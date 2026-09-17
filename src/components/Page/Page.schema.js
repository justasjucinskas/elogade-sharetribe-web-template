import { SUPPORTED_LOCALES } from '../../config/configLocale';

/**
 * Site-wide structured-data nodes (schema.org Organization + WebSite) that <Page> appends
 * to every page's JSON-LD graph. Pure functions, unit-tested in Page.schema.test.js.
 *
 * Everything optional is derived from config and simply omitted while empty, so the nodes
 * stay valid whatever the operator has (not) filled in yet:
 * - `sameAs` merges the local `siteFacebookPage` / `siteTwitterHandle` / `siteInstagramPage`
 *   values with the social-media links of the hosted footer asset (Console → Footer), so
 *   adding a profile in Console updates the entity signal without a deploy.
 * - `logo` is the hosted branding logo (largest variant) or the local fallback asset.
 * - `contactPoint` appears once `siteContactEmail` is set in src/config/configDefault.js.
 * - `WebSite.potentialAction` (Sitelinks search box) targets the locale-prefixed keyword search.
 */

const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;
const unique = arr => arr.filter((v, i) => arr.indexOf(v) === i);
const isAbsoluteURL = url => /^https?:\/\//i.test(url);

export const twitterPageURL = siteTwitterHandle => {
  if (siteTwitterHandle && siteTwitterHandle.charAt(0) === '@') {
    return `https://twitter.com/${siteTwitterHandle.substring(1)}`;
  } else if (siteTwitterHandle) {
    return `https://twitter.com/${siteTwitterHandle}`;
  }
  return null;
};

/**
 * Social profile URLs of the organization: local config values first, then the footer
 * asset's social-media links. Deduplicated, empty/non-string entries dropped.
 */
export const getOrganizationSameAs = config => {
  const fromConfig = [
    config?.siteFacebookPage,
    twitterPageURL(config?.siteTwitterHandle),
    config?.siteInstagramPage,
  ];
  const footerLinks = Array.isArray(config?.footer?.socialMediaLinks)
    ? config.footer.socialMediaLinks
    : [];
  const fromFooter = footerLinks.map(block => block?.link?.url);
  return unique([...fromConfig, ...fromFooter].filter(isNonEmptyString).map(u => u.trim()));
};

/**
 * Absolute URL of the organization logo.
 * `config.branding.logoImageDesktop` is either a hosted imageAsset (Console branding) or a
 * bundled asset path (local fallback, e.g. "/static/media/logo.png") which is made absolute
 * against the marketplace root URL.
 */
export const getOrganizationLogoURL = (branding, marketplaceRootURL) => {
  const logo = branding?.logoImageDesktop || branding?.logoImageMobile;
  if (isNonEmptyString(logo)) {
    return isAbsoluteURL(logo)
      ? logo
      : `${marketplaceRootURL}${logo.startsWith('/') ? '' : '/'}${logo}`;
  }
  if (logo?.type === 'imageAsset') {
    const variants = Object.values(logo.attributes?.variants || {}).filter(v =>
      isNonEmptyString(v?.url)
    );
    const largest = variants.reduce(
      (best, v) => (best == null || (v.width || 0) > (best.width || 0) ? v : best),
      null
    );
    return largest?.url || null;
  }
  return null;
};

/**
 * schema.org Organization node. `@context` is set once at the graph root by <Page>.
 */
export const buildOrganizationNode = ({ config, marketplaceRootURL, marketplaceName }) => {
  const sameAs = getOrganizationSameAs(config);
  const logo = getOrganizationLogoURL(config?.branding, marketplaceRootURL);
  const email = isNonEmptyString(config?.siteContactEmail) ? config.siteContactEmail.trim() : null;
  const addressMaybe = config?.address?.streetAddress ? { address: config.address } : {};

  return {
    '@type': 'Organization',
    '@id': `${marketplaceRootURL}#organization`,
    name: marketplaceName,
    url: marketplaceRootURL,
    ...(logo ? { logo } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(email
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email,
            availableLanguage: SUPPORTED_LOCALES,
          },
        }
      : {}),
    ...addressMaybe,
  };
};

/**
 * schema.org WebSite node with a SearchAction (Sitelinks search box) pointing at the
 * keyword search of the current locale.
 */
export const buildWebSiteNode = ({ marketplaceRootURL, marketplaceName, description, locale }) => ({
  '@type': 'WebSite',
  '@id': `${marketplaceRootURL}#website`,
  name: marketplaceName,
  url: marketplaceRootURL,
  ...(isNonEmptyString(description) ? { description } : {}),
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${marketplaceRootURL}/${locale}/s?keywords={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
});
