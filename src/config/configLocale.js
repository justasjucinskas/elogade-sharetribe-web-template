/**
 * Locale configuration for URL-based localisation.
 *
 * The marketplace is served with a locale prefix in the URL path (`/en/...`, `/lt/...`).
 * This file is the single source of truth for:
 *   - which locale codes appear in the URL (`SUPPORTED_LOCALES`)
 *   - which locale is used when nothing else can be inferred (`DEFAULT_LOCALE`)
 *   - how a URL locale maps to react-intl/moment locale codes
 *   - the cookie name used to remember the user's last manual choice
 */

const SUPPORTED_LOCALES = ['en', 'lt'];
const DEFAULT_LOCALE = 'en';
const LOCALE_COOKIE_NAME = 'locale';

// URL locale → react-intl / moment locale string used by IntlProvider and moment.locale()
const LOCALE_TO_INTL_CODE = {
  en: 'en-US',
  lt: 'lt-LT',
};

const isSupportedLocale = value => SUPPORTED_LOCALES.includes(value);
const toIntlLocale = locale => LOCALE_TO_INTL_CODE[locale] || LOCALE_TO_INTL_CODE[DEFAULT_LOCALE];

module.exports = {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_TO_INTL_CODE,
  isSupportedLocale,
  toIntlLocale,
};
