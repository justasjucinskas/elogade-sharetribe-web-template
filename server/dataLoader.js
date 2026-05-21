const { URL } = require('node:url');
const log = require('./log');
const { getRootURL } = require('./api-util/rootURL');

const PREVENT_DATA_LOADING_IN_SSR = process.env.PREVENT_DATA_LOADING_IN_SSR === 'true';

const extractHostedConfig = configAssets => {
  const configEntries = Object.entries(configAssets);
  return configEntries.reduce((collectedData, [name, content]) => {
    return { ...collectedData, [name]: content?.data || {} };
  }, {});
};

exports.loadData = function(requestUrl, sdk, appInfo, options = {}) {
  const {
    matchPathname,
    configureStore,
    routeConfiguration,
    defaultConfig,
    mergeConfig,
    fetchAppAssets,
    setLocale,
  } = appInfo;
  const { pathname, search } = new URL(`${getRootURL()}${requestUrl}`);
  const locale = options.locale;

  let translations = {};
  let hostedConfig = {};

  const store = configureStore({ initialState: {}, sdk });

  // Make locale available to per-page loadData thunks BEFORE they run, so they can
  // select locale-specific Console content (e.g. landing-page-lt instead of landing-page).
  if (locale && typeof setLocale === 'function') {
    store.dispatch(setLocale(locale));
  }

  if (PREVENT_DATA_LOADING_IN_SSR) {
    // This might help certain temporary scenarios, where DDOS attack adds load to server.
    // Note: This is not a meaningful mitigation against DDOS attacks.
    //       Consider adding some kind of edge protection and rate limiter.
    return Promise.resolve({
      preloadedState: store.getState(),
      translations: {},
      hostedConfig: {},
      locale,
    });
  }

  const dataLoadingCalls = hostedConfigAsset => {
    const config = mergeConfig(hostedConfigAsset, defaultConfig);
    const matchedRoutes = matchPathname(pathname, routeConfiguration(config.layout));
    return matchedRoutes.reduce((calls, match) => {
      const { route, params } = match;
      if (typeof route.loadData === 'function' && !route.auth) {
        calls.push(store.dispatch(route.loadData(params, search, config)));
      }
      return calls;
    }, []);
  };

  // First fetch app-wide assets
  // Then make loadData calls
  // And return object containing preloaded state and translations
  // This order supports other asset (in the future) that should be fetched before data calls.
  return store
    .dispatch(fetchAppAssets(defaultConfig.appCdnAssets))
    .then(fetchedAppAssets => {
      const { translations: translationsRaw, ...rest } = fetchedAppAssets || {};

      // We'll handle translations as a separate data.
      // It's given to React Intl instead of pushing to config Context
      translations = translationsRaw?.data || {};

      // Rest of the assets are considered as hosted configs
      // This structure just gives possibilities to add initial config data
      hostedConfig = { ...hostedConfig, ...extractHostedConfig(rest) };
      return Promise.all(dataLoadingCalls(hostedConfig));
    })
    .then(() => {
      return { preloadedState: store.getState(), translations, hostedConfig, locale };
    })
    .catch(e => {
      log.error(e, 'server-side-data-load-failed');

      // Call to loadData failed, let client handle the data loading errors.
      // (It might be recoverable error like lost connection.)
      // Return "empty" store.
      return { preloadedState: store.getState(), translations, hostedConfig, locale };
    });
};
