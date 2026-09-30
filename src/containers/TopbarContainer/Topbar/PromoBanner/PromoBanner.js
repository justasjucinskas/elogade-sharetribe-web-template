import React, { useEffect, useState } from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { formatPromoLastDay, getActivePromo } from '../../../../util/promo';

import { NamedLink } from '../../../../components';

import { usePayoutStatus } from '../PayoutStatusBanner/PayoutStatusBanner';

import css from './PromoBanner.module.css';

const STORAGE_KEY = 'PromoBanner.dismissed';

// Pages where the bar would compete with the task at hand: authentication (the sign-up
// page carries its own promo panel), checkout, transactions and payout setup.
const HIDDEN_ON_PAGES = [
  'LoginPage',
  'SignupPage',
  'SignupForUserTypePage',
  'ConfirmPage',
  'CheckoutPage',
  'OrderDetailsPage',
  'SaleDetailsPage',
  'StripePayoutPage',
  'StripePayoutOnboardingPage',
  'EmailVerificationPage',
];

const readDismissedPromoId = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return null;
  }
};

const bold = chunks => <strong className={css.strong}>{chunks}</strong>;

/**
 * Site-wide promotion bar at the top of the Topbar (see config/configPromo.js). Logged-out
 * visitors are sent to sign up; logged-in users to create a listing (or to browse, when
 * their user type can't create listings). Dismissal is remembered per promo id.
 *
 * Rendered on the server too, so it doesn't shift the page after hydration; a visitor
 * who dismissed it sees it disappear right after the page loads.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.currentPage page name from route configuration
 * @param {boolean} props.isAuthenticated
 * @param {boolean} props.showCreateListingsLink whether the user can create listings
 * @returns {JSX.Element?} promo bar or null
 */
const PromoBanner = props => {
  const { currentPage, isAuthenticated, showCreateListingsLink } = props;
  const [dismissedPromoId, setDismissedPromoId] = useState(null);
  const intl = useIntl();
  const config = useConfiguration();
  const payoutStatus = usePayoutStatus();

  useEffect(() => {
    setDismissedPromoId(readDismissedPromoId());
  }, []);

  const promo = getActivePromo();
  // The payout warning is actionable, so it wins over the promo — two stacked bars would
  // only dilute both.
  const showBanner =
    !!promo &&
    promo.id !== dismissedPromoId &&
    !HIDDEN_ON_PAGES.includes(currentPage) &&
    !payoutStatus;

  if (!showBanner) {
    return null;
  }

  const handleDismiss = () => {
    setDismissedPromoId(promo.id);
    try {
      window.localStorage.setItem(STORAGE_KEY, promo.id);
    } catch (e) {
      // Storage can be unavailable (e.g. privacy mode) — the bar is then hidden only
      // until the next full page load.
    }
  };

  const date = formatPromoLastDay(intl, promo, 'long');
  const shortDate = formatPromoLastDay(intl, promo, 'short');
  const marketplaceName = config.marketplaceName;

  const arrow = (
    <span className={css.arrow} aria-hidden="true">
      →
    </span>
  );

  const link = !isAuthenticated ? (
    <NamedLink name="SignupPage" className={css.link}>
      <span className={css.wide}>
        <FormattedMessage id="PromoBanner.signupLink" />
      </span>
      <span className={css.narrow}>
        <FormattedMessage id="PromoBanner.signupLinkShort" />
      </span>
      {arrow}
    </NamedLink>
  ) : showCreateListingsLink ? (
    <NamedLink name="NewListingPage" className={css.link}>
      <FormattedMessage id="PromoBanner.createListingLink" />
      {arrow}
    </NamedLink>
  ) : (
    <NamedLink name="SearchPage" className={css.link}>
      <FormattedMessage id="PromoBanner.browseLink" />
      {arrow}
    </NamedLink>
  );

  return (
    <section className={css.root} aria-label={intl.formatMessage({ id: 'PromoBanner.label' })}>
      <p className={css.content}>
        <span className={css.wide}>
          {isAuthenticated ? (
            <FormattedMessage id="PromoBanner.textMember" values={{ date, marketplaceName }} />
          ) : (
            <FormattedMessage id="PromoBanner.text" values={{ date, b: bold }} />
          )}
        </span>
        <span className={css.narrow}>
          <FormattedMessage id="PromoBanner.textShort" values={{ date: shortDate, b: bold }} />
        </span>
        {link}
      </p>
      <button
        type="button"
        className={css.dismissButton}
        onClick={handleDismiss}
        aria-label={intl.formatMessage({ id: 'PromoBanner.dismiss' })}
      >
        <svg
          className={css.dismissIcon}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M1.5 1.5l9 9M10.5 1.5l-9 9"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </button>
    </section>
  );
};

export default PromoBanner;
