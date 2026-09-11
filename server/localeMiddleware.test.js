const {
  localeMiddleware,
  stripLocaleFromResourcePath,
  rewriteLegacySearchParams,
} = require('./localeMiddleware');

const buildReq = ({ url = '/', cookies = {}, headers = {} } = {}) => {
  // req.path is the pathname portion of req.url, set by Express. Mirror that.
  const path = url.split('?')[0];
  return { url, path, cookies, headers };
};

const buildRes = () => {
  const cookies = {};
  const headers = {};
  return {
    cookie: jest.fn((name, value) => {
      cookies[name] = value;
    }),
    redirect: jest.fn(),
    set: jest.fn((name, value) => {
      headers[name] = value;
    }),
    cookies,
    headers,
  };
};

describe('localeMiddleware', () => {
  describe('with a locale already in the path', () => {
    it('sets req.locale and strips the prefix from req.url', () => {
      const req = buildReq({ url: '/lt/listings/123?foo=bar', cookies: { locale: 'lt' } });
      const res = buildRes();
      const next = jest.fn();

      localeMiddleware(req, res, next);

      expect(req.locale).toBe('lt');
      expect(req.url).toBe('/listings/123?foo=bar');
      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('rewrites a bare locale path to "/"', () => {
      const req = buildReq({ url: '/en', cookies: { locale: 'en' } });
      const res = buildRes();
      const next = jest.fn();

      localeMiddleware(req, res, next);

      expect(req.locale).toBe('en');
      expect(req.url).toBe('/');
      expect(next).toHaveBeenCalled();
    });

    it('refreshes the cookie when missing or different', () => {
      const req = buildReq({ url: '/lt/s', cookies: {} });
      const res = buildRes();

      localeMiddleware(req, res, jest.fn());

      expect(res.cookie).toHaveBeenCalledWith('locale', 'lt', expect.any(Object));
    });

    it('does not rewrite the cookie when already matching', () => {
      const req = buildReq({ url: '/lt/s', cookies: { locale: 'lt' } });
      const res = buildRes();

      localeMiddleware(req, res, jest.fn());

      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe('without a locale in the path', () => {
    it('redirects permanently to /<cookie-locale><originalUrl> without letting browsers cache it', () => {
      const req = buildReq({ url: '/s?keywords=bike', cookies: { locale: 'lt' } });
      const res = buildRes();

      localeMiddleware(req, res, jest.fn());

      expect(res.redirect).toHaveBeenCalledWith(301, '/lt/s?keywords=bike');
      expect(res.headers['Cache-Control']).toBe('no-store');
      expect(res.cookie).toHaveBeenCalledWith('locale', 'lt', expect.any(Object));
    });

    it.each(['/', '/p/used-laptops', '/l/6a6c7bfd-630f-44a8-a519-2c2559fcd2d7', '/u/abc'])(
      'redirects content path %s in a single hop',
      url => {
        const req = buildReq({ url, cookies: { locale: 'en' } });
        const res = buildRes();

        localeMiddleware(req, res, jest.fn());

        expect(res.redirect).toHaveBeenCalledWith(301, url === '/' ? '/en' : `/en${url}`);
      }
    );

    it('falls back to Accept-Language when no cookie is set', () => {
      const req = buildReq({
        url: '/',
        headers: { 'accept-language': 'lt-LT,lt;q=0.9,en;q=0.5' },
      });
      const res = buildRes();

      localeMiddleware(req, res, jest.fn());

      expect(res.redirect).toHaveBeenCalledWith(301, '/lt');
    });

    it('falls back to default locale when nothing else matches', () => {
      const req = buildReq({ url: '/', headers: { 'accept-language': 'de,fr' } });
      const res = buildRes();

      localeMiddleware(req, res, jest.fn());

      expect(res.redirect).toHaveBeenCalledWith(301, '/en');
    });

    it('cookie wins over Accept-Language', () => {
      const req = buildReq({
        url: '/listings',
        cookies: { locale: 'en' },
        headers: { 'accept-language': 'lt-LT' },
      });
      const res = buildRes();

      localeMiddleware(req, res, jest.fn());

      expect(res.redirect).toHaveBeenCalledWith(301, '/en/listings');
    });
  });

  describe('legacy search params', () => {
    it('maps a known legacy value and drops the legacy key', () => {
      expect(rewriteLegacySearchParams('?pub_category=laptops')).toBe(
        '?pub_categoryLevel1=computerstablets'
      );
    });

    it('keeps other params and an explicit current param', () => {
      expect(rewriteLegacySearchParams('?pub_category=laptops&keywords=hp&page=2')).toBe(
        '?keywords=hp&page=2&pub_categoryLevel1=computerstablets'
      );
      expect(
        rewriteLegacySearchParams('?pub_category=laptops&pub_categoryLevel1=phonesaccessories')
      ).toBe('?pub_categoryLevel1=phonesaccessories');
    });

    it('returns null when no known legacy value is present', () => {
      expect(rewriteLegacySearchParams('')).toBeNull();
      expect(rewriteLegacySearchParams('?keywords=hp')).toBeNull();
      expect(rewriteLegacySearchParams('?pub_category=unknown')).toBeNull();
    });

    it('lands a bare legacy search URL on the mapped locale URL in one hop', () => {
      const req = buildReq({ url: '/s?pub_category=laptops', cookies: { locale: 'lt' } });
      const res = buildRes();

      localeMiddleware(req, res, jest.fn());

      expect(res.redirect).toHaveBeenCalledWith(301, '/lt/s?pub_categoryLevel1=computerstablets');
      expect(res.headers['Cache-Control']).toBe('no-store');
    });

    it('also redirects a locale-prefixed legacy search URL within the same locale', () => {
      const req = buildReq({ url: '/pl/s?pub_category=laptops', cookies: { locale: 'pl' } });
      const res = buildRes();
      const next = jest.fn();

      localeMiddleware(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(301, '/pl/s?pub_categoryLevel1=computerstablets');
      expect(next).not.toHaveBeenCalled();
    });

    it('does not touch legacy-looking params on other paths', () => {
      const req = buildReq({ url: '/lt/l/abc?pub_category=laptops', cookies: { locale: 'lt' } });
      const res = buildRes();
      const next = jest.fn();

      localeMiddleware(req, res, next);

      expect(res.redirect).not.toHaveBeenCalled();
      expect(req.url).toBe('/l/abc?pub_category=laptops');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('skip rules', () => {
    it.each([
      '/api',
      '/api/users',
      '/static/foo.js',
      '/_status.json',
      '/favicon.ico',
      '/robots.txt',
      '/sitemap.xml',
      '/sitemap-index.xml',
      '/site.webmanifest',
      '/.well-known/openid-configuration',
    ])('lets %s through without setting locale or redirecting', pathname => {
      const req = buildReq({ url: pathname });
      const res = buildRes();
      const next = jest.fn();

      localeMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
      expect(req.locale).toBeUndefined();
    });
  });
});

describe('stripLocaleFromResourcePath', () => {
  it.each([
    ['/en/sitemap-index.xml', '/sitemap-index.xml'],
    ['/lt/sitemap-categories.xml', '/sitemap-categories.xml'],
    ['/pl/sitemap.xml', '/sitemap.xml'],
    ['/lt/robots.txt', '/robots.txt'],
  ])('rewrites %s to %s', (url, expected) => {
    const req = buildReq({ url });
    const next = jest.fn();

    stripLocaleFromResourcePath(req, buildRes(), next);

    expect(req.url).toBe(expected);
    expect(next).toHaveBeenCalled();
  });

  it.each(['/sitemap-index.xml', '/en/s', '/en/sitemap-index.xml/extra', '/enabled/robots.txt'])(
    'leaves %s alone',
    url => {
      const req = buildReq({ url });
      const next = jest.fn();

      stripLocaleFromResourcePath(req, buildRes(), next);

      expect(req.url).toBe(url);
      expect(next).toHaveBeenCalled();
    }
  );
});
