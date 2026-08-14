import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { ensureCurrentUser } from '../../../../util/data';
import { isUserAuthorized } from '../../../../util/userHelpers';
import { fetchStripeAccountThunk } from '../../../../ducks/stripeConnectAccount.duck';

import { NamedLink } from '../../../../components';

import css from './PayoutStatusBanner.module.css';

export const PAYOUT_STATUS_MISSING = 'missing';
export const PAYOUT_STATUS_RESTRICTED = 'restricted';

const SESSION_STORAGE_KEY = 'PayoutStatusBanner.dismissed';

// The full Stripe account is fetched at most once per page load. The copy of
// the stripeAccount relationship included in the currentUser payload doesn't
// carry stripeAccountData, which is needed to detect a restricted account.
let stripeAccountRequested = false;

// Check if there's requirements on selected type: 'past_due', 'currently_due' etc.
const hasRequirements = (stripeAccountData, requirementType) =>
  stripeAccountData != null &&
  stripeAccountData.requirements &&
  Array.isArray(stripeAccountData.requirements[requirementType]) &&
  stripeAccountData.requirements[requirementType].length > 0;

/**
 * Resolve the current user's payout readiness from Redux state.
 *
 * @returns {('missing'|'restricted'|null)} 'missing' when a seller with
 * listings has no payout details at all, 'restricted' when their Stripe
 * account has past-due or currently-due requirements (payouts paused),
 * null when everything is fine or the user is not a seller.
 */
export const usePayoutStatus = () => {
  const currentUser = useSelector(state => state.user.currentUser);
  const currentUserHasListings = useSelector(state => state.user.currentUserHasListings);
  const stripeAccount = useSelector(state => state.stripeConnectAccount.stripeAccount);

  const user = ensureCurrentUser(currentUser);
  const isSellerWithListings = !!user.id && isUserAuthorized(user) && currentUserHasListings;
  if (!isSellerWithListings) {
    return null;
  }

  if (!user.attributes.stripeConnected) {
    return PAYOUT_STATUS_MISSING;
  }

  const stripeAccountData = stripeAccount?.attributes?.stripeAccountData;
  const isRestricted =
    hasRequirements(stripeAccountData, 'past_due') ||
    hasRequirements(stripeAccountData, 'currently_due');
  return isRestricted ? PAYOUT_STATUS_RESTRICTED : null;
};

/**
 * Persistent banner shown under the Topbar for sellers whose payout setup
 * blocks them from getting paid. Two tiers:
 * - missing payout details: informational, dismissible for the session
 * - restricted Stripe account: warning, not dismissible
 *
 * @component
 * @param {Object} props
 * @param {string?} props.currentPage page name from route configuration,
 * used to hide the banner on StripePayoutPage itself
 * @returns {JSX.Element?} banner element or null
 */
const PayoutStatusBanner = props => {
  const { currentPage } = props;
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const dispatch = useDispatch();
  const intl = useIntl();

  const currentUser = useSelector(state => state.user.currentUser);
  const currentUserHasListings = useSelector(state => state.user.currentUserHasListings);
  const stripeAccount = useSelector(state => state.stripeConnectAccount.stripeAccount);
  const status = usePayoutStatus();

  useEffect(() => {
    setMounted(true);
    const isDismissedInSession =
      typeof window !== 'undefined' &&
      window.sessionStorage?.getItem(SESSION_STORAGE_KEY) === 'true';
    setDismissed(isDismissedInSession);
  }, []);

  const user = ensureCurrentUser(currentUser);
  const shouldFetchStripeAccount =
    !!user.id &&
    isUserAuthorized(user) &&
    currentUserHasListings &&
    user.attributes.stripeConnected &&
    stripeAccount?.attributes?.stripeAccountData == null;

  useEffect(() => {
    if (mounted && shouldFetchStripeAccount && !stripeAccountRequested) {
      stripeAccountRequested = true;
      dispatch(fetchStripeAccountThunk());
    }
  }, [mounted, shouldFetchStripeAccount, dispatch]);

  const isRestricted = status === PAYOUT_STATUS_RESTRICTED;
  const isDismissible = status === PAYOUT_STATUS_MISSING;
  const showBanner =
    mounted && !!status && currentPage !== 'StripePayoutPage' && !(isDismissible && dismissed);

  if (!showBanner) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage?.setItem(SESSION_STORAGE_KEY, 'true');
    } catch (e) {
      // Session storage can be unavailable (e.g. privacy mode) — the banner
      // is then dismissed only until the next render of the Topbar.
    }
  };

  const dismissButtonMaybe = isDismissible ? (
    <button
      type="button"
      className={css.dismissButton}
      onClick={handleDismiss}
      aria-label={intl.formatMessage({ id: 'PayoutStatusBanner.dismiss' })}
    >
      <svg
        className={css.dismissIcon}
        width="10"
        height="10"
        viewBox="0 0 10 10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1 1l8 8M9 1L1 9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </button>
  ) : null;

  return (
    <div
      className={classNames(css.root, { [css.restricted]: isRestricted })}
      role={isRestricted ? 'alert' : 'status'}
    >
      <p className={css.text}>
        <FormattedMessage
          id={isRestricted ? 'PayoutStatusBanner.restrictedText' : 'PayoutStatusBanner.missingText'}
        />
      </p>
      <NamedLink name="StripePayoutPage" className={css.actionLink}>
        <FormattedMessage
          id={
            isRestricted
              ? 'PayoutStatusBanner.restrictedAction'
              : 'PayoutStatusBanner.missingAction'
          }
        />
      </NamedLink>
      {dismissButtonMaybe}
    </div>
  );
};

export default PayoutStatusBanner;
