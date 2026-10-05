import { formatMoney } from '../../util/currency';
import { getOfferLimits } from '../../util/priceOffers';
import { types as sdkTypes } from '../../util/sdkLoader';
import {
  composeValidators,
  moneySubUnitAmountAtLeast,
  moneySubUnitAmountBelow,
} from '../../util/validators';

const { Money } = sdkTypes;

/**
 * Price offers (offer-purchase process): the counter offer transitions for MakeCounterOfferModal.
 *
 * @param {Object} process the transaction's process (from getProcess)
 * @param {boolean} isOfferPurchase
 * @returns {Object} { customerCounterOfferTransition, providerCounterOfferTransition }
 */
export const getCounterOfferTransitions = (process, isOfferPurchase) => ({
  customerCounterOfferTransition: isOfferPurchase
    ? process?.transitions?.BUYER_COUNTER_OFFER
    : process?.transitions?.CUSTOMER_MAKE_COUNTER_OFFER,
  providerCounterOfferTransition: isOfferPurchase
    ? process?.transitions?.SELLER_COUNTER_OFFER
    : process?.transitions?.PROVIDER_MAKE_COUNTER_OFFER,
});

/**
 * Price offers: extra props for MakeCounterOfferModal, so that a counter offer stays within the
 * limits the server enforces (server/api-util/priceOffers.js).
 *
 * @param {Object} params
 * @param {Object} params.intl
 * @param {Money} params.listingPrice
 * @param {Money} params.currentOffer the offer on the table
 * @param {'customer'|'provider'} params.transactionRole
 * @returns {Object} { offerValidator, offerInfo } or an empty object
 */
export const getPriceOfferCounterProps = ({
  intl,
  listingPrice,
  currentOffer,
  transactionRole,
}) => {
  if (!listingPrice || !currentOffer) {
    return {};
  }
  const { minimumInSubunits, belowInSubunits } = getOfferLimits({
    listingPrice,
    role: transactionRole,
    latestOfferInSubunits: currentOffer.amount,
  });
  const minimumOffer = formatMoney(intl, new Money(minimumInSubunits, listingPrice.currency));
  const formattedListingPrice = formatMoney(intl, listingPrice);
  return {
    offerValidator: composeValidators(
      moneySubUnitAmountAtLeast(
        intl.formatMessage({ id: 'PriceOffer.offerTooLow' }, { minimumOffer }),
        minimumInSubunits
      ),
      moneySubUnitAmountBelow(
        intl.formatMessage(
          { id: 'PriceOffer.offerTooHigh' },
          { listingPrice: formattedListingPrice }
        ),
        belowInSubunits
      )
    ),
    offerInfo: intl.formatMessage(
      { id: 'PriceOffer.counterOfferRange' },
      { listingPrice: formattedListingPrice, minimumOffer }
    ),
  };
};
