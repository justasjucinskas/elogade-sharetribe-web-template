/**
 * Pure helpers for URL-based locale handling.
 *
 * Shared between the Express middleware (CommonJS require) and the React app
 * (ES module import). Must remain framework-free.
 */

const { SUPPORTED_LOCALES, DEFAULT_LOCALE, isSupportedLocale } = require('../config/configLocale');

const LOCALE_SEGMENT_RE = new RegExp(`^/(${SUPPORTED_LOCALES.join('|')})(?=/|$)`);

/**
 * Returns the locale segment if `pathname` starts with `/<locale>` (followed by `/` or end),
 * otherwise null. `/enabled` does NOT match `/en`.
 */
const parseLocaleFromPath = pathname => {
  if (typeof pathname !== 'string') return null;
  const match = pathname.match(LOCALE_SEGMENT_RE);
  return match ? match[1] : null;
};

/**
 * Returns the pathname with the leading `/<locale>` removed. If no locale segment is present,
 * returns the pathname unchanged. The result always starts with `/`.
 */
const stripLocaleFromPath = pathname => {
  if (typeof pathname !== 'string') return '/';
  const stripped = pathname.replace(LOCALE_SEGMENT_RE, '');
  return stripped.length === 0 ? '/' : stripped;
};

/**
 * Returns `/<locale><rest>`. The `rest` is normalised so the result has exactly one slash
 * between the locale and the rest of the path.
 */
const prependLocale = (pathname, locale) => {
  const safeLocale = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  const rest = typeof pathname === 'string' ? pathname : '/';
  if (rest === '' || rest === '/') return `/${safeLocale}`;
  return `/${safeLocale}${rest.startsWith('/') ? rest : `/${rest}`}`;
};

/**
 * Pick a locale based on (in order): an explicit cookie value, then the browser's
 * Accept-Language header. Falls back to DEFAULT_LOCALE.
 *
 * Accept-Language parsing is intentionally minimal: we only care whether any
 * supported locale appears as a primary subtag, ordered by q-value.
 */
const negotiateLocale = (acceptLanguage, cookieValue) => {
  if (isSupportedLocale(cookieValue)) return cookieValue;

  if (typeof acceptLanguage === 'string' && acceptLanguage.length > 0) {
    const ranked = acceptLanguage
      .split(',')
      .map(entry => {
        const [tag, ...params] = entry.trim().split(';');
        const qParam = params.find(p => p.trim().startsWith('q='));
        const q = qParam ? parseFloat(qParam.split('=')[1]) : 1;
        return { tag: tag.toLowerCase(), q: Number.isFinite(q) ? q : 0 };
      })
      .filter(item => item.tag.length > 0)
      .sort((a, b) => b.q - a.q);

    for (const { tag } of ranked) {
      const primary = tag.split('-')[0];
      if (isSupportedLocale(primary)) return primary;
    }
  }

  return DEFAULT_LOCALE;
};

/**
 * Read a cookie value by name from a `document.cookie` string.
 * Returns null when the cookie is missing or `cookieString` isn't a string.
 */
const readCookie = (cookieString, name) => {
  if (typeof cookieString !== 'string' || cookieString.length === 0) return null;
  const target = `${name}=`;
  const segments = cookieString.split(';');
  for (const raw of segments) {
    const segment = raw.trim();
    if (segment.startsWith(target)) {
      return decodeURIComponent(segment.slice(target.length));
    }
  }
  return null;
};

module.exports = {
  parseLocaleFromPath,
  stripLocaleFromPath,
  prependLocale,
  negotiateLocale,
  readCookie,
};
