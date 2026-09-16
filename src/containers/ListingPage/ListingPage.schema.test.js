import {
  BRAND_FIELD_BY_CATEGORY,
  META_DESCRIPTION_MAX_LENGTH,
  PRICE_VALID_DAYS,
  getBrandName,
  getEnumOptionLabel,
  getItemCondition,
  getListingCategoryPath,
  getListingMetaDescription,
  getListingSchema,
  getPriceValidUntil,
  truncateDescription,
} from './ListingPage.schema';

import en from '../../translations/en.json';
import lt from '../../translations/lt.json';
import pl from '../../translations/pl.json';

// Minimal react-intl stand-in: resolves `messages[id]`, then `defaultMessage`, then the id,
// and substitutes simple `{var}` placeholders.
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

const enMessages = Object.keys(en)
  .filter(k => k.startsWith('ListingPage.metaDescription') || k === 'SearchPage.breadcrumbHome')
  .reduce((acc, k) => ({ ...acc, [k]: en[k] }), {});

const ltOverlay = {
  'category.audiodevices.label': 'Garso įrenginiai',
  'listingField.productcondition.option.verygood': 'Labai gera',
  'listingField.brand3.option.sony': 'Sony (LT)',
  'SearchPage.breadcrumbHome': 'Pradžia',
};

const listingFields = [
  {
    key: 'productcondition',
    schemaType: 'enum',
    enumOptions: [
      { option: 'new', label: 'New' },
      { option: 'likenew', label: 'Like new' },
      { option: 'verygood', label: 'Very good' },
      { option: 'good', label: 'Good' },
      { option: 'acceptable', label: 'Acceptable' },
      { option: 'fairforparts', label: 'Fair / For Parts' },
    ],
  },
  {
    key: 'brand',
    schemaType: 'enum',
    enumOptions: [
      { option: 'apple', label: 'Apple' },
      { option: 'Honor', label: 'Honor' },
      // Console really has both of these on the phones brand field.
      { option: 'Belkin', label: 'Baseus' },
      { option: 'belkin', label: 'Belkin' },
      { option: 'other', label: 'Other' },
    ],
  },
  {
    key: 'brand3',
    schemaType: 'enum',
    enumOptions: [{ option: 'sony', label: 'Sony' }, { option: 'other', label: 'Other' }],
  },
];

const categoryConfiguration = {
  key: 'categoryLevel',
  scope: 'public',
  categoryLevelKeys: ['categoryLevel1', 'categoryLevel2', 'categoryLevel3'],
  categories: [
    { id: 'phonesaccessories', name: 'Phones & Accessories', subcategories: [] },
    {
      id: 'audiodevices',
      name: 'Audio devices',
      subcategories: [{ id: 'speakers', name: 'Speakers', subcategories: [] }],
    },
  ],
};

const config = {
  marketplaceName: 'Elogade',
  marketplaceRootURL: 'https://www.elogade.com',
  categoryConfiguration,
  listing: { listingFields },
};

const routeConfiguration = [
  { name: 'SearchPage', path: '/s' },
  { name: 'ListingPageCanonical', path: '/l/:id' },
];

const uuid = '6a888d1a-3576-4de3-abb8-fcac41c50486';
const now = new Date('2026-09-16T10:00:00.000Z');

const listing = ({ publicData = {}, attributes = {} } = {}) => ({
  id: { uuid },
  attributes: {
    title: 'Stiprintuvas su kolonėlėm',
    description: 'Parduodu tvarkingas kolonėlias su stiprintuvu.',
    createdAt: new Date('2026-08-22T12:00:00.000Z'),
    publicData: {
      categoryLevel1: 'audiodevices',
      productcondition: 'verygood',
      brand3: 'sony',
      warrantystatus: 'nowarranty',
      modelname: 'STR-DH190',
      color: 'Ruda,juoda',
      imeiserialnumber: 'SECRET-IMEI',
      ...publicData,
    },
    ...attributes,
  },
});

const baseParams = {
  intl: createIntl(enMessages),
  config,
  routeConfiguration,
  currentLocale: 'lt',
  listing: listing(),
  authorDisplayName: 'Jonas J',
  images: ['https://img/1', 'https://img/2'],
  priceMaybe: { price: '150.00', priceCurrency: 'EUR' },
  availabilityMaybe: { availability: 'https://schema.org/InStock' },
  now,
};

describe('ListingPage.schema', () => {
  describe('translation parity', () => {
    // src/app.js merges en.json into every locale, so an en-only key would render in English
    // on /lt and /pl. Keep the three files in lockstep.
    it('has the same ListingPage.metaDescription* keys in en, lt and pl', () => {
      const keys = messages =>
        Object.keys(messages)
          .filter(k => k.startsWith('ListingPage.metaDescription'))
          .sort();
      expect(keys(en).length).toBeGreaterThan(0);
      expect(keys(lt)).toEqual(keys(en));
      expect(keys(pl)).toEqual(keys(en));
    });
  });

  describe('getItemCondition', () => {
    it('maps every productcondition value per SEO-INPUTS.md §3', () => {
      expect(getItemCondition('new')).toBe('https://schema.org/NewCondition');
      expect(getItemCondition('likenew')).toBe('https://schema.org/NewCondition');
      expect(getItemCondition('verygood')).toBe('https://schema.org/UsedCondition');
      expect(getItemCondition('good')).toBe('https://schema.org/UsedCondition');
      expect(getItemCondition('acceptable')).toBe('https://schema.org/UsedCondition');
      expect(getItemCondition('fairforparts')).toBe('https://schema.org/DamagedCondition');
    });

    it('never defaults to NewCondition', () => {
      expect(getItemCondition(undefined)).toBe('https://schema.org/UsedCondition');
      expect(getItemCondition(null)).toBe('https://schema.org/UsedCondition');
      expect(getItemCondition('')).toBe('https://schema.org/UsedCondition');
      expect(getItemCondition('refurbished-by-me')).toBe('https://schema.org/UsedCondition');
      expect(getItemCondition('excellent')).toBe('https://schema.org/UsedCondition');
    });

    it('matches case-insensitively', () => {
      expect(getItemCondition('LikeNew')).toBe('https://schema.org/NewCondition');
      expect(getItemCondition(' NEW ')).toBe('https://schema.org/NewCondition');
    });
  });

  describe('getEnumOptionLabel', () => {
    it('resolves the Console label and the localised overlay through the option key', () => {
      expect(getEnumOptionLabel(createIntl(), listingFields, 'productcondition', 'verygood')).toBe(
        'Very good'
      );
      expect(
        getEnumOptionLabel(createIntl(ltOverlay), listingFields, 'productcondition', 'verygood')
      ).toBe('Labai gera');
    });

    it('matches the option key case-insensitively but looks up with the Console key', () => {
      const intl = createIntl({ 'listingField.brand.option.Honor': 'Honor (LT)' });
      expect(getEnumOptionLabel(intl, listingFields, 'brand', 'honor')).toBe('Honor (LT)');
      expect(getEnumOptionLabel(intl, listingFields, 'brand', 'HONOR')).toBe('Honor (LT)');
    });

    it('prefers an exact key match when option keys differ only in case', () => {
      const intl = createIntl();
      expect(getEnumOptionLabel(intl, listingFields, 'brand', 'Belkin')).toBe('Baseus');
      expect(getEnumOptionLabel(intl, listingFields, 'brand', 'belkin')).toBe('Belkin');
      const ltIntl = createIntl({
        'listingField.brand.option.Belkin': 'Baseus (LT)',
        'listingField.brand.option.belkin': 'Belkin (LT)',
      });
      expect(getEnumOptionLabel(ltIntl, listingFields, 'brand', 'Belkin')).toBe('Baseus (LT)');
      expect(getEnumOptionLabel(ltIntl, listingFields, 'brand', 'belkin')).toBe('Belkin (LT)');
    });

    it('falls back to the raw value for unknown options and to empty for missing values', () => {
      expect(getEnumOptionLabel(createIntl(), listingFields, 'brand', 'nothing')).toBe('nothing');
      expect(getEnumOptionLabel(createIntl(), [], 'brand', 'apple')).toBe('apple');
      expect(getEnumOptionLabel(createIntl(), listingFields, 'brand', '')).toBe('');
      expect(getEnumOptionLabel(createIntl(), listingFields, 'brand', undefined)).toBe('');
    });
  });

  describe('getBrandName', () => {
    const intl = createIntl();

    it('covers every level-1 category with its own brand field', () => {
      expect(Object.keys(BRAND_FIELD_BY_CATEGORY).sort()).toEqual(
        [
          'audiodevices',
          'beautypersonalcare',
          'camerasvideo',
          'computerstablets',
          'consoleaccessories',
          'homeappliances',
          'phonesaccessories',
          'tvhomeentertainment',
          'wearablessmartdevices',
        ].sort()
      );
    });

    it('reads the brand field of the listing category', () => {
      expect(
        getBrandName({
          intl,
          listingFields,
          publicData: { categoryLevel1: 'phonesaccessories', brand: 'apple', brand3: 'sony' },
        })
      ).toBe('Apple');
      expect(
        getBrandName({
          intl: createIntl(ltOverlay),
          listingFields,
          publicData: { categoryLevel1: 'audiodevices', brand3: 'sony' },
        })
      ).toBe('Sony (LT)');
    });

    it('ignores brand fields of other categories and listings without a category', () => {
      expect(
        getBrandName({
          intl,
          listingFields,
          publicData: { categoryLevel1: 'phonesaccessories', brand3: 'sony' },
        })
      ).toBeNull();
      expect(getBrandName({ intl, listingFields, publicData: { brand: 'apple' } })).toBeNull();
      expect(
        getBrandName({
          intl,
          listingFields,
          publicData: { categoryLevel1: 'unknown', brand: 'apple' },
        })
      ).toBeNull();
    });

    it('uses brandother text for `other`, otherwise omits the brand', () => {
      expect(
        getBrandName({
          intl,
          listingFields,
          publicData: {
            categoryLevel1: 'phonesaccessories',
            brand: 'other',
            brandother: 'Fairphone',
          },
        })
      ).toBe('Fairphone');
      expect(
        getBrandName({
          intl,
          listingFields,
          publicData: { categoryLevel1: 'phonesaccessories', brand: 'Other', brandother: '  ' },
        })
      ).toBeNull();
      expect(
        getBrandName({
          intl,
          listingFields,
          publicData: { categoryLevel1: 'phonesaccessories', brand: 'other' },
        })
      ).toBeNull();
    });

    it('returns null without any brand data', () => {
      expect(getBrandName({ intl, listingFields, publicData: {} })).toBeNull();
      expect(getBrandName({ intl, listingFields })).toBeNull();
    });
  });

  describe('getListingCategoryPath', () => {
    it('walks the listing categoryLevel1..3 values through the category tree', () => {
      const path = getListingCategoryPath(
        { categoryLevel1: 'audiodevices', categoryLevel2: 'speakers' },
        categoryConfiguration,
        createIntl(ltOverlay)
      );
      expect(path.map(c => c.id)).toEqual(['audiodevices', 'speakers']);
      expect(path[0].name).toBe('Garso įrenginiai');
      expect(path[1].name).toBe('Speakers');
    });

    it('stops at an unknown category', () => {
      expect(
        getListingCategoryPath({ categoryLevel1: 'nope' }, categoryConfiguration, createIntl())
      ).toEqual([]);
      expect(getListingCategoryPath({}, undefined, createIntl())).toEqual([]);
    });
  });

  describe('getPriceValidUntil', () => {
    it(`is ${PRICE_VALID_DAYS} days after the publish date while that is still ahead`, () => {
      // The ticket's example: published 2026-08-22 → 2026-10-21, whenever it is rendered
      // before that date.
      const created = new Date('2026-08-22T12:00:00.000Z');
      expect(getPriceValidUntil(created, new Date('2026-08-22T13:00:00Z'))).toBe('2026-10-21');
      expect(getPriceValidUntil(created, now)).toBe('2026-10-21');
      expect(getPriceValidUntil(created, new Date('2026-10-21T00:00:00Z'))).toBe('2026-10-21');
    });

    it('re-bases on now once the publish-date window has passed', () => {
      expect(getPriceValidUntil(new Date('2025-01-01T00:00:00.000Z'), now)).toBe('2026-11-15');
      expect(
        getPriceValidUntil(new Date('2026-08-22T12:00:00.000Z'), new Date('2026-10-22T00:00:00Z'))
      ).toBe('2026-12-21');
    });

    it('handles missing or invalid createdAt', () => {
      expect(getPriceValidUntil(undefined, now)).toBe('2026-11-15');
      expect(getPriceValidUntil('not a date', now)).toBe('2026-11-15');
    });
  });

  describe('truncateDescription', () => {
    it('leaves short text alone and collapses whitespace', () => {
      expect(truncateDescription('a  b\n c')).toBe('a b c');
    });

    it(`cuts at a word boundary within ${META_DESCRIPTION_MAX_LENGTH} chars`, () => {
      const long = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
      const out = truncateDescription(long);
      expect(out.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX_LENGTH);
      expect(out.endsWith('…')).toBe(true);
      expect(out).not.toMatch(/[,\s–-]…$/);
      expect(long.startsWith(out.slice(0, -1))).toBe(true);
    });

    it('still returns text when there is no word boundary to cut at', () => {
      const out = truncateDescription('-'.repeat(200));
      expect(out.length).toBe(META_DESCRIPTION_MAX_LENGTH);
      expect(out).toBe(`${'-'.repeat(META_DESCRIPTION_MAX_LENGTH - 1)}…`);
      const noSpaces = `iPhone13${'X'.repeat(200)}`;
      expect(truncateDescription(noSpaces).length).toBe(META_DESCRIPTION_MAX_LENGTH);
    });
  });

  describe('getListingMetaDescription', () => {
    const intl = createIntl(enMessages);

    it('follows the §6 template', () => {
      expect(
        getListingMetaDescription({
          intl,
          config,
          listingFields,
          title: 'iPhone 13',
          publicData: { productcondition: 'verygood', warrantystatus: 'nowarranty' },
          formattedPrice: '€150.00',
        })
      ).toBe('iPhone 13, Very good condition – €150.00. Secure purchase on Elogade.');
    });

    it('adds the warranty phrase for seller and manufacturer warranty only', () => {
      const base = {
        intl,
        config,
        listingFields,
        title: 'iPhone 13',
        publicData: { productcondition: 'good' },
        formattedPrice: '€150.00',
      };
      const withWarranty = {
        ...base,
        publicData: { ...base.publicData, warrantystatus: 'sellerwarranty' },
      };
      expect(getListingMetaDescription(withWarranty)).toBe(
        'iPhone 13, Good condition – €150.00. With warranty. Secure purchase on Elogade.'
      );
      expect(
        getListingMetaDescription({
          ...base,
          publicData: { ...base.publicData, warrantystatus: 'manufacturerwarranty' },
        })
      ).toContain('With warranty.');
      expect(getListingMetaDescription(base)).not.toContain('With warranty.');
      expect(
        getListingMetaDescription({
          ...base,
          publicData: { ...base.publicData, warrantystatus: 'nowarranty' },
        })
      ).not.toContain('With warranty.');
    });

    it('uses the localised condition label', () => {
      expect(
        getListingMetaDescription({
          intl: createIntl({
            ...enMessages,
            ...ltOverlay,
            ...Object.keys(lt)
              .filter(k => k.startsWith('ListingPage.metaDescription'))
              .reduce((a, k) => ({ ...a, [k]: lt[k] }), {}),
          }),
          config,
          listingFields,
          title: 'Stiprintuvas',
          publicData: { productcondition: 'verygood', warrantystatus: 'sellerwarranty' },
          formattedPrice: '150,00 €',
        })
      ).toBe(
        'Stiprintuvas, Labai gera būklė – 150,00 €. Su garantija. Saugus pirkimas per Elogade.'
      );
    });

    it('drops the fragments whose data is missing', () => {
      const base = { intl, config, listingFields, title: 'iPhone 13' };
      expect(getListingMetaDescription({ ...base, publicData: {}, formattedPrice: '€1.00' })).toBe(
        'iPhone 13 – €1.00. Secure purchase on Elogade.'
      );
      expect(getListingMetaDescription({ ...base, publicData: { productcondition: 'new' } })).toBe(
        'iPhone 13, New condition. Secure purchase on Elogade.'
      );
      expect(getListingMetaDescription({ ...base, publicData: {} })).toBe(
        'iPhone 13. Secure purchase on Elogade.'
      );
    });

    it(`is at most ${META_DESCRIPTION_MAX_LENGTH} characters`, () => {
      const out = getListingMetaDescription({
        intl,
        config,
        listingFields,
        title: 'A very long listing title that keeps going on and on and on '.repeat(4),
        publicData: { productcondition: 'good', warrantystatus: 'sellerwarranty' },
        formattedPrice: '€150.00',
      });
      expect(out.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX_LENGTH);
      expect(out.endsWith('…')).toBe(true);
    });
  });

  describe('getListingSchema', () => {
    it('builds the Product node per the ticket 4 target', () => {
      const [product] = getListingSchema(baseParams);
      expect(product).toEqual({
        '@type': 'Product',
        '@id': `https://www.elogade.com/lt/l/${uuid}#product`,
        name: 'Stiprintuvas su kolonėlėm',
        description: 'Parduodu tvarkingas kolonėlias su stiprintuvu.',
        sku: uuid,
        category: 'Audio devices',
        brand: { '@type': 'Brand', name: 'Sony' },
        model: 'STR-DH190',
        color: 'Ruda,juoda',
        image: ['https://img/1', 'https://img/2'],
        offers: {
          '@type': 'Offer',
          url: `https://www.elogade.com/lt/l/${uuid}`,
          price: '150.00',
          priceCurrency: 'EUR',
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/UsedCondition',
          priceValidUntil: '2026-10-21',
          seller: { '@type': 'Person', name: 'Jonas J' },
        },
      });
    });

    it('does not carry a per-node @context, ratings, reviews or the IMEI field', () => {
      const json = JSON.stringify(getListingSchema(baseParams));
      expect(json).not.toContain('@context');
      expect(json).not.toContain('aggregateRating');
      expect(json).not.toContain('"review"');
      expect(json).not.toContain('SECRET-IMEI');
      expect(json).not.toContain('imeiserialnumber');
    });

    it('builds a locale-prefixed BreadcrumbList through the category chain', () => {
      const [, breadcrumbs] = getListingSchema({
        ...baseParams,
        intl: createIntl({ ...enMessages, ...ltOverlay }),
        listing: listing({ publicData: { categoryLevel2: 'speakers' } }),
      });
      expect(breadcrumbs).toEqual({
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Pradžia', item: 'https://www.elogade.com/lt' },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Garso įrenginiai',
            item: 'https://www.elogade.com/lt/s?pub_categoryLevel1=audiodevices',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'Speakers',
            item:
              'https://www.elogade.com/lt/s?pub_categoryLevel1=audiodevices&pub_categoryLevel2=speakers',
          },
          {
            '@type': 'ListItem',
            position: 4,
            name: 'Stiprintuvas su kolonėlėm',
            item: `https://www.elogade.com/lt/l/${uuid}`,
          },
        ],
      });
    });

    it('uses the requested locale in every URL', () => {
      const json = JSON.stringify(getListingSchema({ ...baseParams, currentLocale: 'en' }));
      expect(json).toContain(`https://www.elogade.com/en/l/${uuid}`);
      expect(json).toContain('https://www.elogade.com/en/s?pub_categoryLevel1=audiodevices');
      expect(json).not.toContain('/lt/');
    });

    it('omits optional nodes when the data is missing', () => {
      const [product, breadcrumbs] = getListingSchema({
        ...baseParams,
        listing: listing({
          publicData: {
            categoryLevel1: undefined,
            brand3: 'other',
            modelname: '',
            color: undefined,
            productcondition: undefined,
          },
          attributes: { description: '', createdAt: undefined },
        }),
        authorDisplayName: '',
        images: [],
        priceMaybe: {},
        availabilityMaybe: {},
      });
      expect(product).toEqual({
        '@type': 'Product',
        '@id': `https://www.elogade.com/lt/l/${uuid}#product`,
        name: 'Stiprintuvas su kolonėlėm',
        sku: uuid,
        offers: {
          '@type': 'Offer',
          url: `https://www.elogade.com/lt/l/${uuid}`,
          itemCondition: 'https://schema.org/UsedCondition',
          priceValidUntil: '2026-11-15',
        },
      });
      expect(breadcrumbs.itemListElement.map(e => e.position)).toEqual([1, 2]);
    });
  });
});
