/**
 * Price offers ("Make an offer") on product listings.
 *
 * Shared by the browser bundle and the Express server (server/api-util/priceOffers.js), so the
 * client validation and the server-side enforcement can never drift apart.
 *
 * CommonJS on purpose: server/ has no ESM transpilation.
 *
 * Offers run on their own transaction process (`offer-purchase`), next to the listing type's
 * own process: "Buy" keeps initiating default-purchase. See specs/price-offers.md.
 */

// Build-time flag (REACT_APP_* is inlined into the browser bundle). It only hides the
// "Make an offer" button: offer transactions that already exist keep working when it's off.
// Keep it off on an environment until the offer-purchase process alias exists there,
// otherwise initiating an offer fails.
const PRICE_OFFERS_ENABLED = process.env.REACT_APP_PRICE_OFFERS_ENABLED === 'true';

// A buyer's offer must be at least this share of the listing price (100 € → 50 €).
const MINIMUM_OFFER_RATIO = 0.5;

// A buyer may make at most this many offers in one offer transaction
// (the first offer + counters to the seller's counter offers).
const MAX_BUYER_OFFERS = 3;

// These mirror the timers in ext/transaction-processes/offer-purchase/process.edn.
// They're only used to show deadlines in the UI; the process decides the actual expiry.
const OFFER_RESPONSE_HOURS = 48;
const AGREED_OFFER_PAYMENT_HOURS = 24;

const OFFER_PURCHASE_PROCESS_NAME = 'offer-purchase';
const OFFER_PURCHASE_PROCESS_ALIAS = `${OFFER_PURCHASE_PROCESS_NAME}/release-1`;

/**
 * Smallest offer a buyer can make, in subunits. Rounded up, so the offer is never below the ratio.
 *
 * @param {number} listingPriceInSubunits
 * @returns {number}
 */
const getMinimumOfferInSubunits = listingPriceInSubunits =>
  Math.ceil(listingPriceInSubunits * MINIMUM_OFFER_RATIO);

module.exports = {
  PRICE_OFFERS_ENABLED,
  MINIMUM_OFFER_RATIO,
  MAX_BUYER_OFFERS,
  OFFER_RESPONSE_HOURS,
  AGREED_OFFER_PAYMENT_HOURS,
  OFFER_PURCHASE_PROCESS_NAME,
  OFFER_PURCHASE_PROCESS_ALIAS,
  getMinimumOfferInSubunits,
};
