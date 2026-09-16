import { types as sdkTypes } from '../../util/sdkLoader';

import {
  SIMILAR_LISTINGS_COUNT,
  excludeListingFromResponse,
  getSchemaAvailability,
  getSimilarListingsQueryParams,
  isSoldOut,
  pickSimilarListingRefs,
} from './ListingPage.sold';

const { UUID, Money } = sdkTypes;

const stock = quantity => ({ id: new UUID('stock'), type: 'stock', attributes: { quantity } });

const config = {
  currency: 'EUR',
  layout: { listingImage: { aspectWidth: 1, aspectHeight: 1, variantPrefix: 'listing-card' } },
};

const listingWith = (attributes = {}, includes = {}) => ({
  id: new UUID('current'),
  type: 'listing',
  attributes: {
    price: new Money(10000, 'EUR'),
    publicData: { categoryLevel1: 'phonesaccessories' },
    ...attributes,
  },
  ...includes,
});

describe('ListingPage.sold', () => {
  describe('isSoldOut / getSchemaAvailability', () => {
    it('is not sold without a stock relationship (e.g. booking listings)', () => {
      expect(isSoldOut(listingWith())).toBe(false);
      expect(getSchemaAvailability(listingWith())).toBeNull();
      expect(isSoldOut(null)).toBe(false);
      expect(getSchemaAvailability(undefined)).toBeNull();
    });

    it('is in stock while the quantity is positive', () => {
      const listing = listingWith({}, { currentStock: stock(3) });
      expect(isSoldOut(listing)).toBe(false);
      expect(getSchemaAvailability(listing)).toBe('https://schema.org/InStock');
    });

    it('is sold out at quantity 0 (SoldOut, never OutOfStock)', () => {
      const listing = listingWith({}, { currentStock: stock(0) });
      expect(isSoldOut(listing)).toBe(true);
      expect(getSchemaAvailability(listing)).toBe('https://schema.org/SoldOut');
    });

    it('treats a stock relationship without a quantity as sold (parity with the old code)', () => {
      const listing = listingWith({}, { currentStock: { id: new UUID('s'), type: 'stock' } });
      expect(isSoldOut(listing)).toBe(true);
      expect(getSchemaAvailability(listing)).toBe('https://schema.org/SoldOut');
    });
  });

  describe('getSimilarListingsQueryParams', () => {
    it('filters by the level-1 category, a ±40 % price band and stock', () => {
      const params = getSimilarListingsQueryParams({ listing: listingWith(), config });
      expect(params).toEqual({
        pub_categoryLevel1: 'phonesaccessories',
        price: '6000,14001',
        minStock: 1,
        stockMode: 'match-undefined',
        perPage: SIMILAR_LISTINGS_COUNT + 1,
        include: ['author', 'images'],
        'fields.listing': ['title', 'price', 'publicData'],
        'fields.image': ['variants.listing-card', 'variants.listing-card-2x'],
        'limit.images': 1,
        'imageVariant.listing-card': 'w:400;h:400;fit:crop',
        'imageVariant.listing-card-2x': 'w:800;h:800;fit:crop',
      });
    });

    it('rounds the band outwards', () => {
      const listing = listingWith({ price: new Money(333, 'EUR') });
      // 333 * 0.6 = 199.8 → 199; 333 * 1.4 = 466.2 → 467, +1 → 468
      expect(getSimilarListingsQueryParams({ listing, config }).price).toBe('199,468');
    });

    it('omits the price filter for a missing, zero or foreign-currency price', () => {
      const cases = [
        listingWith({ price: null }),
        listingWith({ price: new Money(0, 'EUR') }),
        listingWith({ price: new Money(10000, 'USD') }),
      ];
      cases.forEach(listing => {
        const params = getSimilarListingsQueryParams({ listing, config });
        expect(params).not.toHaveProperty('price');
        expect(params.pub_categoryLevel1).toBe('phonesaccessories');
      });
    });

    it('omits the category filter when the listing has none', () => {
      const listing = listingWith({ publicData: {} });
      const params = getSimilarListingsQueryParams({ listing, config });
      expect(params).not.toHaveProperty('pub_categoryLevel1');
      expect(params.price).toBe('6000,14001');
    });

    it('uses the configured image aspect ratio', () => {
      const wide = {
        ...config,
        layout: { listingImage: { aspectWidth: 4, aspectHeight: 3, variantPrefix: 'card' } },
      };
      const params = getSimilarListingsQueryParams({ listing: listingWith(), config: wide });
      expect(params['imageVariant.card']).toBe('w:400;h:300;fit:crop');
      expect(params['fields.image']).toEqual(['variants.card', 'variants.card-2x']);
    });
  });

  describe('excludeListingFromResponse / pickSimilarListingRefs', () => {
    const image = id => ({ id: new UUID(id), type: 'image', attributes: { variants: {} } });
    const user = id => ({ id: new UUID(id), type: 'user', attributes: {} });
    const listing = (id, imageIds, authorId) => ({
      id: new UUID(id),
      type: 'listing',
      attributes: { title: id },
      relationships: {
        author: { data: { id: new UUID(authorId), type: 'user' } },
        images: { data: imageIds.map(i => ({ id: new UUID(i), type: 'image' })) },
      },
    });
    const response = {
      status: 200,
      data: {
        data: [
          listing('current', ['img-current'], 'seller'),
          listing('other', ['img-other'], 'seller'),
        ],
        included: [image('img-current'), image('img-other'), user('seller')],
        meta: { totalItems: 2 },
      },
    };

    it('drops the current listing and its images but keeps shared authors', () => {
      const filtered = excludeListingFromResponse(response, new UUID('current'));
      expect(filtered.data.data.map(l => l.id.uuid)).toEqual(['other']);
      expect(filtered.data.included.map(r => r.id.uuid)).toEqual(['img-other', 'seller']);
      expect(filtered.data.meta).toEqual({ totalItems: 2 });
      expect(filtered.status).toBe(200);
      // input untouched
      expect(response.data.data).toHaveLength(2);
      expect(response.data.included).toHaveLength(3);
    });

    it('accepts a plain uuid string and returns the response as is when absent', () => {
      expect(excludeListingFromResponse(response, 'current').data.data).toHaveLength(1);
      expect(excludeListingFromResponse(response, new UUID('missing'))).toBe(response);
    });

    it('picks entity refs capped at the module size', () => {
      const many = {
        data: {
          data: Array.from({ length: SIMILAR_LISTINGS_COUNT + 3 }, (_, i) =>
            listing(`l${i}`, [], 'a')
          ),
          included: [],
        },
      };
      const refs = pickSimilarListingRefs(many);
      expect(refs).toHaveLength(SIMILAR_LISTINGS_COUNT);
      expect(refs[0]).toEqual({ id: new UUID('l0'), type: 'listing' });
      expect(Object.keys(refs[0])).toEqual(['id', 'type']);
      expect(pickSimilarListingRefs({ data: { data: [] } })).toEqual([]);
      expect(pickSimilarListingRefs(undefined)).toEqual([]);
    });
  });
});
