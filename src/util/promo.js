import { promo as promoConfig } from '../config/configPromo';

// Promo dates are shown in the marketplace's home time zone, regardless of where the
// server (SSR) or the visitor's browser runs.
export const PROMO_TIME_ZONE = 'Europe/Vilnius';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether the promotion is running at the given moment.
 *
 * @param {Object?} promo promotion config ({ id, startsAt, endsAt }), see config/configPromo.js
 * @param {number} now timestamp in milliseconds
 * @returns {boolean}
 */
export const isPromoActive = (promo = promoConfig, now = Date.now()) => {
  if (!promo?.id || !promo?.endsAt) {
    return false;
  }
  const start = promo.startsAt ? Date.parse(promo.startsAt) : -Infinity;
  const end = Date.parse(promo.endsAt);
  return now >= start && now < end;
};

/**
 * Whole days left in the promotion, counting a started day as a full day (so the last
 * promo day reads "1 day left").
 *
 * @param {Object} promo promotion config
 * @param {number} now timestamp in milliseconds
 * @returns {number}
 */
export const getPromoDaysLeft = (promo = promoConfig, now = Date.now()) =>
  Math.max(1, Math.ceil((Date.parse(promo.endsAt) - now) / DAY_MS));

/**
 * The last day of the promotion, formatted for the current locale in the marketplace time
 * zone: 'long' → "October 31" / "spalio 31 d." / "31 października",
 * 'short' → "10/31" / "10-31" / "31.10".
 *
 * @param {Object} intl react-intl object
 * @param {Object} promo promotion config
 * @param {('long'|'short')} format
 * @returns {string}
 */
export const formatPromoLastDay = (intl, promo = promoConfig, format = 'long') => {
  // endsAt is exclusive (midnight after the last day), so step back one millisecond.
  const lastDay = new Date(Date.parse(promo.endsAt) - 1);
  const options =
    format === 'short' ? { month: '2-digit', day: '2-digit' } : { month: 'long', day: 'numeric' };
  return intl.formatDate(lastDay, { ...options, timeZone: PROMO_TIME_ZONE });
};

/**
 * The currently running promotion, or null. Evaluated at render time, so a page rendered
 * after the end date (SSR or client) no longer shows it.
 *
 * @returns {Object?} promotion config
 */
export const getActivePromo = () => (isPromoActive(promoConfig) ? promoConfig : null);
