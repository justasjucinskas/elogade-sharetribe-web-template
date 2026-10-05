const { types } = require('sharetribe-flex-sdk');
const {
  MAX_BUYER_OFFERS,
  OFFER_PURCHASE_PROCESS_NAME,
  OFFER_PURCHASE_PROCESS_ALIAS,
  getMinimumOfferInSubunits,
} = require('../../src/config/configPriceOffers');
const { transactionLineItems } = require('./lineItems');
const { addOfferToMetadata, throwErrorIfOfferHistoryIsInvalid } = require('./negotiation');

const { Money } = types;

// offer-purchase process: see ext/transaction-processes/offer-purchase/process.edn
const BUYER_MAKE_OFFER = 'transition/buyer-make-offer';
const SELLER_COUNTER_OFFER = 'transition/seller-counter-offer';
const BUYER_COUNTER_OFFER = 'transition/buyer-counter-offer';
const SELLER_ACCEPT_OFFER = 'transition/seller-accept-offer';
const BUYER_ACCEPT_COUNTER_OFFER = 'transition/buyer-accept-counter-offer';
const REQUEST_PAYMENT_AFTER_OFFER = 'transition/request-payment-after-offer';

const buyerOfferTransitions = [BUYER_MAKE_OFFER, BUYER_COUNTER_OFFER];
const acceptTransitions = [SELLER_ACCEPT_OFFER, BUYER_ACCEPT_COUNTER_OFFER];
const privilegedTransitionsOnExistingTransaction = [
  SELLER_COUNTER_OFFER,
  BUYER_COUNTER_OFFER,
  ...acceptTransitions,
  REQUEST_PAYMENT_AFTER_OFFER,
];

// Error codes the client can recognise (apiErrors[].code). An unavailable item reuses the
// Marketplace API's stock error code, so CheckoutPage shows its usual message.
const ERROR_INVALID_OFFER = 'price-offer-invalid';
const ERROR_TOO_MANY_OFFERS = 'price-offer-too-many-offers';
const ERROR_OWN_LISTING = 'price-offer-own-listing';
const ERROR_ITEM_NOT_AVAILABLE = 'transaction-listing-insufficient-stock';

const offerError = (status, code, message) => {
  const error = new Error(message);
  error.status = status;
  error.statusText = message;
  error.data = { errors: [{ status, code, title: message }] };
  return error;
};

const invalidOffer = message => offerError(400, ERROR_INVALID_OFFER, message);

const isOfferPurchaseProcessAlias = processAlias => processAlias === OFFER_PURCHASE_PROCESS_ALIAS;
const isOfferPurchaseProcessName = processName => processName === OFFER_PURCHASE_PROCESS_NAME;

// The transition decides who made the offer: never trust the role sent by the client.
const actorOf = transitionName =>
  buyerOfferTransitions.includes(transitionName) ? 'customer' : 'provider';

/**
 * Find the listing's currentStock quantity from a Marketplace API response that
 * includes 'currentStock' (listings.show) or 'listing.currentStock' (transactions.show).
 *
 * @param {Object} listing listing resource with relationships
 * @param {Array} included included resources of the response
 * @returns {number|null}
 */
const getStockQuantity = (listing, included = []) => {
  const stockRef = listing?.relationships?.currentStock?.data;
  const stock = stockRef
    ? included.find(i => i.type === 'stock' && i.id.uuid === stockRef.id.uuid)
    : null;
  return stock ? stock.attributes.quantity : null;
};

const throwIfListingNotAvailable = (listing, stockQuantity) => {
  const isPublished = listing?.attributes?.state === 'published';
  if (!isPublished || !(stockQuantity > 0)) {
    throw offerError(409, ERROR_ITEM_NOT_AVAILABLE, 'The item is no longer available');
  }
};

/**
 * Validate the amount of an offer against the listing price.
 * Buyer offers must be ≥ the minimum (50 % of the listing price) and below the listing price.
 * Seller counter offers must be above the buyer's latest offer and below the listing price.
 *
 * @returns {Money} the offer
 */
const validateOfferAmount = ({ transitionName, offerInSubunits, currency, listing, offers }) => {
  const price = listing?.attributes?.price;
  const unitType = listing?.attributes?.publicData?.unitType;

  if (!(price instanceof Money) || unitType !== 'item') {
    throw invalidOffer('Offers are only possible on product listings with a price');
  }
  if (currency && currency !== price.currency) {
    throw invalidOffer('Offer currency must match the listing currency');
  }
  if (!Number.isInteger(offerInSubunits) || offerInSubunits <= 0) {
    throw invalidOffer('Offer must be a positive amount');
  }
  if (offerInSubunits >= price.amount) {
    throw invalidOffer('Offer must be below the listing price');
  }

  if (buyerOfferTransitions.includes(transitionName)) {
    if (offerInSubunits < getMinimumOfferInSubunits(price.amount)) {
      throw invalidOffer('Offer is below the minimum offer');
    }
    const buyerOfferCount = (offers || []).filter(o => buyerOfferTransitions.includes(o.transition))
      .length;
    if (buyerOfferCount >= MAX_BUYER_OFFERS) {
      throw offerError(400, ERROR_TOO_MANY_OFFERS, 'The maximum number of offers has been made');
    }
  } else if (transitionName === SELLER_COUNTER_OFFER) {
    const latestOffer = offers?.at(-1);
    if (latestOffer?.by !== 'customer' || offerInSubunits <= latestOffer.offerInSubunits) {
      throw invalidOffer("Counter offer must be above the buyer's offer");
    }
  }

  return new Money(offerInSubunits, price.currency);
};

// Offers and the agreed amount are in the currency of the listing.
// Line items: the item at the offered price, quantity 1 (listings use oneItem stock), shipping
// only once the delivery method is chosen at checkout, and commissions exactly as for "Buy".
const getLineItems = (listing, offer, orderData, commissions) => {
  const { deliveryMethod } = orderData || {};
  const deliveryMethodMaybe = deliveryMethod ? { deliveryMethod } : {};
  return transactionLineItems(
    listing,
    { stockReservationQuantity: 1, ...deliveryMethodMaybe, offer },
    commissions.providerCommission,
    commissions.customerCommission,
    { processName: OFFER_PURCHASE_PROCESS_NAME }
  );
};

/**
 * Params for initiating an offer-purchase transaction (transition/buyer-make-offer).
 * Throws an error with status 4xx if the offer is not allowed.
 *
 * @param {Object} params
 * @param {Object} params.listing listing resource (with currentStock relationship)
 * @param {number|null} params.stockQuantity
 * @param {Object} params.currentUser current user resource
 * @param {Object} params.orderData { offerInSubunits, currency }
 * @param {Object} params.bodyParams { processAlias, transition, params }
 * @param {Object} params.commissions { providerCommission, customerCommission }
 * @returns {Object} { lineItems, metadata } to add to the initiate params
 */
exports.getInitiateParams = ({
  listing,
  stockQuantity,
  currentUser,
  orderData,
  bodyParams,
  commissions,
}) => {
  const { transition: transitionName, processAlias } = bodyParams || {};
  if (transitionName !== BUYER_MAKE_OFFER || !isOfferPurchaseProcessAlias(processAlias)) {
    throw invalidOffer(`${BUYER_MAKE_OFFER} must initiate ${OFFER_PURCHASE_PROCESS_ALIAS}`);
  }

  const authorId = listing?.relationships?.author?.data?.id?.uuid;
  if (!currentUser?.id?.uuid || authorId === currentUser.id.uuid) {
    throw offerError(403, ERROR_OWN_LISTING, 'You cannot make an offer on your own listing');
  }
  throwIfListingNotAvailable(listing, stockQuantity);

  const { offerInSubunits, currency } = orderData || {};
  const offer = validateOfferAmount({
    transitionName,
    offerInSubunits,
    currency,
    listing,
    offers: [],
  });

  return {
    lineItems: getLineItems(listing, offer, {}, commissions),
    metadata: {
      offers: [
        { offerInSubunits: offer.amount, by: actorOf(transitionName), transition: transitionName },
      ],
    },
  };
};

/**
 * Params for a privileged transition of an existing offer-purchase transaction.
 * Throws an error with status 4xx if the transition is not allowed.
 *
 * - seller-counter-offer / buyer-counter-offer: line items and metadata for the new offer.
 * - seller-accept-offer / buyer-accept-counter-offer: no params (the price is already on the
 *   table); only checks that the item can still be sold.
 * - request-payment-after-offer: line items from the agreed amount in metadata (never from the
 *   request body), quantity 1 and shipping for the chosen delivery method.
 *
 * @param {Object} params
 * @param {Object} params.transaction transaction resource
 * @param {Object} params.listing listing resource (with currentStock relationship)
 * @param {number|null} params.stockQuantity
 * @param {Object} params.orderData { offerInSubunits, currency, deliveryMethod }
 * @param {string} params.transitionName
 * @param {Object} params.commissions { providerCommission, customerCommission }
 * @returns {Object} params to add to the transition params (and transition-specific overrides)
 */
exports.getTransitionParams = ({
  transaction,
  listing,
  stockQuantity,
  orderData,
  transitionName,
  commissions,
}) => {
  if (!privilegedTransitionsOnExistingTransaction.includes(transitionName)) {
    throw invalidOffer(`Unknown privileged transition: ${transitionName}`);
  }

  const existingMetadata = transaction?.attributes?.metadata || {};
  const offers = existingMetadata.offers || [];
  const transitions = transaction?.attributes?.transitions || [];

  // Only this server writes the offers (privileged-update-metadata), and each offer must match
  // an offer-carrying transition in the transaction's history.
  throwErrorIfOfferHistoryIsInvalid(offers, transitions);
  throwIfListingNotAvailable(listing, stockQuantity);

  if (transitionName === SELLER_COUNTER_OFFER || transitionName === BUYER_COUNTER_OFFER) {
    const { offerInSubunits, currency } = orderData || {};
    const offer = validateOfferAmount({
      transitionName,
      offerInSubunits,
      currency,
      listing,
      offers,
    });
    const offerRecord = {
      offerInSubunits: offer.amount,
      by: actorOf(transitionName),
      transition: transitionName,
    };
    return {
      lineItems: getLineItems(listing, offer, {}, commissions),
      ...addOfferToMetadata(existingMetadata, offerRecord),
    };
  }

  if (acceptTransitions.includes(transitionName)) {
    return {};
  }

  // REQUEST_PAYMENT_AFTER_OFFER
  const agreedOffer = offers.at(-1);
  const currency = listing.attributes.price.currency;
  if (!Number.isInteger(agreedOffer?.offerInSubunits)) {
    throw invalidOffer('No agreed price found');
  }
  const agreedPrice = new Money(agreedOffer.offerInSubunits, currency);
  return {
    lineItems: getLineItems(listing, agreedPrice, orderData, commissions),
    stockReservationQuantity: 1,
  };
};

exports.isOfferPurchaseProcessAlias = isOfferPurchaseProcessAlias;
exports.isOfferPurchaseProcessName = isOfferPurchaseProcessName;
exports.getStockQuantity = getStockQuantity;
exports.BUYER_MAKE_OFFER = BUYER_MAKE_OFFER;
