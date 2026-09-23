/**
 * Pure helpers for the code-owned legal documents (Terms of Service, Privacy Policy).
 *
 * Every heading in a legal document body starts with its section number:
 * "## 6 - GDPR Privacy", "### 6.2 - Your Rights under the GDPR". The number is
 * locale-independent, so anchor ids derived from it (#section-6-2) point at the
 * same section in every translation.
 */

import { DEFAULT_LOCALE } from '../../config/configLocale';

const NUMBERED_HEADING_RE = /^(\d+(?:\.\d+)*)\s+-\s+(.+)$/;
const TOP_LEVEL_HEADING_RE = /^##\s+(.+)$/;

/**
 * Split a heading's text into its section number, title and anchor id.
 * Headings without a leading number are returned as-is, without an id.
 *
 * @param {string} text heading text, e.g. "6.2 - Your Rights under the GDPR"
 * @returns {{ number: string|null, title: string, id: string|null }}
 */
export const parseHeading = text => {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  const match = trimmed.match(NUMBERED_HEADING_RE);
  if (!match) {
    return { number: null, title: trimmed, id: null };
  }
  const [, number, title] = match;
  return { number, title: title.trim(), id: `section-${number.replace(/\./g, '-')}` };
};

/**
 * Build a table of contents from the top-level ("## ") numbered headings of a
 * Markdown body.
 *
 * @param {string} body Markdown
 * @returns {Array<{ number: string, title: string, id: string }>}
 */
export const extractToc = body => {
  if (typeof body !== 'string') return [];
  return body
    .split('\n')
    .map(line => line.match(TOP_LEVEL_HEADING_RE))
    .filter(Boolean)
    .map(match => parseHeading(match[1]))
    .filter(heading => heading.id);
};

/**
 * Pick the legal document for the current locale, falling back to the default locale.
 *
 * @param {Object} documentsByLocale e.g. { en: loader, lt: loader, pl: loader }
 * @param {string} currentLocale URL locale from `state.locale.current`, e.g. "lt"
 * @returns {{ locale: string, value: any }}
 */
export const pickByLocale = (documentsByLocale, currentLocale) => {
  const locale = documentsByLocale[currentLocale] ? currentLocale : DEFAULT_LOCALE;
  return { locale, value: documentsByLocale[locale] };
};
