import React, { useEffect, useReducer } from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';
import { getMapProviderApiAccess } from '../../util/maps';
import { MAP_LIBRARY_LOADED_EVENT, requestMapLibrary } from '../../util/includeScripts';
import * as mapboxMap from './MapboxMap';
import * as googleMapsMap from './GoogleMap';

import css from './Map.module.css';

/**
 * Map component that uses StaticMap or DynamicMap from the configured map provider: Mapbox or Google Maps
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to component's own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string?} props.mapRootClassName add style rules for the root container
 * @param {string?} props.address
 * @param {Object} props.center LatLng
 * @param {number} props.center.lat latitude
 * @param {number} props.center.lng longitude
 * @param {Object} props.obfuscatedCenter LatLng
 * @param {number} props.obfuscatedCenter.lat latitude
 * @param {number} props.obfuscatedCenter.lng longitude
 * @param {number} props.zoom
 * @param {Object} props.mapsConfig
 * @param {boolean} props.useStaticMap
 * @returns {JSX.Element} Map component
 */
export const Map = props => {
  const config = useConfiguration();
  const {
    className,
    rootClassName,
    mapRootClassName,
    address,
    center,
    obfuscatedCenter,
    zoom,
    mapsConfig,
    useStaticMap,
  } = props;
  const mapsConfiguration = mapsConfig || config.maps;
  const hasApiAccessForMapProvider = !!getMapProviderApiAccess(mapsConfiguration);
  const isGoogleMapsInUse = mapsConfiguration.mapProvider === 'googleMaps';
  const StaticMap = isGoogleMapsInUse ? googleMapsMap.StaticMap : mapboxMap.StaticMap;
  const DynamicMap = isGoogleMapsInUse ? googleMapsMap.DynamicMap : mapboxMap.DynamicMap;
  const isMapsLibLoaded = isGoogleMapsInUse
    ? googleMapsMap.isMapsLibLoaded
    : mapboxMap.isMapsLibLoaded;

  // The map library is included per route (see util/includeScripts.js), so on a client-side
  // navigation it may still be loading when this renders. Re-render once it announces itself
  // (or, if it finished loading between this render and the effect, right away).
  const libLoadedAtRender = !!isMapsLibLoaded();
  const [, rerender] = useReducer(x => x + 1, 0);
  useEffect(() => {
    if (typeof window === 'undefined' || libLoadedAtRender) {
      return undefined;
    }
    if (isMapsLibLoaded()) {
      rerender();
      return undefined;
    }
    requestMapLibrary();
    window.addEventListener(MAP_LIBRARY_LOADED_EVENT, rerender);
    return () => window.removeEventListener(MAP_LIBRARY_LOADED_EVENT, rerender);
  }, [libLoadedAtRender, isMapsLibLoaded]);

  const classes = classNames(rootClassName || css.root, className);
  const mapClasses = mapRootClassName || css.mapRoot;

  if (mapsConfiguration.fuzzy.enabled && !obfuscatedCenter) {
    throw new Error(
      'Map: obfuscatedCenter prop is required when config.maps.fuzzy.enabled === true'
    );
  }
  if (!mapsConfiguration.fuzzy.enabled && !center) {
    throw new Error('Map: center prop is required when config.maps.fuzzy.enabled === false');
  }

  const location = mapsConfiguration.fuzzy.enabled ? obfuscatedCenter : center;
  const zoomLevel =
    zoom || mapsConfiguration.fuzzy.enabled ? mapsConfiguration.fuzzy.defaultZoomLevel : 11;

  const isMapProviderAvailable = hasApiAccessForMapProvider && isMapsLibLoaded();
  return !isMapProviderAvailable ? (
    <div className={classes} />
  ) : useStaticMap ? (
    <StaticMap
      center={location}
      zoom={zoomLevel}
      address={address}
      mapsConfig={mapsConfiguration}
    />
  ) : (
    <DynamicMap
      containerClassName={classes}
      mapClassName={mapClasses}
      center={location}
      zoom={zoomLevel}
      address={address}
      mapsConfig={mapsConfiguration}
    />
  );
};

export default Map;
