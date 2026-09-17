const { csp } = require('./csp');

// Builds the middleware and captures the header it would set on a response.
const getCspHeader = (reportOnly, cspNonce = 'abc') => {
  const req = {};
  const headers = {};
  const res = {
    locals: { cspNonce },
    setHeader: (name, value) => {
      headers[name.toLowerCase()] = value;
    },
    getHeader: name => headers[name.toLowerCase()],
    removeHeader: name => {
      delete headers[name.toLowerCase()];
    },
  };
  let nextCalled = false;
  csp('/csp-report', reportOnly)(req, res, () => {
    nextCalled = true;
  });
  expect(nextCalled).toBe(true);
  return headers;
};

describe('server/csp.js', () => {
  it('never serialises unset optional sources as the literal "undefined"', () => {
    // REACT_APP_SHARETRIBE_SDK_ASSET_CDN_BASE_URL is not set in the test environment,
    // which used to leak "undefined" into connect-src.
    expect(process.env.REACT_APP_SHARETRIBE_SDK_ASSET_CDN_BASE_URL).toBeUndefined();
    const headers = getCspHeader(true);
    const policy = headers['content-security-policy-report-only'];
    expect(policy).toBeDefined();
    expect(policy).not.toMatch(/\bundefined\b/);
    expect(policy).not.toMatch(/\bnull\b/);
    expect(policy).not.toMatch(/  /);
    expect(policy).toContain(
      "connect-src 'self' https://flex-api.sharetribe.com sharetribe-prod-core-files"
    );
  });

  it('uses the per-request nonce and the report URI', () => {
    const policy = getCspHeader(true, 'n0nce')['content-security-policy-report-only'];
    expect(policy).toContain("'nonce-n0nce'");
    expect(policy).toContain('report-uri /csp-report');
  });

  it('emits an enforcing header in block mode', () => {
    const headers = getCspHeader(false);
    expect(headers['content-security-policy']).toBeDefined();
    expect(headers['content-security-policy-report-only']).toBeUndefined();
    expect(headers['content-security-policy']).toContain('upgrade-insecure-requests');
  });
});
