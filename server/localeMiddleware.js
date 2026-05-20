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
 *      and 302-redirect to `/<locale><originalUrl>`.
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
const SKIP_EXACT = new Set(['/_status.json', '/favicon.ico', '/robots.txt', '/site.webmanifest']);

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

const localeMiddleware = (req, res, next) => {
  // req.path strips the query string; for redirects we want to keep it via req.url.
  const pathname = req.path;

  if (shouldSkip(pathname)) {
    return next();
  }

  const localeFromPath = parseLocaleFromPath(pathname);

  if (localeFromPath) {
    req.locale = localeFromPath;
    // Strip the prefix so downstream code (dataLoader, route matching) sees `/foo`.
    // We rewrite req.url rather than req.path because Express uses req.url for routing.
    const strippedPath = stripLocaleFromPath(pathname);
    const queryIndex = req.url.indexOf('?');
    const search = queryIndex >= 0 ? req.url.slice(queryIndex) : '';
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
  // Preserve query string and hash by using req.url (which has no host but does have query).
  const target = prependLocale(req.url, negotiated);
  return res.redirect(302, target);
};

module.exports = {
  localeMiddleware,
  SUPPORTED_LOCALES,
};
