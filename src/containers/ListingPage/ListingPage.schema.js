import { constructQueryParamName } from '../../util/search';
import { formatListingFieldOption } from '../../util/hostedLabels';
import { pathByRouteName } from '../../util/routes';
import { prependLocale } from '../../util/locale';
import { buildCategorySearch } from '../../util/categorySeo';
import { getSelectedCategoryPath } from '../SearchPage/SearchPage.seo';

/**
 * SEO data for ListingPage: the JSON-LD graph (Product + BreadcrumbList) and the
 * <meta name="description"> text.
 *
 * Everything here is pure so it can be unit-tested without rendering. The decisions it
 * encodes (see SEO-PLAN.md PR 3 and SEO-INPUTS.md §3–§6):
 *  - `itemCondition` is mapped from `publicData.productcondition`. A missing or unknown value
 *    falls back to UsedCondition, never NewCondition: the only listing type on this
 *    marketplace is second-hand, so "new" must be an explicit seller claim.
 *  - `brand` is resolved from the per-category brand field (`brand`, `brand1`…`brand8`,
 *    keyed by `categoryLevel1`). The enum value `other` means the free-text `brandother`
 *    field, or no brand node at all — "Other" is never emitted as a brand name.
 *  - Every URL in the graph is locale-prefixed and equal to the listing page's own canonical
 *    (`/<locale>/l/<uuid>`, slug dropped), so the schema never contradicts rel=canonical.
 *  - No `aggregateRating` / `review`: there are no real reviews on the marketplace, and empty
 *    or fabricated rating markup is a manual-action risk.
 *  - `publicData.imeiserialnumber` is deliberately never read here.
 */

const SCHEMA_CONDITION = {
  NEW: 'https://schema.org/NewCondition',
  USED: 'https://schema.org/UsedCondition',
  DAMAGED: 'https://schema.org/DamagedCondition',
};

// `publicData.productcondition` enum → schema.org itemCondition (SEO-INPUTS.md §3).
const CONDITION_TO_SCHEMA = {
  new: SCHEMA_CONDITION.NEW,
  likenew: SCHEMA_CONDITION.NEW,
  verygood: SCHEMA_CONDITION.USED,
  good: SCHEMA_CONDITION.USED,
  acceptable: SCHEMA_CONDITION.USED,
  fairforparts: SCHEMA_CONDITION.DAMAGED,
};

export const CONDITION_FIELD_KEY = 'productcondition';
export const WARRANTY_FIELD_KEY = 'warrantystatus';
export const NO_WARRANTY_VALUE = 'nowarranty';
export const BRAND_OTHER_VALUE = 'other';
export const BRAND_OTHER_TEXT_KEY = 'brandother';

// Console defines one brand enum field per level-1 category (SEO-INPUTS.md §4).
export const BRAND_FIELD_BY_CATEGORY = {
  phonesaccessories: 'brand',
  computerstablets: 'brand1',
  wearablessmartdevices: 'brand2',
  audiodevices: 'brand3',
  consoleaccessories: 'brand4',
  camerasvideo: 'brand5',
  homeappliances: 'brand6',
  tvhomeentertainment: 'brand7',
  beautypersonalcare: 'brand8',
};

// Offer.priceValidUntil: this many days after the listing was published (ticket 4). When
// that date is already in the past the window is re-based on "now" so an old listing does
// not advertise an expired price.
export const PRICE_VALID_DAYS = 60;

export const META_DESCRIPTION_MAX_LENGTH = 155;

const asString = value => (value == null ? '' : `${value}`.trim());
const lower = value => asString(value).toLowerCase();

/**
 * schema.org itemCondition URL for a `productcondition` value. Case-insensitive; anything
 * unmapped (including a missing value) is UsedCondition.
 */
export const getItemCondition = productcondition =>
  CONDITION_TO_SCHEMA[lower(productcondition)] || SCHEMA_CONDITION.USED;

/**
 * Find the enum option of a listing field whose key matches `value` case-insensitively.
 * Returns `{ option, label }` from the field config, or null when the field or option is
 * unknown to the config.
 */
const findEnumOption = (listingFields, fieldKey, value) => {
  const field = (listingFields || []).find(f => f.key === fieldKey);
  const wanted = lower(value);
  if (!field || !wanted) return null;
  return (field.enumOptions || []).find(o => lower(o.option) === wanted) || null;
};

/**
 * Localised label for an enum value of a listing field. The lookup goes through
 * `formatListingFieldOption` keyed on the option key as Console defines it (so a value that
 * only differs in case, e.g. `honor` vs `Honor`, still finds its LT/PL translation). Falls
 * back to the Console label, then to the raw value.
 */
export const getEnumOptionLabel = (intl, listingFields, fieldKey, value) => {
  const raw = asString(value);
  if (!raw) return '';
  const option = findEnumOption(listingFields, fieldKey, raw);
  const optionKey = option ? option.option : raw;
  const fallback = option?.label || raw;
  return formatListingFieldOption(intl, fieldKey, optionKey, fallback);
};

/**
 * Resolve the listing's brand name (SEO-INPUTS.md §4). Looks at the brand field of the
 * listing's level-1 category first, then at any other brand field that happens to carry a
 * value. `other` → `brandother` text, or null.
 *
 * @returns {string|null}
 */
export const getBrandName = ({ intl, listingFields, publicData = {} }) => {
  const categoryField = BRAND_FIELD_BY_CATEGORY[publicData.categoryLevel1];
  const candidates = [
    ...(categoryField ? [categoryField] : []),
    ...Object.values(BRAND_FIELD_BY_CATEGORY).filter(k => k !== categoryField),
  ];
  const fieldKey = candidates.find(k => asString(publicData[k]) !== '');
  if (!fieldKey) return null;

  const value = asString(publicData[fieldKey]);
  if (lower(value) === BRAND_OTHER_VALUE) {
    const otherText = asString(publicData[BRAND_OTHER_TEXT_KEY]);
    return otherText || null;
  }
  return getEnumOptionLabel(intl, listingFields, fieldKey, value) || null;
};

/**
 * Walk the category tree with the listing's own `categoryLevel1..3` values. Same shape as
 * the search page's selected path so breadcrumb URLs are built identically on both pages.
 */
export const getListingCategoryPath = (publicData = {}, categoryConfiguration, intl) => {
  const { categoryLevelKeys = [] } = categoryConfiguration || {};
  const asSearchParams = categoryLevelKeys.reduce((acc, levelKey) => {
    const value = publicData[levelKey];
    return value != null && value !== ''
      ? { ...acc, [constructQueryParamName(levelKey, 'public')]: value }
      : acc;
  }, {});
  return getSelectedCategoryPath(asSearchParams, categoryConfiguration, intl);
};

const toISODate = date => date.toISOString().slice(0, 10);

/**
 * `YYYY-MM-DD` PRICE_VALID_DAYS after the listing was published, never earlier than
 * PRICE_VALID_DAYS after `now`.
 */
export const getPriceValidUntil = (createdAt, now = new Date()) => {
  const created = createdAt instanceof Date ? createdAt : createdAt ? new Date(createdAt) : null;
  const base =
    created && !Number.isNaN(created.getTime()) && created.getTime() > now.getTime()
      ? created
      : now;
  const until = new Date(base.getTime());
  until.setUTCDate(until.getUTCDate() + PRICE_VALID_DAYS);
  return toISODate(until);
};

/**
 * Cut `text` to `maxLength` characters on a word boundary, ending with an ellipsis.
 */
export const truncateDescription = (text, maxLength = META_DESCRIPTION_MAX_LENGTH) => {
  const str = asString(text).replace(/\s+/g, ' ');
  if (str.length <= maxLength) return str;
  const ellipsis = '…';
  const cut = str.slice(0, maxLength - ellipsis.length);
  const lastSpace = cut.lastIndexOf(' ');
  const head = lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut;
  return `${head.replace(/[\s,;:–-]+$/, '')}${ellipsis}`;
};

/**
 * <meta name="description"> for a listing (SEO-INPUTS.md §6):
 * `{title}, {condition} condition – {price}. [With warranty.] Secure purchase on {name}.`
 * Missing condition or price drop their fragment rather than rendering a hole.
 */
export const getListingMetaDescription = ({
  intl,
  config,
  listingFields,
  title,
  publicData = {},
  formattedPrice,
}) => {
  const marketplaceName = config.marketplaceName;
  const condition = getEnumOptionLabel(
    intl,
    listingFields,
    CONDITION_FIELD_KEY,
    publicData[CONDITION_FIELD_KEY]
  );
  const price = asString(formattedPrice);
  const cleanTitle = asString(title);

  const mainId =
    condition && price
      ? 'ListingPage.metaDescription'
      : price
      ? 'ListingPage.metaDescriptionNoCondition'
      : condition
      ? 'ListingPage.metaDescriptionNoPrice'
      : 'ListingPage.metaDescriptionTitleOnly';
  const main = intl.formatMessage({ id: mainId }, { title: cleanTitle, condition, price });

  const warranty = lower(publicData[WARRANTY_FIELD_KEY]);
  const hasWarranty = !!warranty && warranty !== NO_WARRANTY_VALUE;
  const warrantyPart = hasWarranty
    ? intl.formatMessage({ id: 'ListingPage.metaDescriptionWarranty' })
    : '';
  const suffix = intl.formatMessage(
    { id: 'ListingPage.metaDescriptionSuffix' },
    { marketplaceName }
  );

  return truncateDescription([main, warrantyPart, suffix].filter(Boolean).join(' '));
};

/**
 * Build the listing page's JSON-LD nodes: a Product (with Offer) and a BreadcrumbList.
 *
 * @param {Object} params
 * @param {Object} params.intl
 * @param {Object} params.config merged app config
 * @param {Array} params.routeConfiguration
 * @param {string} params.currentLocale URL locale ('en' | 'lt' | 'pl')
 * @param {Object} params.listing ensured listing entity (id, attributes, images, author)
 * @param {string} [params.authorDisplayName]
 * @param {Array<string>} [params.images] absolute image URLs
 * @param {Object} [params.priceMaybe] `{ price, priceCurrency }` or `{}`
 * @param {Object} [params.availabilityMaybe] `{ availability }` or `{}`
 * @param {Date} [params.now] injectable clock for priceValidUntil
 * @returns {{ url: string, categoryPath: Array, schema: Array }}
 */
export const getListingSchema = ({
  intl,
  config,
  routeConfiguration,
  currentLocale,
  listing,
  authorDisplayName,
  images = [],
  priceMaybe = {},
  availabilityMaybe = {},
  now = new Date(),
}) => {
  const root = config.marketplaceRootURL;
  const listingFields = config.listing?.listingFields || [];
  const id = listing?.id?.uuid;
  const { title = '', description = '', publicData = {}, createdAt } = listing?.attributes || {};

  const localeBase = `${root}${prependLocale('/', currentLocale)}`;
  const url = `${root}${prependLocale(
    pathByRouteName('ListingPageCanonical', routeConfiguration, { id }),
    currentLocale
  )}`;
  const searchBase = `${root}${prependLocale(
    pathByRouteName('SearchPage', routeConfiguration),
    currentLocale
  )}`;

  const categoryPath = getListingCategoryPath(publicData, config.categoryConfiguration, intl);
  const level1 = categoryPath[0];
  const brandName = getBrandName({ intl, listingFields, publicData });
  const model = asString(publicData.modelname);
  const color = asString(publicData.color);
  const sellerName = asString(authorDisplayName);

  const product = {
    '@type': 'Product',
    '@id': `${url}#product`,
    name: title,
    ...(description ? { description } : {}),
    sku: id,
    ...(level1 ? { category: level1.name } : {}),
    ...(brandName ? { brand: { '@type': 'Brand', name: brandName } } : {}),
    ...(model ? { model } : {}),
    ...(color ? { color } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    offers: {
      '@type': 'Offer',
      url,
      ...priceMaybe,
      ...availabilityMaybe,
      itemCondition: getItemCondition(publicData[CONDITION_FIELD_KEY]),
      priceValidUntil: getPriceValidUntil(createdAt, now),
      ...(sellerName ? { seller: { '@type': 'Person', name: sellerName } } : {}),
    },
  };

  const breadcrumbList = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { name: intl.formatMessage({ id: 'SearchPage.breadcrumbHome' }), item: localeBase },
      ...categoryPath.map((c, i) => ({
        name: c.name,
        item: `${searchBase}${buildCategorySearch({
          categoryIds: categoryPath.slice(0, i + 1).map(p => p.id),
        })}`,
      })),
      { name: title, item: url },
    ].map((entry, i) => ({ '@type': 'ListItem', position: i + 1, ...entry })),
  };

  return { url, categoryPath, schema: [product, breadcrumbList] };
};
