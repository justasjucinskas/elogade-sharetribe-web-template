/**
 * Helpers for translating labels that come from Sharetribe Console hosted config
 * (listing fields, listing types, user fields, user types, categories, topbar
 * links, footer).
 *
 * Sharetribe Console hosts a single language at a time — labels typed there are
 * plain strings, not translation keys. To support multiple UI locales we look up
 * `<namespace>.<id>.label` (or `.option.<option>` for enum options) in the active
 * translation file, falling back to the Console string when the key is missing.
 *
 * Conventions:
 *   listingField.<key>.label
 *   listingField.<key>.option.<option>
 *   listingField.<key>.helpText
 *   listingType.<id>.label
 *   userField.<key>.label
 *   userField.<key>.option.<option>
 *   userField.<key>.helpText
 *   userType.<id>.label
 *   category.<id>.label
 *   TopbarLink.<href>.text
 *   Footer.slogan
 *   Footer.copyright
 *   Footer.block.<blockId>.text
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

// Listing fields and user fields share the same shape (key, label, schemaType,
// enumOptions). The lookup namespace is the only thing that differs, so the
// public helpers below are thin wrappers around these.
const formatExtendedFieldLabel = (intl, namespace, fieldKey, fallback) =>
  fieldKey ? formatHostedLabel(intl, `${namespace}.${fieldKey}.label`, fallback) : fallback;

const formatExtendedFieldOption = (intl, namespace, fieldKey, optionKey, fallback) =>
  fieldKey && optionKey != null
    ? formatHostedLabel(intl, `${namespace}.${fieldKey}.option.${optionKey}`, fallback)
    : fallback;

const formatExtendedFieldHelpText = (intl, namespace, fieldKey, fallback) =>
  fieldKey ? formatHostedLabel(intl, `${namespace}.${fieldKey}.helpText`, fallback) : fallback;

export const formatListingFieldLabel = (intl, fieldKey, fallback) =>
  formatExtendedFieldLabel(intl, 'listingField', fieldKey, fallback);

export const formatListingFieldOption = (intl, fieldKey, optionKey, fallback) =>
  formatExtendedFieldOption(intl, 'listingField', fieldKey, optionKey, fallback);

export const formatListingFieldHelpText = (intl, fieldKey, fallback) =>
  formatExtendedFieldHelpText(intl, 'listingField', fieldKey, fallback);

export const formatListingTypeLabel = (intl, listingTypeId, fallback) =>
  listingTypeId
    ? formatHostedLabel(intl, `listingType.${listingTypeId}.label`, fallback)
    : fallback;

export const formatUserFieldLabel = (intl, fieldKey, fallback) =>
  formatExtendedFieldLabel(intl, 'userField', fieldKey, fallback);

export const formatUserFieldOption = (intl, fieldKey, optionKey, fallback) =>
  formatExtendedFieldOption(intl, 'userField', fieldKey, optionKey, fallback);

export const formatUserFieldHelpText = (intl, fieldKey, fallback) =>
  formatExtendedFieldHelpText(intl, 'userField', fieldKey, fallback);

export const formatUserTypeLabel = (intl, userTypeId, fallback) =>
  userTypeId ? formatHostedLabel(intl, `userType.${userTypeId}.label`, fallback) : fallback;

export const formatCategoryName = (intl, categoryId, fallback) =>
  categoryId ? formatHostedLabel(intl, `category.${categoryId}.label`, fallback) : fallback;

// Topbar custom links have no stable id in Console — the `href` is the only field
// that survives label edits, so we key off it. If the operator changes a link's
// href, the old key in lt.json becomes stale (silent fallback to the new English
// text) and a new key is needed; run `yarn run translate-hosted --prune --stub`
// to clean up and re-stub.
export const formatTopbarLinkText = (intl, href, fallback) =>
  href ? formatHostedLabel(intl, `TopbarLink.${href}.text`, fallback) : fallback;

const translateEnumOptionsByNamespace = (intl, namespace, fieldKey, enumOptions) => {
  if (!Array.isArray(enumOptions)) return enumOptions;
  return enumOptions.map(o => ({
    ...o,
    label: formatExtendedFieldOption(intl, namespace, fieldKey, o.option, o.label),
  }));
};

const translateEnumOptionsForFormByNamespace = (intl, namespace, fieldKey, enumOptions) => {
  if (!Array.isArray(enumOptions)) return [];
  return enumOptions.map(o => ({
    key: `${o.option}`,
    label: formatExtendedFieldOption(intl, namespace, fieldKey, o.option, o.label),
  }));
};

/**
 * Map enumOptions through `formatListingFieldOption`. Preserves the original
 * `{ option, label, ...rest }` shape (only `label` is replaced). Used by
 * SearchPage filter children, which key off `option`.
 */
export const translateEnumOptions = (intl, fieldKey, enumOptions) =>
  translateEnumOptionsByNamespace(intl, 'listingField', fieldKey, enumOptions);

/**
 * Same as `translateEnumOptions` but produces the `{ key, label }` shape used by
 * Final-Form Field* components (FieldSelect, FieldCheckboxGroup, PropertyGroup).
 */
export const translateEnumOptionsForForm = (intl, fieldKey, enumOptions) =>
  translateEnumOptionsForFormByNamespace(intl, 'listingField', fieldKey, enumOptions);

/** User-field counterparts of `translateEnumOptions` / `translateEnumOptionsForForm`. */
export const translateUserFieldEnumOptions = (intl, fieldKey, enumOptions) =>
  translateEnumOptionsByNamespace(intl, 'userField', fieldKey, enumOptions);

export const translateUserFieldEnumOptionsForForm = (intl, fieldKey, enumOptions) =>
  translateEnumOptionsForFormByNamespace(intl, 'userField', fieldKey, enumOptions);

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

// Footer slogan and copyright are singletons in the hosted footer asset — there is
// only one of each, so they get fixed keys rather than identifier-keyed ones.
export const formatFooterSlogan = (intl, fallback) =>
  formatHostedLabel(intl, 'Footer.slogan', fallback);

export const formatFooterCopyright = (intl, fallback) =>
  formatHostedLabel(intl, 'Footer.copyright', fallback);

// Footer blocks are keyed off their stable `blockId` (set in Console — e.g.
// "general", "terms-and-privacy") so editing the block's markdown text in Console
// doesn't invalidate the LT translation. If the operator changes a block's id,
// the old key becomes stale; `yarn run translate-hosted --prune --stub` resets it.
export const formatFooterBlockText = (intl, blockId, fallback) =>
  blockId ? formatHostedLabel(intl, `Footer.block.${blockId}.text`, fallback) : fallback;

/**
 * Returns a shallow copy of a footer text-content field (slogan, copyright, or
 * block.text) with `content` replaced by the translated value. Pass-through if
 * the field has no string `content` (Field handles empty/optional fields).
 */
const translateContent = (intl, field, lookupId) => {
  if (!field || typeof field.content !== 'string') return field;
  const translated = formatHostedLabel(intl, lookupId, field.content);
  return { ...field, content: translated };
};

export const translateFooterSlogan = (intl, slogan) =>
  translateContent(intl, slogan, 'Footer.slogan');

export const translateFooterCopyright = (intl, copyright) =>
  translateContent(intl, copyright, 'Footer.copyright');

/**
 * Map footer block configs through `formatFooterBlockText`. Only `footerBlock`s
 * carry translatable text — other block types (e.g. socialMediaLink) pass through
 * unchanged. Preserves the original block shape.
 */
export const translateFooterBlocks = (intl, blocks) => {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map(block => {
    if (block?.blockType !== 'footerBlock' || !block.blockId) return block;
    return {
      ...block,
      text: translateContent(intl, block.text, `Footer.block.${block.blockId}.text`),
    };
  });
};
