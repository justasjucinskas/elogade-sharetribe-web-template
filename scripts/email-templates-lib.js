/**
 * Shared helpers for the per-recipient email languages (see specs/email-languages.md).
 *
 * The hand-edited English templates in ext/transaction-processes/<process>/templates/ call
 * `{{t "Key" "English default" args…}}`. The generator rewrites every such call into a branch on
 * the recipient's stored locale (`recipient.public-data.locale`):
 *
 *   {{#eq LOC "en"}}{{t "Key" "English default" args…}}
 *   {{else eq LOC "pl"}}{{t "pl.Key" "<pl text>" args…}}
 *   {{else}}{{t "lt.Key" "<lt text>" args…}}{{/eq}}
 *
 * The English branch is the original call, untouched. Lithuanian is the fallback for a missing or
 * unsupported locale. The lt/pl branches use `t` with a prefixed key that is not in the hosted
 * email-texts.json asset, so `t` falls back to the repo text given as the default – and, unlike
 * `format-text`, still renders `html-tag` arguments such as `<salelink>…</salelink>`.
 *
 * Plain Node, no dependencies: used by scripts/build-email-templates.js,
 * scripts/check-email-texts.js, scripts/render-email-previews.js and the Jest test in
 * src/util/emailTemplates.test.js.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PROCESSES_DIR = path.join(ROOT, 'ext', 'transaction-processes');
const TEXTS_DIR = path.join(ROOT, 'ext', 'email-texts');
// Not build/: `yarn build` empties that folder.
const GENERATED_DIR = path.join(ROOT, 'ext', 'generated');
const BUILD_DIR = path.join(GENERATED_DIR, 'transaction-processes');

// Processes this marketplace uses. The other default-* processes are left alone.
const PROCESSES = ['default-purchase', 'offer-purchase'];

// Built-in emails (password reset, email verification, welcome, new message, …) are edited in
// Console only. Copies of their Console source live here as <dir>/templates/<name>/<name>-…, in
// the same layout as a process, and the generated versions are pasted back into Console.
const BUILT_IN = 'built-in-emails';
const BUILT_IN_DIR = path.join(ROOT, 'ext', BUILT_IN);
const SOURCES = [...PROCESSES, BUILT_IN];
const sourceDir = name => (name === BUILT_IN ? BUILT_IN_DIR : path.join(PROCESSES_DIR, name));

// Languages with a translation file. English is the templates themselves.
const TRANSLATED_LOCALES = ['lt', 'pl'];
const FALLBACK_LOCALE = 'lt';

// Where the template finds the recipient's language. `@root` keeps it valid inside
// {{#with}} / {{#each}} blocks.
const LOCALE_EXPR = '@root.recipient.public-data.locale';

// Number/plural formatting per language. English keeps whatever the template sets today.
const ICU_LOCALES = { lt: 'lt_LT', pl: 'pl_PL' };

const ORIGINAL_HTML_LANG = '<html lang="en">';
const ORIGINAL_SET_LOCALE = '{{set-locale (asset "general/localization.json" "locale" "en_US")}}';

/**
 * Finds the end of a `{{…}}` tag that starts at `start`, skipping `}}` inside string literals
 * (ICU texts such as "{option, select, shipping {shipped} other {delivered}}" contain them).
 *
 * @param {string} source
 * @param {number} start index of the opening `{{`
 * @returns {number} index just after the closing `}}`
 */
const findTagEnd = (source, start) => {
  let inString = false;
  for (let i = start + 2; i < source.length; i++) {
    const c = source[i];
    if (inString) {
      if (c === '\\') {
        i++;
      } else if (c === '"') {
        inString = false;
      }
    } else if (c === '"') {
      inString = true;
    } else if (c === '}' && source[i + 1] === '}') {
      return i + 2;
    }
  }
  throw new Error(`Unclosed tag at index ${start}`);
};

// Reads a "…" literal at `i`; returns its value and the index after the closing quote.
const readString = (source, i) => {
  if (source[i] !== '"') {
    throw new Error(`Expected a string literal at: ${source.slice(i, i + 40)}`);
  }
  let value = '';
  for (let j = i + 1; j < source.length; j++) {
    const c = source[j];
    if (c === '\\') {
      value += source[j + 1];
      j++;
    } else if (c === '"') {
      return { value, end: j + 1 };
    } else {
      value += c;
    }
  }
  throw new Error('Unclosed string literal');
};

/**
 * Finds every `{{t "Key" "default" args…}}` call in a template.
 *
 * @param {string} source template text
 * @returns {Array<{ start: number, end: number, raw: string, key: string, defaultText: string, args: string }>}
 */
const findTCalls = source => {
  const calls = [];
  const re = /\{\{t\s/g;
  let match;
  while ((match = re.exec(source))) {
    const start = match.index;
    const end = findTagEnd(source, start);
    const inner = source.slice(start + 2, end - 2);
    let i = inner.indexOf('t') + 1;
    i += inner.slice(i).match(/^\s*/)[0].length;
    const key = readString(inner, i);
    i = key.end + inner.slice(key.end).match(/^\s*/)[0].length;
    const defaultText = readString(inner, i);
    calls.push({
      start,
      end,
      raw: source.slice(start, end),
      key: key.value,
      defaultText: defaultText.value,
      args: inner.slice(defaultText.end).trim(),
    });
    re.lastIndex = end;
  }
  return calls;
};

/**
 * Top-level `{argument}` names in an ICU message, e.g. "{n, plural, one {# item} other {…}}"
 * gives ["n"]. Nested sub-messages are skipped.
 *
 * @param {string} text
 * @returns {string[]} sorted, unique names
 */
const icuArguments = text => {
  const names = new Set();
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'" && (text[i + 1] === '{' || text[i + 1] === '}')) {
      // ICU quoting: '{' is a literal brace
      const close = text.indexOf("'", i + 1);
      i = close === -1 ? text.length : close;
    } else if (c === '{') {
      if (depth === 0) {
        const name = text.slice(i + 1).match(/^\s*([A-Za-z0-9_-]+)/);
        if (name) names.add(name[1]);
      }
      depth++;
    } else if (c === '}') {
      depth--;
    }
  }
  return [...names].sort();
};

// `<tag>` names used for rich text (html-tag arguments), e.g. "salelink".
const richTextTags = text => [...new Set(text.match(/<([A-Za-z0-9_-]+)>/g) || [])].sort();

// The text goes into a Handlebars string literal: escape the characters that would end it.
const toStringLiteral = text => `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const localeBranches = ({ en, lt, pl }) =>
  `{{#eq ${LOCALE_EXPR} "en"}}${en}{{else eq ${LOCALE_EXPR} "pl"}}${pl}{{else}}${lt}{{/eq}}`;

/**
 * Rewrites one template file so that its texts follow the recipient's language.
 *
 * @param {string} source template text (HTML or subject)
 * @param {{ lt: Object<string,string>, pl: Object<string,string> }} texts translations by key
 * @param {{ isHtml: boolean, name: string }} options
 * @returns {string}
 */
const transformTemplate = (source, texts, { isHtml, name, strict = true }) => {
  const calls = findTCalls(source);
  let out = '';
  let last = 0;
  calls.forEach(call => {
    const translated = TRANSLATED_LOCALES.reduce((acc, locale) => {
      const text = texts[locale][call.key];
      if (typeof text !== 'string') {
        throw new Error(`${name}: no ${locale} text for "${call.key}"`);
      }
      const args = call.args ? ` ${call.args}` : '';
      return { ...acc, [locale]: `{{t "${locale}.${call.key}" ${toStringLiteral(text)}${args}}}` };
    }, {});
    out += source.slice(last, call.start) + localeBranches({ en: call.raw, ...translated });
    last = call.end;
  });
  out += source.slice(last);

  const nonEnglishLocale = localeBranches({
    en: '',
    lt: `{{set-locale "${ICU_LOCALES.lt}"}}`,
    pl: `{{set-locale "${ICU_LOCALES.pl}"}}`,
  });
  // Console's built-in templates are not under our control: replace what is there instead of
  // insisting on the transaction templates' exact lines.
  if (isHtml && !strict) {
    out = out.replace(
      ORIGINAL_HTML_LANG,
      `<html lang="${localeBranches({ en: 'en', lt: 'lt', pl: 'pl' })}">`
    );
    const setLocale = out.match(/\{\{set-locale [^}]*\}\}/);
    out = setLocale
      ? out.replace(
          setLocale[0],
          localeBranches({
            en: setLocale[0],
            lt: `{{set-locale "${ICU_LOCALES.lt}"}}`,
            pl: `{{set-locale "${ICU_LOCALES.pl}"}}`,
          })
        )
      : nonEnglishLocale + out;
  } else if (isHtml) {
    const expectOnce = (needle, replacement) => {
      const count = out.split(needle).length - 1;
      if (count !== 1) {
        throw new Error(`${name}: expected "${needle}" once, found ${count}`);
      }
      out = out.replace(needle, replacement);
    };
    expectOnce(
      ORIGINAL_HTML_LANG,
      `<html lang="${localeBranches({ en: 'en', lt: 'lt', pl: 'pl' })}">`
    );
    expectOnce(
      ORIGINAL_SET_LOCALE,
      localeBranches({
        en: ORIGINAL_SET_LOCALE,
        lt: `{{set-locale "${ICU_LOCALES.lt}"}}`,
        pl: `{{set-locale "${ICU_LOCALES.pl}"}}`,
      })
    );
  } else if (!out.includes('{{set-locale')) {
    // Subjects set no locale today. Plural/number rules in lt/pl texts need theirs; English is
    // left as it is.
    out = nonEnglishLocale + out;
  }
  return out;
};

/**
 * Lists the template files of a process.
 *
 * @param {string} processDir e.g. ext/transaction-processes/offer-purchase
 * @returns {Array<{ template: string, file: string, isHtml: boolean, source: string }>}
 */
const readTemplates = processDir => {
  const templatesDir = path.join(processDir, 'templates');
  return fs
    .readdirSync(templatesDir)
    .filter(template => fs.statSync(path.join(templatesDir, template)).isDirectory())
    .sort()
    .flatMap(template =>
      fs
        .readdirSync(path.join(templatesDir, template))
        .filter(file => /-(html\.html|subject\.txt|text\.txt)$/.test(file))
        .sort()
        .map(file => ({
          template,
          file,
          isHtml: file.endsWith('-html.html'),
          source: fs.readFileSync(path.join(templatesDir, template, file), 'utf8'),
        }))
    );
};

/**
 * Every `t` key used by the given processes (and the built-in emails), with its English default and the files using it.
 *
 * @param {string[]} [processes]
 * @returns {Map<string, { defaults: Set<string>, files: Set<string>, followedBy: Set<string> }>}
 */
const collectKeys = (processes = SOURCES) => {
  const keys = new Map();
  processes.forEach(processName => {
    if (!fs.existsSync(path.join(sourceDir(processName), 'templates'))) return;
    readTemplates(sourceDir(processName)).forEach(({ template, file, source }) => {
      findTCalls(source).forEach(({ key, defaultText, end }) => {
        const entry = keys.get(key) || {
          defaults: new Set(),
          files: new Set(),
          followedBy: new Set(),
        };
        entry.defaults.add(defaultText);
        entry.files.add(`${processName}/${template}/${file}`);
        // Punctuation the template puts right after the text, e.g. `{{t …}}.`
        if (/[.,:;!?]/.test(source[end] || '')) entry.followedBy.add(source[end]);
        keys.set(key, entry);
      });
    });
  });
  return keys;
};

// A missing file reads as {} so that the check lists every key as missing.
const readTexts = (dir = TEXTS_DIR) =>
  TRANSLATED_LOCALES.reduce((acc, locale) => {
    const file = path.join(dir, `${locale}.json`);
    const texts = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    return { ...acc, [locale]: texts };
  }, {});

const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Compares the translations with the keys the templates use.
 *
 * @param {Map} keys from collectKeys()
 * @param {{ lt: Object, pl: Object }} texts from readTexts()
 * @returns {string[]} problems; empty when everything matches
 */
const checkTexts = (keys, texts) => {
  const problems = [];
  // One translation serves every template using the key, so its English defaults may differ in
  // wording but not in arguments.
  keys.forEach(({ defaults }, key) => {
    const signatures = new Set(
      [...defaults].map(d => `${icuArguments(d).join(',')}|${richTextTags(d).join(',')}`)
    );
    if (signatures.size > 1) {
      problems.push(`"${key}" has English defaults with different placeholders across templates`);
    }
  });
  TRANSLATED_LOCALES.forEach(locale => {
    const translations = texts[locale] || {};
    keys.forEach(({ defaults, followedBy = new Set() }, key) => {
      const text = translations[key];
      if (typeof text !== 'string' || !text.trim()) {
        problems.push(`${locale}.json: missing "${key}"`);
        return;
      }
      const english = [...defaults][0];
      const wantArgs = icuArguments(english);
      const gotArgs = icuArguments(text);
      if (!sameList(wantArgs, gotArgs)) {
        problems.push(
          `${locale}.json: "${key}" placeholders {${gotArgs.join(
            ', '
          )}} differ from English {${wantArgs.join(', ')}}`
        );
      }
      const wantTags = richTextTags(english);
      const gotTags = richTextTags(text);
      if (!sameList(wantTags, gotTags)) {
        problems.push(
          `${locale}.json: "${key}" tags ${gotTags.join(' ')} differ from English ${wantTags.join(
            ' '
          )}`
        );
      }
      if (/[\n\r]/.test(text)) {
        problems.push(`${locale}.json: "${key}" contains a line break`);
      }
      followedBy.forEach(mark => {
        if (/[.,:;!?]$/.test(text.trim())) {
          problems.push(
            `${locale}.json: "${key}" ends with punctuation, but the template adds "${mark}" after it`
          );
        }
      });
      if (/["\\]/.test(text)) {
        problems.push(`${locale}.json: "${key}" contains " or \\ (use „ “ quotes instead)`);
      }
    });
    Object.keys(translations).forEach(key => {
      if (!keys.has(key)) {
        problems.push(`${locale}.json: unknown key "${key}" (not used by any template)`);
      }
    });
  });
  return problems;
};

module.exports = {
  ROOT,
  PROCESSES_DIR,
  TEXTS_DIR,
  GENERATED_DIR,
  BUILD_DIR,
  PROCESSES,
  BUILT_IN,
  BUILT_IN_DIR,
  SOURCES,
  sourceDir,
  TRANSLATED_LOCALES,
  FALLBACK_LOCALE,
  LOCALE_EXPR,
  findTCalls,
  icuArguments,
  richTextTags,
  transformTemplate,
  readTemplates,
  collectKeys,
  readTexts,
  checkTexts,
};
