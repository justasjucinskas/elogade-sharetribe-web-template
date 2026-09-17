import routeConfiguration from '../routing/routeConfiguration';
import { isMapLibraryNeeded } from './includeScripts';

const mapboxConfig = {
  maps: { mapProvider: 'mapbox' },
  search: { mainSearch: { searchType: 'keywords' } },
};

describe('util/includeScripts.js', () => {
  describe('isMapLibraryNeeded (keyword search, grid search page, Mapbox)', () => {
    const routes = routeConfiguration({
      searchPage: { variantType: 'grid' },
      listingPage: { variantType: 'carousel' },
    });

    it('skips the library on pages without a map', () => {
      expect(isMapLibraryNeeded('/', routes, mapboxConfig)).toBe(false);
      expect(isMapLibraryNeeded('/s', routes, mapboxConfig)).toBe(false);
      expect(isMapLibraryNeeded('/p/about', routes, mapboxConfig)).toBe(false);
      expect(isMapLibraryNeeded('/login', routes, mapboxConfig)).toBe(false);
      expect(isMapLibraryNeeded('/u/1234', routes, mapboxConfig)).toBe(false);
    });

    it('includes the library on routes that render a map or a location autocomplete', () => {
      expect(isMapLibraryNeeded('/l/nice-listing/1234', routes, mapboxConfig)).toBe(true);
      expect(isMapLibraryNeeded('/l/1234', routes, mapboxConfig)).toBe(true);
      expect(isMapLibraryNeeded('/l/nice-listing/1234/draft', routes, mapboxConfig)).toBe(true);
      expect(isMapLibraryNeeded('/l/nice-listing/1234/new/delivery', routes, mapboxConfig)).toBe(
        true
      );
      expect(isMapLibraryNeeded('/l/nice-listing/1234/edit/location', routes, mapboxConfig)).toBe(
        true
      );
    });

    it('fails open on an unknown pathname', () => {
      expect(isMapLibraryNeeded(undefined, routes, mapboxConfig)).toBe(true);
      expect(isMapLibraryNeeded('', routes, mapboxConfig)).toBe(true);
    });
  });

  it('includes the library on the map variant of the search page', () => {
    const routes = routeConfiguration({
      searchPage: { variantType: 'map' },
      listingPage: { variantType: 'carousel' },
    });
    expect(isMapLibraryNeeded('/s', routes, mapboxConfig)).toBe(true);
    expect(isMapLibraryNeeded('/', routes, mapboxConfig)).toBe(false);
  });

  it('includes the library everywhere when the topbar uses location search', () => {
    const routes = routeConfiguration({
      searchPage: { variantType: 'grid' },
      listingPage: { variantType: 'carousel' },
    });
    const locationSearchConfig = {
      maps: { mapProvider: 'mapbox' },
      search: { mainSearch: { searchType: 'location' } },
    };
    expect(isMapLibraryNeeded('/', routes, locationSearchConfig)).toBe(true);
    expect(isMapLibraryNeeded('/p/about', routes, locationSearchConfig)).toBe(true);
  });

  it('keeps Google Maps included on every page', () => {
    const routes = routeConfiguration({
      searchPage: { variantType: 'grid' },
      listingPage: { variantType: 'carousel' },
    });
    const googleConfig = {
      maps: { mapProvider: 'googleMaps' },
      search: { mainSearch: { searchType: 'keywords' } },
    };
    expect(isMapLibraryNeeded('/', routes, googleConfig)).toBe(true);
  });
});
