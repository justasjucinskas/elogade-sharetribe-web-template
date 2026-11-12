import { configureStore } from '@reduxjs/toolkit';
import { types as sdkTypes } from '../../util/sdkLoader';
import { CATEGORY_TILES } from './sections/categoryTiles';

const { UUID } = sdkTypes;

const CATEGORY_COUNT = CATEGORY_TILES.length;
const HOUR = 60 * 60 * 1000;

const config = { layout: { listingImage: {} }, listing: { listingFields: [] } };

// A fake SDK whose listings.query answers both the showcase query and the
// per-category count queries. `failCategory` makes one category's count fail.
const createSdk = ({ failCategory } = {}) => ({
  listings: {
    query: jest.fn(params => {
      const category = params.pub_categoryLevel1;
      if (failCategory && category === failCategory) {
        return Promise.reject(new Error('API down'));
      }
      if (category) {
        return Promise.resolve({ data: { data: [], meta: { totalItems: 3 } } });
      }
      return Promise.resolve({
        data: {
          data: [
            {
              id: new UUID('listing-1'),
              type: 'listing',
              attributes: { title: 'Phone' },
              relationships: { images: { data: [{ id: new UUID('image-1'), type: 'image' }] } },
            },
          ],
          included: [],
          meta: {},
        },
      });
    }),
  },
});

const countQueries = sdk =>
  sdk.listings.query.mock.calls.filter(([params]) => params.pub_categoryLevel1).length;
const showcaseQueries = sdk =>
  sdk.listings.query.mock.calls.filter(([params]) => !params.pub_categoryLevel1).length;

// The duck's count cache lives in the module, like it does in a Node server
// process. Each test gets a fresh module = a freshly started server.
const loadDuck = () => require('./ModernLandingPage.duck');

const createStore = (duck, sdk, preloadedState) =>
  configureStore({
    reducer: { ModernLandingPage: duck.default, marketplaceData: (state = {}) => state },
    preloadedState,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({ thunk: { extraArgument: sdk }, serializableCheck: false }),
  });

// One full page load handled by the server: a new store per request, same module.
const renderOnServer = async (duck, sdk) => {
  const store = createStore(duck, sdk);
  await store.dispatch(duck.loadData({}, '', config));
  return store.getState();
};

describe('ModernLandingPage.duck', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads the showcase and a count per category on the first render', async () => {
    const duck = loadDuck();
    const sdk = createSdk();

    const state = await renderOnServer(duck, sdk);

    expect(showcaseQueries(sdk)).toBe(1);
    expect(countQueries(sdk)).toBe(CATEGORY_COUNT);
    expect(state.ModernLandingPage.queryError).toBe(null);
    expect(state.ModernLandingPage.featuredListingRefs).toHaveLength(1);
    expect(Object.keys(state.ModernLandingPage.categoryCounts)).toHaveLength(CATEGORY_COUNT);
    expect(state.ModernLandingPage.categoryCounts[CATEGORY_TILES[0].id]).toBe(3);
  });

  it('reuses the category counts across server renders within the hour', async () => {
    const duck = loadDuck();
    const sdk = createSdk();
    const start = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(start);

    await renderOnServer(duck, sdk);
    clock.mockReturnValue(start + HOUR - 1);
    const second = await renderOnServer(duck, sdk);

    expect(countQueries(sdk)).toBe(CATEGORY_COUNT);
    expect(showcaseQueries(sdk)).toBe(2);
    expect(second.ModernLandingPage.categoryCounts[CATEGORY_TILES[0].id]).toBe(3);

    clock.mockReturnValue(start + HOUR);
    await renderOnServer(duck, sdk);
    expect(countQueries(sdk)).toBe(2 * CATEGORY_COUNT);
  });

  it('shares one set of count queries between simultaneous server renders', async () => {
    const duck = loadDuck();
    const sdk = createSdk();

    await Promise.all([renderOnServer(duck, sdk), renderOnServer(duck, sdk)]);

    expect(countQueries(sdk)).toBe(CATEGORY_COUNT);
  });

  it('does not keep counts with a failed category, so the next render retries', async () => {
    const duck = loadDuck();
    const failing = createSdk({ failCategory: CATEGORY_TILES[1].id });

    const first = await renderOnServer(duck, failing);
    expect(first.ModernLandingPage.categoryCounts[CATEGORY_TILES[1].id]).toBe(null);
    expect(first.ModernLandingPage.categoryCounts[CATEGORY_TILES[0].id]).toBe(3);

    const healthy = createSdk();
    await renderOnServer(duck, healthy);
    expect(countQueries(healthy)).toBe(CATEGORY_COUNT);
  });

  it('makes no queries when the browser mounts a server-rendered page', async () => {
    const serverSdk = createSdk();
    const serverState = await renderOnServer(loadDuck(), serverSdk);

    // The browser is another process: fresh module, state from the SSR payload.
    jest.resetModules();
    const browserDuck = loadDuck();
    const browserSdk = createSdk();
    const browserStore = createStore(browserDuck, browserSdk, {
      ModernLandingPage: serverState.ModernLandingPage,
    });
    await browserStore.dispatch(browserDuck.loadData({}, '', config));

    expect(browserSdk.listings.query).not.toHaveBeenCalled();
    expect(browserStore.getState().ModernLandingPage).toEqual(serverState.ModernLandingPage);
  });

  it('refetches the showcase, but not the counts, on a later visit in the same tab', async () => {
    const serverState = await renderOnServer(loadDuck(), createSdk());

    jest.resetModules();
    const browserDuck = loadDuck();
    const browserSdk = createSdk();
    const browserStore = createStore(browserDuck, browserSdk, {
      ModernLandingPage: serverState.ModernLandingPage,
    });
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(serverState.ModernLandingPage.featuredFetchedAt + 60 * 1000);
    await browserStore.dispatch(browserDuck.loadData({}, '', config));

    expect(showcaseQueries(browserSdk)).toBe(1);
    expect(countQueries(browserSdk)).toBe(0);
  });

  it('refetches the showcase when the browser clock is far behind the server', async () => {
    const serverState = await renderOnServer(loadDuck(), createSdk());

    jest.resetModules();
    const browserDuck = loadDuck();
    const browserSdk = createSdk();
    const browserStore = createStore(browserDuck, browserSdk, {
      ModernLandingPage: serverState.ModernLandingPage,
    });
    jest.spyOn(Date, 'now').mockReturnValue(serverState.ModernLandingPage.featuredFetchedAt - HOUR);
    await browserStore.dispatch(browserDuck.loadData({}, '', config));

    expect(showcaseQueries(browserSdk)).toBe(1);
  });

  it('fetches counts in the browser when the server-rendered page had none', async () => {
    const duck = loadDuck();
    const sdk = createSdk();
    const store = createStore(duck, sdk, {
      ModernLandingPage: { ...duck.default(undefined, { type: '@@INIT' }), categoryCounts: {} },
    });

    await store.dispatch(duck.queryCategoryCountsThunk());

    expect(countQueries(sdk)).toBe(CATEGORY_COUNT);
  });
});
