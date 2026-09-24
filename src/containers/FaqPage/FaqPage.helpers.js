/**
 * Pure helpers for the code-owned FAQ page.
 *
 * FAQ content (./content/<locale>.js) is `{ sections: [{ id, title, intro?, items:
 * [{ id, question, answer }] }] }`. Section and question ids are shared by every
 * locale, so anchors (#faq-<id>) point at the same place in each translation.
 */

/**
 * Anchor id of a FAQ section or question.
 *
 * @param {string} id section or question id from the content file
 * @returns {string}
 */
export const faqAnchorId = id => `faq-${id}`;

/**
 * Table-of-contents entries, one per section.
 *
 * @param {Array<Object>} sections
 * @returns {Array<{ id: string, number: string, title: string }>}
 */
export const faqToc = sections =>
  (sections || []).map((section, index) => ({
    id: faqAnchorId(section.id),
    number: String(index + 1),
    title: section.title,
  }));

/**
 * Flatten the small Markdown subset used in answers (links, bold, lists,
 * paragraphs) to plain text for structured data.
 *
 * @param {string} markdown
 * @returns {string}
 */
export const markdownToPlainText = markdown =>
  typeof markdown !== 'string'
    ? ''
    : markdown
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/^\s*(?:[*-]|\d+\.)\s+/gm, '')
        .replace(/\n{2,}/g, '\n')
        .trim();

/**
 * schema.org FAQPage node listing every question with its answer. Passed to
 * <Page schema>, which adds the JSON-LD @context.
 *
 * @param {Array<Object>} sections
 * @param {{ name: string, description: string }} meta page title and description
 * @returns {Object}
 */
export const buildFaqPageSchema = (sections, meta) => ({
  '@type': 'FAQPage',
  name: meta.name,
  description: meta.description,
  mainEntity: (sections || []).flatMap(section =>
    section.items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: markdownToPlainText(item.answer),
      },
    }))
  ),
});
