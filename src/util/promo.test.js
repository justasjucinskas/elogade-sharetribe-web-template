import { fakeIntl } from './testData';
import { formatPromoLastDay, getPromoDaysLeft, isPromoActive } from './promo';

const promo = {
  id: 'test-promo',
  startsAt: '2026-10-01T00:00:00+03:00',
  endsAt: '2026-11-01T00:00:00+02:00',
};

describe('isPromoActive', () => {
  it('is false without a promo, id or end date', () => {
    expect(isPromoActive(null)).toBe(false);
    expect(isPromoActive({ endsAt: promo.endsAt })).toBe(false);
    expect(isPromoActive({ id: 'x' })).toBe(false);
  });

  it('is false before the start', () => {
    expect(isPromoActive(promo, Date.parse('2026-09-30T23:59:59+03:00'))).toBe(false);
  });

  it('is true from the start until the last millisecond before the end', () => {
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

describe('getPromoDaysLeft', () => {
  it('counts a started day as a full day', () => {
    expect(getPromoDaysLeft(promo, Date.parse('2026-10-31T23:00:00+02:00'))).toBe(1);
    expect(getPromoDaysLeft(promo, Date.parse('2026-10-31T00:00:00+02:00'))).toBe(1);
    expect(getPromoDaysLeft(promo, Date.parse('2026-10-30T12:00:00+02:00'))).toBe(2);
  });
});

describe('formatPromoLastDay', () => {
  it('formats the day before the exclusive end in the marketplace time zone', () => {
    const intl = { ...fakeIntl, formatDate: jest.fn(() => 'formatted') };
    expect(formatPromoLastDay(intl, promo, 'long')).toBe('formatted');
    const [date, options] = intl.formatDate.mock.calls[0];
    expect(date.toISOString()).toBe('2026-10-31T21:59:59.999Z');
    expect(options).toEqual({ month: 'long', day: 'numeric', timeZone: 'Europe/Vilnius' });
  });

  it('uses two-digit month and day for the short format', () => {
    const intl = { ...fakeIntl, formatDate: jest.fn(() => 'formatted') };
    formatPromoLastDay(intl, promo, 'short');
    expect(intl.formatDate.mock.calls[0][1]).toEqual({
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Europe/Vilnius',
    });
  });
});
