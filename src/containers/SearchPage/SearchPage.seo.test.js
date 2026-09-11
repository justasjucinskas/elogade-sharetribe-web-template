import {
  MIN_LISTINGS_FOR_INDEXING,
  getSelectedCategoryPath,
  getCanonicalSearch,
  isCleanCategoryUrl,
  getSearchPageSeo,
} from './SearchPage.seo';

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

const listing = (uuid, title) => ({ id: { uuid }, attributes: { title } });

describe('SearchPage.seo', () => {
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

    it('uses bespoke copy for a level-1 category that has it', () => {
      const categoryPath = getSelectedCategoryPath(
        { pub_categoryLevel1: 'phonesaccessories' },
        categoryConfiguration,
        intl
      );
      const seo = getSearchPageSeo({
        intl,
        config,
        currentLocale: 'lt',
        searchParamsInURL: { pub_categoryLevel1: 'phonesaccessories' },
        categoryPath,
        canonicalSearch: '?pub_categoryLevel1=phonesaccessories',
        isCleanUrl: true,
        totalItems: 34,
        listingsAreLoaded: true,
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
        intl,
        config,
        currentLocale: 'en',
        categoryPath,
        canonicalSearch: '?pub_categoryLevel1=camerasvideo',
        totalItems: 7,
        listingsAreLoaded: true,
      });
      expect(seo.h1).toBe('Cameras, Video & Drones (localised)');
      expect(seo.title).toBe('Cameras, Video & Drones (localised) | Elogade');
      expect(seo.description).toBe('Cameras, Video & Drones (localised): 7 listings on Elogade.');
    });

    it('uses the deepest category name when a subcategory is selected', () => {
      const categoryPath = getSelectedCategoryPath(
        { pub_categoryLevel1: 'phonesaccessories' },
        {
          ...categoryConfiguration,
          categories: [
            {
              id: 'phonesaccessories',
              name: 'Phones',
              subcategories: [{ id: 'cases', name: 'Cases' }],
            },
          ],
        },
        intl
      );
      const nested = getSelectedCategoryPath(
        { pub_categoryLevel1: 'phonesaccessories', pub_categoryLevel2: 'cases' },
        {
          ...categoryConfiguration,
          categories: [
            {
              id: 'phonesaccessories',
              name: 'Phones',
              subcategories: [{ id: 'cases', name: 'Cases' }],
            },
          ],
        },
        intl
      );
      expect(categoryPath).toHaveLength(1);
      const seo = getSearchPageSeo({
        intl,
        config,
        currentLocale: 'en',
        categoryPath: nested,
        canonicalSearch: '?pub_categoryLevel1=phonesaccessories&pub_categoryLevel2=cases',
        totalItems: 12,
        listingsAreLoaded: true,
      });
      // Bespoke level-1 copy must not leak onto the subcategory page.
      expect(seo.h1).toBe('Cases');
      expect(seo.description).toBe('Cases: 12 listings on Elogade.');
    });

    it('applies noindex only on a clean, loaded, thin category page', () => {
      const categoryPath = getSelectedCategoryPath(
        { pub_categoryLevel1: 'camerasvideo' },
        categoryConfiguration,
        intl
      );
      const base = {
        intl,
        config,
        currentLocale: 'en',
        categoryPath,
        canonicalSearch: '?pub_categoryLevel1=camerasvideo',
        isCleanUrl: true,
        totalItems: MIN_LISTINGS_FOR_INDEXING - 1,
        listingsAreLoaded: true,
      };
      expect(getSearchPageSeo(base).noIndex).toBe(true);
      expect(getSearchPageSeo({ ...base, totalItems: MIN_LISTINGS_FOR_INDEXING }).noIndex).toBe(
        false
      );
      expect(getSearchPageSeo({ ...base, isCleanUrl: false }).noIndex).toBe(false);
      expect(getSearchPageSeo({ ...base, listingsAreLoaded: false }).noIndex).toBe(false);
      // The bare search page is never noindexed by the threshold.
      expect(
        getSearchPageSeo({ ...base, categoryPath: [], canonicalSearch: '', totalItems: 0 }).noIndex
      ).toBe(false);
    });

    it('builds the bare search page copy and breadcrumb', () => {
      const seo = getSearchPageSeo({
        intl,
        config,
        currentLocale: 'pl',
        totalItems: 86,
        listingsAreLoaded: true,
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
        intl,
        config,
        currentLocale: 'en',
        searchParamsInURL: { keywords: 'airpods' },
        totalItems: 3,
        listingsAreLoaded: true,
      });
      expect(seo.h1).toBe('Search results for “airpods”');
      expect(seo.title).toBe('Search results for “airpods” | Elogade');
      expect(seo.noIndex).toBe(false);
    });

    it('emits a CollectionPage with a nested ItemList, 1-based positions and canonical listing URLs', () => {
      const categoryPath = getSelectedCategoryPath(
        { pub_categoryLevel1: 'camerasvideo', pub_categoryLevel2: 'drones' },
        categoryConfiguration,
        intl
      );
      const canonicalSearch = getCanonicalSearch({ categoryPath, page: 2 });
      const seo = getSearchPageSeo({
        intl,
        config,
        currentLocale: 'lt',
        categoryPath,
        canonicalSearch,
        totalItems: 40,
        listingsAreLoaded: true,
        listings,
      });
      const [collectionPage, breadcrumbs] = seo.schema;
      const pageUrl =
        'https://www.elogade.com/lt/s?pub_categoryLevel1=camerasvideo&pub_categoryLevel2=drones&page=2';

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

    it('honours a listing-type search path', () => {
      const seo = getSearchPageSeo({
        intl,
        config,
        currentLocale: 'en',
        searchPath: '/s/usedproducts',
        totalItems: 1,
        listingsAreLoaded: true,
      });
      expect(seo.schema[0].url).toBe('https://www.elogade.com/en/s/usedproducts');
    });
  });
});
