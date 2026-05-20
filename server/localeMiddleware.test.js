const { localeMiddleware } = require('./localeMiddleware');

const buildReq = ({ url = '/', cookies = {}, headers = {} } = {}) => {
  // req.path is the pathname portion of req.url, set by Express. Mirror that.
  const path = url.split('?')[0];
  return { url, path, cookies, headers };
};

const buildRes = () => {
  const cookies = {};
  return {
    cookie: jest.fn((name, value) => {
      cookies[name] = value;
    }),
    redirect: jest.fn(),
    cookies,
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
    it('redirects to /<cookie-locale><originalUrl>', () => {
      const req = buildReq({ url: '/s?keywords=bike', cookies: { locale: 'lt' } });
      const res = buildRes();

      localeMiddleware(req, res, jest.fn());

      expect(res.redirect).toHaveBeenCalledWith(302, '/lt/s?keywords=bike');
      expect(res.cookie).toHaveBeenCalledWith('locale', 'lt', expect.any(Object));
    });

    it('falls back to Accept-Language when no cookie is set', () => {
      const req = buildReq({
        url: '/',
        headers: { 'accept-language': 'lt-LT,lt;q=0.9,en;q=0.5' },
      });
      const res = buildRes();

      localeMiddleware(req, res, jest.fn());

      expect(res.redirect).toHaveBeenCalledWith(302, '/lt');
    });

    it('falls back to default locale when nothing else matches', () => {
      const req = buildReq({ url: '/', headers: { 'accept-language': 'de,fr' } });
      const res = buildRes();

      localeMiddleware(req, res, jest.fn());

      expect(res.redirect).toHaveBeenCalledWith(302, '/en');
    });

    it('cookie wins over Accept-Language', () => {
      const req = buildReq({
        url: '/listings',
        cookies: { locale: 'en' },
        headers: { 'accept-language': 'lt-LT' },
      });
      const res = buildRes();

      localeMiddleware(req, res, jest.fn());

      expect(res.redirect).toHaveBeenCalledWith(302, '/en/listings');
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
