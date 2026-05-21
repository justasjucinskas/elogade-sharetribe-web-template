import { fetchPageAssets, pageAssetNotFound } from '../../ducks/hostedAssets.duck';
import { getLocalizedAssetSlug, hasNonDefaultLocaleSuffix } from '../../util/locale';

export const loadData = (params, search) => (dispatch, getState) => {
  const { pageId } = params;

  // Locale-specific slugs (e.g. `about-lt`) are addressed implicitly through the
  // canonical URL on the matching locale (`/lt/p/about` → `about-lt.json`). Visiting
  // them directly (`/en/p/about-lt`, `/lt/p/about-lt`) would bleed LT content onto the
  // wrong locale, so we reject those URLs as not found.
  if (hasNonDefaultLocaleSuffix(pageId)) {
    dispatch(pageAssetNotFound());
    return Promise.resolve();
  }

  const locale = getState()?.locale?.current;
  const localizedPageId = getLocalizedAssetSlug(pageId, locale);
  const localizedPath = `content/pages/${localizedPageId}.json`;
  const basePath = `content/pages/${pageId}.json`;
  const hasFallbackContent = false;

  // State key stays as the URL `pageId` so CMSPage.js keeps reading pageAssetsData[pageId].
  return dispatch(fetchPageAssets({ [pageId]: localizedPath }, hasFallbackContent)).catch(err => {
    const isLocalizedAttempt = localizedPageId !== pageId;
    if (isLocalizedAttempt && err?.status === 404) {
      return dispatch(fetchPageAssets({ [pageId]: basePath }, hasFallbackContent));
    }
    throw err;
  });
};
