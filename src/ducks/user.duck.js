import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { util as sdkUtil } from '../util/sdkLoader';
import { denormalisedResponseEntities, ensureOwnListing } from '../util/data';
import * as log from '../util/log';
import { LISTING_STATE_DRAFT } from '../util/types';
import { storableError } from '../util/errors';
import { isUserAuthorized } from '../util/userHelpers';
import {
  getStatesNeedingProviderAttention,
  getStatesNeedingCustomerAttention,
} from '../transactions/transaction';

import { authInfo } from './auth.duck';
import { updateStripeConnectAccount } from './stripeConnectAccount.duck';

// ================ Helper Functions ================ //

const mergeCurrentUser = (oldCurrentUser, newCurrentUser) => {
  const { id: oId, type: oType, attributes: oAttr, ...oldRelationships } = oldCurrentUser || {};
  const { id, type, attributes, ...relationships } = newCurrentUser || {};

  // Passing null will remove currentUser entity.
  // Only relationships are merged.
  // TODO figure out if sparse fields handling needs a better handling.
  return newCurrentUser === null
    ? null
    : oldCurrentUser === null
    ? newCurrentUser
    : { id, type, attributes, ...oldRelationships, ...relationships };
};

// ================ Async Thunks ================ //

//////////////////////////////////////////////////////////////////////
// Fetch ownListings to check if currentUser has published listings //
//////////////////////////////////////////////////////////////////////

const fetchCurrentUserHasListingsPayloadCreator = (_, thunkAPI) => {
  const { getState, extra: sdk, rejectWithValue } = thunkAPI;
  const { currentUser } = getState().user;

  if (!currentUser) {
    return Promise.resolve({ hasListings: false });
  }

  const params = {
    // Since we are only interested in if the user has published
    // listings, we only need at most one result.
    states: 'published',
    page: 1,
    perPage: 1,
  };

  return sdk.ownListings
    .query(params)
    .then(response => {
      const hasListings = response.data.data && response.data.data.length > 0;

      const hasPublishedListings =
        hasListings &&
        ensureOwnListing(response.data.data[0]).attributes.state !== LISTING_STATE_DRAFT;
      return { hasListings: !!hasPublishedListings };
    })
    .catch(e => rejectWithValue(storableError(e)));
};

export const fetchCurrentUserHasListingsThunk = createAsyncThunk(
  'user/fetchCurrentUserHasListings',
  fetchCurrentUserHasListingsPayloadCreator
);

// Backward compatible wrapper for the thunk
export const fetchCurrentUserHasListings = () => (dispatch, getState, sdk) => {
  return dispatch(fetchCurrentUserHasListingsThunk()).unwrap();
};

///////////////////////////////////////////////////////////
// Fetch transactions to check if currentUser has orders //
///////////////////////////////////////////////////////////

const fetchCurrentUserHasOrdersPayloadCreator = (_, { getState, extra: sdk, rejectWithValue }) => {
  if (!getState().user.currentUser) {
    return Promise.resolve({ hasOrders: false });
  }

  const params = {
    only: 'order',
    page: 1,
    perPage: 1,
  };

  return sdk.transactions
    .query(params)
    .then(response => {
      const hasOrders = response.data.data && response.data.data.length > 0;
      return { hasOrders: !!hasOrders };
    })
    .catch(e => rejectWithValue(storableError(e)));
};

export const fetchCurrentUserHasOrdersThunk = createAsyncThunk(
  'user/fetchCurrentUserHasOrders',
  fetchCurrentUserHasOrdersPayloadCreator
);

// Backward compatible wrapper for the thunk
export const fetchCurrentUserHasOrders = () => (dispatch, getState, sdk) => {
  return dispatch(fetchCurrentUserHasOrdersThunk()).unwrap();
};

/////////////////////////////////////////////////////////////////////////////////////
// Fetch transactions in specific states to check if currentUser has notifications //
/////////////////////////////////////////////////////////////////////////////////////

// Notificaiton page size is max (100 items on page)
const NOTIFICATION_PAGE_SIZE = 100;

const fetchCurrentUserNotificationsPayloadCreator = (_, { extra: sdk, rejectWithValue }) => {
  const statesNeedingProviderAttention = getStatesNeedingProviderAttention() || [];
  const statesNeedingCustomerAttention = getStatesNeedingCustomerAttention() || [];

  const paramsForSales = {
    only: 'sale',
    states: statesNeedingProviderAttention.map(state => `state/${state}`).join(','),
    page: 1,
    perPage: NOTIFICATION_PAGE_SIZE,
  };
  const paramsForOrders = {
    only: 'order',
    states: statesNeedingCustomerAttention.map(state => `state/${state}`).join(','),
    page: 1,
    perPage: NOTIFICATION_PAGE_SIZE,
  };

  return Promise.all([
    sdk.transactions.query(paramsForSales),
    sdk.transactions.query(paramsForOrders),
  ])
    .then(([sales, orders]) => {
      const saleNotificationsCount = sales.data.data.length;
      const orderNotificationsCount = orders.data.data.length;
      return { saleNotificationsCount, orderNotificationsCount };
    })
    .catch(e => rejectWithValue(storableError(e)));
};

export const fetchCurrentUserNotificationsThunk = createAsyncThunk(
  'user/fetchCurrentUserNotifications',
  fetchCurrentUserNotificationsPayloadCreator
);

// Backward compatible wrapper for the thunk
export const fetchCurrentUserNotifications = () => (dispatch, getState, sdk) => {
  return dispatch(fetchCurrentUserNotificationsThunk()).unwrap();
};

//////////////////////////////////////////////////////////////////////////////////
// Check whether currentUser has unread messages in their latest conversations  //
//////////////////////////////////////////////////////////////////////////////////

// The Marketplace API has no read/unread state for messages, so read state is
// tracked in currentUser's privateData:
//   privateData.messagesRead = {
//     baseline: ISO timestamp — messages older than this are considered read
//               (set once, so pre-existing conversations don't light the badge),
//     markers: { [transactionId]: ISO timestamp read up to },
//   }
// A message counts as unread when it was sent by the other party and is newer
// than its conversation's marker (or, without a marker, the baseline). Only the
// most recently messaged conversations are checked, and only the newest page of
// each, so the reported count saturates at
// UNREAD_MESSAGES_TX_COUNT * UNREAD_MESSAGES_PER_TX.
const UNREAD_MESSAGES_TX_COUNT = 10;
const UNREAD_MESSAGES_PER_TX = 100;
const READ_MARKERS_MAX_ENTRIES = 30;

// Schema version stamped into every persisted messagesRead object. State whose
// version doesn't match is treated as absent and reinitialized from scratch.
//
// This is the repair path for bad persisted state, and it is the only one: a
// code fix alone cannot undo a wrong baseline, because a baseline that exists
// is never rewritten. Rolling the app back doesn't help either — privateData
// stays on the user's profile after the code that wrote it is gone. If a
// release persists a bad baseline, bump this constant and the next check
// overwrites it for every user.
const MESSAGES_READ_VERSION = 1;

// The check costs one transactions.query plus one messages.query per
// conversation, and fetchCurrentUser runs on nearly every route change. The
// badge is a cosmetic indicator, so throttle the check instead of paying that
// fan-out on every navigation.
const UNREAD_MESSAGES_THROTTLE_MS = 30 * 1000;
let lastUnreadMessagesCheck = { userId: null, at: 0 };

const messagesReadStateFromUser = currentUser =>
  currentUser?.attributes?.profile?.privateData?.messagesRead || null;

// Writing read state back into privateData is a read-modify-write cycle, and the
// copy of currentUser in the store can be stale — fetchCurrentUser/fulfilled
// replaces it with a response that was fetched before the write landed. Two
// writes racing each other would then clobber one another, dropping a marker or,
// worse, the baseline: a messagesRead object without a baseline resolves every
// unmarked conversation to `undefined` and would silently report everything as
// read forever. So the newest known state is kept here, and every write is
// queued onto a single chain that merges into it.
let messagesReadRef = { userId: null, state: null };
let messagesReadWriteQueue = Promise.resolve();

const getMessagesRead = (userId, currentUser) => {
  const state =
    messagesReadRef.userId === userId && messagesReadRef.state
      ? messagesReadRef.state
      : messagesReadStateFromUser(currentUser);
  // Anything from another schema version, or missing its baseline, counts as
  // absent so that callers reinitialize it rather than building on top of it.
  return state?.v === MESSAGES_READ_VERSION && state.baseline ? state : null;
};

// updateFn receives the newest known messagesRead (or null) and returns the next
// one, or null to skip the write entirely.
const writeMessagesRead = (sdk, userId, currentUser, updateFn) => {
  const write = messagesReadWriteQueue.then(() => {
    const updated = updateFn(getMessagesRead(userId, currentUser));
    if (!updated) {
      return null;
    }
    return sdk.currentUser.updateProfile({ privateData: { messagesRead: updated } }).then(() => {
      messagesReadRef = { userId, state: updated };
      return updated;
    });
  });
  // Keep the queue alive: a failed write must not block the ones behind it.
  messagesReadWriteQueue = write.catch(() => {});
  return write;
};

// Messages are returned newest first, so the newest page holds every unread one
// unless a single conversation has more than UNREAD_MESSAGES_PER_TX of them.
const countUnreadMessages = (sdk, currentUserId, transactionId, readUpTo) =>
  sdk.messages
    .query({
      transactionId,
      perPage: UNREAD_MESSAGES_PER_TX,
      include: ['sender'],
      'fields.user': ['profile.displayName'],
    })
    .then(res => {
      const messages = res.data.data || [];
      return messages.filter(m => {
        const senderId = m.relationships?.sender?.data?.id?.uuid;
        return (
          !!senderId &&
          senderId !== currentUserId &&
          new Date(m.attributes.createdAt) > new Date(readUpTo)
        );
      }).length;
    });

const fetchCurrentUserUnreadMessagesPayloadCreator = (params, thunkAPI) => {
  const { getState, extra: sdk, rejectWithValue } = thunkAPI;
  const currentUser = params?.currentUser || getState().user.currentUser;
  const currentUserId = currentUser?.id?.uuid;

  if (!currentUserId) {
    return Promise.resolve({ unreadMessageCountByTx: {} });
  }

  // Skipped during SSR: the fan-out would run on every server-rendered request,
  // and initializing the baseline writes to the user's profile — a GET that is
  // server-rendered for a crawler or a prefetch must not mutate their data.
  const isServer = typeof window === 'undefined';
  const now = Date.now();
  const isThrottled =
    lastUnreadMessagesCheck.userId === currentUserId &&
    now - lastUnreadMessagesCheck.at < UNREAD_MESSAGES_THROTTLE_MS;

  if (isServer || isThrottled) {
    // No payload — leave whatever the previous check resolved in place.
    return Promise.resolve({ skipped: true });
  }
  lastUnreadMessagesCheck = { userId: currentUserId, at: now };

  const messagesRead = getMessagesRead(currentUserId, currentUser);

  // First run for this user (or state from an older schema version):
  // initialize the baseline so that pre-existing conversations don't show up
  // as unread.
  if (!messagesRead) {
    return writeMessagesRead(sdk, currentUserId, currentUser, () => ({
      v: MESSAGES_READ_VERSION,
      baseline: new Date().toISOString(),
      markers: {},
    }))
      .then(updated => ({ unreadMessageCountByTx: {}, messagesRead: updated }))
      .catch(e => rejectWithValue(storableError(e)));
  }

  const { baseline, markers = {} } = messagesRead;

  return sdk.transactions
    .query({
      hasMessage: true,
      // createdAt is the documented secondary key for lastMessageAt ordering.
      sort: 'lastMessageAt,createdAt',
      perPage: UNREAD_MESSAGES_TX_COUNT,
      'fields.transaction': ['lastTransitionedAt'],
    })
    .then(response => {
      const transactionIds = response.data.data.map(tx => tx.id);
      return Promise.all(
        transactionIds.map(transactionId =>
          countUnreadMessages(
            sdk,
            currentUserId,
            transactionId,
            markers[transactionId.uuid] || baseline
          ).then(count => [transactionId.uuid, count])
        )
      );
    })
    .then(entries => ({
      unreadMessageCountByTx: Object.fromEntries(entries.filter(([, count]) => count > 0)),
    }))
    .catch(e => rejectWithValue(storableError(e)));
};

export const fetchCurrentUserUnreadMessagesThunk = createAsyncThunk(
  'user/fetchCurrentUserUnreadMessages',
  fetchCurrentUserUnreadMessagesPayloadCreator
);

// Backward compatible wrapper for the thunk
export const fetchCurrentUserUnreadMessages = params => (dispatch, getState, sdk) => {
  return dispatch(fetchCurrentUserUnreadMessagesThunk(params));
};

const markTransactionMessagesReadPayloadCreator = (
  { transactionId, messageCreatedAt },
  thunkAPI
) => {
  const { getState, extra: sdk, rejectWithValue } = thunkAPI;
  const { currentUser } = getState().user;
  const currentUserId = currentUser?.id?.uuid;
  if (!currentUserId) {
    return Promise.resolve(null);
  }

  const transactionKey = transactionId?.uuid || transactionId;
  const readAt = new Date(messageCreatedAt).toISOString();

  return writeMessagesRead(sdk, currentUserId, currentUser, prev => {
    const { markers = {} } = prev || {};
    // Seed a baseline if there isn't one yet, the same way the first unread
    // check would: persisting markers without one disables the feature.
    const baseline = prev?.baseline || new Date().toISOString();
    // A marker older than the baseline would make already-read messages count
    // as unread again, so never move a conversation back past it.
    const readUpTo = new Date(readAt) > new Date(baseline) ? readAt : baseline;
    const isUpToDate = new Date(markers[transactionKey] || baseline) >= new Date(readUpTo);

    if (isUpToDate && prev) {
      // Already marked as read up to this message
      return null;
    }

    // Keep only the most recent markers so privateData doesn't grow unboundedly
    const entries = Object.entries({ ...markers, [transactionKey]: readUpTo }).sort(
      (a, b) => new Date(b[1]) - new Date(a[1])
    );
    const kept = entries.slice(0, READ_MARKERS_MAX_ENTRIES);
    const dropped = entries.slice(READ_MARKERS_MAX_ENTRIES);
    // Dropped conversations fall back to the baseline, so advance it past the
    // newest dropped marker — otherwise a pruned conversation would light up
    // again on every check with no way to clear it.
    const newestDropped = dropped.length > 0 ? dropped[0][1] : null;
    const nextBaseline =
      newestDropped && new Date(newestDropped) > new Date(baseline) ? newestDropped : baseline;

    return {
      ...prev,
      v: MESSAGES_READ_VERSION,
      baseline: nextBaseline,
      markers: Object.fromEntries(kept),
    };
  })
    .then(updated => (updated ? { transactionId: transactionKey, messagesRead: updated } : null))
    .catch(e => rejectWithValue(storableError(e)));
};

export const markTransactionMessagesReadThunk = createAsyncThunk(
  'user/markTransactionMessagesRead',
  markTransactionMessagesReadPayloadCreator
);

// Backward compatible wrapper for the thunk
export const markTransactionMessagesRead = (transactionId, messageCreatedAt) => (
  dispatch,
  getState,
  sdk
) => {
  return dispatch(markTransactionMessagesReadThunk({ transactionId, messageCreatedAt }));
};

const fetchCurrentUserPayloadCreator = (options, thunkAPI) => {
  const { getState, dispatch, extra: sdk, rejectWithValue } = thunkAPI;
  const state = getState();
  const { currentUserHasListings, currentUserShowTimestamp } = state.user || {};
  const { isAuthenticated } = state.auth;
  const {
    callParams = null,
    updateHasListings = true,
    updateNotifications = true,
    afterLogin,
    enforce = false, // Automatic emailVerification might be called too fast
  } = options || {};

  // Double fetch might happen when e.g. profile page is making a full page load
  const aSecondAgo = new Date().getTime() - 1000;
  if (!enforce && currentUserShowTimestamp > aSecondAgo) {
    return Promise.resolve(state.user.currentUser);
  }

  if (!isAuthenticated && !afterLogin) {
    // Make sure current user is null
    return Promise.resolve(null);
  }

  const parameters = callParams || {
    include: ['effectivePermissionSet', 'profileImage', 'stripeAccount'],
    'fields.image': [
      'variants.square-small',
      'variants.square-small2x',
      'variants.square-xsmall',
      'variants.square-xsmall2x',
    ],
    'imageVariant.square-xsmall': sdkUtil.objectQueryString({
      w: 40,
      h: 40,
      fit: 'crop',
    }),
    'imageVariant.square-xsmall2x': sdkUtil.objectQueryString({
      w: 80,
      h: 80,
      fit: 'crop',
    }),
  };

  return sdk.currentUser
    .show(parameters)
    .then(response => {
      const entities = denormalisedResponseEntities(response);
      if (entities.length !== 1) {
        throw new Error('Expected a resource in the sdk.currentUser.show response');
      }
      const currentUser = entities[0];

      // Save stripeAccount to store.stripe.stripeAccount if it exists
      if (currentUser.stripeAccount) {
        dispatch(updateStripeConnectAccount(currentUser.stripeAccount));
      }

      // set current user id to the logger
      log.setUserId(currentUser.id.uuid);
      return currentUser;
    })
    .then(currentUser => {
      // If currentUser is not active (e.g. in 'pending-approval' state),
      // then they don't have listings or transactions that we care about.
      if (isUserAuthorized(currentUser)) {
        if (currentUserHasListings === false && updateHasListings !== false) {
          dispatch(fetchCurrentUserHasListings());
        }

        if (updateNotifications !== false) {
          dispatch(fetchCurrentUserNotifications());
          // Pass currentUser explicitly — the fulfilled action has not been
          // dispatched yet, so it's not available through getState() here.
          dispatch(fetchCurrentUserUnreadMessagesThunk({ currentUser }));
        }

        if (!currentUser.attributes.emailVerified) {
          dispatch(fetchCurrentUserHasOrders());
        }
      }

      // Make sure auth info is up to date
      dispatch(authInfo());
      return currentUser;
    })
    .catch(e => {
      // Make sure auth info is up to date
      dispatch(authInfo());
      log.error(e, 'fetch-current-user-failed');
      return rejectWithValue(storableError(e));
    });
};

export const fetchCurrentUserThunk = createAsyncThunk(
  'user/fetchCurrentUser',
  fetchCurrentUserPayloadCreator
);
// Backward compatible wrapper for the thunk
/**
 * Fetch currentUser API entity.
 *
 * @param {Object} options
 * @param {Object} [options.callParams]           Optional parameters for the currentUser.show().
 * @param {boolean} [options.updateHasListings]   Make extra call for fetchCurrentUserHasListings()?
 * @param {boolean} [options.updateNotifications] Make extra call for fetchCurrentUserNotifications()?
 * @param {boolean} [options.afterLogin]          Fetch is no-op for unauthenticated users except after login() call
 * @param {boolean} [options.enforce]             Enforce the call even if the currentUser entity is freshly fetched.
 */
export const fetchCurrentUser = options => (dispatch, getState, sdk) => {
  return dispatch(fetchCurrentUserThunk(options)).unwrap();
};

/////////////////////////////////////////////
// Send verification email to currentUser //
/////////////////////////////////////////////

const sendVerificationEmailPayloadCreator = (_, { extra: sdk, rejectWithValue }) => {
  return sdk.currentUser
    .sendVerificationEmail()
    .then(() => ({}))
    .catch(e => rejectWithValue(storableError(e)));
};
export const sendVerificationEmailThunk = createAsyncThunk(
  'user/sendVerificationEmail',
  sendVerificationEmailPayloadCreator,
  {
    condition: (_, { getState }) => {
      return !getState()?.user?.sendVerificationEmailInProgress;
    },
  }
);

// Backward compatible wrapper for the thunk
export const sendVerificationEmail = () => (dispatch, getState, sdk) => {
  return dispatch(sendVerificationEmailThunk()).unwrap();
};

// Keep the in-store currentUser's privateData.messagesRead in sync after a
// profile update, so unread checks in this session use fresh read markers.
const updateCurrentUserMessagesRead = (state, messagesRead) => {
  if (messagesRead && state.currentUser?.attributes?.profile) {
    const { privateData = {} } = state.currentUser.attributes.profile;
    state.currentUser.attributes.profile.privateData = { ...privateData, messagesRead };
  }
};

const sumUnreadMessages = countByTx =>
  Object.values(countByTx).reduce((sum, count) => sum + count, 0);

// ================ Slice ================ //

const userSlice = createSlice({
  name: 'user',
  initialState: {
    currentUser: null,
    currentUserShowTimestamp: 0,
    currentUserShowError: null,
    currentUserHasListings: false,
    currentUserHasListingsError: null,
    currentUserSaleNotificationCount: 0,
    currentUserOrderNotificationCount: 0,
    currentUserNotificationCountError: null,
    currentUserUnreadMessageCount: 0,
    currentUserUnreadMessageCountByTx: {},
    currentUserHasOrders: null, // This is not fetched unless unverified emails exist
    currentUserHasOrdersError: null,
    sendVerificationEmailInProgress: false,
    sendVerificationEmailError: null,
  },
  reducers: {
    clearCurrentUser: state => {
      state.currentUser = null;
      state.currentUserShowError = null;
      state.currentUserHasListings = false;
      state.currentUserHasListingsError = null;
      state.currentUserSaleNotificationCount = 0;
      state.currentUserOrderNotificationCount = 0;
      state.currentUserUnreadMessageCount = 0;
      state.currentUserUnreadMessageCountByTx = {};

      state.currentUserNotificationCountError = null;
    },
    setCurrentUser: (state, action) => {
      state.currentUser = mergeCurrentUser(state.currentUser, action.payload);
    },
    setCurrentUserHasOrders: state => {
      state.currentUserHasOrders = true;
    },
  },
  extraReducers: builder => {
    builder
      // fetchCurrentUser
      .addCase(fetchCurrentUserThunk.pending, state => {
        state.currentUserShowError = null;
      })
      .addCase(fetchCurrentUserThunk.fulfilled, (state, action) => {
        state.currentUser = mergeCurrentUser(state.currentUser, action.payload);
        state.currentUserShowTimestamp = action.payload ? new Date().getTime() : 0;
      })
      .addCase(fetchCurrentUserThunk.rejected, (state, action) => {
        console.error(action.payload);
        state.currentUserShowError = action.payload;
      })
      // fetchCurrentUserHasListings
      .addCase(fetchCurrentUserHasListingsThunk.pending, state => {
        state.currentUserHasListingsError = null;
      })
      .addCase(fetchCurrentUserHasListingsThunk.fulfilled, (state, action) => {
        state.currentUserHasListings = action.payload.hasListings;
      })
      .addCase(fetchCurrentUserHasListingsThunk.rejected, (state, action) => {
        console.error(action.payload);
        state.currentUserHasListingsError = action.payload;
      })
      // fetchCurrentUserNotifications
      .addCase(fetchCurrentUserNotificationsThunk.pending, state => {
        state.currentUserNotificationCountError = null;
      })
      .addCase(fetchCurrentUserNotificationsThunk.fulfilled, (state, action) => {
        state.currentUserSaleNotificationCount = action.payload.saleNotificationsCount;
        state.currentUserOrderNotificationCount = action.payload.orderNotificationsCount;
      })
      .addCase(fetchCurrentUserNotificationsThunk.rejected, (state, action) => {
        console.error(action.payload);
        state.currentUserNotificationCountError = action.payload;
      })
      // fetchCurrentUserUnreadMessages
      .addCase(fetchCurrentUserUnreadMessagesThunk.fulfilled, (state, action) => {
        if (action.payload.skipped) {
          // Throttled or server-side: keep the previous result.
          return;
        }
        const countByTx = action.payload.unreadMessageCountByTx;
        state.currentUserUnreadMessageCountByTx = countByTx;
        state.currentUserUnreadMessageCount = sumUnreadMessages(countByTx);
        updateCurrentUserMessagesRead(state, action.payload.messagesRead);
      })
      .addCase(fetchCurrentUserUnreadMessagesThunk.rejected, (state, action) => {
        // The unread-message indicator is cosmetic — a failed check should not
        // surface the generic error banner.
        console.error(action.payload);
      })
      // markTransactionMessagesRead
      .addCase(markTransactionMessagesReadThunk.fulfilled, (state, action) => {
        if (action.payload) {
          const {
            [action.payload.transactionId]: read,
            ...rest
          } = state.currentUserUnreadMessageCountByTx;
          state.currentUserUnreadMessageCountByTx = rest;
          state.currentUserUnreadMessageCount = sumUnreadMessages(rest);
          updateCurrentUserMessagesRead(state, action.payload.messagesRead);
        }
      })
      .addCase(markTransactionMessagesReadThunk.rejected, (state, action) => {
        console.error(action.payload);
      })
      // fetchCurrentUserHasOrders
      .addCase(fetchCurrentUserHasOrdersThunk.pending, state => {
        state.currentUserHasOrdersError = null;
      })
      .addCase(fetchCurrentUserHasOrdersThunk.fulfilled, (state, action) => {
        state.currentUserHasOrders = action.payload.hasOrders;
      })
      .addCase(fetchCurrentUserHasOrdersThunk.rejected, (state, action) => {
        console.error(action.payload);
        state.currentUserHasOrdersError = action.payload;
      })
      // sendVerificationEmail
      .addCase(sendVerificationEmailThunk.pending, state => {
        state.sendVerificationEmailInProgress = true;
        state.sendVerificationEmailError = null;
      })
      .addCase(sendVerificationEmailThunk.fulfilled, state => {
        state.sendVerificationEmailInProgress = false;
      })
      .addCase(sendVerificationEmailThunk.rejected, (state, action) => {
        state.sendVerificationEmailInProgress = false;
        state.sendVerificationEmailError = action.payload;
      });
  },
});

export default userSlice.reducer;

export const { clearCurrentUser, setCurrentUser, setCurrentUserHasOrders } = userSlice.actions;

// ================ Selectors ================ //

export const hasCurrentUserErrors = state => {
  const { user } = state;
  return (
    user.currentUserShowError ||
    user.currentUserHasListingsError ||
    user.currentUserNotificationCountError ||
    user.currentUserHasOrdersError
  );
};
