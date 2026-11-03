# 0% sellers / 3% buyers — build checklist

Working file for building `specs/seller-zero-commission.md`. Tick an item only when its check
passed, and add anything new you find.

## Config

- [x] `configPromo.js`: new id, `endsAt: null`, comment updated
- [x] `promo.js`: open-ended promo is active; unused date helpers removed (`formatPromoLastDay`,
      `getPromoDaysLeft`, `PROMO_TIME_ZONE`: no references left in `src/` or `server/`)
- [x] `promo.test.js` covers null / future / past `endsAt`, future `startsAt`, `promo = null`

## Promo surfaces (sellers-only, dateless)

- [ ] Top bar: guest, signed in, narrow — guest wide + narrow checked in LT (screenshots);
      signed-in copy covered by `PromoBanner.test.js` only, **not seen in the browser** (no
      signed-in session)
- [x] Landing hero pill: wide, narrow (LT screenshots)
- [x] Sign-up panel: badge, title, subtitle, only the sellers pill, no countdown (LT screenshot)
- [ ] After-sign-up step: kicker, text — code and keys done, **not seen in the browser** (needs a
      fresh sign-up)
- [ ] Listing price notice (`PromoNotice` seller) — code and test done, **not seen in the
      browser** (needs a signed-in seller)
- [x] Checkout: buyer `PromoNotice` removed, `buyer` variant and keys removed (code + grep);
      checkout page itself not seen signed in
- [x] Component tests updated (`PromoBanner`, `PromoNotice`, `AuthenticationPage`)

## Buyer protection note

- [x] `OrderBreakdown`: customer sees `buyerProtectionNote` with a working policy link (LT listing
      order panel: link goes to `/lt/p/market-policies#section-1` and lands on "Pirkėjų apsauga")
- [x] Provider still sees `commissionFeeNote` (unit test)
- [x] Wording checked against policy §1 (en/lt/pl intro: payment held until the buyer confirms
      the item was received and matches the description)
- [x] `OrderBreakdown` tests cover both roles

## Policy and FAQ

- [x] §5 en: promo paragraph gone, 5.1 = 0%, 5.2 = 3% min €0.99 + buyer protection, `lastUpdated`
- [x] §5 lt
- [x] §5 pl
- [x] FAQ payout-estimate answer (en, lt, pl)
- [x] Grep for other seller-fee / "2%" statements: none found. FAQ "listing creation" answer and
      Terms §7.6 only say a fee is shown at checkout if one applies, so left as they are.

## Translations

- [x] New and changed keys in en, lt, pl
- [x] Removed keys gone from en, lt, pl and from `src/` (grep: `promoDaysLeft`,
      `promoRateBuyers`, `PromoNotice.buyerText`, `PromoNotice.buyerTitle` → 0 hits)

## Checks

- [x] `yarn test --watchAll=false` (93 suites, 1312 tests)
- [x] `yarn run test-server` (15 suites, 264 tests)
- [x] `yarn run format-ci`
- [x] `yarn build`
- [ ] LT screenshots of every surface + checkout note — signed-out surfaces, listing breakdown
      note and §5 done; signed-in surfaces pending
- [x] Diff review: nothing blocking (fresh-context subagent)
- [ ] PR opened, not merged

## Found while building

- The Stripe bullet in 5.1 lost its leading "In addition," / "Be to," since the fee bullet it
  followed is gone.
- `EditListingPricingPanel` and `EditListingPricingAndStockPanel` still pass
  `variant="seller"` to `PromoNotice`, which no longer reads it. Harmless; left alone because
  those files are outside the spec's file list.
- The buyer-protection link opens in the same tab, so clicking it at checkout leaves the payment
  step. The spec asked for a `NamedLink`; opening it in a new tab would be a follow-up decision.
- Pre-existing, not changed: `pl.json` `OrderBreakdown.commissionFeeNote` has no leading "*",
  and the `lt.json` provider fee label has no "*".
