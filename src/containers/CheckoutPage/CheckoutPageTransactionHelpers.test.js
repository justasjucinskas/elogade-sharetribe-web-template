import { types as sdkTypes } from '../../util/sdkLoader';
import { getProcess } from '../../transactions/transaction';
import {
  processCheckoutWithPayment,
  processCheckoutWithWalletPayment,
} from './CheckoutPageTransactionHelpers';

jest.mock('./CheckoutPageSessionHelpers', () => ({
  storeData: jest.fn(),
}));

const { UUID } = sdkTypes;

const purchaseProcess = getProcess('default-purchase');
const offerPurchaseProcess = getProcess('offer-purchase');

const listing = {
  id: new UUID('listing-1'),
  type: 'listing',
  attributes: { publicData: { transactionProcessAlias: 'default-purchase/release-1' } },
};

const clientSecret = 'pi_1_secret_x';
const initiatedOrder = {
  id: new UUID('tx-1'),
  type: 'transaction',
  attributes: {
    lastTransition: 'transition/request-payment',
    protectedData: {
      stripePaymentIntents: { default: { stripePaymentIntentClientSecret: clientSecret } },
    },
  },
};
const confirmedOrder = {
  ...initiatedOrder,
  attributes: { ...initiatedOrder.attributes, lastTransition: 'transition/confirm-payment' },
};

const createEv = () => ({ complete: jest.fn(), paymentMethod: { id: 'pm_wallet' } });

const createParams = (overrides = {}) => ({
  ev: createEv(),
  pageData: { listing, orderData: { quantity: 1 }, transaction: null },
  process: purchaseProcess,
  stripe: { id: 'stripe-instance' },
  paymentIntent: null,
  hasPaymentIntentUserActionsDone: false,
  onInitiateOrder: jest.fn(() => Promise.resolve(initiatedOrder)),
  onConfirmCardPayment: jest.fn(() =>
    Promise.resolve({
      transactionId: initiatedOrder.id,
      paymentIntent: { status: 'requires_capture' },
    })
  ),
  onConfirmPayment: jest.fn(() => Promise.resolve(confirmedOrder)),
  setPageData: jest.fn(),
  sessionStorageKey: 'CheckoutPage',
  ...overrides,
});

const orderParams = { listingId: listing.id, quantity: 1, protectedData: {} };

describe('processCheckoutWithWalletPayment', () => {
  it('requests payment, confirms with the wallet payment method and completes the sheet', async () => {
    const params = createParams();

    const result = await processCheckoutWithWalletPayment(orderParams, params);

    expect(result).toEqual({ orderId: confirmedOrder.id, paymentMethodSaved: true });
    expect(params.onInitiateOrder).toHaveBeenCalledWith(
      orderParams,
      'default-purchase/release-1',
      null,
      purchaseProcess.transitions.REQUEST_PAYMENT,
      purchaseProcess.isPrivileged(purchaseProcess.transitions.REQUEST_PAYMENT)
    );
    expect(params.onConfirmCardPayment).toHaveBeenCalledTimes(1);
    expect(params.onConfirmCardPayment).toHaveBeenCalledWith({
      stripe: params.stripe,
      stripePaymentIntentClientSecret: clientSecret,
      orderId: initiatedOrder.id,
      paymentParams: { payment_method: 'pm_wallet' },
      confirmOptions: { handleActions: false },
    });
    expect(params.ev.complete).toHaveBeenCalledTimes(1);
    expect(params.ev.complete).toHaveBeenCalledWith('success');
    expect(params.onConfirmPayment).toHaveBeenCalledWith(
      initiatedOrder.id,
      purchaseProcess.transitions.CONFIRM_PAYMENT,
      {}
    );
    // The order is stored after both Marketplace API calls.
    expect(params.setPageData).toHaveBeenLastCalledWith(
      expect.objectContaining({ transaction: confirmedOrder })
    );
  });

  it('fails the sheet and rejects when Stripe rejects the payment', async () => {
    const stripeError = { code: 'card_declined', type: 'card_error', message: 'Declined' };
    const params = createParams({
      onConfirmCardPayment: jest.fn(() => Promise.reject(stripeError)),
    });

    await expect(processCheckoutWithWalletPayment(orderParams, params)).rejects.toBe(stripeError);
    expect(params.ev.complete).toHaveBeenCalledTimes(1);
    expect(params.ev.complete).toHaveBeenCalledWith('fail');
    expect(params.onConfirmPayment).not.toHaveBeenCalled();
  });

  it('fails the sheet when the order cannot be initiated', async () => {
    const apiError = new Error('Listing is out of stock');
    const params = createParams({ onInitiateOrder: jest.fn(() => Promise.reject(apiError)) });

    await expect(processCheckoutWithWalletPayment(orderParams, params)).rejects.toBe(apiError);
    expect(params.ev.complete).toHaveBeenCalledWith('fail');
    expect(params.onConfirmCardPayment).not.toHaveBeenCalled();
  });

  it('confirms a second time for 3-D Secure after closing the sheet', async () => {
    const onConfirmCardPayment = jest
      .fn()
      .mockResolvedValueOnce({
        transactionId: initiatedOrder.id,
        paymentIntent: { status: 'requires_action' },
      })
      .mockResolvedValueOnce({
        transactionId: initiatedOrder.id,
        paymentIntent: { status: 'requires_capture' },
      });
    const params = createParams({ onConfirmCardPayment });

    await processCheckoutWithWalletPayment(orderParams, params);

    expect(onConfirmCardPayment).toHaveBeenCalledTimes(2);
    // No payment method or options: Stripe.js handles the required action.
    expect(onConfirmCardPayment.mock.calls[1][0]).toEqual({
      stripe: params.stripe,
      stripePaymentIntentClientSecret: clientSecret,
      orderId: initiatedOrder.id,
    });
    expect(params.ev.complete).toHaveBeenCalledTimes(1);
    expect(params.ev.complete).toHaveBeenCalledWith('success');
    expect(params.onConfirmPayment).toHaveBeenCalled();
  });

  it('does not fail the already-closed sheet when 3-D Secure fails', async () => {
    const authError = { code: 'payment_intent_authentication_failure', type: 'card_error' };
    const onConfirmCardPayment = jest
      .fn()
      .mockResolvedValueOnce({
        transactionId: initiatedOrder.id,
        paymentIntent: { status: 'requires_action' },
      })
      .mockRejectedValueOnce(authError);
    const params = createParams({ onConfirmCardPayment });

    await expect(processCheckoutWithWalletPayment(orderParams, params)).rejects.toBe(authError);
    expect(params.ev.complete).toHaveBeenCalledTimes(1);
    expect(params.ev.complete).toHaveBeenCalledWith('success');
    expect(params.onConfirmPayment).not.toHaveBeenCalled();
  });

  it('skips confirming when the PaymentIntent user actions are already done', async () => {
    const paymentIntent = { status: 'requires_capture' };
    const params = createParams({
      pageData: { listing, orderData: { quantity: 1 }, transaction: initiatedOrder },
      paymentIntent,
      hasPaymentIntentUserActionsDone: true,
    });

    await processCheckoutWithWalletPayment(orderParams, params);

    // The order already has a PaymentIntent, so it's not initiated again.
    expect(params.onInitiateOrder).not.toHaveBeenCalled();
    expect(params.onConfirmCardPayment).not.toHaveBeenCalled();
    expect(params.ev.complete).toHaveBeenCalledWith('success');
    expect(params.onConfirmPayment).toHaveBeenCalledWith(
      initiatedOrder.id,
      purchaseProcess.transitions.CONFIRM_PAYMENT,
      {}
    );
  });

  it('pays an agreed price offer with request-payment-after-offer', async () => {
    const offerTx = {
      id: new UUID('offer-tx-1'),
      type: 'transaction',
      attributes: {
        processName: 'offer-purchase',
        state: `state/${offerPurchaseProcess.states.OFFER_AGREED}`,
        lastTransition: offerPurchaseProcess.transitions.SELLER_ACCEPT_OFFER,
        protectedData: {},
      },
    };
    const params = createParams({
      pageData: { listing, orderData: { quantity: 1 }, transaction: offerTx },
      process: offerPurchaseProcess,
    });

    await processCheckoutWithWalletPayment(orderParams, params);

    expect(params.onInitiateOrder).toHaveBeenCalledWith(
      orderParams,
      'default-purchase/release-1',
      offerTx.id,
      offerPurchaseProcess.transitions.REQUEST_PAYMENT_AFTER_OFFER,
      offerPurchaseProcess.isPrivileged(
        offerPurchaseProcess.transitions.REQUEST_PAYMENT_AFTER_OFFER
      )
    );
    expect(params.ev.complete).toHaveBeenCalledWith('success');
  });
});

describe('processCheckoutWithPayment (card, after sharing steps with the wallet flow)', () => {
  it('still requests payment, confirms the card and confirms payment', async () => {
    const card = { id: 'card-element' };
    const params = createParams({
      card,
      billingDetails: { name: 'Buyer' },
      isPaymentFlowUseSavedCard: false,
      isPaymentFlowPayAndSaveCard: false,
    });

    const result = await processCheckoutWithPayment(orderParams, params);

    expect(result).toEqual({ orderId: confirmedOrder.id, paymentMethodSaved: true });
    expect(params.onConfirmCardPayment).toHaveBeenCalledWith({
      stripePaymentIntentClientSecret: clientSecret,
      orderId: initiatedOrder.id,
      stripe: params.stripe,
      card,
      paymentParams: { payment_method: { billing_details: { name: 'Buyer' }, card } },
    });
    expect(params.onConfirmPayment).toHaveBeenCalled();
  });

  it('saves the card from the created PaymentIntent when asked', async () => {
    const onSavePaymentMethod = jest.fn(() => Promise.resolve({}));
    const params = createParams({
      card: {},
      billingDetails: {},
      isPaymentFlowPayAndSaveCard: true,
      onSavePaymentMethod,
      stripeCustomer: { id: 'customer' },
      onConfirmCardPayment: jest.fn(() =>
        Promise.resolve({
          transactionId: initiatedOrder.id,
          paymentIntent: { status: 'requires_capture', payment_method: 'pm_card' },
        })
      ),
    });

    const result = await processCheckoutWithPayment(orderParams, params);

    expect(onSavePaymentMethod).toHaveBeenCalledWith(expect.anything(), 'pm_card');
    expect(result.paymentMethodSaved).toBe(true);
  });
});
