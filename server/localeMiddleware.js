/**
 * Express middleware for URL-based locale handling.
 *
 * For every request that should be rendered by the React app:
 *   1. If the path already starts with a supported locale segment (e.g. `/lt/foo`):
 *      - set `req.locale = 'lt'`
 *      - strip the prefix and overwrite `req.url` to `/foo` so the rest of the
 *        pipeline (dataLoader, routeConfiguration, React Router) sees an
 *        unprefixed URL.
 *      - refresh the locale cookie so subsequent visits remember the choice.
 *   2. Otherwise: pick the best locale from cookie → Accept-Language → default,
 *      and 301-redirect to `/<locale><originalUrl>`. The redirect is permanent so
 *      search engines consolidate the bare URL into the locale one, but it is sent
 *      with `Cache-Control: no-store` so browsers re-negotiate the locale cookie on
 *      the next bare visit instead of replaying a cached target.
 *   3. Either way, a legacy search query (`/s?pub_category=laptops`) is rewritten to
 *      its current form in the same 301, so old URLs land in one hop.
 *
 * The middleware ignores requests for static assets, API endpoints, and other
 * server-handled resources — those routes are mounted before this middleware
 * in server/index.js. As a defensive measure we also skip a few obvious
 * non-app paths (`/api`, `/static`, `/_status.json`, `/favicon.ico`, etc.)
 * in case the mount order changes.
 */

const {
  parseLocaleFromPath,
  stripLocaleFromPath,
  prependLocale,
  negotiateLocale,
} = require('../src/util/locale');
const { LOCALE_COOKIE_NAME, SUPPORTED_LOCALES } = require('../src/config/configLocale');

// Paths that bypass locale handling entirely. The catch-all React route only
// runs after these middlewares anyway, but skipping early keeps things tidy
// if someone adds another middleware below.
const SKIP_PREFIXES = ['/api', '/static', '/.well-known', '/csp-report'];
const SKIP_EXACT = new Set([
  '/_status.json',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/site.webmanifest',
]);

// Locale-free server resources that crawlers may also request under a locale
// prefix (e.g. `/en/sitemap-index.xml`, `/lt/robots.txt`). They are served from
// the root path only; see stripLocaleFromResourcePath below.
const LOCALE_FREE_RESOURCE_RE = /^\/(?:sitemap-[^/]+\.xml|sitemap\.xml|robots\.txt)$/;

// Search page path (locale-free) whose legacy query params are rewritten on redirect.
const SEARCH_PATH = '/s';

// Legacy search query params seen in Search Console, mapped to the current
// `pub_categoryLevel1` schema. `values` maps the old param value to the new one;
// an old value that is not listed is left untouched (the search page ignores it
// and the canonical drops it). Add rows here as more legacy URLs show up.
const LEGACY_SEARCH_PARAMS = {
  pub_category: {
    targetParam: 'pub_categoryLevel1',
    values: { laptops: 'computerstablets' },
  },
};

const shouldSkip = pathname => {
  if (pathname.startsWith('/sitemap-')) return true;
  if (SKIP_EXACT.has(pathname)) return true;
  return SKIP_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
};

// One year — same magnitude as the SDK auth cookies, conservative for a preference.
const COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

const setLocaleCookie = (res, locale) => {
  res.cookie(LOCALE_COOKIE_NAME, locale, {
    maxAge: COOKIE_MAX_AGE_MS,
    httpOnly: false, // the client switcher reads it as a hint; not security-sensitive
    sameSite: 'lax',
    path: '/',
  });
};

const getSearch = url => {
  const queryIndex = url.indexOf('?');
  return queryIndex >= 0 ? url.slice(queryIndex) : '';
};

/**
 * Rewrite legacy search query params (see LEGACY_SEARCH_PARAMS) into their current
 * form. Returns the new search string (starting with `?`, or '' when nothing is
 * left) or null when no legacy param with a known value was present.
 */
const rewriteLegacySearchParams = search => {
  const params = new URLSearchParams(search);
  let changed = false;
  Object.entries(LEGACY_SEARCH_PARAMS).forEach(([legacyParam, { targetParam, values }]) => {
    if (!params.has(legacyParam)) return;
    const mapped = values[params.get(legacyParam)];
    if (!mapped) return;
    params.delete(legacyParam);
    // An explicit current param wins over the legacy one; only fill the gap.
    if (!params.has(targetParam)) params.set(targetParam, mapped);
    changed = true;
  });
  if (!changed) return null;
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
};

// Permanent for crawlers, uncached for browsers (see the file header).
const permanentRedirect = (res, target) => {
  res.set('Cache-Control', 'no-store');
  return res.redirect(301, target);
};

const localeMiddleware = (req, res, next) => {
  // req.path strips the query string; for redirects we want to keep it via req.url.
  const pathname = req.path;

  if (shouldSkip(pathname)) {
    return next();
  }

  const localeFromPath = parseLocaleFromPath(pathname);
  const strippedPath = localeFromPath ? stripLocaleFromPath(pathname) : pathname;
  const search = getSearch(req.url);
  const legacySearch = strippedPath === SEARCH_PATH ? rewriteLegacySearchParams(search) : null;

  if (localeFromPath) {
    if (legacySearch != null) {
      return permanentRedirect(
        res,
        prependLocale(`${strippedPath}${legacySearch}`, localeFromPath)
      );
    }

    req.locale = localeFromPath;
    // Strip the prefix so downstream code (dataLoader, route matching) sees `/foo`.
    // We rewrite req.url rather than req.path because Express uses req.url for routing.
    req.url = `${strippedPath}${search}`;

    // Refresh the cookie if it's missing or stale — keeps the user's last visit pinned.
    if (req.cookies?.[LOCALE_COOKIE_NAME] !== localeFromPath) {
      setLocaleCookie(res, localeFromPath);
    }
    return next();
  }

  // No locale in the path → negotiate and redirect.
  const cookieLocale = req.cookies?.[LOCALE_COOKIE_NAME];
  const acceptLanguage = req.headers['accept-language'];
  const negotiated = negotiateLocale(acceptLanguage, cookieLocale);

  setLocaleCookie(res, negotiated);
  // Preserve the query string by using req.url (which has no host but does have query).
  const originalUrl = legacySearch != null ? `${pathname}${legacySearch}` : req.url;
  return permanentRedirect(res, prependLocale(originalUrl, negotiated));
};

/**
 * Express middleware, mounted BEFORE the robots.txt / sitemap routes: rewrites
 * `/<locale>/sitemap-*.xml`, `/<locale>/sitemap.xml` and `/<locale>/robots.txt` to
 * their locale-free path so the existing resource routes answer them with 200
 * instead of the request falling through to the React app as a 404.
 */
const stripLocaleFromResourcePath = (req, res, next) => {
  const locale = parseLocaleFromPath(req.path);
  if (!locale) return next();
  const strippedPath = stripLocaleFromPath(req.path);
  if (!LOCALE_FREE_RESOURCE_RE.test(strippedPath)) return next();
  req.url = `${strippedPath}${getSearch(req.url)}`;
  return next();
};

module.exports = {
  localeMiddleware,
  stripLocaleFromResourcePath,
  rewriteLegacySearchParams,
  LEGACY_SEARCH_PARAMS,
  SUPPORTED_LOCALES,
};
