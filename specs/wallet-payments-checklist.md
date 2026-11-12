# Apple Pay / Google Pay — build checklist

Spec: `specs/wallet-payments.md`. Tick an item only when its check passes; note the evidence.

## Before build

- [ ] Platform Stripe account country confirmed (assumed `LT`)
- [ ] `staging.elogade.com` registered as a payment method domain (Stripe test mode)
- [ ] `www.elogade.com` (+ `elogade.com` if it serves pages) registered (Stripe live mode)

## Code

- [x] Flag `REACT_APP_WALLET_PAYMENTS_ENABLED` wired (config, Dockerfile, GH workflow, staging script + env example) — `src/config/configWalletPayments.js`, Dockerfile ARG/ENV, workflow build arg from `vars.REACT_APP_WALLET_PAYMENTS_ENABLED`, `build-and-deploy.sh` + `staging.env.example` set `true`; also `.env-template` and `deploy/README.md`. GitHub variable not set (Live, ask first).
- [x] `configStripe.js` country — `export const country = 'LT'` with a TODO: still **unconfirmed** (see Before build).
- [x] `stripe.duck.js` `confirmOptions` + test — `src/ducks/stripe.duck.test.js`: 3rd arg passed; old 1- and 2-arg shapes kept; already-confirmed PI skips confirm.
- [x] Shared `fnRequestPayment` / `fnConfirmPayment`; `processCheckoutWithWalletPayment` + tests — `createRequestPaymentFn` / `createConfirmPaymentFn` used by both flows. `CheckoutPageTransactionHelpers.test.js`: success, Stripe error → `fail`, initiate error → `fail`, `requires_action` → 2nd confirm, 3DS failure after sheet closed, user-actions-done, offer → `REQUEST_PAYMENT_AFTER_OFFER`, plus two card-flow regression tests.
- [x] `StripePaymentForm` button, `canMakePayment`, total update, click guard, unmount + tests — `StripePaymentForm.test.js` (8 tests): flag off, `canMakePayment` null, paymentRequest options + locale, `pr.update` on total change, guard blocks with empty shipping and passes with billing empty, blocked while card submit in progress, paymentmethod → callback with form values, unmount cleanup. Mutation check: dropping `addressLine1` from the wallet-supplied list fails 2 tests.
- [x] `CheckoutPageWithPayment` `handleWalletPayment` + props — success/error tail extracted to `finishCheckout`, shared with `handleSubmit`. No unit test of its own (covered through the helpers + full CheckoutPage suite); real check is on staging.
- [x] `server/csp.js` additions — `*.stripe.network` in connect + frame, `*.google.com` + `pay.google.com` in frame. Console check pending (staging).
- [x] CSS + `en/lt/pl` keys — `StripePaymentForm.orPayWithCard`, `StripePaymentForm.walletFillDetailsFirst` (texts from the spec, unreviewed by a native speaker).
- [x] `yarn test-ci`, `yarn format-ci`, `yarn build` pass — 2026-11-08: `CI=true yarn test-ci` server 15 suites / 264 tests, web 96 suites / 1332 tests, exit 0; `format-ci` clean; `build` exit 0 (only the existing CSS-order warnings).
- [x] Own diff reviewed (or fresh-context subagent review) — fresh-context reviewer (read-only, no shell) read the changed source against the spec: nothing blocking. Own pass: card-flow refactor checked by hand and by the two card regression tests + the existing CheckoutPage suite.

## Staging

- [x] Deployed with the flag on — 2026-11-08, commit `28d746a68` via
      `deploy/staging/build-and-deploy.sh` (exit 0, `Loaded image: elogade-web:staging`,
      container `Up (healthy)`); `https://staging.elogade.com/en` → 200; bundle passes
      `walletPaymentsEnabled:!0` to the form; CSP header has `*.stripe.network`, `*.google.com`,
      `pay.google.com`. `REACT_APP_WALLET_PAYMENTS_ENABLED=true` also added to the VM's
      `staging.env` (backup `staging.env.pre-wallet.bak`). Live container untouched.
- [ ] Google Pay, pickup order → purchased
- [ ] Google Pay, shipped order → purchased, address on transaction
- [ ] Google Pay through a price offer
- [x] Click guard with empty address (old behaviour) — 2026-11-12, Justas on staging (Chrome,
      Google Pay): form empty → no sheet, field errors and "Fill in the delivery details above
      first." shown (screenshot). Superseded the same day by the wallet address change below.
- [ ] Wallet shipping address: shipped order with the page form empty → sheet asks for the
      address; the sheet's address is on the transaction
- [x] No-wallet browser: card checkout unchanged — 2026-11-11, staging checkout (Apple watch band,
      test buyer, built-in browser without a wallet): wallet container `display: none` with 0
      children, no "or pay with card", card iframe present. Card order placed through this branch
      locally (`localhost:3001` → `checkme-test`, Stripe test card 4242, Logitech wireless mouse):
      "Your payment was successful!", transaction `6af48224-c37f-446a-ab85-c892f282f9df`.
- [ ] `/lt`, `/pl` text
- [ ] No CSP reports for Stripe/Google Pay — partly: no CSP messages in the console on the
      staging checkout and 0 CSP lines in the staging server log, but without a wallet the
      Google Pay frames never load. Recheck during the wallet test.
- [ ] Apple Pay on staging Safari (or noted as Live-only)
- [ ] `onBehalfOf` not needed (else: stopped and asked)

## Wallet shipping address (added 2026-11-12, Justas: "Add it now")

- [x] Spec updated — `wallet-payments.md` Decisions: "Shipping address: from the wallet".
- [x] Code + tests — `requestShipping` / `requestPayerPhone` / one shipping option (customer
      shipping-fee line item) on shipped orders, `shippingaddresschange` accepts any country,
      `recipient*` fields no longer block the click guard, sheet address mapped onto `recipient*`
      (overrides the page form), incomplete address → `invalid_shipping_address`, button above the
      shipping form. `StripePaymentForm.test.js` 14 tests; mutation (shipping field back in the
      guard + `fail` instead of `invalid_shipping_address`) fails 4. Guard copy reworded to "Fill in
      the required details below first." (en/lt/pl, unreviewed); new key
      `StripePaymentForm.walletShippingOptionLabel`.
- [x] `CI=true yarn test-ci` (server 264, web 1338, exit 0), `yarn format-ci` exit 0, `yarn build`
      exit 0 — 2026-11-12.
- [x] Diff reviewed — fresh-context reviewer (read-only): nothing blocking. Not verifiable without
      a real sheet: Stripe accepting `detail: ''` on the shipping option; any shipping country is
      accepted (same as the page form's country list).
- [x] Deployed to staging — 2026-11-12, commit `eece70dc1` via `build-and-deploy.sh` (exit 0,
      container `Up (healthy)`), `https://staging.elogade.com/en` → 200, checkout chunk
      `2592.caefc2f6.chunk.js` contains `requestShipping` / `invalid_shipping_address`.
      That first redeploy was built without `STAGING_STRIPE_PUBLISHABLE_KEY`, so checkout said the
      Stripe key wasn't configured (Justas, screenshot). Redeployed the same commit with the key:
      `pk_test_` in `main.ec35089a.js`, BenQ checkout loads the card field and no key error.
      `build-and-deploy.sh` now stops when the key or `.env` client id is missing (checked both).

## Live (ask first)

- [ ] GitHub variable set, image rebuilt
- [ ] Apple Pay real payment, seller declines, pre-authorisation released

## Found during build

- **`yarn test-ci` needs `CI=true` locally**, otherwise `scripts/test.js` starts Jest watch mode on
  changed files only and never exits.
- **Guide bugs we didn't copy:** `initializePRButton` returns early *when* `providerStripeAccountId`
  is set (inverted guard); `processCheckoutWithPRBPayment` uses an undeclared `storeData`; its
  `fnRequestPayment` drops the offer-purchase branch. Shared helpers avoid all three.
- **Sheet closed on every failure:** the guide only calls `ev.complete('fail')` when the Stripe
  confirm fails; if request-payment itself fails (sold out, expired offer) the wallet sheet would
  spin until it times out. Ours fails the sheet on any error before it was completed, once.
- **Wallet failures reuse the card flow's recovery** (`finishCheckout`): invalid-transition errors
  refetch the transaction and redirect or show payment-expired, same as card.
- **`payinTotal` comes from the transaction the breakdown shows** (existing tx with line items,
  else speculated), not only `speculatedTransaction` as in the guide, so the wallet sheet total
  always matches the page.
- **Locale:** the wallet button gets its own Elements instance with `locale` from the page
  (`lt`/`pl`/`en`). The card keeps its existing instance (no locale, Stripe auto-detects), so the
  card field is untouched. Deviation from the spec's "same elements instance".
- **Guard copy vs. transaction fields:** the click guard also blocks on required customer
  transaction fields, but those render *below* the button while the message says "delivery details
  above". Not checked whether Console defines any required customer transaction field; if it
  does, reword the message or move the fields.
- **Platform Stripe country still assumed `LT`.** A wrong country makes `canMakePayment` / the
  sheet misbehave rather than fail loudly; confirm in the Stripe Dashboard before staging tests.
- **Staging check from review:** the button is mounted into a `display: none` container (shown once
  `canMakePayment` resolves, and only after `loadingData`). Confirm it renders full width on first
  show.
- **Staging renders logged-in pages as logged out on the server** (2026-11-11): the SSR HTML shows
  "Sign up" while the browser has the `st-76bc4e4f…-token` cookie, so every full page load logs
  React hydration errors #418/#423/#425 and re-renders on the client. Not from this PR (it changes
  no server, auth or topbar code besides `server/csp.js`); Live's logged-out listing page has no
  such errors, logged-in Live not checked. Follow-up, not a blocker for wallets.
- **Staging test guide:** `wallet-payments-staging-test.md`. Test buyer created on `checkme-test`
  via staging sign-up; login saved in the main checkout's `.env` (`STAGING_TEST_BUYER_*`).
