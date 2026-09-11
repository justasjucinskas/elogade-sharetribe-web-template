import { constructQueryParamName } from '../../util/search';
import { formatCategoryName } from '../../util/hostedLabels';

/**
 * SEO data for SearchPage: canonical query string, robots directive, <title>, meta
 * description, the visible <h1>, and the JSON-LD graph (CollectionPage + BreadcrumbList).
 *
 * Everything here is pure so it can be unit-tested without rendering. The decisions it
 * encodes (see SEO-PLAN.md):
 *  - Category facets (`pub_categoryLevel1..3`) and `page` (> 1) are the only indexable URL
 *    parameters. Every other parameter is stripped from the canonical, so a stacked-facet URL
 *    rolls up to the clean category URL.
 *  - A category with fewer than MIN_LISTINGS_FOR_INDEXING live listings is `noindex,follow`.
 *    That directive is only emitted on the clean category URL: a stacked-facet URL already
 *    canonicals to the clean one and must not also carry noindex.
 *  - Per-category copy lives in `SearchPage.category.<level1 id>.h1` / `.description`
 *    translation keys. Categories without bespoke copy fall back to the localised category
 *    label plus a generic description template.
 */

export const MIN_LISTINGS_FOR_INDEXING = 5;

const PAGE_PARAM = 'page';

const queryParamNameForLevel = levelKey => constructQueryParamName(levelKey, 'public');

/**
 * Sorted, encoded query string without the leading `?`. Used to compare two search strings
 * regardless of parameter order. Values are compared as strings (no numeric coercion), so a
 * numeric-looking category id survives intact.
 */
const normalizeSearch = search => {
  const params = new URLSearchParams(search || '');
  params.sort();
  return params.toString();
};

/**
 * Walk the category tree along the `pub_categoryLevelN` parameters and return the selected
 * chain, deepest last. The walk stops at the first missing or unknown level, so a
 * `pub_categoryLevel2` without a valid `pub_categoryLevel1` is ignored.
 *
 * @param {Object} searchParams parsed URL query params (e.g. `searchParamsInURL`)
 * @param {Object} categoryConfiguration `config.categoryConfiguration`
 * @param {Object} intl react-intl instance for localised names
 * @returns {Array<{ id: string, name: string, level: number, paramKey: string }>}
 */
export const getSelectedCategoryPath = (searchParams, categoryConfiguration, intl) => {
  const { categoryLevelKeys = [], categories = [] } = categoryConfiguration || {};
  const path = [];
  let currentCategories = categories;

  for (let i = 0; i < categoryLevelKeys.length; i++) {
    const paramKey = queryParamNameForLevel(categoryLevelKeys[i]);
    const rawValue = searchParams?.[paramKey];
    if (rawValue == null || rawValue === '') {
      break;
    }
    const value = `${rawValue}`;
    const found = currentCategories.find(c => c.id === value);
    if (!found) {
      break;
    }
    path.push({
      id: found.id,
      name: formatCategoryName(intl, found.id, found.name),
      level: i + 1,
      paramKey,
    });
    currentCategories = found.subcategories || [];
  }

  return path;
};

/**
 * Build the canonical query string for a search page: the validated category chain (in level
 * order) followed by `page` when it is greater than 1. Returns '' when nothing is kept.
 *
 * @param {Object} params
 * @param {Array} params.categoryPath result of getSelectedCategoryPath
 * @param {number|string} [params.page]
 * @returns {string} '' or a string starting with '?'
 */
export const getCanonicalSearch = ({ categoryPath = [], page } = {}) => {
  const params = new URLSearchParams();
  categoryPath.forEach(c => params.append(c.paramKey, c.id));
  const pageNumber = Number(page);
  if (Number.isInteger(pageNumber) && pageNumber > 1) {
    params.append(PAGE_PARAM, `${pageNumber}`);
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
};

/**
 * True when the URL's query string carries nothing beyond what the canonical keeps.
 */
export const isCleanCategoryUrl = (search, canonicalSearch) =>
  normalizeSearch(search) === normalizeSearch(canonicalSearch);

const hasMessage = (intl, id) => !!intl?.messages?.[id];

const listingCanonicalUrl = (localeBase, listing) => `${localeBase}/l/${listing.id.uuid}`;

/**
 * Compute everything SearchPage needs for <Page> and the visible heading.
 *
 * @param {Object} params
 * @param {Object} params.intl
 * @param {Object} params.config merged app config (marketplaceName, marketplaceRootURL)
 * @param {string} params.currentLocale URL locale ('en' | 'lt' | 'pl')
 * @param {string} [params.searchPath='/s'] locale-free pathname of the search route
 * @param {Object} [params.searchParamsInURL] parsed URL params (keywords/address read from here)
 * @param {Array} params.categoryPath result of getSelectedCategoryPath
 * @param {string} params.canonicalSearch result of getCanonicalSearch
 * @param {boolean} params.isCleanUrl result of isCleanCategoryUrl
 * @param {number} params.totalItems live result count for the current query
 * @param {boolean} params.listingsAreLoaded whether totalItems reflects the current query
 * @param {Array} [params.listings] listings on the current page (for the ItemList)
 * @returns {{ title: string, description: string, h1: string, noIndex: boolean, schema: Array }}
 */
export const getSearchPageSeo = ({
  intl,
  config,
  currentLocale,
  searchPath = '/s',
  searchParamsInURL = {},
  categoryPath = [],
  canonicalSearch = '',
  isCleanUrl = true,
  totalItems = 0,
  listingsAreLoaded = false,
  listings = [],
}) => {
  const marketplaceName = config.marketplaceName;
  const localeBase = `${config.marketplaceRootURL}/${currentLocale}`;
  const searchBase = `${localeBase}${searchPath}`;
  const pageUrl = `${searchBase}${canonicalSearch}`;
  const count = totalItems;

  const hasCategory = categoryPath.length > 0;
  const deepest = hasCategory ? categoryPath[categoryPath.length - 1] : null;
  const { keywords, address } = searchParamsInURL || {};
  const query = keywords || address;

  let h1;
  let title;
  let description;

  if (hasCategory) {
    const level1 = categoryPath[0];
    const isLevel1Only = categoryPath.length === 1;
    const h1Key = `SearchPage.category.${level1.id}.h1`;
    const descriptionKey = `SearchPage.category.${level1.id}.description`;

    h1 = isLevel1Only && hasMessage(intl, h1Key) ? intl.formatMessage({ id: h1Key }) : deepest.name;
    description =
      isLevel1Only && hasMessage(intl, descriptionKey)
        ? intl.formatMessage({ id: descriptionKey }, { count })
        : intl.formatMessage(
            { id: 'SearchPage.categoryDescriptionFallback' },
            { category: deepest.name, count, marketplaceName }
          );
    title = `${h1} | ${marketplaceName}`;
  } else if (query) {
    h1 = intl.formatMessage({ id: 'SearchPage.keywordsHeading' }, { keywords: query });
    title = intl.formatMessage(
      { id: 'SearchPage.keywordsTitle' },
      { keywords: query, marketplaceName }
    );
    description = intl.formatMessage(
      { id: 'SearchPage.allListingsDescription' },
      { count, marketplaceName }
    );
  } else {
    h1 = intl.formatMessage({ id: 'SearchPage.allListingsHeading' });
    title = intl.formatMessage({ id: 'SearchPage.allListingsTitle' }, { marketplaceName });
    description = intl.formatMessage(
      { id: 'SearchPage.allListingsDescription' },
      { count, marketplaceName }
    );
  }

  const noIndex =
    hasCategory && isCleanUrl && listingsAreLoaded && totalItems < MIN_LISTINGS_FOR_INDEXING;

  const itemListElement = listings.map((l, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    url: listingCanonicalUrl(localeBase, l),
    name: l.attributes.title,
  }));

  const collectionPage = {
    '@type': 'CollectionPage',
    '@id': `${pageUrl}#page`,
    name: title,
    description,
    url: pageUrl,
    mainEntity: {
      '@type': 'ItemList',
      name: h1,
      numberOfItems: totalItems,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement,
    },
  };

  const trailItems = hasCategory
    ? categoryPath.map((c, i) => ({
        name: c.name,
        item: `${searchBase}${getCanonicalSearch({ categoryPath: categoryPath.slice(0, i + 1) })}`,
      }))
    : [{ name: intl.formatMessage({ id: 'SearchPage.allListingsHeading' }), item: searchBase }];

  const breadcrumbList = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { name: intl.formatMessage({ id: 'SearchPage.breadcrumbHome' }), item: localeBase },
      ...trailItems,
    ].map((entry, i) => ({ '@type': 'ListItem', position: i + 1, ...entry })),
  };

  return {
    title,
    description,
    h1,
    noIndex,
    schema: [collectionPage, breadcrumbList],
  };
};
