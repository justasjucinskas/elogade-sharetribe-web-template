# 0% sellers / 3% buyers — build checklist

Working file for building `specs/seller-zero-commission.md`. Tick an item only when its check
passed, and add anything new you find.

## Config

- [ ] `configPromo.js`: new id, `endsAt: null`, comment updated
- [ ] `promo.js`: open-ended promo is active; unused date helpers removed
- [ ] `promo.test.js` covers null / future / past `endsAt`, future `startsAt`, `promo = null`

## Promo surfaces (sellers-only, dateless)

- [ ] Top bar: guest, signed in, narrow
- [ ] Landing hero pill: wide, narrow
- [ ] Sign-up panel: badge, title, subtitle, only the sellers pill, no countdown
- [ ] After-sign-up step: kicker, text
- [ ] Listing price notice (`PromoNotice` seller)
- [ ] Checkout: buyer `PromoNotice` removed, `buyer` variant and keys removed
- [ ] Component tests updated (`PromoBanner`, `PromoNotice`, `AuthenticationPage`)

## Buyer protection note

- [ ] `OrderBreakdown`: customer sees `buyerProtectionNote` with a working policy link
- [ ] Provider still sees `commissionFeeNote`
- [ ] Wording checked against policy §1
- [ ] `OrderBreakdown` tests cover both roles

## Policy and FAQ

- [ ] §5 en: promo paragraph gone, 5.1 = 0%, 5.2 = 3% min €0.99 + buyer protection, `lastUpdated`
- [ ] §5 lt
- [ ] §5 pl
- [ ] FAQ payout-estimate answer (en, lt, pl)
- [ ] Grep for other seller-fee / "2%" statements (list anything found here and ask)

## Translations

- [ ] New and changed keys in en, lt, pl
- [ ] Removed keys gone from en, lt, pl and from `src/` (grep)

## Checks

- [ ] `yarn test --watchAll=false`
- [ ] `yarn run test-server`
- [ ] `yarn run format-ci`
- [ ] `yarn build`
- [ ] LT screenshots of every surface + checkout note
- [ ] Diff review: nothing blocking
- [ ] PR opened, not merged
