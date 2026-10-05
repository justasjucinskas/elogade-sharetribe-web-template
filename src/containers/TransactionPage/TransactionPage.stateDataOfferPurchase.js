import {
  TX_TRANSITION_ACTOR_CUSTOMER as CUSTOMER,
  TX_TRANSITION_ACTOR_PROVIDER as PROVIDER,
  CONDITIONAL_RESOLVER_WILDCARD,
  ConditionalResolver,
} from '../../transactions/transaction';
import { formatMoney } from '../../util/currency';
import { LINE_ITEM_ITEM } from '../../util/types';
import { hasBuyerOffersLeft, isListingAvailableForOffers } from '../../util/priceOffers';

import { getStateDataForPurchaseProcess } from './TransactionPage.stateDataPurchase.js';

/**
 * Get state data against the price offer process (offer-purchase) for TransactionPage's UI.
 * I.e. info about showing action buttons, current state etc.
 *
 * The offer states are handled here. From pending-payment onwards the process is identical to
 * default-purchase, so those states use the purchase process' state data.
 *
 * @param {*} txInfo detials about transaction
 * @param {*} processInfo  details about process
 */
export const getStateDataForOfferPurchaseProcess = (txInfo, processInfo) => {
  const {
    transaction,
    transactionRole,
    intl,
    onOpenMakeCounterOfferModal,
    onPayAgreedOffer,
  } = txInfo;
  const _ = CONDITIONAL_RESOLVER_WILDCARD;
  const { processName, processState, states, transitions, actionButtonProps } = processInfo;

  // These overwrite the default transition messages on the ActivityFeed component.
  // The defaults are tied to the process state: transitions to the same state can need
  // different messages (e.g. declined by the seller or withdrawn by the buyer).
  const transitionMessages = [
    transitions.BUYER_COUNTER_OFFER,
    transitions.SELLER_ACCEPT_OFFER,
    transitions.BUYER_ACCEPT_COUNTER_OFFER,
    transitions.SELLER_DECLINE_OFFER,
    transitions.BUYER_WITHDRAW_OFFER,
    transitions.BUYER_DECLINE_COUNTER_OFFER,
    transitions.BUYER_CANCEL_ACCEPTED_OFFER,
    transitions.OPERATOR_DECLINE_OFFER,
    transitions.OPERATOR_DECLINE_COUNTER_OFFER,
    transitions.EXPIRE_OFFER,
    transitions.EXPIRE_COUNTER_OFFER,
    transitions.EXPIRE_ACCEPTED_OFFER,
  ].map(transition => ({
    transition,
    translationId: `TransactionPage.ActivityFeed.${processName}.transition.${
      transition.split('/')[1]
    }`,
  }));
  const sharedStateData = { processName, processState, transitionMessages };

  // Offers can't be accepted, countered or paid once the item is sold or the listing closed.
  const isItemAvailable = isListingAvailableForOffers(transaction?.listing);
  const offers = transaction?.attributes?.metadata?.offers || [];
  const itemLineItem = transaction?.attributes?.lineItems?.find(
    item => item.code === LINE_ITEM_ITEM && !item.reversal
  );

  const offerStateData = new ConditionalResolver([processState, transactionRole])
    .cond([states.BUYER_OFFER_PENDING, PROVIDER], () => {
      return {
        ...sharedStateData,
        showDetailCardHeadings: true,
        showActionButtons: true,
        primaryButtonProps: isItemAvailable
          ? actionButtonProps(transitions.SELLER_ACCEPT_OFFER, PROVIDER)
          : null,
        secondaryButtonProps: actionButtonProps(transitions.SELLER_DECLINE_OFFER, PROVIDER),
        tertiaryButtonProps: isItemAvailable
          ? actionButtonProps(transitions.SELLER_COUNTER_OFFER, PROVIDER, {
              onAction: onOpenMakeCounterOfferModal,
            })
          : null,
      };
    })
    .cond([states.BUYER_OFFER_PENDING, CUSTOMER], () => {
      return {
        ...sharedStateData,
        showDetailCardHeadings: true,
        showActionButtons: true,
        secondaryButtonProps: actionButtonProps(transitions.BUYER_WITHDRAW_OFFER, CUSTOMER),
      };
    })
    .cond([states.COUNTER_OFFER_PENDING, CUSTOMER], () => {
      // The buyer can make at most MAX_BUYER_OFFERS offers: after that, accept or decline.
      const canCounter = isItemAvailable && hasBuyerOffersLeft(offers);
      return {
        ...sharedStateData,
        showDetailCardHeadings: true,
        showActionButtons: true,
        primaryButtonProps: isItemAvailable
          ? actionButtonProps(transitions.BUYER_ACCEPT_COUNTER_OFFER, CUSTOMER)
          : null,
        secondaryButtonProps: actionButtonProps(transitions.BUYER_DECLINE_COUNTER_OFFER, CUSTOMER),
        tertiaryButtonProps: canCounter
          ? actionButtonProps(transitions.BUYER_COUNTER_OFFER, CUSTOMER, {
              onAction: onOpenMakeCounterOfferModal,
            })
          : null,
      };
    })
    .cond([states.COUNTER_OFFER_PENDING, PROVIDER], () => {
      return { ...sharedStateData, showDetailCardHeadings: true };
    })
    .cond([states.OFFER_AGREED, CUSTOMER], () => {
      // "Pay" goes to CheckoutPage (delivery method first, if there's a choice).
      // The transition itself (request-payment-after-offer) is made there with the payment.
      const agreedPrice = itemLineItem?.unitPrice;
      const payButtonText = agreedPrice
        ? intl.formatMessage(
            { id: `TransactionPage.${processName}.${CUSTOMER}.payAgreedPrice` },
            { price: formatMoney(intl, agreedPrice) }
          )
        : undefined;
      return {
        ...sharedStateData,
        showDetailCardHeadings: true,
        showActionButtons: true,
        primaryButtonProps: isItemAvailable
          ? actionButtonProps(transitions.REQUEST_PAYMENT_AFTER_OFFER, CUSTOMER, {
              onAction: onPayAgreedOffer,
              ...(payButtonText ? { buttonText: payButtonText } : {}),
            })
          : null,
        secondaryButtonProps: actionButtonProps(transitions.BUYER_CANCEL_ACCEPTED_OFFER, CUSTOMER),
      };
    })
    .cond([states.OFFER_AGREED, PROVIDER], () => {
      return { ...sharedStateData, showDetailCardHeadings: true };
    })
    .cond([states.OFFER_DECLINED, _], () => {
      return { ...sharedStateData, showDetailCardHeadings: true, showBreakDown: false };
    })
    .cond([states.OFFER_EXPIRED, _], () => {
      return { ...sharedStateData, showDetailCardHeadings: true, showBreakDown: false };
    })
    .default(() => null)
    .resolve();

  return (
    offerStateData || { ...getStateDataForPurchaseProcess(txInfo, processInfo), transitionMessages }
  );
};
