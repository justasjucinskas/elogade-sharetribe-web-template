import fs from 'fs';
import path from 'path';

import { createTransaction, createTxTransition } from '../util/testData';
import {
  getProcess,
  getStatesNeedingCustomerAttention,
  getStatesNeedingProviderAttention,
  resolveLatestProcessName,
  getSupportedProcessesInfo,
  OFFER_PURCHASE_PROCESS_NAME,
  TX_TRANSITION_ACTOR_CUSTOMER as CUSTOMER,
  TX_TRANSITION_ACTOR_PROVIDER as PROVIDER,
} from './transaction';

const process = getProcess(OFFER_PURCHASE_PROCESS_NAME);
const { transitions, states } = process;

// Parse the transitions of the process definition (ext/) that the graph must mirror.
const parseProcessEdn = () => {
  const ednPath = path.resolve(
    __dirname,
    '../../ext/transaction-processes/offer-purchase/process.edn'
  );
  const edn = fs.readFileSync(ednPath, 'utf8');
  const transitionsPart = edn.split(':notifications')[0];
  return transitionsPart
    .split('{:name :transition/')
    .slice(1)
    .map(block => {
      const name = block.match(/^([a-z0-9-]+)/)[1];
      const from = block.match(/:from :state\/([a-z0-9-]+)/);
      const to = block.match(/:to :state\/([a-z0-9-]+)/)[1];
      return {
        transition: `transition/${name}`,
        from: from ? from[1] : 'initial',
        to,
        isPrivileged: /:privileged\? true/.test(block),
      };
    });
};

describe('offer-purchase process', () => {
  it('is registered and resolves by name', () => {
    expect(resolveLatestProcessName('offer-purchase')).toEqual('offer-purchase');
    expect(getSupportedProcessesInfo()).toContainEqual({
      name: 'offer-purchase',
      alias: 'offer-purchase/release-1',
      unitTypes: [],
    });
  });

  it('mirrors every transition of process.edn (from, to, privileged)', () => {
    const ednTransitions = parseProcessEdn();
    expect(ednTransitions.length).toEqual(Object.values(transitions).length);

    ednTransitions.forEach(({ transition, from, to, isPrivileged }) => {
      expect(Object.values(transitions)).toContain(transition);
      expect(process.graph.states[from].on[transition]).toEqual(to);
      expect(process.isPrivileged(transition)).toEqual(isPrivileged);
    });
  });

  it('resolves the state of a transaction from its last transition', () => {
    const tx = lastTransition =>
      createTransaction({ processName: 'offer-purchase', lastTransition });
    expect(process.getState(tx(transitions.BUYER_MAKE_OFFER))).toEqual(states.BUYER_OFFER_PENDING);
    expect(process.getState(tx(transitions.BUYER_COUNTER_OFFER))).toEqual(
      states.BUYER_OFFER_PENDING
    );
    expect(process.getState(tx(transitions.SELLER_COUNTER_OFFER))).toEqual(
      states.COUNTER_OFFER_PENDING
    );
    expect(process.getState(tx(transitions.SELLER_ACCEPT_OFFER))).toEqual(states.OFFER_AGREED);
    expect(process.getState(tx(transitions.BUYER_ACCEPT_COUNTER_OFFER))).toEqual(
      states.OFFER_AGREED
    );
    expect(process.getState(tx(transitions.EXPIRE_ACCEPTED_OFFER))).toEqual(states.OFFER_EXPIRED);
    expect(process.getState(tx(transitions.REQUEST_PAYMENT_AFTER_OFFER))).toEqual(
      states.PENDING_PAYMENT
    );
    expect(process.getState(tx(transitions.CONFIRM_PAYMENT))).toEqual(states.PURCHASED);
    expect(process.getState(tx(transitions.MARK_DELIVERED))).toEqual(states.DELIVERED);
  });

  it('copies default-purchase from pending-payment onwards', () => {
    const purchase = getProcess('default-purchase');
    const purchasePhase = [
      'pending-payment',
      'payment-expired',
      'purchased',
      'delivered',
      'received',
      'disputed',
      'canceled',
      'completed',
      'reviewed-by-customer',
      'reviewed-by-provider',
      'reviewed',
    ];
    purchasePhase.forEach(state => {
      expect(process.graph.states[state]).toEqual(purchase.graph.states[state]);
    });
  });

  it("doesn't badge the wrong party: offer states needing attention don't collide", () => {
    // The notification badge queries states by name across all processes (user.duck.js).
    expect(getStatesNeedingProviderAttention()).toContain(states.BUYER_OFFER_PENDING);
    expect(getStatesNeedingProviderAttention()).not.toContain(states.COUNTER_OFFER_PENDING);
    expect(getStatesNeedingProviderAttention()).not.toContain(states.OFFER_AGREED);
    expect(getStatesNeedingCustomerAttention()).toContain(states.COUNTER_OFFER_PENDING);
    expect(getStatesNeedingCustomerAttention()).toContain(states.OFFER_AGREED);
    expect(getStatesNeedingCustomerAttention()).not.toContain(states.BUYER_OFFER_PENDING);
  });

  describe('offer history', () => {
    const history = [
      createTxTransition({ transition: transitions.BUYER_MAKE_OFFER, by: CUSTOMER }),
      createTxTransition({ transition: transitions.SELLER_COUNTER_OFFER, by: PROVIDER }),
      createTxTransition({ transition: transitions.BUYER_ACCEPT_COUNTER_OFFER, by: CUSTOMER }),
    ];
    const offers = [
      { transition: transitions.BUYER_MAKE_OFFER, by: CUSTOMER, offerInSubunits: 6000 },
      { transition: transitions.SELLER_COUNTER_OFFER, by: PROVIDER, offerInSubunits: 8000 },
    ];

    it('validates offers against the offer-carrying transitions', () => {
      expect(process.isValidNegotiationOffersArray(history, offers)).toBe(true);
      expect(process.isValidNegotiationOffersArray(history, offers.slice(0, 1))).toBe(false);
      expect(
        process.isValidNegotiationOffersArray(history, [{ ...offers[0], by: PROVIDER }, offers[1]])
      ).toBe(false);
    });

    it('adds the offered amounts to the transitions for the activity feed', () => {
      const result = process.getTransitionsWithMatchingOffers(history, offers);
      expect(result.map(t => t.offerInSubunits)).toEqual([6000, 8000, undefined]);
    });

    it('treats negotiation and agreed states as states relying on the offer history', () => {
      expect(process.isNegotiationState('state/buyer-offer-pending')).toBe(true);
      expect(process.isNegotiationState('counter-offer-pending')).toBe(true);
      expect(process.isNegotiationState('state/offer-agreed')).toBe(true);
      expect(process.isNegotiationState('state/purchased')).toBe(false);
      expect(process.isNegotiationState(null)).toBe(false);
    });
  });
});
