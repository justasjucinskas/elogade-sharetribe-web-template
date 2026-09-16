import { createImageVariantConfig } from '../../util/sdkLoader';

/**
 * Sold-listing lifecycle helpers for ListingPage (SEO-PLAN.md PR 4, ticket 7).
 *
 * A listing on this marketplace is a single second-hand item, so "stock 0" means "sold".
 * The listing page stays at HTTP 200 with its content intact (it keeps matching long-tail
 * queries); the Offer advertises `SoldOut`, a badge says so, and a "similar listings"
 * module points the residual traffic at live inventory in the same category and price
 * band. Everything here is pure so the duck and the view can be tested separately.
 */

const SCHEMA_AVAILABILITY = {
  IN_STOCK: 'https://schema.org/InStock',
  SOLD_OUT: 'https://schema.org/SoldOut',
};

/** How many similar listings the module shows. */
export const SIMILAR_LISTINGS_COUNT = 8;

/** Similar listings are priced within ±40 % of the current listing. */
export const SIMILAR_LISTINGS_PRICE_BAND = 0.4;

/**
 * True when the listing carries a `currentStock` relationship whose quantity is not positive.
 * Listings without stock (e.g. booking listings) are never "sold".
 *
 * @param {Object} listing listing entity (denormalised, with `currentStock` joined)
 * @returns {boolean}
 */
export const isSoldOut = listing => {
  const stock = listing?.currentStock;
  return !!stock && !(stock.attributes?.quantity > 0);
};

/**
 * schema.org availability for the listing's Offer, or null when the listing has no stock
 * relationship (the Offer then carries no `availability` at all).
 *
 * @param {Object} listing
 * @returns {string|null}
 */
export const getSchemaAvailability = listing => {
  if (!listing?.currentStock) {
    return null;
  }
  return isSoldOut(listing) ? SCHEMA_AVAILABILITY.SOLD_OUT : SCHEMA_AVAILABILITY.IN_STOCK;
};

/**
 * Query params for the "similar listings" module: same level-1 category, price within
 * ±40 % (marketplace currency only), in stock, newest first (API default). One extra
 * result is requested because the current listing matches its own filters and is dropped
 * afterwards. `fields.listing` is limited to what ListingCard renders; `include` stays
 * unrestricted for users because entities are shallow-merged in the store and a sparse
 * author would clobber the profile already loaded for the current listing.
 *
 * @param {Object} params
 * @param {Object} params.listing listing entity (raw API or denormalised)
 * @param {Object} params.config merged app config
 * @returns {Object} params for `sdk.listings.query`
 */
export const getSimilarListingsQueryParams = ({ listing, config }) => {
  const {
    aspectWidth = 1,
    aspectHeight = 1,
    variantPrefix = 'listing-card',
  } = config.layout.listingImage;
  const aspectRatio = aspectHeight / aspectWidth;

  const { price, publicData = {} } = listing?.attributes || {};
  const categoryLevel1 = publicData?.categoryLevel1;
  const categoryMaybe = categoryLevel1 ? { pub_categoryLevel1: categoryLevel1 } : {};

  const amount = price?.amount;
  const hasUsablePrice =
    Number.isFinite(amount) && amount > 0 && price.currency === config.currency;
  const priceMaybe = hasUsablePrice
    ? {
        // The API's price range is `min,max` in minor units with an exclusive max
        // (SearchPage adds the same +1 so the upper bound is inclusive).
        price: [
          Math.floor(amount * (1 - SIMILAR_LISTINGS_PRICE_BAND)),
          Math.ceil(amount * (1 + SIMILAR_LISTINGS_PRICE_BAND)) + 1,
        ].join(','),
      }
    : {};

  return {
    ...categoryMaybe,
    ...priceMaybe,
    minStock: 1,
    stockMode: 'match-undefined',
    perPage: SIMILAR_LISTINGS_COUNT + 1,
    include: ['author', 'images'],
    'fields.listing': ['title', 'price', 'publicData'],
    'fields.image': [`variants.${variantPrefix}`, `variants.${variantPrefix}-2x`],
    'limit.images': 1,
    ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
    ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
  };
};

/**
 * Drop the current listing (and the image resources it references) from a
 * `listings.query` response before the response is merged into the store. The merge is a
 * shallow per-entity merge, so letting the sparse copy through would replace the loaded
 * listing's image variants and relationships (e.g. `limit.images: 1`) with the card-sized
 * subset and break the gallery.
 *
 * @param {Object} response SDK response of `sdk.listings.query`
 * @param {UUID|string} listingId id of the listing being viewed
 * @returns {Object} response of the same shape without the current listing
 */
export const excludeListingFromResponse = (response, listingId) => {
  const uuid = listingId?.uuid || listingId;
  const { data = [], included = [], ...rest } = response?.data || {};
  const excluded = data.find(l => l?.id?.uuid === uuid);
  if (!excluded) {
    return response;
  }
  const excludedImageIds = (excluded.relationships?.images?.data || []).map(img => img.id.uuid);
  return {
    ...response,
    data: {
      ...rest,
      data: data.filter(l => l !== excluded),
      included: included.filter(
        res => !(res.type === 'image' && excludedImageIds.includes(res.id?.uuid))
      ),
    },
  };
};

/**
 * Entity references (`{ id, type }`) for the listings of a (filtered) query response,
 * capped at the module size.
 *
 * @param {Object} response SDK response (after `excludeListingFromResponse`)
 * @param {number} [count]
 * @returns {Array<{ id: UUID, type: string }>}
 */
export const pickSimilarListingRefs = (response, count = SIMILAR_LISTINGS_COUNT) => {
  const data = response?.data?.data || [];
  return data.slice(0, count).map(({ id, type }) => ({ id, type }));
};
