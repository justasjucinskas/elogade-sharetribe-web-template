import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

import { useRouteConfiguration } from '../context/routeConfigurationContext';
import { matchPathname } from '../util/routes';

const MAPBOX_SCRIPT_ID = 'mapbox_GL_JS';
const GOOGLE_MAPS_SCRIPT_ID = 'GoogleMapsApi';
const STRIPE_SCRIPT_ID = 'stripe_js_v3';

/** Dispatched on `window` when Stripe.js has loaded (`window.Stripe` is available). */
export const STRIPE_JS_LOADED_EVENT = 'stripe-js-loaded';
/**
 * Dispatched on `window` when the map provider library has loaded and (for Mapbox) its
 * access token is set. Map consumers rendered before that re-render on this event.
 */
export const MAP_LIBRARY_LOADED_EVENT = 'map-library-loaded';
/**
 * Dispatched on `window` by a map consumer (Map, SearchMap, LocationAutocompleteInput) that
 * mounted on a page where the map library was not included. IncludeScripts listens and adds
 * the library, so Console-managed pages with a location Search CTA still get a geocoder.
 */
export const MAP_LIBRARY_REQUESTED_EVENT = 'map-library-requested';

const dispatchStripeJsLoadedEvent = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STRIPE_JS_LOADED_EVENT));
  }
};
const dispatchMapLibraryLoadedEvent = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MAP_LIBRARY_LOADED_EVENT));
  }
};

/**
 * Ask IncludeScripts to include the map provider library if it is not present yet.
 * Safe to call from any component's mount; a no-op when the library is already loaded.
 */
// Sticky flag next to the event: a class component's componentDidMount runs before
// IncludeScripts' own useEffect has registered its listener on the very first render, so the
// listener also checks this flag when it mounts.
let mapLibraryRequested = false;
export const requestMapLibrary = () => {
  if (typeof window !== 'undefined' && !window.mapboxgl && !window.google?.maps) {
    mapLibraryRequested = true;
    window.dispatchEvent(new CustomEvent(MAP_LIBRARY_REQUESTED_EVENT));
  }
};

const getRouteConfig = (pathname, routeConfiguration) => {
  if (!pathname) {
    return null;
  }
  const matchedRoutes = matchPathname(pathname, routeConfiguration);
  return matchedRoutes.length > 0 ? matchedRoutes[0]?.route : null;
};

/**
 * Whether the map provider library must be included on the page at `pathname`.
 *
 * Mapbox (mapbox-gl.js + mapbox-sdk) used to be loaded on every page although only a few
 * routes render a map or a location autocomplete. It is now included only when:
 * - the route declares `prioritizeLibraryLoading.map` (listing page, map search variant,
 *   edit-listing wizard), or
 * - the marketplace uses location search, in which case the Topbar search form (rendered on
 *   every page) needs the geocoder, or
 * - the pathname is unknown (fail open: better an extra script than a broken map).
 * Google Maps keeps its upstream behaviour (always included; it is fragile when loaded late).
 *
 * @param {string} pathname - locale-free pathname (React Router `location.pathname`)
 * @param {array} routeConfiguration - The route configuration.
 * @param {Object} config - merged app config
 * @returns {boolean}
 */
export const isMapLibraryNeeded = (pathname, routeConfiguration, config) => {
  if (!pathname) {
    return true;
  }
  return isMapLibraryNeededForRoute(getRouteConfig(pathname, routeConfiguration), config);
};
const isMapLibraryNeededForRoute = (routeConfig, config) =>
  config?.maps?.mapProvider === 'googleMaps' ||
  config?.search?.mainSearch?.searchType === 'location' ||
  routeConfig?.prioritizeLibraryLoading?.map === true;

/**
 * Map library is shown on some of the pages, but ReusableMapContainer is used app wide.
 * However, we can defer the map library loading on pages that don't show the map immediately.
 * Note: this currently only affects Mapbox library.
 * Google Maps library is always loaded immediately. (It seems to be more fragile when loaded asynchronously.)
 *
 * @param {Object} routeConfig - The matched route config of the initial page (null if unknown).
 * @returns {boolean} - True if the map library can be deferred, false otherwise.
 */
const canDeferMapLibrary = routeConfig => routeConfig?.prioritizeLibraryLoading?.map !== true;
const canDeferStripeLibrary = routeConfig => routeConfig?.prioritizeLibraryLoading?.stripe !== true;

/**
 * Include scripts (like Map Provider).
 * These scripts are relevant for whole application: location search in Topbar and maps on different pages.
 * However, if you don't need location search and maps, you can just omit this component from app.js
 * Note: another common point to add <scripts>, <links> and <meta> tags is Page.js.
 *       Stripe.js is injected here when `stripe.publishableKey` is set; consumers can
 *       wait for {@link STRIPE_JS_LOADED_EVENT} on `window` if the script may still be loading.
 *
 * Note 2: When adding new external scripts/styles/fonts/etc.,
 *         if a Content Security Policy (CSP) is turned on, the new URLs
 *         should be whitelisted in the policy. Check: server/csp.js
 */
export const IncludeScripts = props => {
  const { marketplaceRootURL: rootURL, maps, analytics, stripe } = props?.config || {};
  const { googleAnalyticsId, plausibleDomains } = analytics;

  const routeConfiguration = useRouteConfiguration();
  // Locale-free pathname of the current route (React Router strips the `basename`), kept in
  // sync with client-side navigation. This component must be rendered inside the Router.
  const { pathname } = useLocation();
  const routeConfig = useMemo(() => getRouteConfig(pathname, routeConfiguration), [
    pathname,
    routeConfiguration,
  ]);

  // Everything that ends up as an attribute on an already-rendered <script> is pinned to the
  // first render: react-helmet-async compares head tags node-by-node, so changing e.g. the
  // `defer` attribute on a client-side navigation would remove and re-append the tag, which
  // re-fetches and re-executes the library (replacing `window.mapboxgl` / `window.Stripe`).
  const pinnedRef = useRef(null);
  if (pinnedRef.current === null) {
    pinnedRef.current = {
      // Note: Affects Mapbox only. Google Maps initialization is not yet ready to support asynchronous loading.
      deferMapLibrary: canDeferMapLibrary(routeConfig) ? { defer: '' } : {},
      deferStripeLibrary: canDeferStripeLibrary(routeConfig) ? { defer: '' } : {},
    };
  }
  const { deferMapLibrary, deferStripeLibrary } = pinnedRef.current;

  const { mapProvider, googleMapsAPIKey, mapboxAccessToken } = maps || {};
  const isGoogleMapsInUse = mapProvider === 'googleMaps';
  // A map consumer that mounted on a page without the library (e.g. a Console page whose
  // Search CTA has a location field) asks for it through MAP_LIBRARY_REQUESTED_EVENT.
  const [mapLibraryRequestedByConsumer, setMapLibraryRequestedByConsumer] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const onRequested = () => setMapLibraryRequestedByConsumer(true);
    if (mapLibraryRequested) {
      onRequested();
    }
    window.addEventListener(MAP_LIBRARY_REQUESTED_EVENT, onRequested);
    return () => window.removeEventListener(MAP_LIBRARY_REQUESTED_EVENT, onRequested);
  }, []);
  // Once the map library has been included it stays for the rest of the session: removing and
  // re-adding the <script> would re-execute mapbox-gl.js and reset the global `mapboxgl` (and
  // its access token) under a mounted map.
  const mapLibraryIncludedRef = useRef(false);
  const mapLibraryNeeded =
    mapLibraryIncludedRef.current ||
    mapLibraryRequestedByConsumer ||
    isMapLibraryNeededForRoute(routeConfig, props?.config);
  mapLibraryIncludedRef.current = mapLibraryNeeded;
  const isMapboxInUse = mapProvider === 'mapbox' && mapLibraryNeeded;

  // Add Google Analytics script if correct id exists (it should start with 'G-' prefix)
  // See: https://developers.google.com/analytics/devguides/collection/gtagjs
  const hasGoogleAnalyticsv4Id = googleAnalyticsId?.indexOf('G-') === 0;

  // Collect relevant map libraries
  let stripeLibrary = [];
  let mapLibraries = [];
  let analyticsLibraries = [];

  if (stripe?.publishableKey) {
    // Stripe script should be on every page, not just the pages that use the API:
    // https://docs.stripe.com/js/including
    stripeLibrary.push(
      <script
        id={STRIPE_SCRIPT_ID}
        key="stripe_js_v3"
        src="https://js.stripe.com/v3/"
        crossOrigin="anonymous"
        {...deferStripeLibrary}
      ></script>
    );
  }

  if (isMapboxInUse) {
    // NOTE: remember to update mapbox-sdk.min.js to a new version regularly.
    // mapbox-sdk.min.js is included from static folder for CSP purposes.
    mapLibraries.push(
      <script
        key="mapboxSDK"
        src={`${rootURL}/static/scripts/mapbox/mapbox-sdk@0.16.2/mapbox-sdk.min.js`}
        async
      ></script>
    );
    // License information for v3.7.0 of the mapbox-gl-js library:
    // https://github.com/mapbox/mapbox-gl-js/blob/v3.7.0/LICENSE.txt

    // Add CSS for Mapbox map
    mapLibraries.push(
      <link
        key="mapbox_GL_CSS"
        href="https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.css"
        rel="stylesheet"
        crossOrigin="anonymous"
      />
    );
    // Add Mapbox library
    mapLibraries.push(
      <script
        id={MAPBOX_SCRIPT_ID}
        key="mapbox_GL_JS"
        src="https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.js"
        crossOrigin="anonymous"
        {...deferMapLibrary}
      ></script>
    );
  } else if (isGoogleMapsInUse) {
    // Add Google Maps library
    mapLibraries.push(
      <script
        id={GOOGLE_MAPS_SCRIPT_ID}
        key="GoogleMapsApi"
        src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsAPIKey}&libraries=places`}
        crossOrigin="anonymous"
      ></script>
    );
  }

  if (googleAnalyticsId && hasGoogleAnalyticsv4Id) {
    // Google Analytics: gtag.js
    // NOTE: This template is a single-page application (SPA).
    //       gtag.js sends initial page_view event after page load.
    //       but we need to handle subsequent events for in-app navigation.
    //       This is done in src/analytics/handlers.js
    analyticsLibraries.push(
      <script
        key="gtag.js"
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
        crossOrigin="anonymous"
      ></script>
    );

    // This component now re-renders on every client-side navigation (it follows the
    // router location to gate the map library), so the gtag bootstrap must run once per
    // page load: `gtag('config')` sends a page_view, and in-app navigation page views are
    // already reported by src/analytics/handlers.js.
    if (typeof window !== 'undefined' && !window.gtag) {
      window.dataLayer = window.dataLayer || [];
      // Ensure that gtag function is found from window scope
      window.gtag = function gtag() {
        dataLayer.push(arguments);
      };
      gtag('js', new Date());
      gtag('config', googleAnalyticsId, {
        cookie_flags: 'SameSite=None;Secure',
      });
    }
  }

  if (plausibleDomains) {
    // If plausibleDomains is not an empty string, include their script too.
    analyticsLibraries.push(
      <script
        key="plausible"
        defer
        src="https://plausible.io/js/script.js"
        data-domain={plausibleDomains}
        crossOrigin="anonymous"
      ></script>
    );
  }

  const isBrowser = typeof window !== 'undefined';
  const isMapboxLoaded = isBrowser && window.mapboxgl;

  // If Mapbox is loaded, we can set the accessToken already here.
  // This is the execution flow with the production build,
  // since SSR includes those map libraries to <head> of the app.
  if (isMapboxInUse && isMapboxLoaded && !window.mapboxgl.accessToken) {
    // Add access token for Mapbox library
    window.mapboxgl.accessToken = mapboxAccessToken;
  }

  // If the script is added on client side as a reaction to page navigation or
  // the app is rendered on client side entirely (e.g. HMR/WebpackDevServer),
  // we need to listen when the script is loaded.
  const onMapLibLoaded = () => {
    // At this point we know that map library is loaded after it's dynamically included
    if (isMapboxInUse && window.mapboxgl && !window.mapboxgl.accessToken) {
      // Add access token for Mapbox sdk.
      window.mapboxgl.accessToken = mapboxAccessToken;
    }
    dispatchMapLibraryLoadedEvent();
  };

  // React Helmet Async doesn't support onLoad prop for scripts.
  // However, it does have onChangeClientState functionality.
  // We can use that to start listen 'load' events when the library is added on client-side.
  const onChangeClientState = (newState, addedTags) => {
    if (addedTags && addedTags.scriptTags) {
      const foundScript = addedTags.scriptTags.find(s =>
        [MAPBOX_SCRIPT_ID, GOOGLE_MAPS_SCRIPT_ID].includes(s.id)
      );
      if (foundScript) {
        foundScript.addEventListener('load', onMapLibLoaded, { once: true });
      }
      const stripeScript = addedTags.scriptTags.find(s => s.id === STRIPE_SCRIPT_ID);
      if (stripeScript) {
        stripeScript.addEventListener('load', dispatchStripeJsLoadedEvent, { once: true });
      }
    }
  };

  // After Helmet writes the Stripe script into the document, either dispatch immediately
  // (Stripe already ran, e.g. cached) or wait for `load` so listeners (e.g. payment forms)
  // can rely on STRIPE_JS_LOADED_EVENT. Complements onChangeClientState for injected tags.
  useEffect(() => {
    if (!stripe?.publishableKey || typeof document === 'undefined') {
      return undefined;
    }
    const script = document.getElementById(STRIPE_SCRIPT_ID);
    if (!script) {
      return undefined;
    }

    if (window.Stripe) {
      dispatchStripeJsLoadedEvent();
      return undefined;
    }

    script.addEventListener('load', dispatchStripeJsLoadedEvent, { once: true });
    return () => {
      script.removeEventListener('load', dispatchStripeJsLoadedEvent);
    };
  }, [stripe?.publishableKey]);

  // The render-time assignment above (isMapboxLoaded check) and onChangeClientState's
  // 'load' listener both miss one case: on a server-rendered page, the mapbox-gl.js
  // script tag already exists in the initial HTML with the same Helmet-managed
  // attributes React would render on hydration, so React Helmet Async treats it as
  // unchanged and never reports it through onChangeClientState's addedTags - the
  // 'load' listener above is never attached to it. This effect closes that gap by
  // checking directly against the DOM/window on mount, independent of Helmet's
  // added/removed tag diffing.
  useEffect(() => {
    if (!isMapboxInUse || typeof window === 'undefined') {
      return undefined;
    }

    const assignAccessToken = () => {
      if (window.mapboxgl && !window.mapboxgl.accessToken) {
        window.mapboxgl.accessToken = mapboxAccessToken;
      }
      if (window.mapboxgl) {
        dispatchMapLibraryLoadedEvent();
      }
    };

    assignAccessToken();

    if (window.mapboxgl) {
      return undefined;
    }

    const script = document.getElementById(MAPBOX_SCRIPT_ID);
    if (!script) {
      return undefined;
    }

    script.addEventListener('load', assignAccessToken, { once: true });
    return () => {
      script.removeEventListener('load', assignAccessToken);
    };
  }, [isMapboxInUse, mapboxAccessToken]);

  const allScripts = [...stripeLibrary, ...analyticsLibraries, ...mapLibraries];
  return <Helmet onChangeClientState={onChangeClientState}>{allScripts}</Helmet>;
};
