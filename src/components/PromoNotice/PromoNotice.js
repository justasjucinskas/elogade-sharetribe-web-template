import React from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { formatPromoLastDay, getActivePromo } from '../../util/promo';

import css from './PromoNotice.module.css';

const IconTag = () => (
  <svg
    className={css.icon}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
  </svg>
);

/**
 * Inline notice about the running promotion (see config/configPromo.js), shown where money
 * is decided: the listing pricing step (seller) and the checkout breakdown (buyer).
 * Renders nothing when no promotion is running.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to component's own css.root
 * @param {('seller'|'buyer')} props.variant which side of the transaction reads it
 * @returns {JSX.Element?} notice or null
 */
const PromoNotice = props => {
  const { className, variant = 'seller' } = props;
  const intl = useIntl();
  const config = useConfiguration();

  const promo = getActivePromo();
  if (!promo) {
    return null;
  }

  const date = formatPromoLastDay(intl, promo, 'long');
  const marketplaceName = config.marketplaceName;
  const isSeller = variant === 'seller';

  return (
    <div className={classNames(css.root, className)}>
      <p className={css.title}>
        <IconTag />
        <FormattedMessage
          id={isSeller ? 'PromoNotice.sellerTitle' : 'PromoNotice.buyerTitle'}
          values={{ date }}
        />
      </p>
      <p className={css.text}>
        <FormattedMessage
          id={isSeller ? 'PromoNotice.sellerText' : 'PromoNotice.buyerText'}
          values={{ date, marketplaceName }}
        />
      </p>
    </div>
  );
};

export default PromoNotice;
