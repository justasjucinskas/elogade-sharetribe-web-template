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

- [ ] Deployed with the flag on
- [ ] Google Pay, pickup order → purchased
- [ ] Google Pay, shipped order → purchased, address on transaction
- [ ] Google Pay through a price offer
- [ ] Click guard with empty address
- [ ] No-wallet browser: card checkout unchanged
- [ ] `/lt`, `/pl` text
- [ ] No CSP reports for Stripe/Google Pay
- [ ] Apple Pay on staging Safari (or noted as Live-only)
- [ ] `onBehalfOf` not needed (else: stopped and asked)

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
