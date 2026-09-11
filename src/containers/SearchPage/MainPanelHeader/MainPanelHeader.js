import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';

import css from './MainPanelHeader.module.css';

/**
 * MainPanelHeader component
 *
 * Renders the page's single <h1> (the SEO heading computed in SearchPage.seo.js) with the
 * live result count in a sibling element, so the heading text stays stable while the count
 * changes with every search.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {React.Node} props.children - The children
 * @param {string} [props.heading] - The <h1> text. When omitted, the result count is rendered as the heading.
 * @param {React.Node} props.sortByComponent - The sort by component
 * @param {boolean} props.isSortByActive - Whether the sort by is active
 * @param {boolean} props.listingsAreLoaded - Whether the listings are loaded
 * @param {number} props.resultsCount - The results count
 * @param {boolean} props.searchInProgress - Whether the search is in progress
 * @param {React.Node} props.noResultsInfo - The no results info
 * @returns {JSX.Element}
 */
const MainPanelHeader = props => {
  const {
    rootClassName,
    className,
    children,
    heading,
    sortByComponent,
    isSortByActive,
    listingsAreLoaded,
    resultsCount,
    searchInProgress = false,
    noResultsInfo,
  } = props;

  const classes = classNames(rootClassName || css.root, className);

  const resultsSummary = (
    <span className={css.resultsFound}>
      {searchInProgress ? (
        <FormattedMessage id="MainPanelHeader.loadingResults" />
      ) : (
        <FormattedMessage id="MainPanelHeader.foundResults" values={{ count: resultsCount }} />
      )}
    </span>
  );

  return (
    <div className={classes}>
      <div className={css.searchOptions}>
        {heading ? (
          <div className={css.headingWrapper}>
            <h1 className={css.heading}>{heading}</h1>
            <p className={css.headingSummary}>{resultsSummary}</p>
          </div>
        ) : (
          <h1 className={css.searchResultSummary}>{resultsSummary}</h1>
        )}
        {isSortByActive ? (
          <div className={css.sortyByWrapper}>
            <span className={css.sortyBy}>
              <FormattedMessage id="MainPanelHeader.sortBy" />
            </span>
            {sortByComponent}
          </div>
        ) : null}
      </div>

      {children}

      {noResultsInfo ? noResultsInfo : null}
    </div>
  );
};

export default MainPanelHeader;
