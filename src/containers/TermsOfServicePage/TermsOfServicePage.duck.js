import { fetchPageAssets } from '../../ducks/hostedAssets.duck';
import { getLocalizedAssetSlug } from '../../util/locale';

export const ASSET_NAME = 'terms-of-service';

export const loadData = (params, search) => (dispatch, getState) => {
  const locale = getState()?.locale?.current;
  const localizedSlug = getLocalizedAssetSlug(ASSET_NAME, locale);
  const localizedPath = `content/pages/${localizedSlug}.json`;
  const basePath = `content/pages/${ASSET_NAME}.json`;

  // State key stays `termsOfService` so TermsOfServicePage keeps reading the same key.
  return dispatch(fetchPageAssets({ termsOfService: localizedPath }, true)).catch(err => {
    const isLocalizedAttempt = localizedSlug !== ASSET_NAME;
    if (isLocalizedAttempt && err?.status === 404) {
      return dispatch(fetchPageAssets({ termsOfService: basePath }, true));
    }
    throw err;
  });
};
