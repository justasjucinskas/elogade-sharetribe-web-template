const { Readable } = require('stream');
const { SitemapIndexStream, SitemapStream, streamToPromise } = require('sitemap');
const log = require('../log.js');
const { createTTLCache } = require('../api-util/cache.js');
const { getRootURL } = require('../api-util/rootURL.js');
const sdkUtils = require('../api-util/sdk.js');
const { SUPPORTED_LOCALES, DEFAULT_LOCALE } = require('../../src/config/configLocale');
const { hasNonDefaultLocaleSuffix } = require('../../src/util/locale');
const {
  MIN_LISTINGS_FOR_INDEXING,
  CATEGORY_LEVEL_PARAM_PREFIX,
  buildCategorySearch,
} = require('../../src/util/categorySeo');

// For each user-visible path emit one <url> per supported locale, with
// <xhtml:link rel="alternate" hreflang="..."> siblings so search engines treat
// them as language variants of the same page. Paths are relative and must start
// with `/` (or be exactly `/`); absolute URLs would be silently rewritten under
// our own hostname by the URL constructor, so we reject them.
const withLocaleAlternates = path => {
  if (typeof path !== 'string' || path.length === 0 || !path.startsWith('/')) {
    throw new Error(
      `withLocaleAlternates: expected a relative path starting with '/', got ${JSON.stringify(
        path
      )}`
    );
  }
  const base = path === '/' ? '' : path;
  const buildHref = locale => `/${locale}${base}`;
  const buildLinks = () => [
    ...SUPPORTED_LOCALES.map(locale => ({ lang: locale, url: buildHref(locale) })),
    { lang: 'x-default', url: buildHref(DEFAULT_LOCALE) },
  ];
  // Each <url> gets its own `links` array so a future library/transform that
  // mutates `item.links` can't corrupt sibling entries.
  return SUPPORTED_LOCALES.map(locale => ({ url: buildHref(locale), links: buildLinks() }));
};

const expandPathsWithLocaleAlternates = paths => paths.flatMap(withLocaleAlternates);

const isSitemapDisabled = process.env.SITEMAP_DISABLED === 'true';
const dev = process.env.REACT_APP_ENV === 'development';

///////////////////////////////////////////////////////////////////////////////
// This file generates sitemaps.                                             //
// 1. The robotsTxt.js adds link to the sitemap-index.xml                    //
// 2. sitemap-index.xml links to 4 different sub sitemaps:                   //
//   a. sitemap-default.xml                                                  //
//     - Contains links to public built-in pages of the client app.          //
//     - It also shows landing-page, terms-of-service and privacy-policy     //
//       pages as they have fixed paths unlike other CMS pages.              //
//   b. sitemap-categories.xml                                               //
//     - Category search pages (/s?pub_categoryLevel1=...) for every         //
//       category, at any level, with at least MIN_LISTINGS_FOR_INDEXING     //
//       live listings. Counted at generation time with the same stock       //
//       filter SearchPage uses, so the sitemap and the page's noindex agree //
//   c. sitemap-recent-listings.xml                                          //
//     - Every live (published, in-stock) listing, max 10 000                //
//   d. sitemap-recent-pages.xml                                             //
//     - This contains Pages, which are shown from path /p/:pageId           //
//     - Does not contain landing-page, terms-of-service and privacy-policy  //
//                                                                           //
// Every entry is expanded to one <url> per supported locale with hreflang   //
// alternates (withLocaleAlternates). /<locale>/sitemap-*.xml serves the     //
// same document as /sitemap-*.xml (see stripLocaleFromResourcePath in       //
// server/localeMiddleware.js) and /sitemap.xml 301s to /sitemap-index.xml.  //
//                                                                           //
// Note: There's simple memory cache in use (ttl = 1 hour).                  //
//       These middlewares also add cache control headers, but googlebot     //
//       does not respect those.                                             //
//       Other tags than <loc> are omitted:                                  //
//       - Google ignores <priority> and <changefreq> values.                //
//       - Google uses the <lastmod> value only if it's consistently and     //
//         verifiably accurate. This is hard to detect reliably on API level //
//         as data entity might have changed, but page UI is not.            //
///////////////////////////////////////////////////////////////////////////////

// The default sitemap (/sitemap-default.xml) contains public built-in pages.
// If you create new pages that are accessible by unauthenticated user,
// you can add them here.
//
// Note 1: The value of these key-value pairs should be the locale-free path string.
//         Each path is expanded into one <url> entry per supported locale (with
//         <xhtml:link rel="alternate" hreflang="..."> siblings) by
//         expandPathsWithLocaleAlternates below.
//
// Note 2: landing page (/), /terms-of-service, and /privacy-policy are fixed routes on this client app
//       even though the content comes from hosted assets
//
// Note 3: /signup and /login are `noindex,follow` (AuthenticationPage) and the bare /s
//         search page is a thin duplicate of the category pages, so none of them are
//         submitted. Category searches come from sitemap-categories.xml.
const defaultPublicPaths = {
  landingPage: '/',
  termsOfService: '/terms-of-service',
  privacyPolicy: '/privacy-policy',
};

// Time-to-live (ttl) is one hour. The server never observes listing lifecycle
// events, so a short TTL is the agreed substitute for event-driven regeneration.
const ttl = 3600; // seconds
const cache = createTTLCache(ttl);

// The same stock filter SearchPage.duck.js applies when no dates filter is in use.
// Using it here keeps "live listing" consistent between the page (noindex threshold),
// the category sitemap (inclusion threshold) and the listings sitemap (membership).
const LIVE_LISTING_FILTERS = { minStock: 1, stockMode: 'match-undefined' };

// The Marketplace API search schema supports three category levels.
const MAX_CATEGORY_DEPTH = 3;
// Parallel count queries while generating sitemap-categories.xml.
const CATEGORY_COUNT_CONCURRENCY = 5;
// Listings sitemap pagination. The sitemap protocol caps a file at 50 000 URLs;
// we emit one <url> per locale, so 10 000 listings is the safe upper bound.
const LISTINGS_PER_PAGE = 100;
const MAX_SITEMAP_LISTINGS = 10000;

const CATEGORIES_ASSET_PATH = '/listings/listing-categories.json';

const EMPTY_URLSET = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"></urlset>`;

/**
 * Flatten the Console category tree into id chains, one per category at any level:
 * [['phones'], ['phones', 'smartphones'], ...]. Entries without a string id are
 * skipped together with their subtree; depth is capped at MAX_CATEGORY_DEPTH.
 *
 * @param {Array} categories `categories` from listing-categories.json
 * @param {Array<string>} parentIds
 * @returns {Array<Array<string>>}
 */
const flattenCategoryTree = (categories, parentIds = []) => {
  if (!Array.isArray(categories) || parentIds.length >= MAX_CATEGORY_DEPTH) return [];
  return categories.flatMap(category => {
    const id = category?.id;
    if (typeof id !== 'string' || id.length === 0) return [];
    const ids = [...parentIds, id];
    return [ids, ...flattenCategoryTree(category.subcategories, ids)];
  });
};

/**
 * Map `ids` (level 1 first) to the `pub_categoryLevelN` query params the
 * Marketplace API expects.
 */
const categoryQueryParams = ids =>
  Object.fromEntries(ids.map((id, i) => [`${CATEGORY_LEVEL_PARAM_PREFIX}${i + 1}`, id]));

/**
 * Run `fn` over `items` with at most `limit` promises in flight. Results keep the
 * input order. Rejections propagate (the caller decides whether to fail closed).
 */
const mapWithConcurrency = (items, limit, fn) => {
  const results = new Array(items.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  };
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  return Promise.all(workers).then(() => results);
};

const fetchCategoryTree = sdk =>
  sdk
    .assetsByAlias({ paths: [CATEGORIES_ASSET_PATH], alias: 'latest' })
    .then(response => response?.data?.data?.[0]?.attributes?.data?.categories || []);

const countLiveListings = (sdk, ids) =>
  sdk.listings
    .query({ ...categoryQueryParams(ids), ...LIVE_LISTING_FILTERS, perPage: 1 })
    .then(response => response?.data?.meta?.totalItems || 0);

/**
 * Category search paths that have at least MIN_LISTINGS_FOR_INDEXING live listings,
 * serialised with buildCategorySearch so <loc> equals the page's rel=canonical.
 * Any failed count query rejects: a sitemap silently missing categories for an hour
 * is worse than a 500 the crawler retries.
 *
 * @param {Object} sdk
 * @returns {Promise<Array<string>>} locale-free paths, e.g. '/s?pub_categoryLevel1=phones'
 */
const getIndexableCategoryPaths = sdk =>
  fetchCategoryTree(sdk)
    .then(flattenCategoryTree)
    .then(chains =>
      mapWithConcurrency(chains, CATEGORY_COUNT_CONCURRENCY, ids =>
        countLiveListings(sdk, ids).then(totalItems => ({ ids, totalItems }))
      )
    )
    .then(counts =>
      counts
        .filter(({ totalItems }) => totalItems >= MIN_LISTINGS_FOR_INDEXING)
        .map(({ ids }) => `/s${buildCategorySearch({ categoryIds: ids })}`)
    );

/**
 * Every live listing as a locale-free `/l/<uuid>` path, newest first, capped at
 * MAX_SITEMAP_LISTINGS. Uses listings.query instead of sdk.sitemapData because the
 * latter is cached up to 24 h on the API side and does not filter out sold-out
 * (stock 0) listings.
 *
 * @param {Object} sdk
 * @returns {Promise<Array<string>>}
 */
const fetchLiveListingPaths = async sdk => {
  const paths = [];
  const maxPages = Math.ceil(MAX_SITEMAP_LISTINGS / LISTINGS_PER_PAGE);
  for (let page = 1; page <= maxPages; page++) {
    const response = await sdk.listings.query({
      ...LIVE_LISTING_FILTERS,
      'fields.listing': ['state'],
      perPage: LISTINGS_PER_PAGE,
      page,
    });
    const listings = response?.data?.data || [];
    listings.forEach(l => {
      // Drop listings without a uuid so we don't publish `/l/undefined` (now
      // multiplied across locales) to crawlers.
      const uuid = l?.id?.uuid;
      if (uuid && paths.length < MAX_SITEMAP_LISTINGS) paths.push(`/l/${uuid}`);
    });
    const totalPages = response?.data?.meta?.totalPages || 0;
    if (page >= totalPages || listings.length < LISTINGS_PER_PAGE) break;
  }
  return paths;
};

/**
 * Render a <urlset> for the given locale-free paths.
 *
 * @param {String} rootUrl
 * @param {Array<string>} paths
 * @returns {Promise<Buffer|string>}
 */
const renderUrlset = (rootUrl, paths) => {
  if (paths.length === 0) return Promise.resolve(EMPTY_URLSET);
  const smStream = new SitemapStream({ hostname: rootUrl });
  Readable.from(expandPathsWithLocaleAlternates(paths)).pipe(smStream);
  return streamToPromise(smStream);
};

const renderSitemapIndex = (rootUrl, sitemapPaths) => {
  const smiStream = new SitemapIndexStream({ level: 'warn' });
  sitemapPaths.forEach(sitemapPath => smiStream.write({ url: `${rootUrl}${sitemapPath}` }));
  // Since we manually add content to the stream, we need to close it.
  smiStream.end();
  return streamToPromise(smiStream);
};

// Renders in progress, by cache key. Requests that miss the cache while a render
// is already running await that render instead of starting another fan-out of
// API queries (relevant every hour when the TTL expires under crawler traffic).
const inFlight = new Map();

const renderOnce = (cacheKey, render) => {
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);
  const pending = Promise.resolve()
    .then(render)
    .then(xml => {
      cache[cacheKey] = xml;
      return xml;
    })
    .finally(() => inFlight.delete(cacheKey));
  inFlight.set(cacheKey, pending);
  return pending;
};

/**
 * Send the cached document for `cacheKey`, or build it with `render`, cache it and
 * send it. Concurrent misses share one render. Failures log and return 500 without
 * caching.
 */
const sendSitemap = (res, cacheKey, render, logKey) => {
  res.set({
    'Content-Type': 'application/xml',
    'Cache-Control': `public, max-age=${ttl}`,
  });

  const { data, timestamp } = cache[cacheKey];
  if (data && timestamp) {
    const age = Math.floor((Date.now() - timestamp) / 1000);
    res.set('Age', age);
    res.send(data);
    return Promise.resolve();
  }

  return renderOnce(cacheKey, render)
    .then(xml => {
      res.send(xml);
    })
    .catch(e => {
      log.error(e, logKey);
      res.status(500).end();
    });
};

/////////////////////////////////////////////
// Handlers for /sitemap-* prefixed routes //
/////////////////////////////////////////////

/**
 * This sitemap-index.xml links to the sub sitemaps:
 * - sitemap-default.xml
 * - sitemap-categories.xml (public marketplaces only)
 * - sitemap-recent-listings.xml (public marketplaces only)
 * - sitemap-recent-pages.xml
 *
 * @param {Object} req request
 * @param {Object} res response
 * @param {String} rootUrl location from where these sitemap paths can be found
 * @param {Boolean} isPrivateMarketplace is private marketplace mode set
 */
const sitemapIndex = (req, res, rootUrl, isPrivateMarketplace) => {
  const sitemaps = isPrivateMarketplace
    ? ['/sitemap-default.xml', '/sitemap-recent-pages.xml']
    : [
        '/sitemap-default.xml',
        '/sitemap-categories.xml',
        '/sitemap-recent-listings.xml',
        '/sitemap-recent-pages.xml',
      ];
  return sendSitemap(
    res,
    'sitemapIndex',
    () => renderSitemapIndex(rootUrl, sitemaps),
    'sitemap-index-render-failed'
  );
};

/**
 * The default sitemap contains links to public built-in pages of the client app.
 * It also shows landing-page, terms-of-service, and privacy-policy pages
 * as they have fixed paths unlike other CMS pages.
 *
 * @param {Object} req request
 * @param {Object} res response
 * @param {String} rootUrl location from where these sitemap paths can be found
 */
const sitemapDefault = (req, res, rootUrl) => {
  return sendSitemap(
    res,
    'sitemapDefault',
    () => renderUrlset(rootUrl, Object.values(defaultPublicPaths)),
    'sitemap-default-render-failed'
  );
};

/**
 * Category search pages with enough live listings to be indexable.
 *
 * @param {Object} req request
 * @param {Object} res response
 * @param {String} rootUrl location from where these sitemap paths can be found
 * @param {Object} sdk
 */
const sitemapCategories = (req, res, rootUrl, sdk) => {
  return sendSitemap(
    res,
    'sitemapCategories',
    () => getIndexableCategoryPaths(sdk).then(paths => renderUrlset(rootUrl, paths)),
    'sitemap-categories-render-failed'
  );
};

/**
 * This listings sitemap returns every live listing, max 10 000.
 *
 * @param {Object} req request
 * @param {Object} res response
 * @param {String} rootUrl location from where these sitemap paths can be found
 * @param {Object} sdk
 */
const sitemapListings = (req, res, rootUrl, sdk) => {
  return sendSitemap(
    res,
    'sitemapRecentListings',
    () =>
      fetchLiveListingPaths(sdk)
        .then(paths => renderUrlset(rootUrl, paths))
        .catch(e => {
          // Private marketplace mode might throw
          if (e.status === 403) return EMPTY_URLSET;
          throw e;
        }),
    'sitemap-recent-listings-render-failed'
  );
};

/**
 * The recent pages sitemap contains Pages, which are shown from path /p/:pageId
 * However, it does not contain landing-page, terms-of-service and privacy-policy
 * as those pages have hard-coded paths too: '/', '/terms-of-service', adn '/privacy-policy'.
 *
 * @param {Object} req request
 * @param {Object} res response
 * @param {String} rootUrl location from where these sitemap paths can be found
 * @param {Object} sdk
 */
const sitemapPages = (req, res, rootUrl, sdk) => {
  const pathPrefix = '/content/pages/';
  const fetchPagePaths = () =>
    sdk.sitemapData.queryAssets({ pathPrefix }).then(response => {
      const assets = response.data.data || [];

      // Pick those asset paths that CMSPage component renders. Locale-suffixed
      // slugs (e.g. `about-lt`) are the operator-authored LT variants of base
      // pages; they're served from the base URL on the LT locale and rejected
      // when accessed directly (CMSPage.duck.js uses the same helper), so they
      // don't get their own sitemap entry.
      const permanentPaths = ['landing-page', 'terms-of-service', 'privacy-policy'];
      return assets.reduce((picked, asset) => {
        const assetFileName = asset.attributes?.assetPath?.slice(pathPrefix.length);
        if (!assetFileName) return picked;
        const assetName = assetFileName.split('.')[0];
        if (!assetName) return picked;
        if (permanentPaths.includes(assetName)) return picked;
        if (hasNonDefaultLocaleSuffix(assetName)) return picked;
        return [...picked, `/p/${assetName}`];
      }, []);
    });

  return sendSitemap(
    res,
    'sitemapRecentPages',
    () => fetchPagePaths().then(paths => renderUrlset(rootUrl, paths)),
    'sitemap-recent-pages-render-failed'
  );
};

/**
 * Render different sitemap resources.
 *
 * @param {Object} req request
 * @param {Object} res response
 * @param {function} next
 * @param {Object} sdk
 * @param {Boolean} isPrivateMarketplace
 */
const handleSitemaps = (req, res, next, sdk, isPrivateMarketplace) => {
  const resource = req.params.resource;
  const parts = resource.split('.');
  const sitemapResource = parts[0];
  // Resolve hostname inside the request
  const rootUrl = getRootURL();

  if (sitemapResource === 'index') {
    sitemapIndex(req, res, getRootURL({ useDevApiServerPort: true }), isPrivateMarketplace);
  } else if (sitemapResource === 'default') {
    sitemapDefault(req, res, rootUrl);
  } else if (sitemapResource === 'categories' && !isPrivateMarketplace) {
    sitemapCategories(req, res, rootUrl, sdk);
  } else if (sitemapResource === 'recent-listings' && !isPrivateMarketplace) {
    sitemapListings(req, res, rootUrl, sdk);
  } else if (sitemapResource === 'recent-pages') {
    sitemapPages(req, res, rootUrl, sdk);
  } else {
    // If none of the resource-routes mapped, we pass this forward.
    next();
  }
};

/**
 * Route: "sitemap-:resource". resource can point to index, default, categories,
 * recent-listings, or recent-pages.
 *
 * @param {Object} req request
 * @param {Object} res response
 * @param {function} next
 */
const sitemapRoute = (req, res, next) => {
  // Making it a bit faster to react to DDOS attacks, since the generation is a bit resource intensive.
  // You might want to consider adding cron job and avoid sitemap generation on request time.
  if (isSitemapDisabled) {
    res.status(503).end();
    console.log('Sitemap functionality is disabled.'); // eslint-disable-line no-console
    return;
  }

  const sdk = sdkUtils.getSdk(req, res);
  sdkUtils
    .fetchAccessControlAsset(sdk)
    .then(response => {
      const accessControlAsset = response.data.data[0];

      const { marketplace } =
        accessControlAsset?.type === 'jsonAsset' ? accessControlAsset.attributes.data : {};
      const isPrivateMarketplace = marketplace?.private === true;
      handleSitemaps(req, res, next, sdk, isPrivateMarketplace);
    })
    .catch(e => {
      const is404 = e.status === 404;
      if (is404) {
        // If access-control.json asset is not found, we default to "public" marketplace.
        handleSitemaps(req, res, next, sdk, false);

        if (dev) {
          // Log error
          console.error('sitemap-render-failed-no-asset-found');
        }
      } else {
        next();
      }
    });
};

/**
 * Route: "/sitemap.xml". The conventional sitemap location has no document of its
 * own; send crawlers permanently to the index.
 */
const sitemapXmlRedirect = (req, res) => {
  res.set('Cache-Control', `public, max-age=${ttl}`);
  res.redirect(301, '/sitemap-index.xml');
};

module.exports = {
  sitemapRoute,
  sitemapXmlRedirect,
  // Exported for tests
  withLocaleAlternates,
  flattenCategoryTree,
  getIndexableCategoryPaths,
  fetchLiveListingPaths,
  renderUrlset,
  sitemapIndex,
  sitemapDefault,
  sitemapCategories,
  sitemapListings,
  sitemapPages,
  LIVE_LISTING_FILTERS,
  MAX_SITEMAP_LISTINGS,
  ttl,
};
