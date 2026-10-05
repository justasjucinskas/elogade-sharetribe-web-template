import Decimal from 'decimal.js';

import { types as sdkTypes } from '../../util/sdkLoader';
import {
  createListing,
  createStock,
  createTransaction,
  createTxTransition,
  createUser,
  fakeIntl,
} from '../../util/testData';
import {
  getProcess,
  TX_TRANSITION_ACTOR_CUSTOMER as CUSTOMER,
  TX_TRANSITION_ACTOR_PROVIDER as PROVIDER,
} from '../../transactions/transaction';

import { getStateData } from './TransactionPage.stateData';

const { Money } = sdkTypes;
const process = getProcess('offer-purchase');
const { transitions } = process;

const offerTransaction = ({ offerSteps, lastTransition, stockQuantity = 1 }) => {
  const tx = createTransaction({
    id: 'tx',
    processName: 'offer-purchase',
    lastTransition,
    customer: createUser('buyer'),
    provider: createUser('seller'),
    listing: createListing(
      'listing',
      { price: new Money(10000, 'EUR') },
      { currentStock: createStock('stock', { quantity: stockQuantity }) }
    ),
    transitions: offerSteps.map(([transition, by]) => createTxTransition({ transition, by })),
    lineItems: [
      {
        code: 'line-item/item',
        includeFor: ['customer', 'provider'],
        quantity: new Decimal(1),
        unitPrice: new Money(7000, 'EUR'),
        lineTotal: new Money(7000, 'EUR'),
        reversal: false,
      },
    ],
  });
  const offers = offerSteps
    .filter(([, , amount]) => amount)
    .map(([transition, by, offerInSubunits]) => ({ transition, by, offerInSubunits }));
  return { ...tx, attributes: { ...tx.attributes, metadata: { offers } } };
};

const stateData = (transaction, transactionRole) =>
  getStateData(
    {
      transaction,
      transactionRole,
      intl: fakeIntl,
      transitionInProgress: null,
      transitionError: null,
      onTransition: () => {},
      onOpenReviewModal: () => {},
      onOpenMakeCounterOfferModal: () => {},
      onPayAgreedOffer: () => {},
    },
    process
  );

const BUYER_OFFER = [transitions.BUYER_MAKE_OFFER, CUSTOMER, 7000];
const SELLER_COUNTER = [transitions.SELLER_COUNTER_OFFER, PROVIDER, 9000];
const BUYER_COUNTER = [transitions.BUYER_COUNTER_OFFER, CUSTOMER, 7000];

describe('TransactionPage state data: offer-purchase', () => {
  it('seller can accept, decline or counter a buyer offer', () => {
    const tx = offerTransaction({ offerSteps: [BUYER_OFFER], lastTransition: BUYER_OFFER[0] });
    const data = stateData(tx, PROVIDER);
    expect(data.processState).toEqual('buyer-offer-pending');
    expect(data.showActionButtons).toBe(true);
    expect(data.primaryButtonProps.buttonText).toEqual(
      'TransactionPage.offer-purchase.provider.transition-seller-accept-offer.actionButton'
    );
    expect(data.secondaryButtonProps.buttonText).toEqual(
      'TransactionPage.offer-purchase.provider.transition-seller-decline-offer.actionButton'
    );
    expect(data.tertiaryButtonProps.buttonText).toEqual(
      'TransactionPage.offer-purchase.provider.transition-seller-counter-offer.actionButton'
    );
  });

  it('buyer can only withdraw their pending offer', () => {
    const tx = offerTransaction({ offerSteps: [BUYER_OFFER], lastTransition: BUYER_OFFER[0] });
    const data = stateData(tx, CUSTOMER);
    expect(data.primaryButtonProps).toBeUndefined();
    expect(data.secondaryButtonProps.buttonText).toEqual(
      'TransactionPage.offer-purchase.customer.transition-buyer-withdraw-offer.actionButton'
    );
  });

  it('hides accept and counter once the item is sold, keeps decline', () => {
    const tx = offerTransaction({
      offerSteps: [BUYER_OFFER],
      lastTransition: BUYER_OFFER[0],
      stockQuantity: 0,
    });
    const data = stateData(tx, PROVIDER);
    expect(data.primaryButtonProps).toBeNull();
    expect(data.tertiaryButtonProps).toBeNull();
    expect(data.secondaryButtonProps.buttonText).toContain('seller-decline-offer');
  });

  it('buyer can counter a counter offer until 3 offers are made', () => {
    const twoBuyerOffers = offerTransaction({
      offerSteps: [BUYER_OFFER, SELLER_COUNTER, BUYER_COUNTER, SELLER_COUNTER],
      lastTransition: SELLER_COUNTER[0],
    });
    expect(stateData(twoBuyerOffers, CUSTOMER).tertiaryButtonProps.buttonText).toContain(
      'buyer-counter-offer'
    );

    const threeBuyerOffers = offerTransaction({
      offerSteps: [
        BUYER_OFFER,
        SELLER_COUNTER,
        BUYER_COUNTER,
        SELLER_COUNTER,
        BUYER_COUNTER,
        SELLER_COUNTER,
      ],
      lastTransition: SELLER_COUNTER[0],
    });
    const data = stateData(threeBuyerOffers, CUSTOMER);
    expect(data.tertiaryButtonProps).toBeNull();
    expect(data.primaryButtonProps.buttonText).toContain('buyer-accept-counter-offer');
    expect(data.secondaryButtonProps.buttonText).toContain('buyer-decline-counter-offer');
  });

  it('buyer pays the agreed price, unless the item is sold', () => {
    const accepted = [transitions.SELLER_ACCEPT_OFFER, PROVIDER];
    const tx = offerTransaction({
      offerSteps: [BUYER_OFFER, accepted],
      lastTransition: accepted[0],
    });
    const data = stateData(tx, CUSTOMER);
    expect(data.processState).toEqual('offer-agreed');
    expect(data.primaryButtonProps.buttonText).toEqual(
      'TransactionPage.offer-purchase.customer.payAgreedPrice'
    );
    expect(data.secondaryButtonProps.buttonText).toContain('buyer-cancel-accepted-offer');

    const sold = offerTransaction({
      offerSteps: [BUYER_OFFER, accepted],
      lastTransition: accepted[0],
      stockQuantity: 0,
    });
    expect(stateData(sold, CUSTOMER).primaryButtonProps).toBeNull();
    expect(stateData(tx, PROVIDER).showActionButtons).toBeUndefined();
  });

  it('uses the purchase state data after payment, with offer messages in the feed', () => {
    const steps = [
      BUYER_OFFER,
      [transitions.SELLER_ACCEPT_OFFER, PROVIDER],
      [transitions.REQUEST_PAYMENT_AFTER_OFFER, CUSTOMER],
      [transitions.CONFIRM_PAYMENT, CUSTOMER],
    ];
    const tx = offerTransaction({ offerSteps: steps, lastTransition: transitions.CONFIRM_PAYMENT });
    const data = stateData(tx, PROVIDER);
    expect(data.processState).toEqual('purchased');
    expect(data.primaryButtonProps.buttonText).toEqual(
      'TransactionPage.offer-purchase.provider.transition-mark-delivered.actionButton'
    );
    expect(data.transitionMessages.map(m => m.transition)).toContain(
      transitions.SELLER_ACCEPT_OFFER
    );
  });
});
