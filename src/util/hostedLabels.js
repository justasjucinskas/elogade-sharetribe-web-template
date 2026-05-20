/**
 * Helpers for translating labels that come from Sharetribe Console hosted config
 * (listing fields, enum options, listing types, categories, topbar links).
 *
 * Sharetribe Console hosts a single language at a time — labels typed there are
 * plain strings, not translation keys. To support multiple UI locales we look up
 * `<namespace>.<id>.label` (or `.option.<option>` for enum options) in the active
 * translation file, falling back to the Console string when the key is missing.
 *
 * Conventions:
 *   listingField.<key>.label
 *   listingField.<key>.option.<option>
 *   listingType.<id>.label
 *   category.<id>.label
 *   TopbarLink.<href>.text
 *
 * The Console string is always passed as `defaultMessage`, so `/en` keeps working
 * even without any translation keys, and any locale degrades to the Console string
 * for keys that have not been translated yet.
 *
 * Use the `yarn run translate-hosted` script to audit which keys are missing.
 */

const formatHostedLabel = (intl, id, defaultMessage) => {
  if (!intl) return defaultMessage;
  if (typeof defaultMessage !== 'string' || defaultMessage.length === 0) {
    return defaultMessage;
  }
  return intl.formatMessage({ id, defaultMessage });
};

export const formatListingFieldLabel = (intl, fieldKey, fallback) =>
  fieldKey ? formatHostedLabel(intl, `listingField.${fieldKey}.label`, fallback) : fallback;

export const formatListingFieldOption = (intl, fieldKey, optionKey, fallback) =>
  fieldKey && optionKey != null
    ? formatHostedLabel(intl, `listingField.${fieldKey}.option.${optionKey}`, fallback)
    : fallback;

export const formatListingTypeLabel = (intl, listingTypeId, fallback) =>
  listingTypeId
    ? formatHostedLabel(intl, `listingType.${listingTypeId}.label`, fallback)
    : fallback;

export const formatCategoryName = (intl, categoryId, fallback) =>
  categoryId ? formatHostedLabel(intl, `category.${categoryId}.label`, fallback) : fallback;

// Topbar custom links have no stable id in Console — the `href` is the only field
// that survives label edits, so we key off it. If the operator changes a link's
// href, the old key in lt.json becomes stale (silent fallback to the new English
// text) and a new key is needed; run `yarn run translate-hosted --prune --stub`
// to clean up and re-stub.
export const formatTopbarLinkText = (intl, href, fallback) =>
  href ? formatHostedLabel(intl, `TopbarLink.${href}.text`, fallback) : fallback;

/**
 * Map enumOptions through `formatListingFieldOption`. Preserves the original
 * `{ option, label, ...rest }` shape (only `label` is replaced). Used by
 * SearchPage filter children, which key off `option`.
 */
export const translateEnumOptions = (intl, fieldKey, enumOptions) => {
  if (!Array.isArray(enumOptions)) return enumOptions;
  return enumOptions.map(o => ({
    ...o,
    label: formatListingFieldOption(intl, fieldKey, o.option, o.label),
  }));
};

/**
 * Same as `translateEnumOptions` but produces the `{ key, label }` shape used by
 * Final-Form Field* components (FieldSelect, FieldCheckboxGroup, PropertyGroup).
 */
export const translateEnumOptionsForForm = (intl, fieldKey, enumOptions) => {
  if (!Array.isArray(enumOptions)) return [];
  return enumOptions.map(o => ({
    key: `${o.option}`,
    label: formatListingFieldOption(intl, fieldKey, o.option, o.label),
  }));
};

/**
 * Map listingType options (shape `{ option, label, ...rest }`, where `option`
 * holds the listingType id) through `formatListingTypeLabel`.
 */
export const translateListingTypeOptions = (intl, options) => {
  if (!Array.isArray(options)) return options;
  return options.map(o => ({
    ...o,
    label: formatListingTypeLabel(intl, o.option, o.label),
  }));
};

/**
 * Recursively map categories' `name` field through `formatCategoryName`.
 * Preserves the `subcategories` tree.
 */
export const translateCategories = (intl, categories) => {
  if (!Array.isArray(categories)) return categories;
  return categories.map(cat => ({
    ...cat,
    name: formatCategoryName(intl, cat.id, cat.name),
    subcategories: translateCategories(intl, cat.subcategories),
  }));
};
