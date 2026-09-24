import { buildFaqPageSchema, faqAnchorId, faqToc, markdownToPlainText } from './FaqPage.helpers';

import faqEn from './content/en';
import faqLt from './content/lt';
import faqPl from './content/pl';

const sections = [
  {
    id: 'shipping',
    title: 'Shipping',
    items: [
      { id: 'cost', question: 'How much?', answer: 'It **depends** on:\n\n* size,\n* weight.' },
    ],
  },
  {
    id: 'payouts',
    title: 'Payouts',
    intro: 'Intro text.',
    items: [{ id: 'when', question: 'When?', answer: 'See [the policies](/p/market-policies).' }],
  },
];

describe('faqToc', () => {
  it('lists one numbered entry per section, pointing at its anchor', () => {
    expect(faqToc(sections)).toEqual([
      { id: 'faq-shipping', number: '1', title: 'Shipping' },
      { id: 'faq-payouts', number: '2', title: 'Payouts' },
    ]);
    expect(faqToc(undefined)).toEqual([]);
  });
});

describe('markdownToPlainText', () => {
  it('strips links, bold and list markers', () => {
    expect(markdownToPlainText('It **depends** on:\n\n* size,\n* weight.')).toEqual(
      'It depends on:\nsize,\nweight.'
    );
    expect(markdownToPlainText('1. Ship it\n2. Track it')).toEqual('Ship it\nTrack it');
    expect(markdownToPlainText('See [the policies](/p/market-policies#section-6).')).toEqual(
      'See the policies.'
    );
    expect(markdownToPlainText(null)).toEqual('');
  });
});

describe('buildFaqPageSchema', () => {
  it('builds a FAQPage node with every question and a plain-text answer', () => {
    const schema = buildFaqPageSchema(sections, { name: 'FAQ', description: 'Answers' });
    expect(schema).toEqual({
      '@type': 'FAQPage',
      name: 'FAQ',
      description: 'Answers',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How much?',
          acceptedAnswer: { '@type': 'Answer', text: 'It depends on:\nsize,\nweight.' },
        },
        {
          '@type': 'Question',
          name: 'When?',
          acceptedAnswer: { '@type': 'Answer', text: 'See the policies.' },
        },
      ],
    });
  });
});

// Anchors (#faq-<id>) are shared by every locale, so a translation must keep the
// English section and question ids, in the same order.
describe('FAQ content', () => {
  const idsOf = doc => doc.sections.map(s => [s.id, s.items.map(item => item.id)]);

  it('has unique anchor ids', () => {
    const anchors = faqEn.sections.flatMap(s => [s.id, ...s.items.map(item => item.id)]);
    expect(new Set(anchors.map(faqAnchorId)).size).toEqual(anchors.length);
  });

  it.each([['lt', faqLt], ['pl', faqPl]])('%s keeps the English ids and order', (_locale, doc) => {
    expect(idsOf(doc)).toEqual(idsOf(faqEn));
    doc.sections.forEach((section, i) => {
      expect(!!section.intro).toEqual(!!faqEn.sections[i].intro);
    });
  });

  it.each([['en', faqEn], ['lt', faqLt], ['pl', faqPl]])(
    '%s has text for every section and question',
    (_locale, doc) => {
      doc.sections.forEach(section => {
        expect(section.title).toBeTruthy();
        section.items.forEach(item => {
          expect(item.question).toBeTruthy();
          expect(item.answer).toBeTruthy();
        });
      });
    }
  );
});
