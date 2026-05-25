/* eslint-disable no-console */
/**
 * translate-hosted — keep translation files in sync with Sharetribe Console hosted config.
 *
 * Sharetribe Console hosts a single language at a time, so listing field labels,
 * enum option labels, listing type labels and category names appear in whatever
 * language the operator typed in Console. This script audits the gap between the
 * hosted config and the project's overlay translation files (e.g.
 * `src/translations/hosted/lt.json`) using the keying convention defined in
 * `src/util/hostedLabels.js`:
 *
 *   listingField.<key>.label
 *   listingField.<key>.option.<option>
 *   listingType.<id>.label
 *   category.<id>.label
 *   TopbarLink.<href>.text
 *   Footer.slogan
 *   Footer.copyright
 *   Footer.block.<blockId>.text
 *
 * Usage:
 *   yarn run translate-hosted [--check] [--stub] [--prune] [--locales=lt,de] [--source=<path>]
 *
 *   (default)         List missing/stale keys, non-zero exit if anything is missing.
 *   --check           Same as default; intended for CI.
 *   --stub            Write missing keys with the English fallback value (translator workflow).
 *   --prune           Remove stale keys (no longer present in hosted config).
 *   --locales=lt[,xx] Comma-separated locale codes to audit. Defaults to every locale
 *                     in src/translations except en.
 *   --source=<path>   Read hosted config from a local snapshot JSON instead of the live API.
 *                     The snapshot must look like:
 *                     { listingFields, listingTypes, categories, topbar, footer }
 *                     where each value is the parsed contents of the matching hosted asset.
 *
 * Authentication: uses REACT_APP_SHARETRIBE_SDK_CLIENT_ID from .env. The Asset
 * Delivery API does not require the client secret, so credentials cannot leak via
 * this script.
 */

const fs = require('fs');
const path = require('path');

const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const sharetribeSdk = require('sharetribe-flex-sdk');

dotenvExpand.expand(dotenv.config());

const TRANSLATIONS_DIR = path.resolve(__dirname, '../src/translations');
const SOURCE_LOCALE = 'en';
const HOSTED_NAMESPACES = ['listingField.', 'listingType.', 'category.', 'TopbarLink.', 'Footer.'];
const ASSET_PATHS = {
  listingFields: '/listings/listing-fields.json',
  listingTypes: '/listings/listing-types.json',
  categories: '/listings/listing-categories.json',
  topbar: '/content/top-bar.json',
  footer: '/content/footer.json',
};

const parseArgs = argv => {
  const flags = { check: false, stub: false, prune: false };
  let locales = null;
  let source = null;

  for (const raw of argv.slice(2)) {
    if (raw === '--check') flags.check = true;
    else if (raw === '--stub') flags.stub = true;
    else if (raw === '--prune') flags.prune = true;
    else if (raw.startsWith('--locales=')) {
      locales = raw
        .slice('--locales='.length)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    } else if (raw.startsWith('--source=')) {
      source = raw.slice('--source='.length);
    } else {
      throw new Error(`Unknown flag: ${raw}`);
    }
  }
  return { flags, locales, source };
};

const discoverLocales = () => {
  return fs
    .readdirSync(TRANSLATIONS_DIR)
    .filter(name => name.endsWith('.json'))
    .map(name => name.replace(/\.json$/, ''))
    .filter(code => code !== SOURCE_LOCALE);
};

const fetchHostedConfigLive = async () => {
  const clientId = process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      'REACT_APP_SHARETRIBE_SDK_CLIENT_ID is not set. Add it to .env or pass --source=<path>.'
    );
  }
  const sdk = sharetribeSdk.createInstance({ clientId });

  const get = async (label, assetPath) => {
    const res = await sdk.assetByAlias({ path: assetPath, alias: 'latest' });
    const data = res?.data?.data;
    if (!data) {
      console.warn(`Hosted asset for ${label} (${assetPath}) returned no data.`);
    }
    return data || {};
  };

  const [listingFields, listingTypes, categories, topbar, footer] = await Promise.all([
    get('listingFields', ASSET_PATHS.listingFields),
    get('listingTypes', ASSET_PATHS.listingTypes),
    get('categories', ASSET_PATHS.categories),
    get('topbar', ASSET_PATHS.topbar),
    get('footer', ASSET_PATHS.footer),
  ]);

  return { listingFields, listingTypes, categories, topbar, footer };
};

const loadHostedConfigFromFile = sourcePath => {
  const abs = path.resolve(process.cwd(), sourcePath);
  const raw = fs.readFileSync(abs, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    listingFields: parsed.listingFields || {},
    listingTypes: parsed.listingTypes || {},
    categories: parsed.categories || {},
    topbar: parsed.topbar || {},
    footer: parsed.footer || {},
  };
};

const walkCategories = (cats, into) => {
  if (!Array.isArray(cats)) return;
  for (const cat of cats) {
    if (cat?.id) into.set(`category.${cat.id}.label`, cat.name || cat.id);
    walkCategories(cat?.subcategories, into);
  }
};

/**
 * Returns a Map from translation key → fallback English value (the Console string).
 */
const computeExpectedKeys = hostedConfig => {
  const expected = new Map();

  const fields = hostedConfig.listingFields?.listingFields || [];
  for (const field of fields) {
    if (!field?.key) continue;
    expected.set(`listingField.${field.key}.label`, field.label || field.key);

    const isEnumLike = ['enum', 'multi-enum'].includes(field.schemaType);
    if (isEnumLike && Array.isArray(field.enumOptions)) {
      for (const opt of field.enumOptions) {
        if (opt?.option == null) continue;
        expected.set(
          `listingField.${field.key}.option.${opt.option}`,
          opt.label || `${opt.option}`
        );
      }
    }
  }

  const listingTypes = hostedConfig.listingTypes?.listingTypes || [];
  for (const lt of listingTypes) {
    const id = lt?.id || lt?.listingType;
    if (!id) continue;
    expected.set(`listingType.${id}.label`, lt.label || id);
  }

  walkCategories(hostedConfig.categories?.categories, expected);

  const topbarLinks = hostedConfig.topbar?.customLinks || [];
  for (const link of topbarLinks) {
    if (!link?.href || typeof link.text !== 'string') continue;
    expected.set(`TopbarLink.${link.href}.text`, link.text);
  }

  const footerData = hostedConfig.footer || {};
  if (typeof footerData.slogan?.content === 'string' && footerData.slogan.content.length > 0) {
    expected.set('Footer.slogan', footerData.slogan.content);
  }
  if (
    typeof footerData.copyright?.content === 'string' &&
    footerData.copyright.content.length > 0
  ) {
    expected.set('Footer.copyright', footerData.copyright.content);
  }
  const footerBlocks = Array.isArray(footerData.blocks) ? footerData.blocks : [];
  for (const block of footerBlocks) {
    const blockId = block?.blockId;
    const text = block?.text?.content;
    if (!blockId || typeof text !== 'string' || text.length === 0) continue;
    expected.set(`Footer.block.${blockId}.text`, text);
  }

  return expected;
};

const isHostedKey = key => HOSTED_NAMESPACES.some(ns => key.startsWith(ns));

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJsonSorted = (file, obj) => {
  const sorted = {};
  for (const k of Object.keys(obj).sort()) sorted[k] = obj[k];
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(sorted, null, 2) + '\n');
};

const diff = (expected, actual) => {
  const expectedKeys = new Set(expected.keys());
  const actualKeys = new Set(Object.keys(actual));

  const missing = [];
  for (const k of expectedKeys) {
    if (!actualKeys.has(k)) missing.push(k);
  }
  const stale = [];
  for (const k of actualKeys) {
    if (isHostedKey(k) && !expectedKeys.has(k)) stale.push(k);
  }
  missing.sort();
  stale.sort();
  return { missing, stale };
};

const auditLocale = (locale, expected, { stub, prune }) => {
  // Overlay strings live in a hosted/ subdirectory so they stay isolated from
  // the upstream-managed UI translation files (see CLAUDE.md → Internationalization).
  const file = path.join(TRANSLATIONS_DIR, 'hosted', `${locale}.json`);
  const current = fs.existsSync(file) ? readJson(file) : {};
  const { missing, stale } = diff(expected, current);

  let wrote = false;
  if (stub && missing.length > 0) {
    for (const k of missing) current[k] = expected.get(k);
    wrote = true;
  }
  if (prune && stale.length > 0) {
    for (const k of stale) delete current[k];
    wrote = true;
  }
  if (wrote) writeJsonSorted(file, current);

  return { missing, stale, wrote };
};

const printReport = (locale, missing, stale, wrote) => {
  console.log(`\nhosted/${locale}.json`);
  if (missing.length === 0 && stale.length === 0) {
    console.log('  ✓ up to date');
    return;
  }
  if (missing.length > 0) {
    console.log(`  Missing (${missing.length}):`);
    for (const k of missing) console.log(`    ${k}`);
  }
  if (stale.length > 0) {
    console.log(`  Stale (${stale.length}, no longer in Console):`);
    for (const k of stale) console.log(`    ${k}`);
  }
  if (wrote) console.log('  → file updated');
};

const main = async () => {
  const { flags, locales: requestedLocales, source } = parseArgs(process.argv);

  const hostedConfig = source ? loadHostedConfigFromFile(source) : await fetchHostedConfigLive();

  const expected = computeExpectedKeys(hostedConfig);
  const locales = requestedLocales || discoverLocales();

  const fields = hostedConfig.listingFields?.listingFields?.length || 0;
  const types = hostedConfig.listingTypes?.listingTypes?.length || 0;
  const topLevelCats = (hostedConfig.categories?.categories || []).length;
  const totalCats = [...expected.keys()].filter(k => k.startsWith('category.')).length;
  const topbarLinks = (hostedConfig.topbar?.customLinks || []).length;
  const footerBlocks = (hostedConfig.footer?.blocks || []).length;
  console.log(
    `Hosted config: ${fields} listing fields, ${types} listing types, ${topLevelCats} top-level categories (${totalCats} total incl. subcategories), ${topbarLinks} topbar links, ${footerBlocks} footer blocks`
  );
  console.log(`Expected keys: ${expected.size}`);
  console.log(`Locales: ${locales.join(', ') || '(none)'}`);

  let totalMissing = 0;
  let totalStale = 0;
  for (const locale of locales) {
    const { missing, stale, wrote } = auditLocale(locale, expected, flags);
    totalMissing += missing.length;
    totalStale += stale.length;
    printReport(locale, missing, stale, wrote);
  }

  if (!flags.stub && !flags.prune) {
    if (totalMissing > 0) {
      console.log(
        `\nRun \`yarn run translate-hosted --stub\` to add missing keys with English fallback values.`
      );
    }
    if (totalStale > 0) {
      console.log(`Run \`yarn run translate-hosted --prune\` to remove stale keys.`);
    }
  }

  // Exit non-zero on missing keys (so CI can gate on it). Stale keys are a warning, not a hard fail.
  const failOnMissing = !flags.stub && totalMissing > 0;
  process.exit(failOnMissing ? 1 : 0);
};

main().catch(err => {
  console.error(err?.message || err);
  process.exit(2);
});
