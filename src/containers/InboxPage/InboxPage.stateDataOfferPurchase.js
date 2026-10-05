import {
  TX_TRANSITION_ACTOR_CUSTOMER as CUSTOMER,
  TX_TRANSITION_ACTOR_PROVIDER as PROVIDER,
  CONDITIONAL_RESOLVER_WILDCARD,
  ConditionalResolver,
} from '../../transactions/transaction';

import { getStateDataForPurchaseProcess } from './InboxPage.stateDataPurchase.js';

// Get UI data mapped to specific transaction state & role.
// Price offers (offer-purchase): the offer states are handled here; from pending-payment onwards
// the process is identical to default-purchase.
export const getStateDataForOfferPurchaseProcess = (txInfo, processInfo) => {
  const { transactionRole } = txInfo;
  const { processName, processState, states } = processInfo;
  const _ = CONDITIONAL_RESOLVER_WILDCARD;

  const offerStateData = new ConditionalResolver([processState, transactionRole])
    .cond([states.BUYER_OFFER_PENDING, PROVIDER], () => {
      return { processName, processState, actionNeeded: true, isSaleNotification: true };
    })
    .cond([states.BUYER_OFFER_PENDING, CUSTOMER], () => {
      return { processName, processState };
    })
    .cond([states.COUNTER_OFFER_PENDING, CUSTOMER], () => {
      return { processName, processState, actionNeeded: true };
    })
    .cond([states.COUNTER_OFFER_PENDING, PROVIDER], () => {
      return { processName, processState };
    })
    .cond([states.OFFER_AGREED, CUSTOMER], () => {
      return { processName, processState, actionNeeded: true };
    })
    .cond([states.OFFER_AGREED, PROVIDER], () => {
      return { processName, processState };
    })
    .cond([states.OFFER_DECLINED, _], () => {
      return { processName, processState, isFinal: true };
    })
    .cond([states.OFFER_EXPIRED, _], () => {
      return { processName, processState, isFinal: true };
    })
    .default(() => null)
    .resolve();

  return offerStateData || getStateDataForPurchaseProcess(txInfo, processInfo);
};
