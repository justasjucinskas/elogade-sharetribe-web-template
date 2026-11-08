// Import contexts and util modules
import { findRouteByRouteName } from '../../util/routes';
import { ensureStripeCustomer, ensureTransaction } from '../../util/data';
import { formatMoney } from '../../util/currency';
import {
  NEGOTIATION_PROCESS_NAME,
  OFFER_PURCHASE_PROCESS_NAME,
  resolveLatestProcessName,
} from '../../transactions/transaction';
import { storeData } from './CheckoutPageSessionHelpers';

/**
 * Extract relevant transaction type data from listing type
 * Note: this is saved to protectedData of the transaction entity
 *       therefore, we don't need the process name (nor alias)
 *
 * @param {Object} listingType
 * @param {String} unitTypeInPublicData
 * @param {Object} config
 * @returns object containing unitType etc. - or an empty object.
 */
export const getTransactionTypeData = (listingType, unitTypeInPublicData, config) => {
  const listingTypeConfig = config.listing.listingTypes.find(lt => lt.listingType === listingType);
  const { process, alias, unitType, ...rest } = listingTypeConfig?.transactionType || {};
  // Note: we want to rely on unitType written in public data of the listing entity.
  //       The listingType configuration might have changed on the fly.
  return unitTypeInPublicData ? { unitType: unitTypeInPublicData, ...rest } : {};
};

/**
 * This just makes it easier to transfrom bookingDates object if needed
 * (or manibulate bookingStart and bookingEnd)
 *
 * @param {Object} bookingDates
 * @returns object containing bookingDates or an empty object.
 */
export const bookingDatesMaybe = bookingDates => {
  return bookingDates ? { bookingDates } : {};
};

/**
 * Construct billing details (JSON-like object) for the Stripe API
 *
 * @param {Object} formValues object containing name, addressLine1, addressLine2, postal, city, state, country
 * @param {Object} currentUser
 * @returns Object that contains name, email and potentially address data for the Stripe API
 */
export const getBillingDetails = (formValues, currentUser) => {
  const { name, addressLine1, addressLine2, postal, city, state, country } = formValues;

  // Billing address is recommended.
  // However, let's not assume that <StripePaymentAddress> data is among formValues.
  // Read more about this from Stripe's docs
  // https://stripe.com/docs/stripe-js/reference#stripe-handle-card-payment-no-element
  const addressMaybe =
    addressLine1 && postal
      ? {
          address: {
            city: city,
            country: country,
            line1: addressLine1,
            line2: addressLine2,
            postal_code: postal,
            state: state,
          },
        }
      : {};
  return {
    name,
    email: currentUser?.attributes?.email,
    ...addressMaybe,
  };
};

/**
 * Get formatted total price (payinTotal)
 *
 * @param {Object} transaction
 * @param {Object} intl
 * @returns formatted money as a string.
 */
export const getFormattedTotalPrice = (transaction, intl) => {
  const totalPrice = transaction.attributes.payinTotal;
  return formatMoney(intl, totalPrice);
};

/**
 * Construct shipping details (JSON-like object)
 *
 * @param {Object} formValues object containing saveAfterOnetimePayment, recipientName,
 * recipientPhoneNumber, recipientAddressLine1, recipientAddressLine2, recipientPostal,
 * recipientCity, recipientState, and recipientCountry.
 * @returns shippingDetails object containing name, phoneNumber and address
 */
export const getShippingDetailsMaybe = formValues => {
  const {
    saveAfterOnetimePayment: saveAfterOnetimePaymentRaw,
    recipientName,
    recipientPhoneNumber,
    recipientAddressLine1,
    recipientAddressLine2,
    recipientPostal,
    recipientCity,
    recipientState,
    recipientCountry,
  } = formValues;

  return recipientName && recipientAddressLine1 && recipientPostal
    ? {
        shippingDetails: {
          name: recipientName,
          phoneNumber: recipientPhoneNumber,
          address: {
            city: recipientCity,
            country: recipientCountry,
            line1: recipientAddressLine1,
            line2: recipientAddressLine2,
            postalCode: recipientPostal,
            state: recipientState,
          },
        },
      }
    : {};
};

/**
 * Check if the default payment method exists for the currentUser
 * @param {Boolean} stripeCustomerFetched
 * @param {Object} currentUser
 * @returns true if default payment method has been set
 */
export const hasDefaultPaymentMethod = (stripeCustomerFetched, currentUser) =>
  !!(
    stripeCustomerFetched &&
    currentUser?.stripeCustomer?.attributes?.stripeCustomerId &&
    currentUser?.stripeCustomer?.defaultPaymentMethod?.id
  );

/**
 * Check if payment is expired (PAYMENT_EXPIRED state).
 *
 * @param {Object} existingTransaction
 * @param {Object} process
 * @returns true if payment has expired.
 */
export const hasPaymentExpired = (existingTransaction, process) => {
  return process.getState(existingTransaction) === process.states.PAYMENT_EXPIRED;
};

/**
 * Check if the transaction has passed PENDING_PAYMENT state (assumes that process has that state)
 * @param {Object} tx
 * @param {Object} process
 * @returns true if the transaction has passed that state
 */
export const hasTransactionPassedPendingPayment = (tx, process) => {
  return process.hasPassedState(process.states.PENDING_PAYMENT, tx);
};

const persistTransaction = (order, pageData, storeData, setPageData, sessionStorageKey) => {
  // Store the returned transaction (order)
  if (order?.id) {
    // Store order.
    const { orderData, listing } = pageData;
    storeData(orderData, listing, order, sessionStorageKey);
    setPageData({ ...pageData, transaction: order });
  }
};

/**
 * Step 1 of both checkout sequences (card and Apple Pay / Google Pay):
 * initiate the order by requesting payment from Marketplace API.
 *
 * Shared by processCheckoutWithPayment and processCheckoutWithWalletPayment so that the
 * request-payment transition choice (inquiry, negotiation, price offer) can't drift between them.
 *
 * @param {Object} params
 * @param {Object} params.pageData checkout page data (listing, orderData, transaction)
 * @param {Object} params.process transaction process (from getProcess)
 * @param {Function} params.onInitiateOrder
 * @param {Function} params.setPageData
 * @param {String} params.sessionStorageKey
 * @returns {Function} fnParams (orderParams) => Promise resolving to the order (transaction)
 */
const createRequestPaymentFn = params => {
  const { pageData, process, onInitiateOrder, setPageData, sessionStorageKey } = params;
  const storedTx = ensureTransaction(pageData.transaction);
  const processAlias = pageData?.listing?.attributes?.publicData?.transactionProcessAlias;

  return fnParams => {
    // fnParams should be { listingId, deliveryMethod?, quantity?, bookingDates?, paymentMethod?.setupPaymentMethodForSaving?, protectedData }
    const hasPaymentIntents = storedTx.attributes.protectedData?.stripePaymentIntents;

    const isOfferPendingInNegotiationProcess =
      resolveLatestProcessName(processAlias.split('/')[0]) === NEGOTIATION_PROCESS_NAME &&
      storedTx.attributes.state === `state/${process.states.OFFER_PENDING}`;
    // Price offers: the listing's alias is default-purchase, the transaction's process isn't.
    const isPriceAgreedInOfferPurchaseProcess =
      resolveLatestProcessName(storedTx?.attributes?.processName) === OFFER_PURCHASE_PROCESS_NAME &&
      storedTx.attributes.state === `state/${process.states.OFFER_AGREED}`;

    const requestTransition =
      storedTx?.attributes?.lastTransition === process.transitions.INQUIRE
        ? process.transitions.REQUEST_PAYMENT_AFTER_INQUIRY
        : isOfferPendingInNegotiationProcess
        ? process.transitions.REQUEST_PAYMENT_TO_ACCEPT_OFFER
        : isPriceAgreedInOfferPurchaseProcess
        ? process.transitions.REQUEST_PAYMENT_AFTER_OFFER
        : process.transitions.REQUEST_PAYMENT;
    const isPrivileged = process.isPrivileged(requestTransition);

    // If paymentIntent exists, order has been initiated previously.
    const orderPromise = hasPaymentIntents
      ? Promise.resolve(storedTx)
      : onInitiateOrder(fnParams, processAlias, storedTx.id, requestTransition, isPrivileged);

    return orderPromise.then(order => {
      // Store the returned transaction (order)
      persistTransaction(order, pageData, storeData, setPageData, sessionStorageKey);
      return order;
    });
  };
};

/**
 * Step 3 of both checkout sequences (card and Apple Pay / Google Pay):
 * complete the order by confirming payment against Marketplace API.
 *
 * @param {Object} params
 * @param {Object} params.pageData checkout page data (listing, orderData, transaction)
 * @param {Object} params.process transaction process (from getProcess)
 * @param {Function} params.onConfirmPayment
 * @param {Function} params.setPageData
 * @param {String} params.sessionStorageKey
 * @returns {Function} fnParams ({ paymentIntent, transactionId }) => Promise resolving to the order
 */
const createConfirmPaymentFn = params => {
  const { pageData, process, onConfirmPayment, setPageData, sessionStorageKey } = params;
  const storedTx = ensureTransaction(pageData.transaction);

  return fnParams => {
    // fnParams should contain { paymentIntent, transactionId } returned in step 2
    const transactionId = fnParams.transactionId;
    const transitionName = process.transitions.CONFIRM_PAYMENT;
    const isTransitionedAlready = storedTx?.attributes?.lastTransition === transitionName;
    const orderPromise = isTransitionedAlready
      ? Promise.resolve(storedTx)
      : onConfirmPayment(transactionId, transitionName, {});

    return orderPromise.then(order => {
      // Store the returned transaction (order)
      persistTransaction(order, pageData, storeData, setPageData, sessionStorageKey);
      return order;
    });
  };
};

const getPaymentIntentClientSecret = order => {
  const hasPaymentIntents = order?.attributes?.protectedData?.stripePaymentIntents;
  if (!hasPaymentIntents) {
    throw new Error(
      `Missing StripePaymentIntents key in transaction's protectedData. Check that your transaction process is configured to use payment intents.`
    );
  }
  return order.attributes.protectedData.stripePaymentIntents.default
    .stripePaymentIntentClientSecret;
};

// Here we create promise calls in sequence
// This is pretty much the same as:
// fnRequestPayment({...initialParams})
//   .then(result => fnConfirmCardPayment({...result}))
//   .then(result => fnConfirmPayment({...result}))
const applyAsync = (acc, val) => acc.then(val);
const composeAsync = (...funcs) => x => funcs.reduce(applyAsync, Promise.resolve(x));

/**
 * Create call sequence for checkout with Stripe PaymentIntents.
 *
 * @param {Object} orderParams contains params for the initial order itself
 * @param {Object} extraPaymentParams contains extra params needed by one of the following calls in the checkout sequence
 * @returns Promise that goes through each step in the checkout sequence.
 */
export const processCheckoutWithPayment = (orderParams, extraPaymentParams) => {
  const {
    hasPaymentIntentUserActionsDone,
    isPaymentFlowUseSavedCard,
    isPaymentFlowPayAndSaveCard,
    onConfirmCardPayment,
    onSavePaymentMethod,
    paymentIntent,
    stripeCustomer,
    stripePaymentMethodId,
  } = extraPaymentParams;

  const ensuredStripeCustomer = ensureStripeCustomer(stripeCustomer);

  let createdPaymentIntent = null;

  ////////////////////////////////////////////////
  // Step 1: initiate order                     //
  // by requesting payment from Marketplace API //
  ////////////////////////////////////////////////
  const fnRequestPayment = createRequestPaymentFn(extraPaymentParams);

  //////////////////////////////////
  // Step 2: pay using Stripe SDK //
  //////////////////////////////////
  const fnConfirmCardPayment = fnParams => {
    // fnParams should be returned transaction entity
    const order = fnParams;
    const stripePaymentIntentClientSecret = getPaymentIntentClientSecret(order);

    const { stripe, card, billingDetails, paymentIntent } = extraPaymentParams;
    const stripeElementMaybe = !isPaymentFlowUseSavedCard ? { card } : {};

    // Note: For basic USE_SAVED_CARD scenario, we have set it already on API side, when PaymentIntent was created.
    // However, the payment_method is save here for USE_SAVED_CARD flow if customer first attempted onetime payment
    const paymentParams = !isPaymentFlowUseSavedCard
      ? {
          payment_method: {
            billing_details: billingDetails,
            card: card,
          },
        }
      : { payment_method: stripePaymentMethodId };

    const params = {
      stripePaymentIntentClientSecret,
      orderId: order?.id,
      stripe,
      ...stripeElementMaybe,
      paymentParams,
    };

    return hasPaymentIntentUserActionsDone
      ? Promise.resolve({ transactionId: order?.id, paymentIntent })
      : onConfirmCardPayment(params);
  };

  ///////////////////////////////////////////////////
  // Step 3: complete order                        //
  // by confirming payment against Marketplace API //
  ///////////////////////////////////////////////////
  const confirmPayment = createConfirmPaymentFn(extraPaymentParams);
  const fnConfirmPayment = fnParams => {
    // Remember the created PaymentIntent for step 4
    createdPaymentIntent = fnParams.paymentIntent;
    return confirmPayment(fnParams);
  };

  //////////////////////////////////////////////////////////
  // Step 4: optionally save card as defaultPaymentMethod //
  //////////////////////////////////////////////////////////
  const fnSavePaymentMethod = fnParams => {
    const pi = createdPaymentIntent || paymentIntent;
    const orderId = fnParams?.id;

    if (isPaymentFlowPayAndSaveCard) {
      return onSavePaymentMethod(ensuredStripeCustomer, pi.payment_method)
        .then(response => {
          if (response.errors) {
            return { orderId, paymentMethodSaved: false };
          }
          return { orderId, paymentMethodSaved: true };
        })
        .catch(e => {
          // Real error cases are catched already in paymentMethods page.
          return { orderId, paymentMethodSaved: false };
        });
    } else {
      return Promise.resolve({ orderId, paymentMethodSaved: true });
    }
  };

  const handlePaymentIntentCreation = composeAsync(
    fnRequestPayment,
    fnConfirmCardPayment,
    fnConfirmPayment,
    fnSavePaymentMethod
  );

  return handlePaymentIntentCreation(orderParams);
};

/**
 * Create call sequence for checkout with Apple Pay / Google Pay (Stripe Payment Request Button).
 *
 * Same steps as processCheckoutWithPayment, except step 2: the payment method comes from the
 * wallet ("paymentmethod" event). The PaymentIntent is first confirmed with
 * { handleActions: false } so that the wallet sheet can be closed promptly, and confirmed again
 * (which shows 3-D Secure) if Stripe says it still requires action.
 * Wallet cards can't be saved as the default payment method, so there's no save step.
 *
 * See specs/wallet-payments.md and
 * https://www.sharetribe.com/docs/how-to/payments/payment-request-button/
 *
 * @param {Object} orderParams contains params for the initial order itself
 * @param {Object} extraPaymentParams the same params as processCheckoutWithPayment takes, plus
 * `ev`: the Stripe paymentRequest "paymentmethod" event
 * @returns Promise resolving to { orderId, paymentMethodSaved: true }
 */
export const processCheckoutWithWalletPayment = (orderParams, extraPaymentParams) => {
  const {
    ev,
    hasPaymentIntentUserActionsDone,
    onConfirmCardPayment,
    paymentIntent,
    stripe,
  } = extraPaymentParams;

  // The wallet sheet stays open (spinning) until ev.complete is called, and it can only be
  // called once.
  let isSheetCompleted = false;
  const completeSheet = status => {
    if (!isSheetCompleted) {
      isSheetCompleted = true;
      ev.complete(status);
    }
  };

  // Step 1: initiate order (shared with the card flow)
  const fnRequestPayment = createRequestPaymentFn(extraPaymentParams);

  // Step 2: confirm the PaymentIntent with the wallet's payment method
  const fnConfirmWalletPayment = async order => {
    const stripePaymentIntentClientSecret = getPaymentIntentClientSecret(order);
    const orderId = order?.id;

    // A previous attempt already completed Stripe's part (e.g. the page was refreshed).
    if (hasPaymentIntentUserActionsDone) {
      completeSheet('success');
      return { transactionId: orderId, paymentIntent };
    }

    // Attach the wallet's payment method without handling actions, so this returns quickly.
    const firstResult = await onConfirmCardPayment({
      stripe,
      stripePaymentIntentClientSecret,
      orderId,
      paymentParams: { payment_method: ev.paymentMethod.id },
      confirmOptions: { handleActions: false },
    });

    // Close the wallet sheet before any 3-D Secure step.
    completeSheet('success');

    if (firstResult?.paymentIntent?.status === 'requires_action') {
      // Let Stripe.js show the 3-D Secure challenge.
      return onConfirmCardPayment({ stripe, stripePaymentIntentClientSecret, orderId });
    }
    return firstResult;
  };

  // Step 3: complete order (shared with the card flow)
  const fnConfirmPayment = createConfirmPaymentFn(extraPaymentParams);

  const handleWalletPaymentIntentCreation = composeAsync(
    fnRequestPayment,
    fnConfirmWalletPayment,
    fnConfirmPayment
  );

  return handleWalletPaymentIntentCreation(orderParams)
    .then(order => ({ orderId: order?.id, paymentMethodSaved: true }))
    .catch(err => {
      // Tells the browser the payment failed, if the sheet is still open.
      completeSheet('fail');
      throw err;
    });
};

/**
 * Initialize OrderDetailsPage with given initialValues.
 *
 * @param {Object} initialValues
 * @param {Object} routes
 * @param {Function} dispatch
 */
export const setOrderPageInitialValues = (initialValues, routes, dispatch) => {
  const OrderPage = findRouteByRouteName('OrderDetailsPage', routes);

  // Transaction is already created
  dispatch(OrderPage.setInitialValues(initialValues));
};
