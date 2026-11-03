# 0% commission for sellers, 3% for buyers

Status: spec written 2026-11-03, built 2026-11-03 (PR open, not merged). Build notes and checks:
`specs/seller-zero-commission-checklist.md`.

## Goal

The 0% promo for buyers **and** sellers (`zero-commission-2026-10`, see `src/config/configPromo.js`)
ended on 31 October 2026, and every promo surface hid itself on 1 November. From now on:

- **Sellers pay 0%**, with no end date.
- **Buyers pay 3%, minimum €0.99.**

The client has already set this in Sharetribe Console. Checked on 2026-11-03 against the Live
asset (`https://cdn.st-api.com/v1/assets/pub/34ce3207-9cf3-4194-a176-1f7ee3633744/a/latest/transactions/commission.json`):
`providerCommission 0% / min 0`, `customerCommission 3% / min 99` (cents). **No Console change is
part of this work.**

What the client asked for (paraphrased from Lithuanian), and the whole scope:

1. Keep the promo banners (homepage, sign-up page, top bar, etc.) but make them about **sellers
   only**: "0 % komisinių parduodant".
2. **Say nothing about the buyer fee** in the banners: neither 0% nor 3%.
3. Update the **Marketplace Policies**, which still say sellers pay 2% and still carry the promo
   paragraph.
4. At checkout, the buyer fee note "* Šis mokestis padeda mums palaikyti platformą…" should instead
   say that **buyer protection is included**. Off-platform deals are costing the marketplace, so
   buyers need to see what the fee gets them.

Not in scope: renaming the fee line ("Elogade mokestis *"), the "Pirkėjo apsauga" box from the
client's screenshot (it is not in our code), new pages or components, emails, anything server-side.

## Decisions (made with Justas on 2026-11-03)

- **Open-ended.** No end date, so no date in any copy, no "Akcija · iki 10-31" date, no "X days
  left" countdown. To end it later, set `endsAt` (everything hides itself at that moment) or set
  `promo = null`.
- **Buyer protection = the footnote only.** The fee line keeps its name.
- **The policy mentions the €0.99 minimum** next to the 3%.
- **New promo id**, so the top bar reappears once for visitors who dismissed the old one.

## Changes

### Promo config and helpers

- `src/config/configPromo.js`: `id: 'zero-commission-sellers'`, `startsAt: null`, `endsAt: null`.
  Update the file comment: this promo is sellers-only and has no end date.
- `src/util/promo.js`: `isPromoActive` must treat a missing `endsAt` as "no end" (today it returns
  false). `formatPromoLastDay` and `getPromoDaysLeft` are no longer used by any surface; remove them
  if nothing else uses them, with their tests.
- `src/util/promo.test.js`: cover `endsAt: null` (active), a future `endsAt` (active), a past one
  (inactive), `startsAt` in the future (inactive), `promo = null` (inactive).

### Copy on every promo surface

All copy is sellers-only and dateless. Drop the `{date}` placeholders from the keys. Suggested
texts below; `en.json` is the source, `lt.json` and `pl.json` get matching translations (Polish
written in the same style as the existing `pl.json` promo keys).

| Surface | File | EN | LT |
| --- | --- | --- | --- |
| Top bar, guest | `Topbar/PromoBanner/PromoBanner.js` | **0% commission** on selling | **0 % komisinių** parduodant |
| Top bar, signed in | same | {marketplaceName} charges sellers no commission. | {marketplaceName} netaiko komisinių pardavėjams. |
| Top bar, narrow | same | **0% commission** on selling | **0 % komisinių** parduodant |
| Hero pill (wide + narrow) | `ModernLandingPage/sections/SectionHero.js` | **0% commission** on selling | **0 % komisinių** parduodant |
| Sign-up panel badge | `AuthenticationPage/AuthenticationPage.js` (`PromoBrandPanel`) | Promo | Akcija |
| Sign-up panel title | same | 0% commission / *on selling.* | 0 % komisinių / *parduodant.* |
| Sign-up panel subtitle | same | {marketplaceName} charges sellers no commission. Sign up and sell commission-free. | {marketplaceName} netaiko komisinių pardavėjams. Užsiregistruokite ir parduokite be komisinių. |
| Sign-up panel rate pills | same | only "Sellers 0%" | only "Pardavėjams 0 %" |
| After sign-up step, kicker | `AuthenticationPage/EmailVerificationInfo.js` | While you wait | Kol laukiate |
| After sign-up step, text | same | {marketplaceName} takes no commission from sellers. | {marketplaceName} neima komisinių iš pardavėjų. |
| Listing price step notice | `components/PromoNotice/PromoNotice.js` (seller) | No commission for sellers / {marketplaceName} takes no commission from your sale. | Pardavėjams komisinių netaikome / {marketplaceName} neima komisinio nuo jūsų pardavimo. |

- Sign-up panel: remove the "Buyers 0%" pill (`promoRateBuyers`) and the countdown
  (`promoDaysLeft`, `promoCountdown`). Keep the trust list (`brandTrust1-3`) as it is.
- After-sign-up step: the title ("Sell your first item commission-free") and the two links stay.
- Top bar and hero pill: links, dismiss behaviour and `HIDDEN_ON_PAGES` stay as they are.
- **Buyer notice at checkout goes away**: remove `<PromoNotice variant="buyer" />` from
  `CheckoutPage/CheckoutPageWithPayment.js` (and its `.promoNotice` CSS if unused), the `buyer`
  variant from `PromoNotice`, and the `PromoNotice.buyer*` keys.
- Remove every translation key that is no longer used (in en, lt and pl).

### Buyer protection note in the order breakdown

`src/components/OrderBreakdown/OrderBreakdown.js` shows `OrderBreakdown.commissionFeeNote` under
the total whenever there is a commission line for the viewer's role. The breakdown appears in the
listing order panel (right above "Pirkti dabar"), at checkout and on the transaction page.

- **Customer** with a customer-commission line: show a new key `OrderBreakdown.buyerProtectionNote`
  with a link to Marketplace Policies, section 1 (`NamedLink name="MarketplacePoliciesPage"` with
  `#section-1`, check the anchor id against the rendered page).
  - EN: "* Includes buyer protection: your payment is held until you confirm the item arrived as
    described. <link>How it works</link>"
  - LT: "* Įskaičiuota pirkėjo apsauga: jūsų mokėjimas saugomas, kol patvirtinsite, kad gavote
    prekę, atitinkančią aprašymą. <link>Kaip tai veikia</link>"
- **Provider** with a provider-commission line (old orders from before the promo still have one):
  keep `OrderBreakdown.commissionFeeNote` unchanged.
- Check that the claim matches what the policy says buyer protection is (policy intro and §1).
  If it doesn't, use the policy's own wording.

### Marketplace Policies §5

`src/containers/MarketplacePoliciesPage/content/{en,lt,pl}.js`. Keep the section numbering and
heading structure (`LegalPage.helpers.test.js` checks it), and bump `lastUpdated` to the ship date
in all three.

- Delete the **Promotion** paragraph.
- **5.1 Seller Commission**: ELOGADE charges sellers no service fee (0%). Stripe's processing fee
  still applies (keep the existing Stripe bullet). The payout bullet becomes "after Stripe
  processing fees are deducted", without "ELOGADE (2%)". Drop the bullets that only make sense
  with a fee: "deducted automatically when the transaction is completed", "No ELOGADE service fee
  is charged if the item does not sell".
- **5.2 Buyer Fees**: 3% service fee at checkout, **minimum €0.99**. Replace "This fee helps
  support platform operations, secure payments, and user protection" with a bullet saying the fee
  includes buyer protection, linking to section 1. Keep the shipping and "fees shown before
  payment" bullets.
- 5.3 stays.

Also fix the one other place that states sellers pay an ELOGADE fee, so the site doesn't
contradict the policy: `src/containers/FaqPage/content/{en,lt,pl}.js`, the answer to "Are Stripe
processing fees included in the payout estimate?" ("after ELOGADE service fees and applicable
Stripe… fees are deducted" → after Stripe fees only). FAQ ids stay the same. Grep the content
files and translations for any other "2%"/"2 %" or seller-fee statement; if you find more, list
them in the checklist and ask before changing them.

## Done means

- In `yarn dev` (en, lt, pl), signed out and signed in, the top bar, hero pill, sign-up panel,
  after-sign-up step and listing price notice show the sellers-only copy, with no date and no buyer
  rate anywhere. Screenshots of each in LT.
- Checkout shows no promo notice. With a customer commission in the marketplace you test against,
  the breakdown shows the buyer-protection note with a working link; a provider view does not.
  Screenshot.
- `/lt/p/market-policies#section-5` shows 0% / 3% (min €0.99), no promo paragraph, new
  `lastUpdated`, in all three locales.
- `yarn test --watchAll=false`, `yarn run test-server`, `yarn run format-ci` and `yarn build` pass.
  Show the output.
- No leftover unused promo keys: grep each removed key across `src/`.
- A self-review of the diff (or a fresh-context subagent review) found nothing blocking.
- A PR is open against `main` (`gh pr create --repo justasjucinskas/elogade-sharetribe-web-template`).
  **Not merged**: merging to `main` deploys Live.

## Stop and ask

- Before merging, pushing to `main`, deploying to staging or Live, or changing anything in
  Sharetribe Console.
- If any copy would mention the buyer fee outside the policy and the order breakdown.
- If the buyer-protection wording can't be backed by the policy text.
- If doing this needs anything outside the files listed above (beyond tests and translations).
