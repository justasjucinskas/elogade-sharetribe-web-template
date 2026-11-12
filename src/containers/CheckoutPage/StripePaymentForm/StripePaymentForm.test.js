import React from 'react';
import '@testing-library/jest-dom';

import { types as sdkTypes } from '../../../util/sdkLoader';
import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';

import StripePaymentForm, {
  getFieldsBlockingWalletPayment,
  getShippingFormValuesFromWallet,
} from './StripePaymentForm';

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

  it('on shipped orders, asks the wallet for the address and opens the sheet with the form empty', async () => {
    const { stripe, handlers } = mockStripe({ canMakePaymentResult: { googlePay: true } });
    renderForm({ askShippingDetails: true, shippingFee: new Money(500, 'EUR') });
    await screen.findByText(ORP_PAY_WITH_CARD);

    expect(stripe.paymentRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requestShipping: true,
        requestPayerPhone: true,
        shippingOptions: [
          {
            id: 'delivery',
            label: 'StripePaymentForm.walletShippingOptionLabel',
            detail: '',
            amount: 500,
          },
        ],
      })
    );

    // The wallet button comes before the shipping address form.
    const button = document.getElementById('TestStripePaymentForm-wallet');
    const addressField = screen.getByLabelText('ShippingDetails.addressLine1Label');
    expect(
      button.compareDocumentPosition(addressField) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    // Shipping and billing address empty → the sheet still opens.
    const event = { preventDefault: jest.fn() };
    act(() => handlers['button:click'](event));
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Any address the buyer picks in the sheet is accepted.
    const addressChange = { updateWith: jest.fn(), shippingAddress: { country: 'DE' } };
    handlers['pr:shippingaddresschange'](addressChange);
    expect(addressChange.updateWith).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success' })
    );
  });

  it('does not ask the wallet for an address on pickup orders', async () => {
    const { stripe, handlers } = mockStripe({ canMakePaymentResult: { googlePay: true } });
    renderForm({ askShippingDetails: false, showPickUpLocation: true });
    await screen.findByText(ORP_PAY_WITH_CARD);

    const options = stripe.paymentRequest.mock.calls[0][0];
    expect(options.requestShipping).toBeUndefined();
    expect(options.shippingOptions).toBeUndefined();
    expect(handlers['pr:shippingaddresschange']).toBeUndefined();
  });

  it('blocks the wallet sheet until required transaction fields are filled', async () => {
    const { handlers } = mockStripe({ canMakePaymentResult: { applePay: true } });
    renderForm({
      showTransactionFields: true,
      transactionFieldConfigs: [
        {
          key: 'serialNumber',
          scope: 'protected',
          schemaType: 'text',
          showTo: 'customer',
          label: 'Serial number',
          saveConfig: { isRequired: true, requiredMessage: 'Serial number is required' },
        },
      ],
    });
    await screen.findByText(ORP_PAY_WITH_CARD);

    const blockedEvent = { preventDefault: jest.fn() };
    act(() => handlers['button:click'](blockedEvent));
    expect(blockedEvent.preventDefault).toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(FILL_DETAILS_FIRST);
    expect(screen.getByText('Serial number is required')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Serial number/), 'SN-1');
    expect(screen.queryByText(FILL_DETAILS_FIRST)).not.toBeInTheDocument();
    const allowedEvent = { preventDefault: jest.fn() };
    act(() => handlers['button:click'](allowedEvent));
    expect(allowedEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('puts the wallet shipping address on the order, over the page form', async () => {
    const onWalletPaymentMethod = jest.fn();
    const { stripe, handlers } = mockStripe({ canMakePaymentResult: { googlePay: true } });
    renderForm({ askShippingDetails: true, onWalletPaymentMethod });
    await screen.findByText(ORP_PAY_WITH_CARD);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('ShippingDetails.addressLine1Label'), 'Form street 9');
    await user.type(screen.getByLabelText(/StripePaymentForm.messageLabel/), 'Hello');

    const ev = {
      complete: jest.fn(),
      paymentMethod: { id: 'pm_1' },
      payerName: 'Payer Name',
      payerPhone: '+37060000000',
      shippingAddress: {
        recipient: 'Wallet Recipient',
        addressLine: ['Gedimino pr. 1', 'Apt 2'],
        postalCode: 'LT-01103',
        city: 'Vilnius',
        region: '',
        country: 'lt',
        phone: '',
      },
    };
    handlers['pr:paymentmethod'](ev);
    expect(ev.complete).not.toHaveBeenCalled();
    expect(onWalletPaymentMethod).toHaveBeenCalledWith(
      ev,
      stripe,
      expect.objectContaining({
        initialMessage: 'Hello',
        recipientName: 'Wallet Recipient',
        recipientPhoneNumber: '+37060000000',
        recipientAddressLine1: 'Gedimino pr. 1',
        recipientAddressLine2: 'Apt 2',
        recipientPostal: 'LT-01103',
        recipientCity: 'Vilnius',
        recipientCountry: 'LT',
      })
    );
  });

  it('fails the sheet when the wallet address is incomplete on a shipped order', async () => {
    const onWalletPaymentMethod = jest.fn();
    const { handlers } = mockStripe({ canMakePaymentResult: { googlePay: true } });
    renderForm({ askShippingDetails: true, onWalletPaymentMethod });
    await screen.findByText(ORP_PAY_WITH_CARD);

    const ev = {
      complete: jest.fn(),
      paymentMethod: { id: 'pm_1' },
      payerName: 'Payer Name',
      shippingAddress: { addressLine: ['Gedimino pr. 1'], city: 'Vilnius', country: 'LT' },
    };
    handlers['pr:paymentmethod'](ev);
    expect(ev.complete).toHaveBeenCalledWith('invalid_shipping_address');
    expect(onWalletPaymentMethod).not.toHaveBeenCalled();
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
  it('ignores the billing and shipping fields the wallet supplies', () => {
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
    ).toEqual(['prot_serialNumber']);
    expect(getFieldsBlockingWalletPayment(undefined)).toEqual([]);
  });
});

describe('getShippingFormValuesFromWallet', () => {
  it('falls back to the payer name and phone, and joins extra address lines', () => {
    expect(
      getShippingFormValuesFromWallet({
        payerName: ' Payer Name ',
        payerPhone: '+48500000000',
        shippingAddress: {
          recipient: '',
          addressLine: ['ul. Marszałkowska 1', '', 'm. 2', 'klatka B'],
          postalCode: '00-001',
          city: 'Warszawa',
          region: 'Mazowieckie',
          country: 'PL',
        },
      })
    ).toEqual({
      recipientName: 'Payer Name',
      recipientPhoneNumber: '+48500000000',
      recipientAddressLine1: 'ul. Marszałkowska 1',
      recipientAddressLine2: 'm. 2, klatka B',
      recipientPostal: '00-001',
      recipientCity: 'Warszawa',
      recipientState: 'Mazowieckie',
      recipientCountry: 'PL',
    });
  });

  it('returns null without an address or with a required part missing', () => {
    expect(getShippingFormValuesFromWallet({ payerName: 'A' })).toBeNull();
    const full = {
      recipient: 'A',
      addressLine: ['Street 1'],
      postalCode: '01103',
      city: 'Vilnius',
      country: 'LT',
    };
    expect(getShippingFormValuesFromWallet({ shippingAddress: full })).not.toBeNull();
    ['recipient', 'addressLine', 'postalCode', 'city', 'country'].forEach(key => {
      expect(
        getShippingFormValuesFromWallet({ shippingAddress: { ...full, [key]: undefined } })
      ).toBeNull();
    });
  });
});
