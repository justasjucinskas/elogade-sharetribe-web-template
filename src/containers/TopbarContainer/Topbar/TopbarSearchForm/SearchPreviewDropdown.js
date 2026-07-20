import React, { useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { formatMoney } from '../../../../util/currency';
import { createSlug } from '../../../../util/urlHelpers';
import { NamedLink, ResponsiveImage } from '../../../../components';

import { queryPreviewListings, clearPreview } from '../../../../ducks/searchPreview.duck';
import css from './SearchPreviewDropdown.module.css';

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

const imageVariants = image => {
  const variants = image?.attributes?.variants || {};
  return Object.keys(variants).filter(k => k.startsWith('listing-card'));
};

const PreviewRow = ({ listing, onSelect, intl, isActive }) => {
  const id = listing?.id?.uuid;
  const { title = '', price } = listing?.attributes || {};
  const slug = createSlug(title);
  const firstImage = listing?.images?.[0];
  const priceText = price ? formatMoney(intl, price) : null;

  return (
    <NamedLink
      className={classNames(css.row, { [css.rowActive]: isActive })}
      name="ListingPage"
      params={{ id, slug }}
      onClick={onSelect}
      tabIndex={-1}
    >
      <div className={css.thumb}>
        <ResponsiveImage
          rootClassName={css.thumbImage}
          alt={title}
          image={firstImage}
          variants={imageVariants(firstImage)}
        />
      </div>
      <div className={css.rowInfo}>
        <span className={css.rowTitle}>{title}</span>
        {priceText ? <span className={css.rowPrice}>{priceText}</span> : null}
      </div>
    </NamedLink>
  );
};

/**
 * Live typeahead dropdown for the topbar keyword search. Debounced query against
 * the Marketplace API; renders thumbnail + title + price rows plus a
 * "see all results" link. Purely client-side (no SSR loadData).
 */
const SearchPreviewDropdownComponent = props => {
  const {
    keywords,
    isOpen,
    onSelect,
    listings,
    inProgress,
    onQuery,
    onClear,
    listboxId,
    optionId,
    activeIndex = -1,
  } = props;
  const intl = useIntl();
  const trimmed = (keywords || '').trim();
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!isOpen) {
      return undefined;
    }
    if (trimmed.length < MIN_CHARS) {
      onClear();
      return undefined;
    }
    timeoutRef.current = setTimeout(() => onQuery(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, isOpen]);

  if (!isOpen || trimmed.length < MIN_CHARS) {
    return null;
  }

  const hasResults = listings.length > 0;

  return (
    // preventDefault on mousedown keeps the input focused so row clicks register.
    // data-search-preview is the hook the dark topbar uses to reset its retinted
    // colour tokens on this panel — see TopbarDesktop.module.css.
    <div className={css.dropdown} onMouseDown={e => e.preventDefault()} data-search-preview>
      {/* Status text lives outside the listbox: only the result rows are options. */}
      {inProgress && !hasResults ? (
        <div className={css.message} role="status">
          <FormattedMessage id="TopbarSearchForm.searching" />
        </div>
      ) : null}

      {!inProgress && !hasResults ? (
        <div className={css.message} role="status">
          <FormattedMessage id="TopbarSearchForm.noResults" values={{ keywords: trimmed }} />
        </div>
      ) : null}

      {hasResults ? (
        <ul className={css.list} id={listboxId} role="listbox">
          {listings.map((listing, i) => (
            <li
              key={listing.id.uuid}
              id={optionId ? optionId(i) : undefined}
              role="option"
              aria-selected={i === activeIndex}
            >
              <PreviewRow
                listing={listing}
                onSelect={onSelect}
                intl={intl}
                isActive={i === activeIndex}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {hasResults ? (
        <NamedLink
          className={css.seeAll}
          name="SearchPage"
          to={{ search: `?keywords=${encodeURIComponent(trimmed)}` }}
          onClick={onSelect}
        >
          <FormattedMessage id="TopbarSearchForm.seeAllResults" values={{ keywords: trimmed }} />
        </NamedLink>
      ) : null}
    </div>
  );
};

const mapStateToProps = state => {
  const { listings, inProgress, error } = state.searchPreview;
  return { listings, inProgress, error };
};

const mapDispatchToProps = dispatch => ({
  onQuery: keywords => dispatch(queryPreviewListings(keywords)),
  onClear: () => dispatch(clearPreview()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SearchPreviewDropdownComponent);
