import { createListing, createStock } from './testData';
import { types as sdkTypes } from './sdkLoader';
import {
  canMakePriceOffer,
  getBuyerOfferCount,
  getOfferDeadline,
  getOfferLimits,
  hasBuyerOffersLeft,
  isListingAvailableForOffers,
} from './priceOffers';

const { Money } = sdkTypes;

const productListing = (attributes = {}, stockQuantity = 1) =>
  createListing(
    'listing',
    {
      price: new Money(10000, 'EUR'),
      publicData: { transactionProcessAlias: 'default-purchase/release-1', unitType: 'item' },
      ...attributes,
    },
    { currentStock: createStock('stock', { quantity: stockQuantity }) }
  );

describe('priceOffers', () => {
  describe('canMakePriceOffer', () => {
    const can = (listing, extra = {}) =>
      canMakePriceOffer({
        listing,
        isOwnListing: false,
        marketplaceCurrency: 'EUR',
        enabled: true,
        ...extra,
      });

    it('allows offers on a product in stock', () => {
      expect(can(productListing())).toBe(true);
    });

    it('is hidden when the feature flag is off', () => {
      expect(can(productListing(), { enabled: false })).toBe(false);
    });

    it('is hidden whenever "Buy" is: own listing, closed, out of stock', () => {
      expect(can(productListing(), { isOwnListing: true })).toBe(false);
      expect(can(productListing({ state: 'closed' }))).toBe(false);
      expect(can(productListing({}, 0))).toBe(false);
    });

    it('is only for products on default-purchase in the marketplace currency', () => {
      expect(
        can(
          productListing({
            publicData: { transactionProcessAlias: 'default-booking/release-1', unitType: 'day' },
          })
        )
      ).toBe(false);
      expect(can(productListing({ price: new Money(10000, 'USD') }))).toBe(false);
    });
  });

  it('isListingAvailableForOffers needs a published listing with stock', () => {
    expect(isListingAvailableForOffers(productListing())).toBe(true);
    expect(isListingAvailableForOffers(productListing({}, 0))).toBe(false);
    expect(isListingAvailableForOffers(productListing({ state: 'closed' }))).toBe(false);
    expect(isListingAvailableForOffers(createListing('no-stock-loaded'))).toBe(false);
  });

  it('getOfferLimits: buyer ≥ 50 % (rounded up), seller above the buyer offer', () => {
    expect(getOfferLimits({ listingPrice: new Money(9999, 'EUR'), role: 'customer' })).toEqual({
      minimumInSubunits: 5000,
      belowInSubunits: 9999,
    });
    expect(
      getOfferLimits({
        listingPrice: new Money(10000, 'EUR'),
        role: 'provider',
        latestOfferInSubunits: 6000,
      })
    ).toEqual({ minimumInSubunits: 6001, belowInSubunits: 10000 });
  });

  it('counts buyer offers against the cap of 3', () => {
    const offers = [
      { transition: 'transition/buyer-make-offer', by: 'customer' },
      { transition: 'transition/seller-counter-offer', by: 'provider' },
      { transition: 'transition/buyer-counter-offer', by: 'customer' },
      { transition: 'transition/seller-counter-offer', by: 'provider' },
    ];
    expect(getBuyerOfferCount(offers)).toEqual(2);
    expect(hasBuyerOffersLeft(offers)).toBe(true);
    const third = { transition: 'transition/buyer-counter-offer', by: 'customer' };
    expect(hasBuyerOffersLeft([...offers, third])).toBe(false);
  });

  it('getOfferDeadline adds the hours to the last transition time', () => {
    const tx = { attributes: { lastTransitionedAt: new Date(Date.UTC(2026, 9, 5, 12, 0)) } };
    expect(getOfferDeadline(tx, 24)).toEqual(new Date(Date.UTC(2026, 9, 6, 12, 0)));
    expect(getOfferDeadline({ attributes: {} }, 24)).toBeNull();
  });
});
