/**
 * @jest-environment node
 */
// Email templates in the recipient's language (specs/email-languages.md). The generator lives in
// scripts/ (plain Node); this test runs its checks as part of `yarn test`.
const {
  checkTexts,
  collectKeys,
  findTCalls,
  icuArguments,
  readTexts,
  transformTemplate,
} = require('../../scripts/email-templates-lib');

const LOC = '@root.recipient.public-data.locale';

describe('ext/email-texts', () => {
  it('translate every key used by the templates, with the same placeholders', () => {
    const keys = collectKeys();
    expect(keys.size).toBeGreaterThan(200);
    expect(checkTexts(keys, readTexts())).toEqual([]);
  });
});

describe('findTCalls', () => {
  it('reads key, default and arguments, also when the text contains }}', () => {
    const source =
      'a {{t "K.Subject" "Your order was {option, select, shipping {shipped} other {delivered}}" option=transaction.protected-data.deliveryMethod}} b {{t "K.Cta" "View"}}';
    const calls = findTCalls(source);
    expect(calls.map(({ key, defaultText, args }) => ({ key, defaultText, args }))).toEqual([
      {
        key: 'K.Subject',
        defaultText: 'Your order was {option, select, shipping {shipped} other {delivered}}',
        args: 'option=transaction.protected-data.deliveryMethod',
      },
      { key: 'K.Cta', defaultText: 'View', args: '' },
    ]);
    expect(source.slice(calls[1].start, calls[1].end)).toBe('{{t "K.Cta" "View"}}');
  });
});

describe('icuArguments', () => {
  it('returns top-level argument names only', () => {
    expect(
      icuArguments('{name} paid {amount,number,::.00} for {n, plural, one {# item} other {# {x}}}')
    ).toEqual(['amount', 'n', 'name']);
  });
});

describe('transformTemplate', () => {
  const texts = {
    lt: { 'K.Title': 'Užsakymas „{title}“', 'K.Link': 'Žr. <a>čia</a>' },
    pl: { 'K.Title': 'Zamówienie „{title}”', 'K.Link': 'Zobacz <a>tutaj</a>' },
  };

  it('branches every t call on the recipient locale and keeps English untouched', () => {
    const source = '{{t "K.Title" "Order {title}" title=listing.title}}';
    expect(transformTemplate(source, texts, { isHtml: false, name: 'x' })).toBe(
      `{{#eq ${LOC} "en"}}{{else eq ${LOC} "pl"}}{{set-locale "pl_PL"}}{{else}}{{set-locale "lt_LT"}}{{/eq}}` +
        `{{#eq ${LOC} "en"}}{{t "K.Title" "Order {title}" title=listing.title}}` +
        `{{else eq ${LOC} "pl"}}{{t "pl.K.Title" "Zamówienie „{title}”" title=listing.title}}` +
        `{{else}}{{t "lt.K.Title" "Užsakymas „{title}“" title=listing.title}}{{/eq}}`
    );
  });

  it('sets html lang and number locale per recipient in HTML templates', () => {
    const source =
      '<html lang="en">{{set-locale (asset "general/localization.json" "locale" "en_US")}}{{t "K.Link" "See <a>here</a>" a=(html-tag "a" href="x")}}</html>';
    const out = transformTemplate(source, texts, { isHtml: true, name: 'x' });
    expect(out).toContain(
      `<html lang="{{#eq ${LOC} "en"}}en{{else eq ${LOC} "pl"}}pl{{else}}lt{{/eq}}">`
    );
    expect(out).toContain(
      `{{#eq ${LOC} "en"}}{{set-locale (asset "general/localization.json" "locale" "en_US")}}{{else eq ${LOC} "pl"}}{{set-locale "pl_PL"}}{{else}}{{set-locale "lt_LT"}}{{/eq}}`
    );
    expect(out).toContain('{{t "lt.K.Link" "Žr. <a>čia</a>" a=(html-tag "a" href="x")}}');
  });

  it('fails on a key without translation', () => {
    expect(() =>
      transformTemplate('{{t "K.Missing" "x"}}', texts, { isHtml: false, name: 'tpl' })
    ).toThrow('tpl: no lt text for "K.Missing"');
  });

  it('fails when an HTML template does not have the expected lang/locale lines', () => {
    expect(() =>
      transformTemplate('<html lang="lt"></html>', texts, { isHtml: true, name: 'tpl' })
    ).toThrow('expected "<html lang="en">" once');
  });
});

describe('checkTexts', () => {
  const keys = new Map([
    ['K.A', { defaults: new Set(['Hi {name}, see <link>this</link>']), files: new Set() }],
  ]);
  const ok = 'Labas, {name}, žr. <link>čia</link>';

  it('accepts matching translations', () => {
    expect(checkTexts(keys, { lt: { 'K.A': ok }, pl: { 'K.A': ok } })).toEqual([]);
  });

  it('reports missing, unknown, changed placeholders and tags, and quotes', () => {
    const problems = checkTexts(keys, {
      lt: { 'K.A': 'Labas, {vardas}, <link>čia</link>', 'K.Old': 'x' },
      pl: { 'K.A': 'Cześć "{name}" tutaj' },
    });
    expect(problems).toEqual([
      'lt.json: "K.A" placeholders {vardas} differ from English {name}',
      'lt.json: unknown key "K.Old" (not used by any template)',
      'pl.json: "K.A" tags  differ from English <link>',
      'pl.json: "K.A" contains " or \\ (use „ “ quotes instead)',
    ]);
    expect(checkTexts(keys, { lt: {}, pl: { 'K.A': ok } })).toEqual(['lt.json: missing "K.A"']);
  });

  it('reports a final full stop when the template adds one after the text', () => {
    const dotted = new Map([
      [
        'K.B',
        { defaults: new Set(['Paid on {date}']), files: new Set(), followedBy: new Set('.') },
      ],
    ]);
    expect(
      checkTexts(dotted, { lt: { 'K.B': 'Sumokėta {date}.' }, pl: { 'K.B': 'Zapłacono {date}' } })
    ).toEqual(['lt.json: "K.B" ends with punctuation, but the template adds "." after it']);
  });
});
