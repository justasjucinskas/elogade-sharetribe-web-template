import React, { useEffect, useState } from 'react';
import classNames from 'classnames';

import {
  AGREED_OFFER_PAYMENT_HOURS,
  MAX_BUYER_OFFERS,
  OFFER_RESPONSE_HOURS,
} from '../../../config/configPriceOffers';
import { FormattedMessage } from '../../../util/reactIntl';
import { formatMoney } from '../../../util/currency';
import { LINE_ITEM_ITEM } from '../../../util/types';
import {
  getBuyerOfferCount,
  getOfferDeadline,
  isListingAvailableForOffers,
} from '../../../util/priceOffers';
import { getProcess, OFFER_PURCHASE_PROCESS_NAME } from '../../../transactions/transaction';

import { Heading } from '../../../components';

import css from './PriceOfferSummary.module.css';

const deadlineFormat = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

/**
 * The price on the table in a price offer transaction (offer-purchase process): listing price,
 * current or agreed offer, the deadline of the current step and whether the item is still
 * available. Shown while the price is being negotiated or waiting for payment.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {propTypes.transaction} props.transaction - The transaction (with listing.currentStock)
 * @param {'customer'|'provider'} props.transactionRole - The role of the current user
 * @param {string} props.processState - The current state of the transaction
 * @param {Object} props.intl - The intl object
 * @returns {JSX.Element|null}
 */
const PriceOfferSummary = props => {
  const { className, transaction, transactionRole, processState, intl } = props;
  // Deadlines are shown in the viewer's time zone: render them only in the browser, so that
  // server-rendered markup (server time zone) can't differ from the hydrated one.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const { states } = getProcess(OFFER_PURCHASE_PROCESS_NAME);
  const isCustomer = transactionRole === 'customer';

  const offerStates = [
    states.BUYER_OFFER_PENDING,
    states.COUNTER_OFFER_PENDING,
    states.OFFER_AGREED,
  ];
  if (!offerStates.includes(processState)) {
    return null;
  }

  const listing = transaction?.listing;
  const listingPrice = listing?.attributes?.price;
  const itemLineItem = transaction?.attributes?.lineItems?.find(
    item => item.code === LINE_ITEM_ITEM && !item.reversal
  );
  const offer = itemLineItem?.unitPrice;
  const offers = transaction?.attributes?.metadata?.offers || [];
  const isItemAvailable = isListingAvailableForOffers(listing);

  const isAgreed = processState === states.OFFER_AGREED;
  const deadline = getOfferDeadline(
    transaction,
    isAgreed ? AGREED_OFFER_PAYMENT_HOURS : OFFER_RESPONSE_HOURS
  );
  const formattedDeadline = mounted && deadline ? intl.formatDate(deadline, deadlineFormat) : null;

  // Whose move is it: the buyer's offer waits for the seller, the counter offer for the buyer.
  const isOwnOffer =
    (processState === states.BUYER_OFFER_PENDING && isCustomer) ||
    (processState === states.COUNTER_OFFER_PENDING && !isCustomer);
  const offerLabelId = isAgreed
    ? 'TransactionPage.PriceOffer.agreedPriceLabel'
    : processState === states.COUNTER_OFFER_PENDING
    ? 'TransactionPage.PriceOffer.counterOfferLabel'
    : 'TransactionPage.PriceOffer.offerLabel';

  const deadlineMessageId = isAgreed
    ? `TransactionPage.PriceOffer.${isCustomer ? 'payBy' : 'buyerPaysBy'}`
    : isOwnOffer
    ? 'TransactionPage.PriceOffer.waitingForResponse'
    : 'TransactionPage.PriceOffer.respondBy';

  const buyerOffersLeft = Math.max(0, MAX_BUYER_OFFERS - getBuyerOfferCount(offers));
  const showOffersLeft = isCustomer && processState === states.COUNTER_OFFER_PENDING;

  return (
    <div className={classNames(css.root, className)}>
      <Heading as="h2" rootClassName={css.sectionHeading}>
        <FormattedMessage id="TransactionPage.PriceOffer.heading" />
      </Heading>

      {listingPrice ? (
        <div className={css.row}>
          <span className={css.label}>
            <FormattedMessage id="TransactionPage.PriceOffer.listingPriceLabel" />
          </span>
          <s className={css.listingPrice}>{formatMoney(intl, listingPrice)}</s>
        </div>
      ) : null}
      {offer ? (
        <div className={css.row}>
          <span className={css.label}>
            <FormattedMessage id={offerLabelId} values={{ isOwnOffer: `${isOwnOffer}` }} />
          </span>
          <span className={css.offer}>{formatMoney(intl, offer)}</span>
        </div>
      ) : null}

      {!isItemAvailable ? (
        <p className={css.notAvailable}>
          <FormattedMessage id="TransactionPage.PriceOffer.itemNotAvailable" />
        </p>
      ) : formattedDeadline ? (
        <p className={css.info}>
          <FormattedMessage id={deadlineMessageId} values={{ deadline: formattedDeadline }} />
        </p>
      ) : null}

      {isItemAvailable && showOffersLeft ? (
        <p className={css.info}>
          <FormattedMessage
            id="TransactionPage.PriceOffer.offersLeft"
            values={{ count: buyerOffersLeft }}
          />
        </p>
      ) : null}
    </div>
  );
};

export default PriceOfferSummary;
