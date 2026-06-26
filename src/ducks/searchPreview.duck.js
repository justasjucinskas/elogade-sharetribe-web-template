import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../util/errors';
import { denormalisedResponseEntities } from '../util/data';
import { createImageVariantConfig } from '../util/sdkLoader';

// Number of listings shown in the topbar search typeahead.
const RESULT_PAGE_SIZE = 5;

// ================ Async thunk ================ //

const queryPreviewPayloadCreator = async (keywords, thunkAPI) => {
  const { extra: sdk, rejectWithValue } = thunkAPI;
  const trimmed = (keywords || '').trim();

  return sdk.listings
    .query({
      keywords: trimmed,
      perPage: RESULT_PAGE_SIZE,
      page: 1,
      minStock: 1,
      stockMode: 'match-undefined',
      include: ['images'],
      'fields.listing': ['title', 'price'],
      'fields.image': ['variants.listing-card', 'variants.listing-card-2x'],
      ...createImageVariantConfig('listing-card', 400, 1),
      ...createImageVariantConfig('listing-card-2x', 800, 1),
      'limit.images': 1,
    })
    .then(response => ({ keywords: trimmed, listings: denormalisedResponseEntities(response) }))
    .catch(error => rejectWithValue(storableError(error)));
};

export const queryPreviewListings = createAsyncThunk(
  'searchPreview/queryPreviewListings',
  queryPreviewPayloadCreator
);

// ================ Slice ================ //

const initialState = { keywords: '', listings: [], inProgress: false, error: null };

const searchPreviewSlice = createSlice({
  name: 'searchPreview',
  initialState,
  reducers: {
    clearPreview: () => initialState,
  },
  extraReducers: builder => {
    builder
      .addCase(queryPreviewListings.pending, (state, action) => {
        // Track the keywords of the in-flight request so we can drop stale responses.
        state.keywords = (action.meta.arg || '').trim();
        state.inProgress = true;
        state.error = null;
      })
      .addCase(queryPreviewListings.fulfilled, (state, action) => {
        // Ignore responses for a query the user has already typed past.
        if (action.payload.keywords !== state.keywords) {
          return;
        }
        state.listings = action.payload.listings;
        state.inProgress = false;
      })
      .addCase(queryPreviewListings.rejected, (state, action) => {
        state.inProgress = false;
        state.error = action.payload;
      });
  },
});

export const { clearPreview } = searchPreviewSlice.actions;
export default searchPreviewSlice.reducer;
