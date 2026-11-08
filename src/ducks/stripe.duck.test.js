import { configureStore } from '@reduxjs/toolkit';
import reducer, { confirmCardPayment } from './stripe.duck';

const createStore = () => configureStore({ reducer: { stripe: reducer } });

const createStripe = (status = 'requires_payment_method') => ({
  retrievePaymentIntent: jest.fn(() => Promise.resolve({ paymentIntent: { status } })),
  confirmCardPayment: jest.fn(() =>
    Promise.resolve({ paymentIntent: { id: 'pi_1', status: 'requires_capture' } })
  ),
});

describe('confirmCardPayment', () => {
  const stripePaymentIntentClientSecret = 'pi_1_secret_x';
  const orderId = { uuid: 'tx-1' };

  it('passes confirmOptions as the third argument', async () => {
    const stripe = createStripe();
    const store = createStore();
    const paymentParams = { payment_method: 'pm_wallet' };
    const confirmOptions = { handleActions: false };

    const result = await store.dispatch(
      confirmCardPayment({
        stripe,
        stripePaymentIntentClientSecret,
        paymentParams,
        confirmOptions,
        orderId,
      })
    );

    expect(stripe.confirmCardPayment).toHaveBeenCalledWith(
      stripePaymentIntentClientSecret,
      paymentParams,
      confirmOptions
    );
    expect(result.transactionId).toEqual(orderId);
    expect(result.paymentIntent.status).toBe('requires_capture');
  });

  it('keeps the old call shape without confirmOptions', async () => {
    const stripe = createStripe();
    const store = createStore();
    const paymentParams = { payment_method: { card: {} } };

    await store.dispatch(
      confirmCardPayment({ stripe, stripePaymentIntentClientSecret, paymentParams, orderId })
    );
    expect(stripe.confirmCardPayment).toHaveBeenCalledWith(
      stripePaymentIntentClientSecret,
      paymentParams
    );

    stripe.confirmCardPayment.mockClear();
    await store.dispatch(confirmCardPayment({ stripe, stripePaymentIntentClientSecret, orderId }));
    expect(stripe.confirmCardPayment).toHaveBeenCalledWith(stripePaymentIntentClientSecret);
  });

  it('skips confirming when the PaymentIntent is already confirmed', async () => {
    const stripe = createStripe('requires_capture');
    const store = createStore();

    await store.dispatch(
      confirmCardPayment({
        stripe,
        stripePaymentIntentClientSecret,
        paymentParams: { payment_method: 'pm_wallet' },
        confirmOptions: { handleActions: false },
        orderId,
      })
    );
    expect(stripe.confirmCardPayment).not.toHaveBeenCalled();
  });
});
