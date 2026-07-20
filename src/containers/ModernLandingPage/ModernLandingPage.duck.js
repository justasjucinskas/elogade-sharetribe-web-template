import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { createImageVariantConfig } from '../../util/sdkLoader';
import { storableError } from '../../util/errors';
import { CATEGORY_TILES } from './sections/categoryTiles';

// ================ Async Thunks ================ //

/**
 * Fetch the newest published listings for the hero showcase. Only listings
 * that are in stock are requested; the ones with photos are kept, since the
 * showcase cards are image-led.
 */
const queryFeaturedListingsPayloadCreator = (
  { config },
  { dispatch, rejectWithValue, extra: sdk }
) => {
  const {
    aspectWidth = 1,
    aspectHeight = 1,
    variantPrefix = 'listing-card',
  } = config.layout.listingImage;
  const aspectRatio = aspectHeight / aspectWidth;

  return sdk.listings
    .query({
      perPage: 12,
      minStock: 1,
      stockMode: 'match-undefined',
      include: ['author', 'images'],
      // The showcase cards render nothing but the title, the price, the first
      // photo and the seller's name, so the rest of the listing payload would
      // only bloat the SSR-serialized state.
      'fields.listing': ['title', 'price'],
      'fields.image': [`variants.${variantPrefix}`, `variants.${variantPrefix}-2x`],
      'limit.images': 1,
      // The showcase cards credit the seller by name.
      'fields.user': ['profile.displayName'],
      ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
      ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
    })
    .then(response => {
      const listingFields = config?.listing?.listingFields;
      const sanitizeConfig = { listingFields };
      const listingRefs = response.data.data
        .filter(l => l.relationships?.images?.data?.length > 0)
        .map(({ id, type }) => ({ id, type }));
      dispatch(addMarketplaceEntities(response, sanitizeConfig));
      return { listingRefs };
    })
    .catch(e => rejectWithValue(storableError(e)));
};

export const queryFeaturedListingsThunk = createAsyncThunk(
  'ModernLandingPage/queryFeaturedListings',
  queryFeaturedListingsPayloadCreator
);

/**
 * Fetch a live published-listing count per top-level category for the "Shop by
 * category" tiles. Sharetribe has no aggregation endpoint, so we fire one cheap
 * `perPage: 1` query per category and read `meta.totalItems` (the total match
 * count, independent of the page size). A single category's failure yields a
 * null count for that tile only — it must not sink the rest of the page.
 */
const queryCategoryCountsPayloadCreator = (arg, { extra: sdk }) => {
  return Promise.all(
    CATEGORY_TILES.map(({ id }) =>
      sdk.listings
        // The stock filters mirror what SearchPage always sends, so a tile's
        // count matches what clicking through to it actually shows.
        .query({ pub_categoryLevel1: id, perPage: 1, minStock: 1, stockMode: 'match-undefined' })
        .then(res => [id, res.data.meta.totalItems])
        .catch(() => [id, null])
    )
  ).then(entries => Object.fromEntries(entries));
};

export const queryCategoryCountsThunk = createAsyncThunk(
  'ModernLandingPage/queryCategoryCounts',
  queryCategoryCountsPayloadCreator
);

// ================ Slice ================ //

const initialState = {
  featuredListingRefs: [],
  queryInProgress: false,
  queryError: null,
  categoryCounts: {},
};

const modernLandingPageSlice = createSlice({
  name: 'ModernLandingPage',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(queryFeaturedListingsThunk.pending, state => {
        state.queryInProgress = true;
        state.queryError = null;
      })
      .addCase(queryFeaturedListingsThunk.fulfilled, (state, action) => {
        state.queryInProgress = false;
        state.featuredListingRefs = action.payload.listingRefs;
      })
      .addCase(queryFeaturedListingsThunk.rejected, (state, action) => {
        state.queryInProgress = false;
        state.queryError = action.payload;
      })
      .addCase(queryCategoryCountsThunk.fulfilled, (state, action) => {
        state.categoryCounts = action.payload;
      });
  },
});

export default modernLandingPageSlice.reducer;

// ================ Load data ================ //

export const loadData = (params, search, config) => dispatch => {
  return Promise.all([
    dispatch(queryFeaturedListingsThunk({ config })),
    dispatch(queryCategoryCountsThunk()),
  ]);
};
