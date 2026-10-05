/**
 * Client-side helpers for price offers (offer-purchase process).
 * The same limits are enforced on the server: server/api-util/priceOffers.js
 */
import {
  PRICE_OFFERS_ENABLED,
  MAX_BUYER_OFFERS,
  getMinimumOfferInSubunits,
} from '../config/configPriceOffers';
import { buyerOfferTransitions } from '../transactions/transactionProcessOfferPurchase';
import { isPurchaseProcessAlias } from '../transactions/transaction';
import { LISTING_STATE_PUBLISHED } from './types';

const HOUR_IN_MS = 60 * 60 * 1000;

/**
 * Is the listing currently for sale: published and in stock.
 * Offers can't be made, accepted or paid otherwise.
 *
 * @param {Object} listing listing entity with currentStock relationship
 * @returns {boolean}
 */
export const isListingAvailableForOffers = listing => {
  const isPublished = listing?.attributes?.state === LISTING_STATE_PUBLISHED;
  const stock = listing?.currentStock?.attributes?.quantity;
  return isPublished && stock > 0;
};

/**
 * Can "Make an offer" be shown for this listing: the feature is on, the listing is a product
 * sold through default-purchase ("Buy"), it's for sale and it's not the user's own listing.
 *
 * @param {Object} params
 * @param {Object} params.listing listing entity with currentStock relationship
 * @param {boolean} params.isOwnListing
 * @param {string} params.marketplaceCurrency
 * @param {boolean} [params.enabled] defaults to the build-time feature flag
 * @returns {boolean}
 */
export const canMakePriceOffer = ({
  listing,
  isOwnListing,
  marketplaceCurrency,
  enabled = PRICE_OFFERS_ENABLED,
}) => {
  const { transactionProcessAlias, unitType } = listing?.attributes?.publicData || {};
  const price = listing?.attributes?.price;
  return (
    !!enabled &&
    !isOwnListing &&
    isPurchaseProcessAlias(transactionProcessAlias) &&
    unitType === 'item' &&
    !!price &&
    price.currency === marketplaceCurrency &&
    isListingAvailableForOffers(listing)
  );
};

/**
 * How many offers the buyer has made in this transaction (first offer + counter offers).
 *
 * @param {Array<Object>} offers transaction.attributes.metadata.offers
 * @returns {number}
 */
export const getBuyerOfferCount = offers =>
  (offers || []).filter(o => buyerOfferTransitions.includes(o.transition)).length;

/**
 * Can the buyer still make a counter offer.
 *
 * @param {Array<Object>} offers transaction.attributes.metadata.offers
 * @returns {boolean}
 */
export const hasBuyerOffersLeft = offers => getBuyerOfferCount(offers) < MAX_BUYER_OFFERS;

/**
 * Limits for a new offer, in subunits.
 * - Buyer: at least 50 % of the listing price, below the listing price.
 * - Seller (counter offer): above the buyer's latest offer, below the listing price.
 *
 * @param {Object} params
 * @param {Money} params.listingPrice
 * @param {'customer'|'provider'} params.role
 * @param {number} [params.latestOfferInSubunits] the offer on the table (for counter offers)
 * @returns {Object} { minimumInSubunits, belowInSubunits }
 */
export const getOfferLimits = ({ listingPrice, role, latestOfferInSubunits }) => {
  const priceAmount = listingPrice?.amount;
  const minimumInSubunits =
    role === 'provider' ? latestOfferInSubunits + 1 : getMinimumOfferInSubunits(priceAmount);
  return { minimumInSubunits, belowInSubunits: priceAmount };
};

/**
 * When the current step of an offer expires: the process expires it after a fixed number of
 * hours since the transaction entered its current state.
 *
 * @param {Object} transaction transaction entity
 * @param {number} hours e.g. OFFER_RESPONSE_HOURS
 * @returns {Date|null}
 */
export const getOfferDeadline = (transaction, hours) => {
  const lastTransitionedAt = transaction?.attributes?.lastTransitionedAt;
  return lastTransitionedAt instanceof Date
    ? new Date(lastTransitionedAt.getTime() + hours * HOUR_IN_MS)
    : null;
};
