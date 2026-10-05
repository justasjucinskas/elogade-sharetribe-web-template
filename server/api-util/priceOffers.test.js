const { types } = require('sharetribe-flex-sdk');
const { getInitiateParams, getTransitionParams, getStockQuantity } = require('./priceOffers');

const { Money, UUID } = types;

const SELLER_ID = 'seller-uuid';
const BUYER_ID = 'buyer-uuid';
const STOCK_ID = 'stock-uuid';

const listing = ({ priceAmount = 10000, state = 'published', publicData = {} } = {}) => ({
  id: new UUID('listing-uuid'),
  type: 'listing',
  attributes: {
    state,
    price: new Money(priceAmount, 'EUR'),
    publicData: {
      unitType: 'item',
      shippingPriceInSubunitsOneItem: 500,
      shippingPriceInSubunitsAdditionalItems: 0,
      ...publicData,
    },
  },
  relationships: {
    author: { data: { id: new UUID(SELLER_ID), type: 'user' } },
    currentStock: { data: { id: new UUID(STOCK_ID), type: 'stock' } },
  },
});

const commissions = {
  providerCommission: { percentage: 10 },
  customerCommission: { percentage: 5 },
};

const buyer = { id: new UUID(BUYER_ID), type: 'currentUser' };

const initiate = ({ offerInSubunits, currency = 'EUR', ...rest }) =>
  getInitiateParams({
    listing: listing(),
    stockQuantity: 1,
    currentUser: buyer,
    orderData: { offerInSubunits, currency },
    bodyParams: {
      processAlias: 'offer-purchase/release-1',
      transition: 'transition/buyer-make-offer',
      params: {},
    },
    commissions,
    ...rest,
  });

const itemLineItem = lineItems => lineItems.find(li => li.code === 'line-item/item');

// Build a transaction whose offers (metadata) and history (transitions) match each other.
const transactionWithOffers = offerSteps => {
  const offers = offerSteps.map(([transition, by, offerInSubunits]) => ({
    transition,
    by,
    offerInSubunits,
  }));
  const transitions = offerSteps.map(([transition, by]) => ({
    transition,
    by,
    createdAt: new Date(),
  }));
  return {
    attributes: { processName: 'offer-purchase', metadata: { offers }, transitions },
  };
};

const BUYER_MAKE_OFFER = ['transition/buyer-make-offer', 'customer'];
const SELLER_COUNTER = ['transition/seller-counter-offer', 'provider'];
const BUYER_COUNTER = ['transition/buyer-counter-offer', 'customer'];

const transition = ({ transaction, transitionName, orderData = {}, ...rest }) =>
  getTransitionParams({
    transaction,
    listing: listing(),
    stockQuantity: 1,
    orderData,
    transitionName,
    commissions,
    ...rest,
  });

const expectErrorCode = (fn, code) => {
  let error = null;
  try {
    fn();
  } catch (e) {
    error = e;
  }
  expect(error).not.toBeNull();
  expect(error.data.errors[0].code).toEqual(code);
  return error;
};

describe('priceOffers: buyer-make-offer (initiate)', () => {
  it('accepts an offer of exactly 50 % of the listing price', () => {
    const { lineItems, metadata } = initiate({ offerInSubunits: 5000 });
    expect(itemLineItem(lineItems).unitPrice).toEqual(new Money(5000, 'EUR'));
    expect(itemLineItem(lineItems).quantity).toEqual(1);
    expect(metadata).toEqual({
      offers: [
        { offerInSubunits: 5000, by: 'customer', transition: 'transition/buyer-make-offer' },
      ],
    });
  });

  it('adds the commission as for "Buy" and no shipping before checkout', () => {
    const { lineItems } = initiate({ offerInSubunits: 7000 });
    expect(lineItems.map(li => li.code)).toEqual([
      'line-item/item',
      'line-item/provider-commission',
      'line-item/customer-commission',
    ]);
  });

  it('rejects an offer below 50 % of the listing price', () => {
    const error = expectErrorCode(() => initiate({ offerInSubunits: 4999 }), 'price-offer-invalid');
    expect(error.status).toEqual(400);
  });

  it('rounds the minimum up (99.99 € → 50.00 €)', () => {
    const run = offerInSubunits =>
      getInitiateParams({
        listing: listing({ priceAmount: 9999 }),
        stockQuantity: 1,
        currentUser: buyer,
        orderData: { offerInSubunits, currency: 'EUR' },
        bodyParams: {
          processAlias: 'offer-purchase/release-1',
          transition: 'transition/buyer-make-offer',
        },
        commissions,
      });
    expectErrorCode(() => run(4999), 'price-offer-invalid');
    expect(itemLineItem(run(5000).lineItems).unitPrice).toEqual(new Money(5000, 'EUR'));
  });

  it('rejects an offer equal to or above the listing price', () => {
    expectErrorCode(() => initiate({ offerInSubunits: 10000 }), 'price-offer-invalid');
    expectErrorCode(() => initiate({ offerInSubunits: 12000 }), 'price-offer-invalid');
  });

  it('rejects a non-integer, zero or missing amount', () => {
    expectErrorCode(() => initiate({ offerInSubunits: 5000.5 }), 'price-offer-invalid');
    expectErrorCode(() => initiate({ offerInSubunits: 0 }), 'price-offer-invalid');
    expectErrorCode(() => initiate({ offerInSubunits: undefined }), 'price-offer-invalid');
  });

  it('rejects an offer in another currency', () => {
    expectErrorCode(
      () => initiate({ offerInSubunits: 6000, currency: 'USD' }),
      'price-offer-invalid'
    );
  });

  it('rejects an offer on your own listing', () => {
    const error = expectErrorCode(
      () =>
        initiate({
          offerInSubunits: 6000,
          currentUser: { id: new UUID(SELLER_ID), type: 'currentUser' },
        }),
      'price-offer-own-listing'
    );
    expect(error.status).toEqual(403);
  });

  it('rejects an offer on a closed or sold-out listing', () => {
    expectErrorCode(
      () => initiate({ offerInSubunits: 6000, listing: listing({ state: 'closed' }) }),
      'transaction-listing-insufficient-stock'
    );
    expectErrorCode(
      () => initiate({ offerInSubunits: 6000, stockQuantity: 0 }),
      'transaction-listing-insufficient-stock'
    );
  });

  it('rejects an offer on a listing that is not a product', () => {
    expectErrorCode(
      () =>
        initiate({ offerInSubunits: 6000, listing: listing({ publicData: { unitType: 'day' } }) }),
      'price-offer-invalid'
    );
  });

  it('only initiates offer-purchase with buyer-make-offer', () => {
    expectErrorCode(
      () =>
        initiate({
          offerInSubunits: 6000,
          bodyParams: {
            processAlias: 'default-purchase/release-1',
            transition: 'transition/buyer-make-offer',
          },
        }),
      'price-offer-invalid'
    );
    expectErrorCode(
      () =>
        initiate({
          offerInSubunits: 6000,
          bodyParams: {
            processAlias: 'offer-purchase/release-1',
            transition: 'transition/request-payment',
          },
        }),
      'price-offer-invalid'
    );
  });
});

describe('priceOffers: counter offers', () => {
  it('lets the seller counter above the buyer offer and records it in metadata', () => {
    const transaction = transactionWithOffers([[...BUYER_MAKE_OFFER, 6000]]);
    const params = transition({
      transaction,
      transitionName: 'transition/seller-counter-offer',
      orderData: { offerInSubunits: 8000, currency: 'EUR', actor: 'customer' },
    });
    expect(itemLineItem(params.lineItems).unitPrice).toEqual(new Money(8000, 'EUR'));
    // The actor comes from the transition, not from the request
    expect(params.metadata.offers.at(-1)).toEqual({
      offerInSubunits: 8000,
      by: 'provider',
      transition: 'transition/seller-counter-offer',
    });
    expect(params.metadata.offers).toHaveLength(2);
  });

  it("rejects a seller counter offer that isn't above the buyer's latest offer", () => {
    const transaction = transactionWithOffers([[...BUYER_MAKE_OFFER, 6000]]);
    const counter = offerInSubunits =>
      transition({
        transaction,
        transitionName: 'transition/seller-counter-offer',
        orderData: { offerInSubunits, currency: 'EUR' },
      });
    expectErrorCode(() => counter(6000), 'price-offer-invalid');
    expectErrorCode(() => counter(5500), 'price-offer-invalid');
  });

  it('rejects a seller counter offer at or above the listing price', () => {
    const transaction = transactionWithOffers([[...BUYER_MAKE_OFFER, 6000]]);
    expectErrorCode(
      () =>
        transition({
          transaction,
          transitionName: 'transition/seller-counter-offer',
          orderData: { offerInSubunits: 10000, currency: 'EUR' },
        }),
      'price-offer-invalid'
    );
  });

  it('applies the 50 % minimum to the buyer counter offer', () => {
    const transaction = transactionWithOffers([
      [...BUYER_MAKE_OFFER, 6000],
      [...SELLER_COUNTER, 9000],
    ]);
    const counter = offerInSubunits =>
      transition({
        transaction,
        transitionName: 'transition/buyer-counter-offer',
        orderData: { offerInSubunits, currency: 'EUR' },
      });
    expectErrorCode(() => counter(4000), 'price-offer-invalid');
    expectErrorCode(() => counter(10000), 'price-offer-invalid');
    expect(itemLineItem(counter(7000).lineItems).unitPrice).toEqual(new Money(7000, 'EUR'));
  });

  it("allows the buyer's 3rd offer and rejects the 4th", () => {
    const afterTwoBuyerOffers = transactionWithOffers([
      [...BUYER_MAKE_OFFER, 6000],
      [...SELLER_COUNTER, 9000],
      [...BUYER_COUNTER, 6500],
      [...SELLER_COUNTER, 8500],
    ]);
    const third = transition({
      transaction: afterTwoBuyerOffers,
      transitionName: 'transition/buyer-counter-offer',
      orderData: { offerInSubunits: 7000, currency: 'EUR' },
    });
    expect(third.metadata.offers).toHaveLength(5);

    const afterThreeBuyerOffers = transactionWithOffers([
      [...BUYER_MAKE_OFFER, 6000],
      [...SELLER_COUNTER, 9000],
      [...BUYER_COUNTER, 6500],
      [...SELLER_COUNTER, 8500],
      [...BUYER_COUNTER, 7000],
      [...SELLER_COUNTER, 8000],
    ]);
    const error = expectErrorCode(
      () =>
        transition({
          transaction: afterThreeBuyerOffers,
          transitionName: 'transition/buyer-counter-offer',
          orderData: { offerInSubunits: 7500, currency: 'EUR' },
        }),
      'price-offer-too-many-offers'
    );
    expect(error.status).toEqual(400);
  });

  it('rejects any transition when the offer history does not match the transitions', () => {
    const transaction = transactionWithOffers([[...BUYER_MAKE_OFFER, 6000]]);
    transaction.attributes.metadata.offers[0].by = 'provider';
    expect(() =>
      transition({
        transaction,
        transitionName: 'transition/seller-accept-offer',
      })
    ).toThrow('Past negotiation offers are invalid');
  });
});

describe('priceOffers: accepting and paying', () => {
  it('accepting adds no params but needs the item to be available', () => {
    const transaction = transactionWithOffers([[...BUYER_MAKE_OFFER, 6000]]);
    expect(transition({ transaction, transitionName: 'transition/seller-accept-offer' })).toEqual(
      {}
    );
    expectErrorCode(
      () =>
        transition({
          transaction,
          transitionName: 'transition/seller-accept-offer',
          stockQuantity: 0,
        }),
      'transaction-listing-insufficient-stock'
    );
  });

  it('pay-after-offer uses the agreed amount from metadata, not the request', () => {
    const transaction = transactionWithOffers([
      [...BUYER_MAKE_OFFER, 6000],
      [...SELLER_COUNTER, 8000],
    ]);
    const params = transition({
      transaction,
      transitionName: 'transition/request-payment-after-offer',
      orderData: { offerInSubunits: 100, deliveryMethod: 'shipping' },
    });
    expect(itemLineItem(params.lineItems).unitPrice).toEqual(new Money(8000, 'EUR'));
    expect(itemLineItem(params.lineItems).quantity).toEqual(1);
    expect(params.stockReservationQuantity).toEqual(1);
    // Shipping is added on top of the agreed price, as for "Buy"
    const shipping = params.lineItems.find(li => li.code === 'line-item/shipping-fee');
    expect(shipping.unitPrice).toEqual(new Money(500, 'EUR'));
    expect(params.metadata).toBeUndefined();
  });

  it('pay-after-offer with pickup has no shipping fee', () => {
    const transaction = transactionWithOffers([[...BUYER_MAKE_OFFER, 6000]]);
    const params = transition({
      transaction,
      transitionName: 'transition/request-payment-after-offer',
      orderData: { deliveryMethod: 'pickup' },
    });
    expect(params.lineItems.map(li => li.code)).not.toContain('line-item/shipping-fee');
    expect(itemLineItem(params.lineItems).unitPrice).toEqual(new Money(6000, 'EUR'));
  });

  it('pay-after-offer fails when the item has been sold or the listing closed', () => {
    const transaction = transactionWithOffers([[...BUYER_MAKE_OFFER, 6000]]);
    const pay = extra => () =>
      transition({
        transaction,
        transitionName: 'transition/request-payment-after-offer',
        orderData: { deliveryMethod: 'pickup' },
        ...extra,
      });
    const error = expectErrorCode(
      pay({ stockQuantity: 0 }),
      'transaction-listing-insufficient-stock'
    );
    expect(error.status).toEqual(409);
    expectErrorCode(
      pay({ listing: listing({ state: 'closed' }) }),
      'transaction-listing-insufficient-stock'
    );
  });

  it('rejects privileged transitions that are not part of the offer flow', () => {
    const transaction = transactionWithOffers([[...BUYER_MAKE_OFFER, 6000]]);
    expectErrorCode(
      () => transition({ transaction, transitionName: 'transition/request-payment' }),
      'price-offer-invalid'
    );
  });
});

describe('priceOffers: getStockQuantity', () => {
  it('finds the stock of the listing among included resources', () => {
    const included = [
      { id: new UUID('other'), type: 'stock', attributes: { quantity: 5 } },
      { id: new UUID(STOCK_ID), type: 'stock', attributes: { quantity: 1 } },
    ];
    expect(getStockQuantity(listing(), included)).toEqual(1);
    expect(getStockQuantity(listing(), [])).toEqual(null);
  });
});
