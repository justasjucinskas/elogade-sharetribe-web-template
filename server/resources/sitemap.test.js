const {
  flattenCategoryTree,
  getIndexableCategoryPaths,
  fetchLiveListingPaths,
  renderUrlset,
  sitemapIndex,
  sitemapDefault,
  sitemapCategories,
  sitemapListings,
  sitemapPages,
  sitemapXmlRedirect,
  withLocaleAlternates,
  LIVE_LISTING_FILTERS,
  MAX_SITEMAP_LISTINGS,
  ttl,
} = require('./sitemap');
const { MIN_LISTINGS_FOR_INDEXING } = require('../../src/util/categorySeo');

jest.mock('../log.js', () => ({ error: jest.fn() }));

const ROOT = 'https://www.example.com';

const buildRes = () => {
  const res = {
    headers: {},
    statusCode: 200,
    body: null,
    ended: false,
    set: jest.fn((key, value) => {
      if (typeof key === 'object') Object.assign(res.headers, key);
      else res.headers[key] = value;
      return res;
    }),
    status: jest.fn(code => {
      res.statusCode = code;
      return res;
    }),
    send: jest.fn(body => {
      res.body = body == null ? body : body.toString();
      return res;
    }),
    end: jest.fn(() => {
      res.ended = true;
      return res;
    }),
    redirect: jest.fn(),
  };
  return res;
};

const countMatches = (xml, needle) => xml.split(needle).length - 1;

// The sitemap module caches per resource for `ttl`; each cached test below uses a
// distinct rootUrl or query shape only where the cache key differs, so tests that
// share a cache key are ordered "first render → then cached".

describe('withLocaleAlternates', () => {
  it('emits one <url> per locale, each with all alternates and x-default', () => {
    const entries = withLocaleAlternates('/s?pub_categoryLevel1=phones');
    expect(entries.map(e => e.url)).toEqual([
      '/en/s?pub_categoryLevel1=phones',
      '/lt/s?pub_categoryLevel1=phones',
      '/pl/s?pub_categoryLevel1=phones',
    ]);
    entries.forEach(entry => {
      expect(entry.links.map(l => l.lang)).toEqual(['en', 'lt', 'pl', 'x-default']);
      expect(entry.links[3].url).toBe('/en/s?pub_categoryLevel1=phones');
    });
  });

  it('rejects absolute URLs', () => {
    expect(() => withLocaleAlternates('https://evil.example/x')).toThrow();
  });
});

describe('flattenCategoryTree', () => {
  it('returns one id chain per category at every level, parent first', () => {
    const tree = [
      {
        id: 'phones',
        name: 'Phones',
        subcategories: [
          { id: 'smartphones', subcategories: [] },
          { id: 'cases', subcategories: [{ id: 'leather', subcategories: [] }] },
        ],
      },
      { id: 'audio' },
    ];
    expect(flattenCategoryTree(tree)).toEqual([
      ['phones'],
      ['phones', 'smartphones'],
      ['phones', 'cases'],
      ['phones', 'cases', 'leather'],
      ['audio'],
    ]);
  });

  it('skips entries without a string id and stops at three levels', () => {
    const tree = [
      { name: 'no id', subcategories: [{ id: 'orphan' }] },
      {
        id: 'a',
        subcategories: [{ id: 'b', subcategories: [{ id: 'c', subcategories: [{ id: 'd' }] }] }],
      },
    ];
    expect(flattenCategoryTree(tree)).toEqual([['a'], ['a', 'b'], ['a', 'b', 'c']]);
  });

  it('tolerates a missing tree', () => {
    expect(flattenCategoryTree(undefined)).toEqual([]);
    expect(flattenCategoryTree(null)).toEqual([]);
  });
});

const buildCategorySdk = countsByKey => {
  const listingsQuery = jest.fn(params => {
    const key = [params.pub_categoryLevel1, params.pub_categoryLevel2, params.pub_categoryLevel3]
      .filter(Boolean)
      .join('/');
    const totalItems = countsByKey[key] || 0;
    return Promise.resolve({ data: { data: [], meta: { totalItems } } });
  });
  return {
    assetsByAlias: jest.fn(() =>
      Promise.resolve({
        data: {
          data: [
            {
              type: 'jsonAsset',
              attributes: {
                data: {
                  categories: [
                    {
                      id: 'phones',
                      subcategories: [{ id: 'smartphones' }, { id: 'cases' }],
                    },
                    { id: 'audio', subcategories: [] },
                    { id: 'cameras', subcategories: [] },
                  ],
                },
              },
            },
          ],
        },
      })
    ),
    listings: { query: listingsQuery },
  };
};

describe('getIndexableCategoryPaths', () => {
  it('keeps categories at or above the threshold, at any level, as canonical search paths', async () => {
    const sdk = buildCategorySdk({
      phones: 20,
      'phones/smartphones': MIN_LISTINGS_FOR_INDEXING,
      'phones/cases': MIN_LISTINGS_FOR_INDEXING - 1,
      audio: 7,
      cameras: 0,
    });

    const paths = await getIndexableCategoryPaths(sdk);

    expect(paths).toEqual([
      '/s?pub_categoryLevel1=phones',
      '/s?pub_categoryLevel1=phones&pub_categoryLevel2=smartphones',
      '/s?pub_categoryLevel1=audio',
    ]);
    expect(sdk.assetsByAlias).toHaveBeenCalledWith({
      paths: ['/listings/listing-categories.json'],
      alias: 'latest',
    });
    // One count query per category, with the same live-listing filter as the search page.
    expect(sdk.listings.query).toHaveBeenCalledTimes(5);
    sdk.listings.query.mock.calls.forEach(([params]) => {
      expect(params).toMatchObject({ ...LIVE_LISTING_FILTERS, perPage: 1 });
    });
    expect(sdk.listings.query).toHaveBeenCalledWith(
      expect.objectContaining({ pub_categoryLevel1: 'phones', pub_categoryLevel2: 'cases' })
    );
  });

  it('rejects when a count query fails, so a partial sitemap is never cached', async () => {
    const sdk = buildCategorySdk({ phones: 20 });
    sdk.listings.query.mockImplementationOnce(() => Promise.reject(new Error('boom')));

    await expect(getIndexableCategoryPaths(sdk)).rejects.toThrow('boom');
  });
});

describe('fetchLiveListingPaths', () => {
  const listing = uuid => ({ id: { uuid }, type: 'listing' });

  it('pages through listings.query with the live-listing filter', async () => {
    const pages = {
      1: { data: Array.from({ length: 100 }, (_, i) => listing(`p1-${i}`)), totalPages: 2 },
      2: { data: [listing('p2-0'), { id: {}, type: 'listing' }], totalPages: 2 },
    };
    const query = jest.fn(params =>
      Promise.resolve({
        data: {
          data: pages[params.page].data,
          meta: { totalPages: pages[params.page].totalPages },
        },
      })
    );

    const paths = await fetchLiveListingPaths({ listings: { query } });

    expect(paths).toHaveLength(101);
    expect(paths[0]).toBe('/l/p1-0');
    expect(paths[100]).toBe('/l/p2-0');
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toMatchObject({
      ...LIVE_LISTING_FILTERS,
      perPage: 100,
      page: 1,
    });
    expect(query.mock.calls[1][0]).toMatchObject({ page: 2 });
  });

  it('stops after a short page even when meta is missing', async () => {
    const query = jest.fn(() => Promise.resolve({ data: { data: [listing('a'), listing('b')] } }));
    const paths = await fetchLiveListingPaths({ listings: { query } });
    expect(paths).toEqual(['/l/a', '/l/b']);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('caps at MAX_SITEMAP_LISTINGS', async () => {
    const query = jest.fn(params =>
      Promise.resolve({
        data: {
          data: Array.from({ length: 100 }, (_, i) => listing(`${params.page}-${i}`)),
          meta: { totalPages: 500 },
        },
      })
    );
    const paths = await fetchLiveListingPaths({ listings: { query } });
    expect(paths).toHaveLength(MAX_SITEMAP_LISTINGS);
    expect(query).toHaveBeenCalledTimes(MAX_SITEMAP_LISTINGS / 100);
  });
});

describe('renderUrlset', () => {
  it('escapes query strings and omits priority/changefreq/lastmod', async () => {
    const xml = (await renderUrlset(ROOT, [
      '/s?pub_categoryLevel1=phones&pub_categoryLevel2=cases',
    ])).toString();

    expect(countMatches(xml, '<loc>')).toBe(3);
    expect(countMatches(xml, 'hreflang=')).toBe(12);
    expect(xml).toContain(
      `<loc>${ROOT}/lt/s?pub_categoryLevel1=phones&amp;pub_categoryLevel2=cases</loc>`
    );
    expect(xml).not.toContain('<priority>');
    expect(xml).not.toContain('<changefreq>');
    expect(xml).not.toContain('<lastmod>');
  });

  it('returns an empty urlset for no paths', async () => {
    const xml = (await renderUrlset(ROOT, [])).toString();
    expect(xml).toContain('<urlset');
    expect(xml).not.toContain('<url>');
  });
});

describe('sitemap handlers', () => {
  it('index lists the four sub sitemaps for a public marketplace and caches for one hour', async () => {
    const res = buildRes();
    await sitemapIndex({}, res, ROOT, false);

    expect(ttl).toBe(3600);
    expect(res.headers['Cache-Control']).toBe('public, max-age=3600');
    expect(res.headers['Content-Type']).toBe('application/xml');
    expect(res.body).toContain(`<loc>${ROOT}/sitemap-default.xml</loc>`);
    expect(res.body).toContain(`<loc>${ROOT}/sitemap-categories.xml</loc>`);
    expect(res.body).toContain(`<loc>${ROOT}/sitemap-recent-listings.xml</loc>`);
    expect(res.body).toContain(`<loc>${ROOT}/sitemap-recent-pages.xml</loc>`);
  });

  it('index omits the categories and listings sitemaps for a private marketplace', async () => {
    let fresh;
    jest.isolateModules(() => {
      fresh = require('./sitemap');
    });
    const res = buildRes();
    await fresh.sitemapIndex({}, res, ROOT, true);

    expect(countMatches(res.body, '<loc>')).toBe(2);
    expect(res.body).toContain(`<loc>${ROOT}/sitemap-default.xml</loc>`);
    expect(res.body).toContain(`<loc>${ROOT}/sitemap-recent-pages.xml</loc>`);
    expect(res.body).not.toContain('sitemap-categories');
    expect(res.body).not.toContain('sitemap-recent-listings');
  });

  it('default sitemap contains the code-owned content pages only — no login, signup or bare search', async () => {
    const res = buildRes();
    await sitemapDefault({}, res, ROOT);

    expect(countMatches(res.body, '<loc>')).toBe(18);
    expect(res.body).toContain(`<loc>${ROOT}/lt</loc>`);
    expect(res.body).toContain(`<loc>${ROOT}/pl/terms-of-service</loc>`);
    expect(res.body).toContain(`<loc>${ROOT}/en/privacy-policy</loc>`);
    expect(res.body).toContain(`<loc>${ROOT}/lt/p/about</loc>`);
    expect(res.body).toContain(`<loc>${ROOT}/en/p/faq</loc>`);
    expect(res.body).toContain(`<loc>${ROOT}/pl/p/market-policies</loc>`);
    expect(res.body).not.toMatch(/login|signup/);
    expect(res.body).not.toContain(`/s</loc>`);
  });

  it('categories sitemap renders eligible categories with hreflang and caches the result', async () => {
    const sdk = buildCategorySdk({ phones: 20, 'phones/smartphones': 6, audio: 2 });
    const res = buildRes();
    await sitemapCategories({}, res, ROOT, sdk);

    expect(countMatches(res.body, '<loc>')).toBe(6);
    expect(countMatches(res.body, 'hreflang=')).toBe(24);
    expect(res.body).toContain(`<loc>${ROOT}/lt/s?pub_categoryLevel1=phones</loc>`);
    expect(res.body).toContain(
      `<loc>${ROOT}/en/s?pub_categoryLevel1=phones&amp;pub_categoryLevel2=smartphones</loc>`
    );
    expect(res.body).not.toContain('pub_categoryLevel1=audio');

    const cachedRes = buildRes();
    await sitemapCategories({}, cachedRes, ROOT, sdk);
    expect(cachedRes.body).toBe(res.body);
    expect(cachedRes.headers.Age).toBeDefined();
    expect(sdk.assetsByAlias).toHaveBeenCalledTimes(1);
  });

  it('listings sitemap sends an empty urlset on 403 (private marketplace) without a 500', async () => {
    const error = new Error('forbidden');
    error.status = 403;
    const sdk = { listings: { query: jest.fn(() => Promise.reject(error)) } };
    const res = buildRes();
    await sitemapListings({}, res, ROOT, sdk);

    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.body).toContain('<urlset');
    expect(res.body).not.toContain('<url>');
  });

  it('pages sitemap lists CMS pages, skipping code-owned and locale-suffixed slugs', async () => {
    const asset = assetPath => ({ attributes: { assetPath } });
    const sdk = {
      sitemapData: {
        queryAssets: jest.fn(() =>
          Promise.resolve({
            data: {
              data: [
                asset('/content/pages/shipping.json'),
                asset('/content/pages/shipping-lt.json'),
                asset('/content/pages/shipping-pl.json'),
                asset('/content/pages/shipping-lte.json'),
                asset('/content/pages/landing-page.json'),
                asset('/content/pages/terms-of-service.json'),
                asset('/content/pages/privacy-policy.json'),
                asset('/content/pages/about.json'),
                asset('/content/pages/faq.json'),
                asset('/content/pages/market-policies.json'),
                { attributes: {} },
              ],
            },
          })
        ),
      },
    };
    const res = buildRes();
    await sitemapPages({}, res, ROOT, sdk);

    expect(sdk.sitemapData.queryAssets).toHaveBeenCalledWith({ pathPrefix: '/content/pages/' });
    const locs = (res.body.match(/<loc>[^<]*<\/loc>/g) || []).map(l => l.slice(5, -6));
    expect(locs).toEqual([
      `${ROOT}/en/p/shipping`,
      `${ROOT}/lt/p/shipping`,
      `${ROOT}/pl/p/shipping`,
      `${ROOT}/en/p/shipping-lte`,
      `${ROOT}/lt/p/shipping-lte`,
      `${ROOT}/pl/p/shipping-lte`,
    ]);
  });

  it('shares one render between concurrent cache misses', async () => {
    let fresh;
    jest.isolateModules(() => {
      fresh = require('./sitemap');
    });
    const sdk = buildCategorySdk({ phones: 20 });
    const resA = buildRes();
    const resB = buildRes();
    await Promise.all([
      fresh.sitemapCategories({}, resA, ROOT, sdk),
      fresh.sitemapCategories({}, resB, ROOT, sdk),
    ]);

    expect(sdk.assetsByAlias).toHaveBeenCalledTimes(1);
    expect(sdk.listings.query).toHaveBeenCalledTimes(5);
    expect(resA.body).toBe(resB.body);
    expect(resA.body).toContain('pub_categoryLevel1=phones');
  });

  it('responds 500 and does not cache when generation fails', async () => {
    const sdk = buildCategorySdk({});
    sdk.assetsByAlias.mockImplementation(() => Promise.reject(new Error('asset down')));
    const res = buildRes();
    // The cache key does not depend on rootUrl, so use a fresh module instance
    // to avoid the entry cached by the categories test above.
    let fresh;
    jest.isolateModules(() => {
      fresh = require('./sitemap');
    });
    await fresh.sitemapCategories({}, res, ROOT, sdk);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.ended).toBe(true);
    expect(res.send).not.toHaveBeenCalled();
  });

  it('/sitemap.xml redirects permanently to the index', () => {
    const res = buildRes();
    sitemapXmlRedirect({}, res);
    expect(res.redirect).toHaveBeenCalledWith(301, '/sitemap-index.xml');
  });
});
