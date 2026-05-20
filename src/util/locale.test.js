const {
  parseLocaleFromPath,
  stripLocaleFromPath,
  prependLocale,
  negotiateLocale,
  readCookie,
} = require('./locale');

describe('parseLocaleFromPath', () => {
  it('returns the locale segment when path starts with /<locale>/', () => {
    expect(parseLocaleFromPath('/en/')).toBe('en');
    expect(parseLocaleFromPath('/lt/listings/123')).toBe('lt');
  });

  it('returns the locale segment when path is exactly /<locale>', () => {
    expect(parseLocaleFromPath('/en')).toBe('en');
    expect(parseLocaleFromPath('/lt')).toBe('lt');
  });

  it('returns null when path has no locale prefix', () => {
    expect(parseLocaleFromPath('/')).toBeNull();
    expect(parseLocaleFromPath('/listings')).toBeNull();
  });

  it('does not match a longer word that starts with a locale code', () => {
    expect(parseLocaleFromPath('/enabled')).toBeNull();
    expect(parseLocaleFromPath('/lithuania')).toBeNull();
  });

  it('returns null for unsupported locales', () => {
    expect(parseLocaleFromPath('/de/foo')).toBeNull();
    expect(parseLocaleFromPath('/fr')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(parseLocaleFromPath(undefined)).toBeNull();
    expect(parseLocaleFromPath(null)).toBeNull();
    expect(parseLocaleFromPath(42)).toBeNull();
  });
});

describe('stripLocaleFromPath', () => {
  it('removes the leading locale segment', () => {
    expect(stripLocaleFromPath('/en/listings/123')).toBe('/listings/123');
    expect(stripLocaleFromPath('/lt/s')).toBe('/s');
  });

  it('returns "/" when only the locale segment is present', () => {
    expect(stripLocaleFromPath('/en')).toBe('/');
    expect(stripLocaleFromPath('/lt/')).toBe('/');
  });

  it('returns the path unchanged when there is no locale prefix', () => {
    expect(stripLocaleFromPath('/listings')).toBe('/listings');
    expect(stripLocaleFromPath('/')).toBe('/');
  });

  it('does not strip words that merely start with a locale code', () => {
    expect(stripLocaleFromPath('/enabled')).toBe('/enabled');
  });

  it('returns "/" for non-string input', () => {
    expect(stripLocaleFromPath(undefined)).toBe('/');
  });
});

describe('prependLocale', () => {
  it('prepends the locale to a regular path', () => {
    expect(prependLocale('/listings/123', 'lt')).toBe('/lt/listings/123');
    expect(prependLocale('/s?keywords=bike', 'en')).toBe('/en/s?keywords=bike');
  });

  it('returns /<locale> for root path', () => {
    expect(prependLocale('/', 'en')).toBe('/en');
    expect(prependLocale('', 'lt')).toBe('/lt');
  });

  it('normalises missing leading slash', () => {
    expect(prependLocale('listings/abc', 'en')).toBe('/en/listings/abc');
  });

  it('falls back to default locale when the input locale is unsupported', () => {
    expect(prependLocale('/x', 'de')).toBe('/en/x');
  });
});

describe('negotiateLocale', () => {
  it('prefers a supported cookie value', () => {
    expect(negotiateLocale('en-US', 'lt')).toBe('lt');
    expect(negotiateLocale('lt', 'en')).toBe('en');
  });

  it('ignores unsupported cookie value and falls back to Accept-Language', () => {
    expect(negotiateLocale('lt-LT,lt;q=0.9,en;q=0.5', 'de')).toBe('lt');
  });

  it('picks the highest-q supported language from Accept-Language', () => {
    expect(negotiateLocale('de;q=0.9,lt;q=0.8,en;q=0.5')).toBe('lt');
    expect(negotiateLocale('fr,en;q=0.9')).toBe('en');
  });

  it('matches by primary subtag', () => {
    expect(negotiateLocale('lt-LT')).toBe('lt');
    expect(negotiateLocale('en-GB')).toBe('en');
  });

  it('falls back to default when nothing matches', () => {
    expect(negotiateLocale('de,fr,es')).toBe('en');
    expect(negotiateLocale('')).toBe('en');
    expect(negotiateLocale(undefined, undefined)).toBe('en');
  });
});

describe('readCookie', () => {
  it('returns the cookie value when present', () => {
    expect(readCookie('foo=1; locale=lt; bar=2', 'locale')).toBe('lt');
    expect(readCookie('locale=en', 'locale')).toBe('en');
  });

  it('decodes URI-encoded cookie values', () => {
    expect(readCookie('locale=lt%2DLT', 'locale')).toBe('lt-LT');
  });

  it('returns null when missing', () => {
    expect(readCookie('foo=1', 'locale')).toBeNull();
    expect(readCookie('', 'locale')).toBeNull();
    expect(readCookie(undefined, 'locale')).toBeNull();
  });
});
