import {
  MIN_LISTINGS_FOR_INDEXING,
  getSelectedCategoryPath,
  getCanonicalSearch,
  isCleanCategoryUrl,
  getSearchPageSeo,
} from './SearchPage.seo';
import { buildCategorySearch, parsePageNumber } from '../../util/categorySeo';

import en from '../../translations/en.json';
import lt from '../../translations/lt.json';
import pl from '../../translations/pl.json';

// Minimal react-intl stand-in: resolves `messages[id]`, then `defaultMessage`, then the id,
// and substitutes simple `{var}` placeholders. ICU plurals are not needed for these tests.
const createIntl = (messages = {}) => ({
  locale: 'en',
  messages,
  formatMessage: ({ id, defaultMessage }, values = {}) => {
    const template = messages[id] ?? defaultMessage ?? id;
    return Object.keys(values).reduce(
      (str, key) => str.replace(new RegExp(`\\{${key}\\}`, 'g'), `${values[key]}`),
      template
    );
  },
});

const baseMessages = {
  'SearchPage.allListingsHeading': 'All listings',
  'SearchPage.allListingsTitle': 'All listings | {marketplaceName}',
  'SearchPage.allListingsDescription': 'All listings on {marketplaceName}. {count} listings.',
  'SearchPage.categoryDescriptionFallback': '{category}: {count} listings on {marketplaceName}.',
  'SearchPage.keywordsHeading': 'Search results for “{keywords}”',
  'SearchPage.keywordsTitle': 'Search results for “{keywords}” | {marketplaceName}',
  'SearchPage.breadcrumbHome': 'Home',
  'SearchPage.category.phonesaccessories.h1': 'Used Phones & Accessories',
  'SearchPage.category.phonesaccessories.description':
    'Used and new phones, cases and chargers. {count} listings.',
  'category.camerasvideo.label': 'Cameras, Video & Drones (localised)',
};

const categoryConfiguration = {
  key: 'categoryLevel',
  scope: 'public',
  categoryLevelKeys: ['categoryLevel1', 'categoryLevel2', 'categoryLevel3'],
  categories: [
    { id: 'phonesaccessories', name: 'Phones & Accessories', subcategories: [] },
    {
      id: 'camerasvideo',
      name: 'Cameras & Video',
      subcategories: [
        { id: 'drones', name: 'Drones', subcategories: [] },
        { id: 'actioncameras', name: 'Action cameras', subcategories: [] },
      ],
    },
  ],
};

const config = {
  marketplaceName: 'Elogade',
  marketplaceRootURL: 'https://www.elogade.com',
};

const routeConfiguration = [
  { name: 'ListingPage', path: '/l/:slug/:id' },
  { name: 'ListingPageCanonical', path: '/l/:id' },
];

const listing = (uuid, title) => ({ id: { uuid }, attributes: { title } });

const loaded = { listingsAreLoaded: true, totalPages: 1 };

describe('util/categorySeo', () => {
  it('parses only plain positive integers as page numbers', () => {
    expect(parsePageNumber(2)).toBe(2);
    expect(parsePageNumber('7')).toBe(7);
    expect(parsePageNumber('0')).toBeNull();
    expect(parsePageNumber('1e2')).toBeNull();
    expect(parsePageNumber('0x10')).toBeNull();
    expect(parsePageNumber('2.0')).toBeNull();
    expect(parsePageNumber(undefined)).toBeNull();
  });

  it('builds the category chain in level order and appends page > 1', () => {
    expect(buildCategorySearch({})).toBe('');
    expect(buildCategorySearch({ categoryIds: ['a'] })).toBe('?pub_categoryLevel1=a');
    expect(buildCategorySearch({ categoryIds: ['a', 'b'], page: 2 })).toBe(
      '?pub_categoryLevel1=a&pub_categoryLevel2=b&page=2'
    );
    expect(buildCategorySearch({ categoryIds: ['a'], page: 1 })).toBe('?pub_categoryLevel1=a');
    expect(buildCategorySearch({ page: '1e2' })).toBe('');
  });
});

describe('SearchPage.seo', () => {
  describe('translation parity', () => {
    // src/app.js merges en.json into every locale, so an en-only SearchPage key would be
    // rendered in English on /lt and /pl. Keep the three files in lockstep.
    it('has the same SearchPage.* keys in en, lt and pl', () => {
      const searchKeys = messages =>
        Object.keys(messages)
          .filter(k => k.startsWith('SearchPage.'))
          .sort();
      expect(searchKeys(lt)).toEqual(searchKeys(en));
      expect(searchKeys(pl)).toEqual(searchKeys(en));
    });

    it('does not ship the removed schema placeholder keys', () => {
      [
        'SearchPage.schemaTitle',
        'SearchPage.schemaDescription',
        'SearchPage.schemaForSearch',
      ].forEach(key => {
        expect(en[key]).toBeUndefined();
        expect(lt[key]).toBeUndefined();
        expect(pl[key]).toBeUndefined();
      });
    });
  });

  describe('getSelectedCategoryPath', () => {
    it('returns an empty path without category params', () => {
      expect(getSelectedCategoryPath({}, categoryConfiguration, createIntl())).toEqual([]);
      expect(
        getSelectedCategoryPath({ keywords: 'x' }, categoryConfiguration, createIntl())
      ).toEqual([]);
    });

    it('returns the level-1 category with its localised name', () => {
      const intl = createIntl(baseMessages);
      const path = getSelectedCategoryPath(
        { pub_categoryLevel1: 'camerasvideo' },
        categoryConfiguration,
        intl
      );
      expect(path).toEqual([
        {
          id: 'camerasvideo',
          name: 'Cameras, Video & Drones (localised)',
          level: 1,
          paramKey: 'pub_categoryLevel1',
        },
      ]);
    });

    it('falls back to the Console name when no translation exists', () => {
      const path = getSelectedCategoryPath(
        { pub_categoryLevel1: 'phonesaccessories' },
        categoryConfiguration,
        createIntl()
      );
      expect(path[0].name).toBe('Phones & Accessories');
    });

    it('walks nested levels in order', () => {
      const path = getSelectedCategoryPath(
        { pub_categoryLevel1: 'camerasvideo', pub_categoryLevel2: 'drones' },
        categoryConfiguration,
        createIntl()
      );
      expect(path.map(c => c.id)).toEqual(['camerasvideo', 'drones']);
      expect(path[1]).toMatchObject({ level: 2, paramKey: 'pub_categoryLevel2' });
    });

    it('stops at an unknown id and ignores orphaned deeper levels', () => {
      expect(
        getSelectedCategoryPath(
          { pub_categoryLevel1: 'nope', pub_categoryLevel2: 'drones' },
          categoryConfiguration,
          createIntl()
        )
      ).toEqual([]);
      expect(
        getSelectedCategoryPath(
          { pub_categoryLevel2: 'drones' },
          categoryConfiguration,
          createIntl()
        )
      ).toEqual([]);
      expect(
        getSelectedCategoryPath(
          { pub_categoryLevel1: 'camerasvideo', pub_categoryLevel2: 'unknown' },
          categoryConfiguration,
          createIntl()
        ).map(c => c.id)
      ).toEqual(['camerasvideo']);
    });
  });

  describe('getCanonicalSearch', () => {
    const cameras = getSelectedCategoryPath(
      { pub_categoryLevel1: 'camerasvideo', pub_categoryLevel2: 'drones' },
      categoryConfiguration,
      createIntl()
    );

    it('is empty for the bare search page', () => {
      expect(getCanonicalSearch({})).toBe('');
      expect(getCanonicalSearch({ categoryPath: [], page: 1 })).toBe('');
    });

    it('keeps the category chain in level order', () => {
      expect(getCanonicalSearch({ categoryPath: cameras })).toBe(
        '?pub_categoryLevel1=camerasvideo&pub_categoryLevel2=drones'
      );
    });

    it('keeps page only when greater than 1', () => {
      expect(getCanonicalSearch({ categoryPath: cameras.slice(0, 1), page: 1 })).toBe(
        '?pub_categoryLevel1=camerasvideo'
      );
      expect(getCanonicalSearch({ categoryPath: cameras.slice(0, 1), page: '2' })).toBe(
        '?pub_categoryLevel1=camerasvideo&page=2'
      );
      expect(getCanonicalSearch({ page: 3 })).toBe('?page=3');
      expect(getCanonicalSearch({ page: 'abc' })).toBe('');
    });
  });

  describe('isCleanCategoryUrl', () => {
    it('ignores parameter order but not extra parameters', () => {
      expect(isCleanCategoryUrl('?pub_categoryLevel1=x', '?pub_categoryLevel1=x')).toBe(true);
      expect(
        isCleanCategoryUrl('?page=2&pub_categoryLevel1=x', '?pub_categoryLevel1=x&page=2')
      ).toBe(true);
      expect(
        isCleanCategoryUrl('?pub_categoryLevel1=x&sort=-createdAt', '?pub_categoryLevel1=x')
      ).toBe(false);
      expect(isCleanCategoryUrl('', '')).toBe(true);
      expect(isCleanCategoryUrl('?keywords=cat', '')).toBe(false);
    });
  });

  describe('getSearchPageSeo', () => {
    const intl = createIntl(baseMessages);
    const listings = [listing('uuid-1', 'First'), listing('uuid-2', 'Second')];
    const common = { intl, config, routeConfiguration };

    it('uses bespoke copy for a level-1 category that has it', () => {
      const categoryPath = getSelectedCategoryPath(
        { pub_categoryLevel1: 'phonesaccessories' },
        categoryConfiguration,
        intl
      );
      const seo = getSearchPageSeo({
        ...common,
        currentLocale: 'lt',
        searchParamsInURL: { pub_categoryLevel1: 'phonesaccessories' },
        categoryPath,
        canonicalSearch: '?pub_categoryLevel1=phonesaccessories',
        isCleanUrl: true,
        totalItems: 34,
        ...loaded,
        listings,
      });
      expect(seo.h1).toBe('Used Phones & Accessories');
      expect(seo.title).toBe('Used Phones & Accessories | Elogade');
      expect(seo.description).toBe('Used and new phones, cases and chargers. 34 listings.');
      expect(seo.noIndex).toBe(false);
    });

    it('falls back to the category label and generic description', () => {
      const categoryPath = getSelectedCategoryPath(
        { pub_categoryLevel1: 'camerasvideo' },
        categoryConfiguration,
        intl
      );
      const seo = getSearchPageSeo({
        ...common,
        currentLocale: 'en',
        categoryPath,
        canonicalSearch: '?pub_categoryLevel1=camerasvideo',
        totalItems: 7,
        ...loaded,
      });
      expect(seo.h1).toBe('Cameras, Video & Drones (localised)');
      expect(seo.title).toBe('Cameras, Video & Drones (localised) | Elogade');
      expect(seo.description).toBe('Cameras, Video & Drones (localised): 7 listings on Elogade.');
    });

    it('uses the deepest category name when a subcategory is selected', () => {
      const nestedConfig = {
        ...categoryConfiguration,
        categories: [
          {
            id: 'phonesaccessories',
            name: 'Phones',
            subcategories: [{ id: 'cases', name: 'Cases' }],
          },
        ],
      };
      const nested = getSelectedCategoryPath(
        { pub_categoryLevel1: 'phonesaccessories', pub_categoryLevel2: 'cases' },
        nestedConfig,
        intl
      );
      const seo = getSearchPageSeo({
        ...common,
        currentLocale: 'en',
        categoryPath: nested,
        canonicalSearch: '?pub_categoryLevel1=phonesaccessories&pub_categoryLevel2=cases',
        totalItems: 12,
        ...loaded,
      });
      // Bespoke level-1 copy must not leak onto the subcategory page.
      expect(seo.h1).toBe('Cases');
      expect(seo.description).toBe('Cases: 12 listings on Elogade.');
    });

    describe('noIndex', () => {
      const categoryPath = getSelectedCategoryPath(
        { pub_categoryLevel1: 'camerasvideo' },
        categoryConfiguration,
        intl
      );
      const base = {
        ...common,
        currentLocale: 'en',
        categoryPath,
        canonicalSearch: '?pub_categoryLevel1=camerasvideo',
        isCleanUrl: true,
        totalItems: MIN_LISTINGS_FOR_INDEXING - 1,
        ...loaded,
      };

      it('applies to a clean, loaded, thin category page', () => {
        expect(getSearchPageSeo(base).noIndex).toBe(true);
        expect(getSearchPageSeo({ ...base, totalItems: MIN_LISTINGS_FOR_INDEXING }).noIndex).toBe(
          false
        );
      });

      it('is never applied to a stacked-facet URL (it canonicals to the clean one)', () => {
        expect(getSearchPageSeo({ ...base, isCleanUrl: false }).noIndex).toBe(false);
        expect(
          getSearchPageSeo({ ...base, isCleanUrl: false, listingsAreLoaded: false }).noIndex
        ).toBe(false);
      });

      it('fails closed when the result set could not be loaded', () => {
        expect(
          getSearchPageSeo({ ...base, totalItems: 100, listingsAreLoaded: false }).noIndex
        ).toBe(true);
        expect(
          getSearchPageSeo({
            ...base,
            categoryPath: [],
            canonicalSearch: '',
            listingsAreLoaded: false,
          }).noIndex
        ).toBe(true);
      });

      it('applies to a page beyond the last page, on category and bare search alike', () => {
        const paged = { ...base, totalItems: 30, totalPages: 2 };
        expect(getSearchPageSeo({ ...paged, page: 2 }).noIndex).toBe(false);
        expect(getSearchPageSeo({ ...paged, page: 3 }).noIndex).toBe(true);
        expect(getSearchPageSeo({ ...paged, page: '500' }).noIndex).toBe(true);
        expect(
          getSearchPageSeo({ ...paged, categoryPath: [], canonicalSearch: '?page=500', page: 500 })
            .noIndex
        ).toBe(true);
        // Empty result set: totalPages 0 still allows page 1.
        expect(getSearchPageSeo({ ...paged, totalItems: 0, totalPages: 0, page: 1 }).noIndex).toBe(
          true // thin category, not out-of-range
        );
        expect(
          getSearchPageSeo({
            ...paged,
            categoryPath: [],
            canonicalSearch: '',
            totalItems: 0,
            totalPages: 0,
          }).noIndex
        ).toBe(false);
      });

      it('does not apply the threshold to the bare search page', () => {
        expect(
          getSearchPageSeo({ ...base, categoryPath: [], canonicalSearch: '', totalItems: 0 })
            .noIndex
        ).toBe(false);
      });
    });

    it('builds the bare search page copy and breadcrumb', () => {
      const seo = getSearchPageSeo({
        ...common,
        currentLocale: 'pl',
        totalItems: 86,
        ...loaded,
        listings,
      });
      expect(seo.h1).toBe('All listings');
      expect(seo.title).toBe('All listings | Elogade');
      expect(seo.description).toBe('All listings on Elogade. 86 listings.');
      const [collectionPage, breadcrumbs] = seo.schema;
      expect(collectionPage.url).toBe('https://www.elogade.com/pl/s');
      expect(breadcrumbs.itemListElement).toEqual([
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.elogade.com/pl' },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'All listings',
          item: 'https://www.elogade.com/pl/s',
        },
      ]);
    });

    it('uses keyword copy for a keyword search without category', () => {
      const seo = getSearchPageSeo({
        ...common,
        currentLocale: 'en',
        searchParamsInURL: { keywords: 'airpods' },
        totalItems: 3,
        ...loaded,
      });
      expect(seo.h1).toBe('Search results for “airpods”');
      expect(seo.title).toBe('Search results for “airpods” | Elogade');
      expect(seo.noIndex).toBe(false);
    });

    it('treats a numeric keyword (coerced by parse) as a keyword search', () => {
      const seo = getSearchPageSeo({
        ...common,
        currentLocale: 'en',
        searchParamsInURL: { keywords: 0 },
        totalItems: 1,
        ...loaded,
      });
      expect(seo.h1).toBe('Search results for “0”');
    });

    it('emits a CollectionPage with a nested ItemList, 1-based positions and canonical listing URLs', () => {
      const categoryPath = getSelectedCategoryPath(
        { pub_categoryLevel1: 'camerasvideo', pub_categoryLevel2: 'drones' },
        categoryConfiguration,
        intl
      );
      const canonicalSearch = getCanonicalSearch({ categoryPath, page: 2 });
      const seo = getSearchPageSeo({
        ...common,
        currentLocale: 'lt',
        categoryPath,
        canonicalSearch,
        page: 2,
        totalItems: 40,
        totalPages: 2,
        listingsAreLoaded: true,
        listings,
      });
      const [collectionPage, breadcrumbs] = seo.schema;
      const pageUrl =
        'https://www.elogade.com/lt/s?pub_categoryLevel1=camerasvideo&pub_categoryLevel2=drones&page=2';

      expect(seo.noIndex).toBe(false);
      expect(collectionPage['@type']).toBe('CollectionPage');
      expect(collectionPage['@id']).toBe(`${pageUrl}#page`);
      expect(collectionPage.url).toBe(pageUrl);
      expect(collectionPage['@context']).toBeUndefined();

      const { mainEntity } = collectionPage;
      expect(typeof mainEntity).toBe('object');
      expect(Array.isArray(mainEntity)).toBe(false);
      expect(mainEntity).toMatchObject({
        '@type': 'ItemList',
        name: 'Drones',
        numberOfItems: 40,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
      });
      expect(mainEntity.itemListElement).toEqual([
        {
          '@type': 'ListItem',
          position: 1,
          url: 'https://www.elogade.com/lt/l/uuid-1',
          name: 'First',
        },
        {
          '@type': 'ListItem',
          position: 2,
          url: 'https://www.elogade.com/lt/l/uuid-2',
          name: 'Second',
        },
      ]);

      expect(breadcrumbs).toEqual({
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.elogade.com/lt' },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Cameras, Video & Drones (localised)',
            item: 'https://www.elogade.com/lt/s?pub_categoryLevel1=camerasvideo',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'Drones',
            item:
              'https://www.elogade.com/lt/s?pub_categoryLevel1=camerasvideo&pub_categoryLevel2=drones',
          },
        ],
      });
    });

    it('uses the request pathname verbatim so JSON-LD URLs match the canonical', () => {
      const seo = getSearchPageSeo({
        ...common,
        currentLocale: 'en',
        searchPath: '/s/usedproducts',
        totalItems: 1,
        ...loaded,
      });
      expect(seo.schema[0].url).toBe('https://www.elogade.com/en/s/usedproducts');
    });
  });
});
