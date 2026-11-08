import React from 'react';
import '@testing-library/jest-dom';

import { types as sdkTypes } from '../../../util/sdkLoader';
import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';

import StripePaymentForm, { getFieldsBlockingWalletPayment } from './StripePaymentForm';

const { Money } = sdkTypes;
const { screen, act, waitFor, userEvent } = testingLibrary;
const noop = () => null;

const ORP_PAY_WITH_CARD = 'StripePaymentForm.orPayWithCard';
const FILL_DETAILS_FIRST = 'StripePaymentForm.walletFillDetailsFirst';

// A fake Stripe.js with a controllable paymentRequest().canMakePayment() result.
const mockStripe = ({ canMakePaymentResult }) => {
  const handlers = {};
  const paymentRequest = {
    canMakePayment: jest.fn(() => Promise.resolve(canMakePaymentResult)),
    on: jest.fn((event, fn) => {
      handlers[`pr:${event}`] = fn;
    }),
    off: jest.fn(),
    update: jest.fn(),
  };
  const walletButton = {
    mount: jest.fn(),
    unmount: jest.fn(),
    on: jest.fn((event, fn) => {
      handlers[`button:${event}`] = fn;
    }),
    off: jest.fn(),
  };
  const cardElement = {
    mount: noop,
    unmount: noop,
    update: noop,
    addEventListener: noop,
    removeEventListener: noop,
  };
  const elementsOptions = [];
  const stripe = {
    elements: jest.fn(options => {
      elementsOptions.push(options);
      return {
        create: jest.fn(type => (type === 'paymentRequestButton' ? walletButton : cardElement)),
      };
    }),
    paymentRequest: jest.fn(() => paymentRequest),
  };
  window.Stripe = jest.fn(() => stripe);
  return { stripe, paymentRequest, walletButton, handlers, elementsOptions };
};

const renderForm = (props = {}) =>
  render(
    <StripePaymentForm
      formId="TestStripePaymentForm"
      onSubmit={noop}
      onStripeInitialized={noop}
      stripePublishableKey="pk_test_x"
      locale="en-US"
      marketplaceName="Elogade"
      processName="default-purchase"
      loadingData={false}
      inProgress={false}
      showInitialMessageInput
      providerDisplayName="Seller"
      initialValues={{}}
      walletPaymentsEnabled
      payinTotal={new Money(1299, 'EUR')}
      stripeCountry="LT"
      onWalletPaymentMethod={jest.fn()}
      {...props}
    />
  );

describe('StripePaymentForm wallet payments (Apple Pay / Google Pay)', () => {
  afterEach(() => {
    delete window.Stripe;
  });

  it('shows no wallet button when the flag is off', async () => {
    const { stripe } = mockStripe({ canMakePaymentResult: { applePay: true } });
    renderForm({ walletPaymentsEnabled: false });

    await act(async () => {});
    expect(stripe.paymentRequest).not.toHaveBeenCalled();
    expect(screen.queryByText(ORP_PAY_WITH_CARD)).not.toBeInTheDocument();
  });

  it('shows no wallet button when canMakePayment resolves null', async () => {
    const { stripe, paymentRequest, walletButton } = mockStripe({ canMakePaymentResult: null });
    renderForm();

    await waitFor(() => expect(paymentRequest.canMakePayment).toHaveBeenCalled());
    await act(async () => {});
    expect(stripe.paymentRequest).toHaveBeenCalledTimes(1);
    expect(walletButton.mount).not.toHaveBeenCalled();
    expect(screen.queryByText(ORP_PAY_WITH_CARD)).not.toBeInTheDocument();
    // The card form is unchanged.
    expect(screen.getByText('StripePaymentForm.paymentHeading')).toBeInTheDocument();
  });

  it('mounts the button with the order total, country and page locale', async () => {
    const { stripe, walletButton, elementsOptions } = mockStripe({
      canMakePaymentResult: { googlePay: true },
    });
    renderForm();

    expect(await screen.findByText(ORP_PAY_WITH_CARD)).toBeInTheDocument();
    expect(stripe.paymentRequest).toHaveBeenCalledWith({
      country: 'LT',
      currency: 'eur',
      total: { label: 'Elogade', amount: 1299 },
      requestPayerName: true,
      requestPayerEmail: true,
      disableWallets: ['link', 'browserCard'],
    });
    expect(walletButton.mount).toHaveBeenCalledWith(
      document.getElementById('TestStripePaymentForm-wallet')
    );
    expect(elementsOptions.some(o => o?.locale === 'en')).toBe(true);
  });

  it('updates the wallet total when payinTotal changes', async () => {
    const { paymentRequest } = mockStripe({ canMakePaymentResult: { googlePay: true } });
    const { rerender } = renderForm();
    await screen.findByText(ORP_PAY_WITH_CARD);

    rerender(
      <StripePaymentForm
        formId="TestStripePaymentForm"
        onSubmit={noop}
        onStripeInitialized={noop}
        stripePublishableKey="pk_test_x"
        locale="en-US"
        marketplaceName="Elogade"
        processName="default-purchase"
        loadingData={false}
        initialValues={{}}
        walletPaymentsEnabled
        payinTotal={new Money(2500, 'EUR')}
        stripeCountry="LT"
      />
    );
    expect(paymentRequest.update).toHaveBeenCalledWith({
      total: { label: 'Elogade', amount: 2500 },
    });
  });

  it('blocks the wallet sheet until the shipping address is filled, ignoring billing fields', async () => {
    const { handlers } = mockStripe({ canMakePaymentResult: { applePay: true } });
    renderForm({ askShippingDetails: true });
    await screen.findByText(ORP_PAY_WITH_CARD);

    // Shipping address empty → the sheet stays closed and the errors are shown.
    const blockedEvent = { preventDefault: jest.fn() };
    act(() => handlers['button:click'](blockedEvent));
    expect(blockedEvent.preventDefault).toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(FILL_DETAILS_FIRST);
    expect(screen.getByText('ShippingDetails.addressLine1Required')).toBeInTheDocument();

    // Fill in the shipping address. Billing name and address stay empty.
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('ShippingDetails.recipientNameLabel'), 'Buyer Name');
    await user.type(screen.getByLabelText('ShippingDetails.addressLine1Label'), 'Gedimino pr. 1');
    await user.type(screen.getByLabelText('ShippingDetails.postalCodeLabel'), 'LT-01103');
    await user.type(screen.getByLabelText('ShippingDetails.cityLabel'), 'Vilnius');
    await user.selectOptions(screen.getByLabelText('ShippingDetails.countryLabel'), 'LT');

    expect(screen.queryByText(FILL_DETAILS_FIRST)).not.toBeInTheDocument();
    const allowedEvent = { preventDefault: jest.fn() };
    act(() => handlers['button:click'](allowedEvent));
    expect(allowedEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('blocks the wallet sheet while a card payment is in progress', async () => {
    const { handlers } = mockStripe({ canMakePaymentResult: { applePay: true } });
    renderForm({ inProgress: true });
    await screen.findByText(ORP_PAY_WITH_CARD);

    const event = { preventDefault: jest.fn() };
    act(() => handlers['button:click'](event));
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('passes the wallet payment method and form values on, and cleans up on unmount', async () => {
    const onWalletPaymentMethod = jest.fn();
    const { stripe, handlers, paymentRequest, walletButton } = mockStripe({
      canMakePaymentResult: { applePay: true },
    });
    const { unmount } = renderForm({ onWalletPaymentMethod });
    await screen.findByText(ORP_PAY_WITH_CARD);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/StripePaymentForm.messageLabel/), 'Hello');
    const ev = { complete: jest.fn(), paymentMethod: { id: 'pm_1' } };
    handlers['pr:paymentmethod'](ev);
    expect(onWalletPaymentMethod).toHaveBeenCalledWith(
      ev,
      stripe,
      expect.objectContaining({ initialMessage: 'Hello' })
    );

    unmount();
    expect(walletButton.unmount).toHaveBeenCalled();
    expect(paymentRequest.off).toHaveBeenCalledWith('paymentmethod', handlers['pr:paymentmethod']);
  });
});

describe('getFieldsBlockingWalletPayment', () => {
  it('ignores the billing fields the wallet supplies', () => {
    expect(
      getFieldsBlockingWalletPayment({
        name: 'Required',
        addressLine1: 'Required',
        postal: 'Required',
        city: 'Required',
        country: 'Required',
        recipientAddressLine1: 'Required',
        prot_serialNumber: 'Required',
        recipientCity: undefined,
      })
    ).toEqual(['recipientAddressLine1', 'prot_serialNumber']);
    expect(getFieldsBlockingWalletPayment(undefined)).toEqual([]);
  });
});
