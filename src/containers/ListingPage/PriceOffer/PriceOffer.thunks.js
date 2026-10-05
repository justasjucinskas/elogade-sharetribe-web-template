import { createAsyncThunk } from '@reduxjs/toolkit';

import { OFFER_PURCHASE_PROCESS_ALIAS } from '../../../config/configPriceOffers';
import { initiatePrivileged } from '../../../util/api';
import { storableError } from '../../../util/errors';
import * as log from '../../../util/log';
import { OFFER_PURCHASE_PROCESS_NAME, getProcess } from '../../../transactions/transaction';
import { setCurrentUserHasOrders } from '../../../ducks/user.duck';

// Price offers on ListingPage. These thunks keep no state in the store: the page keeps the
// modal state locally. The offer itself is validated and priced on the server
// (server/api-util/priceOffers.js).

/**
 * Make a price offer: initiates an offer-purchase transaction with transition/buyer-make-offer,
 * then sends the optional message to it.
 *
 * Resolves with the id of the new transaction.
 */
export const makePriceOffer = createAsyncThunk(
  'ListingPage/makePriceOffer',
  ({ listing, offer, message }, { dispatch, rejectWithValue, extra: sdk }) => {
    const { transitions } = getProcess(OFFER_PURCHASE_PROCESS_NAME);
    const bodyParams = {
      processAlias: OFFER_PURCHASE_PROCESS_ALIAS,
      transition: transitions.BUYER_MAKE_OFFER,
      params: {
        listingId: listing.id,
        protectedData: { unitType: listing.attributes.publicData?.unitType },
      },
    };
    const orderData = {
      offerInSubunits: offer.amount,
      currency: offer.currency,
      actor: 'customer',
    };

    return initiatePrivileged({ isSpeculative: false, orderData, bodyParams, queryParams: {} })
      .then(response => {
        const transactionId = response.data.data.id;
        dispatch(setCurrentUserHasOrders());

        const content = message?.trim();
        // The offer stands even if the message fails: it's shown on the transaction page.
        return content
          ? sdk.messages
              .send({ transactionId, content })
              .then(() => transactionId)
              .catch(e => {
                log.error(e, 'price-offer-message-failed', { transactionId: transactionId.uuid });
                return transactionId;
              })
          : transactionId;
      })
      .catch(e => {
        log.error(e, 'price-offer-failed', { listingId: listing.id.uuid });
        return rejectWithValue(storableError(e));
      });
  }
);

/**
 * Find the current user's open offer on a listing (if any), so the listing page can link to it
 * instead of starting a new negotiation.
 *
 * Resolves with the transaction id or null.
 */
export const fetchOpenPriceOffer = createAsyncThunk(
  'ListingPage/fetchOpenPriceOffer',
  ({ listingId }, { rejectWithValue, extra: sdk }) => {
    const { states } = getProcess(OFFER_PURCHASE_PROCESS_NAME);
    const openStates = [
      states.BUYER_OFFER_PENDING,
      states.COUNTER_OFFER_PENDING,
      states.OFFER_AGREED,
      states.PENDING_PAYMENT,
    ];
    return sdk.transactions
      .query({
        only: 'order',
        listingId,
        processNames: OFFER_PURCHASE_PROCESS_NAME,
        states: openStates.map(s => `state/${s}`).join(','),
        perPage: 1,
      })
      .then(response => response.data.data[0]?.id || null)
      .catch(e => rejectWithValue(storableError(e)));
  }
);
