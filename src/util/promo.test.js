import { isPromoActive } from './promo';

const promo = {
  id: 'test-promo',
  startsAt: '2026-10-01T00:00:00+03:00',
  endsAt: '2026-11-01T00:00:00+02:00',
};

describe('isPromoActive', () => {
  it('is false without a promo or id', () => {
    expect(isPromoActive(null)).toBe(false);
    expect(isPromoActive({ endsAt: promo.endsAt })).toBe(false);
  });

  it('is true without an end date', () => {
    const openEnded = { id: 'x', startsAt: null, endsAt: null };
    expect(isPromoActive(openEnded, Date.parse('2099-01-01T00:00:00Z'))).toBe(true);
    expect(isPromoActive({ id: 'x' }, Date.parse('2099-01-01T00:00:00Z'))).toBe(true);
  });

  it('is false before the start', () => {
    expect(isPromoActive(promo, Date.parse('2026-09-30T23:59:59+03:00'))).toBe(false);
    const futureStart = { ...promo, endsAt: null };
    expect(isPromoActive(futureStart, Date.parse('2026-09-30T23:59:59+03:00'))).toBe(false);
  });

  it('is true from the start until the last millisecond before a future end', () => {
    expect(isPromoActive(promo, Date.parse('2026-10-01T00:00:00+03:00'))).toBe(true);
    expect(isPromoActive(promo, Date.parse('2026-10-31T23:59:59+02:00'))).toBe(true);
  });

  it('is false from the end on', () => {
    expect(isPromoActive(promo, Date.parse('2026-11-01T00:00:00+02:00'))).toBe(false);
  });

  it('treats a missing start as already started', () => {
    const openStart = { ...promo, startsAt: null };
    expect(isPromoActive(openStart, Date.parse('2020-01-01T00:00:00Z'))).toBe(true);
  });
});
