import { promo as promoConfig } from '../config/configPromo';

/**
 * Whether the promotion is running at the given moment. A missing start means it has
 * already started; a missing end means it never ends.
 *
 * @param {Object?} promo promotion config ({ id, startsAt, endsAt }), see config/configPromo.js
 * @param {number} now timestamp in milliseconds
 * @returns {boolean}
 */
export const isPromoActive = (promo = promoConfig, now = Date.now()) => {
  if (!promo?.id) {
    return false;
  }
  const start = promo.startsAt ? Date.parse(promo.startsAt) : -Infinity;
  const end = promo.endsAt ? Date.parse(promo.endsAt) : Infinity;
  return now >= start && now < end;
};

/**
 * The currently running promotion, or null. Evaluated at render time, so a page rendered
 * after the end date (SSR or client) no longer shows it.
 *
 * @returns {Object?} promotion config
 */
export const getActivePromo = () => (isPromoActive(promoConfig) ? promoConfig : null);
