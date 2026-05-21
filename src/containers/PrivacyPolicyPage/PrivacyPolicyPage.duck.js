import { fetchPageAssets } from '../../ducks/hostedAssets.duck';
import { getLocalizedAssetSlug } from '../../util/locale';

export const ASSET_NAME = 'privacy-policy';

export const loadData = (params, search) => (dispatch, getState) => {
  const locale = getState()?.locale?.current;
  const localizedSlug = getLocalizedAssetSlug(ASSET_NAME, locale);
  const localizedPath = `content/pages/${localizedSlug}.json`;
  const basePath = `content/pages/${ASSET_NAME}.json`;

  // State key stays `privacyPolicy` so PrivacyPolicyPage keeps reading the same key.
  return dispatch(fetchPageAssets({ privacyPolicy: localizedPath }, true)).catch(err => {
    const isLocalizedAttempt = localizedSlug !== ASSET_NAME;
    if (isLocalizedAttempt && err?.status === 404) {
      return dispatch(fetchPageAssets({ privacyPolicy: basePath }, true));
    }
    throw err;
  });
};
