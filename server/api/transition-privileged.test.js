const { types } = require('sharetribe-flex-sdk');

const { Money, UUID } = types;

const mockTransactionShow = jest.fn();
const mockTransition = jest.fn();
const mockHandleError = jest.fn();

jest.mock('../api-util/sdk', () => ({
  createCookieTokenStore: () => ({}),
  getSdk: () => ({ transactions: { show: mockTransactionShow } }),
  getTrustedSdk: () =>
    Promise.resolve({
      transactions: { transition: mockTransition, transitionSpeculative: mockTransition },
    }),
  fetchCommission: () =>
    Promise.resolve({
      data: {
        data: [
          {
            type: 'jsonAsset',
            attributes: { data: { providerCommission: { percentage: 10 } } },
          },
        ],
      },
    }),
  handleError: (res, e) => {
    mockHandleError(e);
    res.end();
  },
  serialize: data => data,
}));

const transitionPrivileged = require('./transition-privileged');

const offerPurchaseTransaction = () => {
  const listing = {
    id: new UUID('listing-uuid'),
    type: 'listing',
    attributes: {
      state: 'published',
      price: new Money(10000, 'EUR'),
      publicData: { unitType: 'item', shippingPriceInSubunitsOneItem: 500 },
    },
    relationships: { currentStock: { data: { id: new UUID('stock-uuid'), type: 'stock' } } },
  };
  const stock = { id: new UUID('stock-uuid'), type: 'stock', attributes: { quantity: 1 } };
  const transaction = {
    id: new UUID('tx-uuid'),
    type: 'transaction',
    attributes: {
      processName: 'offer-purchase',
      payinTotal: new Money(7000, 'EUR'),
      metadata: {
        offers: [
          { offerInSubunits: 7000, by: 'customer', transition: 'transition/buyer-make-offer' },
        ],
      },
      transitions: [
        { transition: 'transition/buyer-make-offer', by: 'customer', createdAt: new Date() },
        { transition: 'transition/seller-accept-offer', by: 'provider', createdAt: new Date() },
      ],
    },
    relationships: { listing: { data: { id: listing.id, type: 'listing' } } },
  };
  return { data: { data: transaction, included: [listing, stock] } };
};

const callEndpoint = body =>
  new Promise(resolve => {
    const res = {
      status: () => res,
      set: () => res,
      send: () => res,
      json: () => res,
      end: () => resolve(),
    };
    transitionPrivileged({ body }, res);
  });

describe('transition-privileged: offer-purchase', () => {
  beforeEach(() => {
    mockTransactionShow.mockReset();
    mockTransition.mockReset();
    mockHandleError.mockReset();
    mockTransactionShow.mockResolvedValue(offerPurchaseTransaction());
    mockTransition.mockResolvedValue({ status: 200, statusText: 'OK', data: {} });
  });

  it('pays the agreed amount from metadata even if the request sends another price', async () => {
    await callEndpoint({
      isSpeculative: false,
      orderData: { deliveryMethod: 'pickup', offerInSubunits: 100 },
      bodyParams: {
        id: new UUID('tx-uuid'),
        transition: 'transition/request-payment-after-offer',
        params: {
          listingId: new UUID('listing-uuid'),
          stockReservationQuantity: 3,
          protectedData: { deliveryMethod: 'pickup' },
          lineItems: [
            {
              code: 'line-item/item',
              unitPrice: new Money(100, 'EUR'),
              quantity: 1,
              includeFor: ['customer', 'provider'],
            },
          ],
          metadata: { offers: [] },
        },
      },
      queryParams: {},
    });

    expect(mockHandleError).not.toHaveBeenCalled();
    expect(mockTransition).toHaveBeenCalledTimes(1);
    const [body] = mockTransition.mock.calls[0];
    const itemLine = body.params.lineItems.find(li => li.code === 'line-item/item');
    expect(itemLine.unitPrice).toEqual(new Money(7000, 'EUR'));
    expect(itemLine.quantity).toEqual(1);
    expect(body.params.stockReservationQuantity).toEqual(1);
    expect(body.params.metadata).toBeUndefined();
    expect(body.params.listingId).toBeUndefined();
    expect(body.params.protectedData).toEqual({ deliveryMethod: 'pickup' });
  });

  it('rejects a seller counter offer below the buyer offer without calling the API', async () => {
    const tx = offerPurchaseTransaction();
    tx.data.data.attributes.transitions = tx.data.data.attributes.transitions.slice(0, 1);
    mockTransactionShow.mockResolvedValue(tx);

    await callEndpoint({
      isSpeculative: false,
      orderData: { offerInSubunits: 6000, currency: 'EUR', actor: 'provider' },
      bodyParams: {
        id: new UUID('tx-uuid'),
        transition: 'transition/seller-counter-offer',
        params: {},
      },
      queryParams: {},
    });

    expect(mockTransition).not.toHaveBeenCalled();
    expect(mockHandleError).toHaveBeenCalledTimes(1);
    expect(mockHandleError.mock.calls[0][0].status).toEqual(400);
  });

  it('accepting sends no line items or metadata', async () => {
    const tx = offerPurchaseTransaction();
    tx.data.data.attributes.transitions = tx.data.data.attributes.transitions.slice(0, 1);
    mockTransactionShow.mockResolvedValue(tx);

    await callEndpoint({
      isSpeculative: false,
      orderData: {},
      bodyParams: {
        id: new UUID('tx-uuid'),
        transition: 'transition/seller-accept-offer',
        params: { lineItems: [], metadata: { offers: [] } },
      },
      queryParams: {},
    });

    expect(mockHandleError).not.toHaveBeenCalled();
    const [body] = mockTransition.mock.calls[0];
    expect(body.params).toEqual({});
  });
});
