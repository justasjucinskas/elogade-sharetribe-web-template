/**
 * Transaction process graph for price offers on product listings:
 *   - offer-purchase
 *
 * The buyer makes an offer, the seller accepts, declines or counters, and once the price is
 * agreed the buyer pays it. From pending-payment onwards the graph is identical to
 * default-purchase. Listing types stay on default-purchase: "Make an offer" initiates this
 * process explicitly, next to "Buy". See specs/price-offers.md.
 */

/**
 * Transitions
 *
 * These strings must sync with values defined in Marketplace API,
 * since transaction objects given by API contain info about last transitions.
 * All the actions in API side happen in transitions,
 * so we need to understand what those strings mean.
 */

export const transitions = {
  // The buyer makes an offer. Price and offer history are set by the client app's server.
  BUYER_MAKE_OFFER: 'transition/buyer-make-offer',

  // The seller reacts to the buyer's offer.
  SELLER_ACCEPT_OFFER: 'transition/seller-accept-offer',
  SELLER_DECLINE_OFFER: 'transition/seller-decline-offer',
  SELLER_COUNTER_OFFER: 'transition/seller-counter-offer',
  BUYER_WITHDRAW_OFFER: 'transition/buyer-withdraw-offer',
  OPERATOR_DECLINE_OFFER: 'transition/operator-decline-offer',
  EXPIRE_OFFER: 'transition/expire-offer',

  // The buyer reacts to the seller's counter offer.
  BUYER_ACCEPT_COUNTER_OFFER: 'transition/buyer-accept-counter-offer',
  BUYER_DECLINE_COUNTER_OFFER: 'transition/buyer-decline-counter-offer',
  BUYER_COUNTER_OFFER: 'transition/buyer-counter-offer',
  OPERATOR_DECLINE_COUNTER_OFFER: 'transition/operator-decline-counter-offer',
  EXPIRE_COUNTER_OFFER: 'transition/expire-counter-offer',

  // The price is agreed: the buyer pays it on CheckoutPage (the item is not reserved before that).
  REQUEST_PAYMENT_AFTER_OFFER: 'transition/request-payment-after-offer',
  BUYER_CANCEL_ACCEPTED_OFFER: 'transition/buyer-cancel-accepted-offer',
  EXPIRE_ACCEPTED_OFFER: 'transition/expire-accepted-offer',

  // From here on, the same transitions as in default-purchase.

  // Stripe SDK might need to ask 3D security from customer, in a separate front-end step.
  // Therefore we need to make another transition to Marketplace API,
  // to tell that the payment is confirmed.
  CONFIRM_PAYMENT: 'transition/confirm-payment',

  // If the payment is not confirmed in the time limit set in transaction process (by default 15min)
  // the transaction will expire automatically.
  EXPIRE_PAYMENT: 'transition/expire-payment',

  // Provider or opeartor can mark the product shipped/delivered
  MARK_DELIVERED: 'transition/mark-delivered',
  OPERATOR_MARK_DELIVERED: 'transition/operator-mark-delivered',

  // Customer can mark the product received (e.g. picked up from provider)
  MARK_RECEIVED_FROM_PURCHASED: 'transition/mark-received-from-purchased',

  // Automatic cancellation happens if none marks the delivery happened
  AUTO_CANCEL: 'transition/auto-cancel',

  // Operator can cancel the purchase before product has been marked as delivered / received
  CANCEL: 'transition/cancel',

  // If provider has marked the product delivered (e.g. shipped),
  // customer can then mark the product received
  MARK_RECEIVED: 'transition/mark-received',

  // If customer doesn't mark the product received manually, it can happen automatically
  AUTO_MARK_RECEIVED: 'transition/auto-mark-received',

  // When provider has marked the product delivered, customer or operator can dispute the transaction
  DISPUTE: 'transition/dispute',
  OPERATOR_DISPUTE: 'transition/operator-dispute',

  // If nothing is done to disputed transaction it ends up to Canceled state
  AUTO_CANCEL_FROM_DISPUTED: 'transition/auto-cancel-from-disputed',

  // Operator can cancel disputed transaction manually
  CANCEL_FROM_DISPUTED: 'transition/cancel-from-disputed',

  // Operator can mark the disputed transaction as received
  MARK_RECEIVED_FROM_DISPUTED: 'transition/mark-received-from-disputed',

  // System moves transaction automatically from received state to complete state
  // This makes it possible to to add notifications to that single transition.
  AUTO_COMPLETE: 'transition/auto-complete',

  // Reviews are given through transaction transitions. Review 1 can be
  // by provider or customer, and review 2 will be the other party of
  // the transaction.
  REVIEW_1_BY_PROVIDER: 'transition/review-1-by-provider',
  REVIEW_2_BY_PROVIDER: 'transition/review-2-by-provider',
  REVIEW_1_BY_CUSTOMER: 'transition/review-1-by-customer',
  REVIEW_2_BY_CUSTOMER: 'transition/review-2-by-customer',
  EXPIRE_CUSTOMER_REVIEW_PERIOD: 'transition/expire-customer-review-period',
  EXPIRE_PROVIDER_REVIEW_PERIOD: 'transition/expire-provider-review-period',
  EXPIRE_REVIEW_PERIOD: 'transition/expire-review-period',
};

/**
 * States
 *
 * These constants are only for making it clear how transitions work together.
 * You should not use these constants outside of this file.
 *
 * Note: these states are not in sync with states used transaction process definitions
 *       in Marketplace API. Only last transitions are passed along transaction object.
 *
 * Note: the notification badge (user.duck.js) queries states across every process by name.
 *       'buyer-offer-pending' and 'offer-agreed' are named so that they don't collide with
 *       default-negotiation's 'offer-pending' and 'offer-accepted', which need the other party's
 *       attention.
 */

export const states = {
  INITIAL: 'initial',
  BUYER_OFFER_PENDING: 'buyer-offer-pending',
  COUNTER_OFFER_PENDING: 'counter-offer-pending',
  OFFER_AGREED: 'offer-agreed',
  OFFER_DECLINED: 'offer-declined',
  OFFER_EXPIRED: 'offer-expired',
  PENDING_PAYMENT: 'pending-payment',
  PAYMENT_EXPIRED: 'payment-expired',
  PURCHASED: 'purchased',
  DELIVERED: 'delivered',
  RECEIVED: 'received',
  DISPUTED: 'disputed',
  CANCELED: 'canceled',
  COMPLETED: 'completed',
  REVIEWED: 'reviewed',
  REVIEWED_BY_CUSTOMER: 'reviewed-by-customer',
  REVIEWED_BY_PROVIDER: 'reviewed-by-provider',
};

/**
 * Description of transaction process graph
 *
 * You should keep this in sync with transaction process defined in Marketplace API
 *
 * Note: we don't use yet any state machine library,
 *       but this description format is following Xstate (FSM library)
 *       https://xstate.js.org/docs/
 */
export const graph = {
  // id is defined only to support Xstate format.
  // However if you have multiple transaction processes defined,
  // it is best to keep them in sync with transaction process aliases.
  id: 'offer-purchase/release-1',

  // This 'initial' state is a starting point for new transaction
  initial: states.INITIAL,

  // States
  states: {
    [states.INITIAL]: {
      on: {
        [transitions.BUYER_MAKE_OFFER]: states.BUYER_OFFER_PENDING,
      },
    },
    [states.BUYER_OFFER_PENDING]: {
      on: {
        [transitions.SELLER_ACCEPT_OFFER]: states.OFFER_AGREED,
        [transitions.SELLER_DECLINE_OFFER]: states.OFFER_DECLINED,
        [transitions.SELLER_COUNTER_OFFER]: states.COUNTER_OFFER_PENDING,
        [transitions.BUYER_WITHDRAW_OFFER]: states.OFFER_DECLINED,
        [transitions.OPERATOR_DECLINE_OFFER]: states.OFFER_DECLINED,
        [transitions.EXPIRE_OFFER]: states.OFFER_EXPIRED,
      },
    },
    [states.COUNTER_OFFER_PENDING]: {
      on: {
        [transitions.BUYER_ACCEPT_COUNTER_OFFER]: states.OFFER_AGREED,
        [transitions.BUYER_DECLINE_COUNTER_OFFER]: states.OFFER_DECLINED,
        [transitions.BUYER_COUNTER_OFFER]: states.BUYER_OFFER_PENDING,
        [transitions.OPERATOR_DECLINE_COUNTER_OFFER]: states.OFFER_DECLINED,
        [transitions.EXPIRE_COUNTER_OFFER]: states.OFFER_EXPIRED,
      },
    },
    [states.OFFER_AGREED]: {
      on: {
        [transitions.REQUEST_PAYMENT_AFTER_OFFER]: states.PENDING_PAYMENT,
        [transitions.BUYER_CANCEL_ACCEPTED_OFFER]: states.OFFER_DECLINED,
        [transitions.EXPIRE_ACCEPTED_OFFER]: states.OFFER_EXPIRED,
      },
    },
    [states.OFFER_DECLINED]: { type: 'final' },
    [states.OFFER_EXPIRED]: { type: 'final' },

    [states.PENDING_PAYMENT]: {
      on: {
        [transitions.EXPIRE_PAYMENT]: states.PAYMENT_EXPIRED,
        [transitions.CONFIRM_PAYMENT]: states.PURCHASED,
      },
    },

    [states.PAYMENT_EXPIRED]: {},
    [states.PURCHASED]: {
      on: {
        [transitions.MARK_DELIVERED]: states.DELIVERED,
        [transitions.OPERATOR_MARK_DELIVERED]: states.DELIVERED,
        [transitions.MARK_RECEIVED_FROM_PURCHASED]: states.RECEIVED,
        [transitions.AUTO_CANCEL]: states.CANCELED,
        [transitions.CANCEL]: states.CANCELED,
      },
    },

    [states.CANCELED]: {},

    [states.DELIVERED]: {
      on: {
        [transitions.MARK_RECEIVED]: states.RECEIVED,
        [transitions.AUTO_MARK_RECEIVED]: states.RECEIVED,
        [transitions.DISPUTE]: states.DISPUTED,
        [transitions.OPERATOR_DISPUTE]: states.DISPUTED,
      },
    },

    [states.DISPUTED]: {
      on: {
        [transitions.AUTO_CANCEL_FROM_DISPUTED]: states.CANCELED,
        [transitions.CANCEL_FROM_DISPUTED]: states.CANCELED,
        [transitions.MARK_RECEIVED_FROM_DISPUTED]: states.RECEIVED,
      },
    },

    [states.RECEIVED]: {
      on: {
        [transitions.AUTO_COMPLETE]: states.COMPLETED,
      },
    },

    [states.COMPLETED]: {
      on: {
        [transitions.EXPIRE_REVIEW_PERIOD]: states.REVIEWED,
        [transitions.REVIEW_1_BY_CUSTOMER]: states.REVIEWED_BY_CUSTOMER,
        [transitions.REVIEW_1_BY_PROVIDER]: states.REVIEWED_BY_PROVIDER,
      },
    },

    [states.REVIEWED_BY_CUSTOMER]: {
      on: {
        [transitions.REVIEW_2_BY_PROVIDER]: states.REVIEWED,
        [transitions.EXPIRE_PROVIDER_REVIEW_PERIOD]: states.REVIEWED,
      },
    },
    [states.REVIEWED_BY_PROVIDER]: {
      on: {
        [transitions.REVIEW_2_BY_CUSTOMER]: states.REVIEWED,
        [transitions.EXPIRE_CUSTOMER_REVIEW_PERIOD]: states.REVIEWED,
      },
    },
    [states.REVIEWED]: { type: 'final' },
  },
};

// Transitions that put an offer (an amount) on the table. Each of them adds one entry to
// transaction.attributes.metadata.offers (written only by the client app's server).
export const offerTransitions = [
  transitions.BUYER_MAKE_OFFER,
  transitions.SELLER_COUNTER_OFFER,
  transitions.BUYER_COUNTER_OFFER,
];

// Transitions made by the buyer that put an amount on the table (capped by MAX_BUYER_OFFERS).
export const buyerOfferTransitions = [
  transitions.BUYER_MAKE_OFFER,
  transitions.BUYER_COUNTER_OFFER,
];

/**
 * Checks if the offers array (metadata, written by the client app's server) matches the
 * offer-carrying transitions of the transaction, in the same order and by the same actors.
 *
 * Note: TransactionPage uses this (with isNegotiationState) to validate offer data.
 *
 * @param {Array<Object>} transitions transaction.attributes.transitions
 * @param {Array<Object>} offers transaction.attributes.metadata.offers
 * @returns {boolean}
 */
export const isValidNegotiationOffersArray = (transitions, offers) => {
  const pickedTransitions = transitions.filter(t => offerTransitions.includes(t.transition));
  const isOffersAnArray = !!offers && Array.isArray(offers);
  if (!isOffersAnArray || offers.length !== pickedTransitions.length) {
    return false;
  }
  return offers.every(
    (offer, i) =>
      offer.transition === pickedTransitions[i].transition && offer.by === pickedTransitions[i].by
  );
};

/**
 * Returns a new array of transitions where offer-carrying transitions have the offered amount
 * (offerInSubunits) added. ActivityFeed shows it.
 *
 * @param {Array<Object>} transitions transaction.attributes.transitions
 * @param {Array<Object>} offers transaction.attributes.metadata.offers
 * @returns {Array<Object>}
 */
export const getTransitionsWithMatchingOffers = (transitions, offers) => {
  if (!isValidNegotiationOffersArray(transitions, offers)) {
    return transitions;
  }
  let offerIndex = 0;
  return transitions.map(t =>
    offerTransitions.includes(t.transition)
      ? { ...t, offerInSubunits: offers[offerIndex++]?.offerInSubunits }
      : t
  );
};

/**
 * Checks if the state is one where actions rely on the offer history: the price is being
 * negotiated, or it has been agreed and is waiting for payment.
 * TransactionPage validates the offer data (isValidNegotiationOffersArray) in these states.
 *
 * @param {string} state e.g. 'buyer-offer-pending' or 'state/buyer-offer-pending'
 * @returns {boolean}
 */
export const isNegotiationState = state => {
  if (state == null) {
    return false;
  }
  const unprefixedState = state.indexOf('/') === -1 ? state : state.split('/')[1];
  return [states.BUYER_OFFER_PENDING, states.COUNTER_OFFER_PENDING, states.OFFER_AGREED].includes(
    unprefixedState
  );
};

// Check if a transition is the kind that should be rendered
// when showing transition history (e.g. ActivityFeed)
// The first transition and most of the expiration transitions made by system are not relevant
export const isRelevantPastTransition = transition => {
  return [
    transitions.BUYER_MAKE_OFFER,
    transitions.SELLER_ACCEPT_OFFER,
    transitions.SELLER_DECLINE_OFFER,
    transitions.SELLER_COUNTER_OFFER,
    transitions.BUYER_WITHDRAW_OFFER,
    transitions.OPERATOR_DECLINE_OFFER,
    transitions.EXPIRE_OFFER,
    transitions.BUYER_ACCEPT_COUNTER_OFFER,
    transitions.BUYER_DECLINE_COUNTER_OFFER,
    transitions.BUYER_COUNTER_OFFER,
    transitions.OPERATOR_DECLINE_COUNTER_OFFER,
    transitions.EXPIRE_COUNTER_OFFER,
    transitions.BUYER_CANCEL_ACCEPTED_OFFER,
    transitions.EXPIRE_ACCEPTED_OFFER,
    transitions.EXPIRE_PAYMENT,
    transitions.CONFIRM_PAYMENT,
    transitions.AUTO_CANCEL,
    transitions.CANCEL,
    transitions.MARK_DELIVERED,
    transitions.OPERATOR_MARK_DELIVERED,
    transitions.DISPUTE,
    transitions.OPERATOR_DISPUTE,
    transitions.AUTO_COMPLETE,
    transitions.AUTO_CANCEL_FROM_DISPUTED,
    transitions.CANCEL_FROM_DISPUTED,
    transitions.REVIEW_1_BY_CUSTOMER,
    transitions.REVIEW_1_BY_PROVIDER,
    transitions.REVIEW_2_BY_CUSTOMER,
    transitions.REVIEW_2_BY_PROVIDER,
  ].includes(transition);
};
export const isCustomerReview = transition => {
  return [transitions.REVIEW_1_BY_CUSTOMER, transitions.REVIEW_2_BY_CUSTOMER].includes(transition);
};

export const isProviderReview = transition => {
  return [transitions.REVIEW_1_BY_PROVIDER, transitions.REVIEW_2_BY_PROVIDER].includes(transition);
};

// Check if the given transition is privileged.
//
// Privileged transitions need to be handled from a secure context,
// i.e. the backend. This helper is used to check if the transition
// should go through the local API endpoints, or if using JS SDK is
// enough.
export const isPrivileged = transition => {
  return [
    transitions.BUYER_MAKE_OFFER,
    transitions.SELLER_ACCEPT_OFFER,
    transitions.SELLER_COUNTER_OFFER,
    transitions.BUYER_ACCEPT_COUNTER_OFFER,
    transitions.BUYER_COUNTER_OFFER,
    transitions.REQUEST_PAYMENT_AFTER_OFFER,
  ].includes(transition);
};

// Check when transaction is completed (item is received and review notifications sent)
export const isCompleted = transition => {
  const txCompletedTransitions = [
    transitions.AUTO_COMPLETE,
    transitions.REVIEW_1_BY_CUSTOMER,
    transitions.REVIEW_1_BY_PROVIDER,
    transitions.REVIEW_2_BY_CUSTOMER,
    transitions.REVIEW_2_BY_PROVIDER,
    transitions.EXPIRE_REVIEW_PERIOD,
    transitions.EXPIRE_CUSTOMER_REVIEW_PERIOD,
    transitions.EXPIRE_PROVIDER_REVIEW_PERIOD,
  ];
  return txCompletedTransitions.includes(transition);
};

// Check when transaction is refunded (order did not happen)
// In these transitions action/stripe-refund-payment is called
export const isRefunded = transition => {
  const txRefundedTransitions = [
    transitions.EXPIRE_PAYMENT,
    transitions.CANCEL,
    transitions.AUTO_CANCEL,
    transitions.AUTO_CANCEL_FROM_DISPUTED,
    transitions.CANCEL_FROM_DISPUTED,
  ];
  return txRefundedTransitions.includes(transition);
};

export const statesNeedingProviderAttention = [states.BUYER_OFFER_PENDING, states.PURCHASED];

export const statesNeedingCustomerAttention = [states.COUNTER_OFFER_PENDING, states.OFFER_AGREED];
