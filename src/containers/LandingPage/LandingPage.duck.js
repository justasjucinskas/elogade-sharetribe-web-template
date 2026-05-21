import { fetchPageAssets } from '../../ducks/hostedAssets.duck';
import { getLocalizedAssetSlug } from '../../util/locale';

export const ASSET_NAME = 'landing-page';

export const loadData = (params, search) => (dispatch, getState) => {
  const locale = getState()?.locale?.current;
  const localizedSlug = getLocalizedAssetSlug(ASSET_NAME, locale);
  const localizedPath = `content/pages/${localizedSlug}.json`;
  const basePath = `content/pages/${ASSET_NAME}.json`;

  // State key MUST stay `landingPage` so LandingPage.js keeps reading
  // pageAssetsData.landingPage regardless of which slug was actually fetched.
  return dispatch(fetchPageAssets({ landingPage: localizedPath }, true)).catch(err => {
    const isLocalizedAttempt = localizedSlug !== ASSET_NAME;
    if (isLocalizedAttempt && err?.status === 404) {
      return dispatch(fetchPageAssets({ landingPage: basePath }, true));
    }
    throw err;
  });
};
