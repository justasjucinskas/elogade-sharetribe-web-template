import React from 'react';

import { FormattedMessage } from '../../util/reactIntl';

import { Heading, ListingCard } from '../../components';

import css from './ListingPage.module.css';

// The grid is 1 / 2 / 3 / 4 columns (see .similarListingsGrid), so the card image never
// needs more than a quarter of the viewport on desktop.
const cardRenderSizes = [
  '(max-width: 549px) 100vw',
  '(max-width: 767px) 50vw',
  '(max-width: 1023px) 33vw',
  '25vw',
].join(', ');

/**
 * "Similar listings" module: live listings from the same category and price band
 * (queried by ListingPage.duck's loadData, so it is part of the server-rendered HTML).
 * Renders nothing when there is nothing to show.
 *
 * @component
 * @param {Object} props
 * @param {Array<Object>} props.listings denormalised listing entities
 * @returns {JSX.Element|null}
 */
const SectionSimilarListings = props => {
  const { listings = [] } = props;
  if (listings.length === 0) {
    return null;
  }

  return (
    <section className={css.sectionSimilarListings} data-testid="similar-listings">
      <Heading as="h2" rootClassName={css.similarListingsHeading}>
        <FormattedMessage id="ListingPage.similarListingsHeading" />
      </Heading>
      <ul className={css.similarListingsGrid}>
        {listings.map(l => (
          <li key={l.id.uuid} className={css.similarListingsItem}>
            <ListingCard
              className={css.similarListingCard}
              listing={l}
              renderSizes={cardRenderSizes}
            />
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SectionSimilarListings;
