import { extractToc, parseHeading, pickByLocale } from './LegalPage.helpers';

import termsEn from '../TermsOfServicePage/content/en';
import termsLt from '../TermsOfServicePage/content/lt';
import termsPl from '../TermsOfServicePage/content/pl';
import privacyEn from '../PrivacyPolicyPage/content/en';
import privacyLt from '../PrivacyPolicyPage/content/lt';
import privacyPl from '../PrivacyPolicyPage/content/pl';

describe('parseHeading', () => {
  it('splits a numbered heading into number, title and anchor id', () => {
    expect(parseHeading('6.2 - Your Rights under the GDPR')).toEqual({
      number: '6.2',
      title: 'Your Rights under the GDPR',
      id: 'section-6-2',
    });
    expect(parseHeading('7.8.1 - Our Order Cancellation Rights').id).toEqual('section-7-8-1');
  });

  it('leaves unnumbered headings without an id', () => {
    expect(parseHeading('Contact')).toEqual({ number: null, title: 'Contact', id: null });
    expect(parseHeading(undefined)).toEqual({ number: null, title: '', id: null });
  });
});

describe('extractToc', () => {
  it('lists only top-level numbered headings', () => {
    const body = [
      'Intro',
      '',
      '## 1 - First',
      '### 1.1 - Sub',
      '## Unnumbered',
      '## 2 - Second',
    ].join('\n');
    expect(extractToc(body)).toEqual([
      { number: '1', title: 'First', id: 'section-1' },
      { number: '2', title: 'Second', id: 'section-2' },
    ]);
  });

  it('returns an empty list for missing content', () => {
    expect(extractToc(null)).toEqual([]);
  });
});

describe('pickByLocale', () => {
  const docs = { en: 'EN', lt: 'LT', pl: 'PL' };

  it('maps a URL locale to its document', () => {
    expect(pickByLocale(docs, 'lt')).toEqual({ locale: 'lt', value: 'LT' });
    expect(pickByLocale(docs, 'pl')).toEqual({ locale: 'pl', value: 'PL' });
    expect(pickByLocale(docs, 'en')).toEqual({ locale: 'en', value: 'EN' });
  });

  it('falls back to the default locale', () => {
    expect(pickByLocale(docs, 'de')).toEqual({ locale: 'en', value: 'EN' });
    expect(pickByLocale(docs, undefined)).toEqual({ locale: 'en', value: 'EN' });
  });
});

// Translations must mirror the English structure: anchor ids come from section
// numbers, so a missing or renumbered heading would break deep links and the
// table of contents in one language only.
describe.each([
  ['Terms of Service', { en: termsEn, lt: termsLt, pl: termsPl }],
  ['Privacy Policy', { en: privacyEn, lt: privacyLt, pl: privacyPl }],
])('%s translations', (_name, docs) => {
  const headingNumbers = body =>
    body
      .split('\n')
      .filter(line => /^#{2,4} /.test(line))
      .map(line => {
        const [hashes, ...rest] = line.split(' ');
        return `${hashes} ${parseHeading(rest.join(' ')).number}`;
      });

  it('numbers every heading', () => {
    Object.values(docs).forEach(doc => {
      expect(headingNumbers(doc.body).filter(h => h.endsWith(' null'))).toEqual([]);
    });
  });

  it.each(['lt', 'pl'])('%s keeps the English sections and date', locale => {
    expect(docs[locale].lastUpdated).toEqual(docs.en.lastUpdated);
    expect(headingNumbers(docs[locale].body)).toEqual(headingNumbers(docs.en.body));
  });
});
