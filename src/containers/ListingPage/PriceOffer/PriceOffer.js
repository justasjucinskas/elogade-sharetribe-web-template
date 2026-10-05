import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import appSettings from '../../../config/settings';
import { AGREED_OFFER_PAYMENT_HOURS } from '../../../config/configPriceOffers';
import { FormattedMessage } from '../../../util/reactIntl';
import { types as sdkTypes } from '../../../util/sdkLoader';
import { formatMoney } from '../../../util/currency';
import { createResourceLocatorString } from '../../../util/routes';
import {
  composeValidators,
  moneySubUnitAmountAtLeast,
  moneySubUnitAmountBelow,
} from '../../../util/validators';
import { hasPermissionToInitiateTransactions, isUserAuthorized } from '../../../util/userHelpers';
import {
  NO_ACCESS_PAGE_INITIATE_TRANSACTIONS,
  NO_ACCESS_PAGE_USER_PENDING_APPROVAL,
} from '../../../util/urlHelpers';
import { ERROR_CODE_TRANSACTION_LISTING_INSUFFICIENT_STOCK } from '../../../util/types';
import { canMakePriceOffer, getOfferLimits } from '../../../util/priceOffers';

import { NamedLink, SecondaryButton } from '../../../components';

import MakeCounterOfferModal from '../../TransactionPage/MakeCounterOfferModal/MakeCounterOfferModal';

import { fetchOpenPriceOffer, makePriceOffer } from './PriceOffer.thunks';
import css from './PriceOffer.module.css';

const { Money } = sdkTypes;

const MAKE_OFFER_BUTTON_ID = 'makePriceOfferButton';

const errorCode = error => error?.apiErrors?.[0]?.code;

const OfferError = ({ error }) => {
  const code = errorCode(error);
  const id =
    code === ERROR_CODE_TRANSACTION_LISTING_INSUFFICIENT_STOCK
      ? 'PriceOffer.itemNotAvailableError'
      : code === 'price-offer-own-listing'
      ? 'PriceOffer.ownListingError'
      : code === 'price-offer-invalid'
      ? 'PriceOffer.invalidOfferError'
      : 'PriceOffer.makeOfferFailed';
  return <FormattedMessage id={id} />;
};

/**
 * "Make an offer" on ListingPage (price offers, offer-purchase process).
 *
 * Returns
 * - priceOfferAction: a render function for OrderPanel, (placement) => button or a link to the
 *   user's open offer on this listing. Null when offers aren't possible for this listing.
 * - priceOfferModal: the offer modal, to be rendered on the page.
 *
 * Call it before the page's early returns (it's a hook): listing can still be loading.
 */
export const usePriceOffer = props => {
  const {
    listing,
    isOwnListing,
    currentUser,
    config,
    routes,
    history,
    location,
    intl,
    onManageDisableScrolling,
  } = props;
  const dispatch = useDispatch();
  const [isModalOpen, setModalOpen] = useState(false);
  const [inProgress, setInProgress] = useState(false);
  const [error, setError] = useState(null);
  const [openOfferTxId, setOpenOfferTxId] = useState(null);

  const showPriceOffer = canMakePriceOffer({
    listing,
    isOwnListing,
    marketplaceCurrency: config.currency,
  });
  const listingId = listing?.id;
  const currentUserId = currentUser?.id?.uuid;

  // Link to the user's open offer instead of starting another negotiation on the same item.
  useEffect(() => {
    if (showPriceOffer && currentUserId && listingId) {
      dispatch(fetchOpenPriceOffer({ listingId }))
        .unwrap()
        .then(txId => setOpenOfferTxId(txId))
        .catch(() => setOpenOfferTxId(null));
    }
  }, [showPriceOffer, currentUserId, listingId?.uuid]);

  if (!showPriceOffer) {
    return { priceOfferAction: null, priceOfferModal: null };
  }

  const onOpenMakeOffer = () => {
    if (!currentUser) {
      const state = { from: `${location.pathname}${location.search}${location.hash}` };
      history.push(createResourceLocatorString('LoginPage', routes, {}, {}), state);
    } else if (!isUserAuthorized(currentUser)) {
      const pathParams = { missingAccessRight: NO_ACCESS_PAGE_USER_PENDING_APPROVAL };
      history.push(createResourceLocatorString('NoAccessPage', routes, pathParams, {}));
    } else if (!hasPermissionToInitiateTransactions(currentUser)) {
      const pathParams = { missingAccessRight: NO_ACCESS_PAGE_INITIATE_TRANSACTIONS };
      history.push(createResourceLocatorString('NoAccessPage', routes, pathParams, {}));
    } else {
      setError(null);
      setModalOpen(true);
    }
  };

  const onSubmitOffer = values => {
    const { counterOffer: offer, message } = values;
    setInProgress(true);
    setError(null);
    dispatch(makePriceOffer({ listing, offer, message }))
      .unwrap()
      .then(txId => {
        setInProgress(false);
        setModalOpen(false);
        history.push(
          createResourceLocatorString('OrderDetailsPage', routes, { id: txId.uuid }, {})
        );
      })
      .catch(e => {
        setInProgress(false);
        setError(e);
      });
  };

  const priceOfferAction = placement =>
    openOfferTxId ? (
      <NamedLink
        className={css.viewOfferLink}
        name="OrderDetailsPage"
        params={{ id: openOfferTxId.uuid }}
      >
        <FormattedMessage id="PriceOffer.viewYourOffer" />
      </NamedLink>
    ) : (
      <SecondaryButton
        id={`${placement}_${MAKE_OFFER_BUTTON_ID}`}
        className={css.makeOfferButton}
        onClick={onOpenMakeOffer}
      >
        <FormattedMessage id="PriceOffer.makeOfferButton" />
      </SecondaryButton>
    );

  const price = listing.attributes.price;
  const { minimumInSubunits, belowInSubunits } = getOfferLimits({
    listingPrice: price,
    role: 'customer',
  });
  const minimumOffer = new Money(minimumInSubunits, price.currency);
  const formattedPrice = formatMoney(intl, price);
  const formattedMinimum = formatMoney(intl, minimumOffer);

  const offerValidator = composeValidators(
    moneySubUnitAmountAtLeast(
      intl.formatMessage({ id: 'PriceOffer.offerTooLow' }, { minimumOffer: formattedMinimum }),
      minimumInSubunits
    ),
    moneySubUnitAmountBelow(
      intl.formatMessage({ id: 'PriceOffer.offerTooHigh' }, { listingPrice: formattedPrice }),
      belowInSubunits
    )
  );

  const priceOfferModal = (
    <MakeCounterOfferModal
      id="MakePriceOfferModal"
      formId="MakePriceOfferForm"
      isOpen={isModalOpen}
      onCloseModal={() => setModalOpen(false)}
      focusElementId={`panel_${MAKE_OFFER_BUTTON_ID}`}
      onManageDisableScrolling={onManageDisableScrolling}
      onMakeCounterOffer={onSubmitOffer}
      currentOffer={minimumOffer}
      counterOfferInProgress={inProgress}
      counterOfferError={error}
      currencyConfig={appSettings.getCurrencyFormatting(price.currency)}
      title={<FormattedMessage id="PriceOffer.modalTitle" />}
      description={
        <FormattedMessage
          id="PriceOffer.modalDescription"
          values={{ listingTitle: listing.attributes.title }}
        />
      }
      offerValidator={offerValidator}
      offerInfo={
        <>
          <FormattedMessage
            id="PriceOffer.offerRange"
            values={{ listingPrice: formattedPrice, minimumOffer: formattedMinimum }}
          />{' '}
          <FormattedMessage
            id="PriceOffer.paymentInfo"
            values={{ hours: AGREED_OFFER_PAYMENT_HOURS }}
          />
        </>
      }
      messageField={{
        label: intl.formatMessage({ id: 'PriceOffer.messageLabel' }),
        placeholder: intl.formatMessage({ id: 'PriceOffer.messagePlaceholder' }),
      }}
      submitButtonText={intl.formatMessage({ id: 'PriceOffer.submitOffer' })}
      errorMessage={<OfferError error={error} />}
    />
  );

  return { priceOfferAction, priceOfferModal };
};
