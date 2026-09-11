/**
 * Category-page SEO rules shared by the browser bundle (SearchPage.seo.js) and the
 * Express server (server/resources/sitemap.js, category sitemap).
 *
 * CommonJS on purpose: server/ has no ESM transpilation, and both sides must serialise the
 * canonical category URL identically or the sitemap <loc> and the page's rel=canonical drift.
 *
 * The search schema is fixed to `pub_categoryLevel1..3` (see getBuiltInCategorySpecs in
 * src/util/configHelpers.js), so the param names are hard-coded here rather than derived
 * from config.
 */

// A category (any level) with fewer live listings than this is `noindex,follow` on the
// page and excluded from the category sitemap.
const MIN_LISTINGS_FOR_INDEXING = 5;

const CATEGORY_LEVEL_PARAM_PREFIX = 'pub_categoryLevel';
const PAGE_PARAM = 'page';

/**
 * Parse a `page` query value into a positive integer, or null. Only plain decimal digits
 * are accepted (`1e2`, `0x10`, `2.0` are rejected) so the canonical never contains a page
 * number the search API would reject or reinterpret.
 */
const parsePageNumber = page => {
  const str = page == null ? '' : `${page}`;
  if (!/^\d+$/.test(str)) return null;
  const n = parseInt(str, 10);
  return n > 0 ? n : null;
};

/**
 * Build the canonical query string for a category search page: the category chain in
 * level order (level 1 first) followed by `page` when greater than 1.
 *
 * @param {Object} params
 * @param {Array<string>} [params.categoryIds] category ids from level 1 down (max 3)
 * @param {number|string} [params.page]
 * @returns {string} '' or a string starting with '?'
 */
const buildCategorySearch = ({ categoryIds = [], page } = {}) => {
  const params = new URLSearchParams();
  categoryIds.forEach((id, i) => params.append(`${CATEGORY_LEVEL_PARAM_PREFIX}${i + 1}`, id));
  const pageNumber = parsePageNumber(page);
  if (pageNumber != null && pageNumber > 1) {
    params.append(PAGE_PARAM, `${pageNumber}`);
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
};

module.exports = {
  MIN_LISTINGS_FOR_INDEXING,
  CATEGORY_LEVEL_PARAM_PREFIX,
  parsePageNumber,
  buildCategorySearch,
};
