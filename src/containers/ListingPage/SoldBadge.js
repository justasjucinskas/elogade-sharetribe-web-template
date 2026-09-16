import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';

import css from './ListingPage.module.css';

/**
 * "Sold" badge shown next to the title of a listing whose stock is 0. Rendered on the
 * server too, so crawlers see the sold state alongside the SoldOut Offer.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className]
 * @returns {JSX.Element}
 */
const SoldBadge = props => {
  const { className } = props;
  return (
    <span className={classNames(css.soldBadge, className)}>
      <FormattedMessage id="ListingPage.soldBadge" />
    </span>
  );
};

export default SoldBadge;
