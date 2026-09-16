import React from 'react';

import { FormattedMessage } from '../../util/reactIntl';

import css from './ListingPage.module.css';

/**
 * "Sold" badge shown next to the title of a listing whose stock is 0. Rendered on the
 * server too, so crawlers see the sold state alongside the SoldOut Offer.
 *
 * @component
 * @returns {JSX.Element}
 */
const SoldBadge = () => (
  <span className={css.soldBadge}>
    <FormattedMessage id="ListingPage.soldBadge" />
  </span>
);

export default SoldBadge;
