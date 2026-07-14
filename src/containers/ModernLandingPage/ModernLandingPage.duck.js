import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { createImageVariantConfig } from '../../util/sdkLoader';
import { storableError } from '../../util/errors';

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
      include: ['images'],
      'fields.image': [`variants.${variantPrefix}`, `variants.${variantPrefix}-2x`],
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

// ================ Slice ================ //

const initialState = {
  featuredListingRefs: [],
  queryInProgress: false,
  queryError: null,
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
      });
  },
});

export default modernLandingPageSlice.reducer;

// ================ Load data ================ //

export const loadData = (params, search, config) => dispatch => {
  return dispatch(queryFeaturedListingsThunk({ config }));
};
