# Apple Pay and Google Pay at checkout

Status: spec written 2026-11-08, not built. Build notes and checks:
`specs/wallet-payments-checklist.md`.

## Goal

Buyers can pay with **Apple Pay** (Safari, iPhone/Mac) or **Google Pay** (Chrome, Android) at
checkout, as well as with a card. Nothing else about the order changes: same transaction processes,
same pre-authorisation, same order page afterwards.

## How it works (and why this approach)

We follow Sharetribe's official guide,
[How to add the Payment Request Button](https://www.sharetribe.com/docs/how-to/payments/payment-request-button/),
with the changes listed under "Where we differ from the guide".

- Stripe's **Payment Request Button** (`stripe.paymentRequest` +
  `elements.create('paymentRequestButton')`) shows Apple Pay or Google Pay, whichever the device
  supports, and nothing otherwise.
- Not Stripe's newer Express Checkout Element or Payment Element: Sharetribe creates the
  PaymentIntent itself with `capture_method: manual` and fixed `payment_method_types`, which those
  elements don't support. Apple Pay and Google Pay produce a **card** payment method, so they fit
  the PaymentIntent Sharetribe already creates.
- **No transaction process change** and no Sharetribe CLI push. The flow is the existing one with
  step 2 swapped:
  1. `fnRequestPayment` (unchanged: inquiry / negotiation / **offer-purchase** / standard
     transition).
  2. `confirmCardPayment(clientSecret, { payment_method: ev.paymentMethod.id }, { handleActions: false })`;
     on error `ev.complete('fail')`; on success `ev.complete('success')`; if the PaymentIntent is
     `requires_action` (3-D Secure), a second `confirmCardPayment(clientSecret)` with no params.
  3. `fnConfirmPayment` (unchanged), then the same redirect to the order page.

## Decisions (made with Justas on 2026-11-08)

- **Shipping address: from the wallet** (changed with Justas on 2026-11-12, after the first staging
  test; replaces "form first"). For shipped orders the wallet sheet asks for the shipping address
  and phone (`requestShipping: true`, `requestPayerPhone: true`), with one shipping option priced at
  the customer's shipping-fee line item. Any country is accepted, like the form's country list. The
  address the buyer picks in the sheet goes on the transaction, whatever the page form says; the
  form stays for card payments. If the sheet returns an address without name, street, postal code,
  city or country, the sheet shows "invalid shipping address"
  (`ev.complete('invalid_shipping_address')`) and no order is placed. Pickup orders need nothing
  extra.
- **Seller's Stripe account (`onBehalfOf`): only if required.** The guide passes the seller's Stripe
  Connect account id, read through the Sharetribe **Integration API**, which this repo does not use.
  Build without it first. If a staging Google Pay payment fails or the PaymentIntent rejects the
  payment method because `on_behalf_of` doesn't match, **stop and ask** before adding the endpoint;
  it needs new Integration API apps in Console for `checkme-test` and `checkme` and a new server
  secret.
- **Behind a build-time flag, staging first.** `REACT_APP_WALLET_PAYMENTS_ENABLED`, wired like
  `REACT_APP_PRICE_OFFERS_ENABLED` (Dockerfile ARG/ENV, `.github/workflows/docker-publish.yml` build
  arg from a GitHub variable, `deploy/staging/build-and-deploy.sh` + `staging.env.example` set
  `true`). Off unless `'true'`. Live gets it only after a real payment is tested.
- **Placement: above the card.** Wallet button first, then an "or pay with card" divider, then the
  existing card/saved-card section. On shipped orders the button and divider go above the shipping
  address form too, since the wallet supplies the address. The button and divider render only when
  `canMakePayment()` says a wallet is available.

## Changes

### Config

- `src/config/configStripe.js`: `export const country = 'LT'` (the country of the platform's Stripe
  account; confirm before building, see "Blocked before build").
- New `src/config/configWalletPayments.js` (or inside `configStripe.js`):
  `WALLET_PAYMENTS_ENABLED = process.env.REACT_APP_WALLET_PAYMENTS_ENABLED === 'true'`.

### `src/ducks/stripe.duck.js`

- `confirmCardPaymentPayloadCreator` accepts optional `confirmOptions` and passes it as the third
  argument to `stripe.confirmCardPayment` when given. Keep the existing "already confirmed" check.

### `src/containers/CheckoutPage/CheckoutPageTransactionHelpers.js`

- New export `processCheckoutWithWalletPayment(orderParams, extraPaymentParams)` where
  `extraPaymentParams` carries the Stripe `ev` (paymentmethod event).
- **Do not copy `fnRequestPayment` / `fnConfirmPayment`.** Pull them out of
  `processCheckoutWithPayment` into shared helpers so the two flows can't drift (the guide's copy
  already dropped the offer-purchase branch this fork needs).
- No "save card" step: wallet cards can't be saved as default. Resolve
  `{ orderId, paymentMethodSaved: true }`.
- `hasPaymentIntentUserActionsDone` (retrying a half-finished order): call `ev.complete('success')`
  and skip confirm, as the guide does.

### `src/containers/CheckoutPage/StripePaymentForm/StripePaymentForm.js`

Per the guide, adjusted:

- New props: `payinTotal`, `stripeCountry`, `onWalletPaymentMethod`, `walletPaymentsEnabled`.
- `initializeWalletButton()` once Stripe.js is loaded, `payinTotal` is known and the container ref
  exists:
  `stripe.paymentRequest({ country, currency: payinTotal.currency.toLowerCase(), total: { label: <marketplace name>, amount: payinTotal.amount }, requestPayerName: true, requestPayerEmail: true, disableWallets: ['link', 'browserCard'] })`.
  Only Apple Pay and Google Pay: no Stripe Link, no "browser saved card" button. `payinTotal.amount`
  is already in minor units (cents), which is what Stripe wants.
- Mount the button with the same `elements` instance and locale the card uses, so the button text is
  in the page language.
- `componentDidUpdate`: `pr.update({ total })` when `payinTotal.amount` changes.
- **Click guard (our addition):** `prButton.on('click', e => …)`. Synchronously check the fields the
  wallet doesn't supply: required transaction fields (the shipping address comes from the sheet
  since 2026-11-12). If any are invalid, `e.preventDefault()`, mark the fields touched so errors
  show, scroll to the first one, and show `StripePaymentForm.walletFillDetailsFirst`. **Billing
  name/address, shipping address and card fields are not checked**: the wallet supplies them.
- `paymentmethod` handler reads the current Final Form values (`message`, shipping, transaction
  fields) and calls `onWalletPaymentMethod(ev, stripe, values)`.
- Unmount: `prButton.unmount()`, `pr.off('paymentmethod', …)`.
- Render, first thing inside the payment section (after `LocationOrShippingDetails`, above
  `PaymentMethodSelector` / `OneTimePaymentWithCardElement`): the button container, then the
  divider. Hide both when the flag is off, `canMakePayment()` is falsy, while `loadingData`, or when
  `billingDetailsNeeded` is false (transaction already past pending-payment).
- Disable the button (or fail with `ev.complete('fail')`) while a card submit is in progress, and
  vice versa.

### `src/containers/CheckoutPage/CheckoutPageWithPayment.js`

- `handleWalletPayment(ev, stripe, formValues, …)` mirrors `handleSubmit`: same
  `getOrderParams(pageData, getShippingDetailsMaybe(formValues), {}, config, transactionFieldsProtectedData, message)`,
  then `processCheckoutWithWalletPayment`, then the same `setOrderPageInitialValues` /
  `onSubmitCallback` / `history.push(OrderDetailsPage)`. On error, the same error state as a failed
  card payment (`confirmCardPaymentError` path shows the existing messages). Guard against double
  submit with the existing `submitting` state.
- Pass `payinTotal={speculatedTransaction?.attributes?.payinTotal}`, `stripeCountry`,
  `walletPaymentsEnabled`, `onWalletPaymentMethod` to `StripePaymentForm`.

### `server/csp.js`

- Add `*.stripe.network` to `connectSrc` and `frameSrc`; add `*.google.com` and `pay.google.com` to
  `frameSrc` (Google Pay sheet). `*.stripe.com` and `connectSrc *.google.com` are already there.
  Check the browser console on staging (CSP is `report` there) for anything else blocked.

### Styles and copy

- `StripePaymentForm.module.css`: button container (full width, 48px tall, matches the card field's
  radius) and a divider with centred text. Class selectors only, mobile-first.
- New keys in `en.json`, `lt.json`, `pl.json`:

| Key                                           | EN                                        | LT                                               | PL                                        |
| --------------------------------------------- | ----------------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| `StripePaymentForm.orPayWithCard`             | or pay with card                          | arba mokėkite kortele                            | lub zapłać kartą                          |
| `StripePaymentForm.walletFillDetailsFirst`    | Fill in the required details below first. | Pirmiausia užpildykite privalomus laukus žemiau. | Najpierw uzupełnij wymagane pola poniżej. |
| `StripePaymentForm.walletShippingOptionLabel` | Delivery                                  | Pristatymas                                      | Dostawa                                   |

- No change to FAQ, policies or emails: none of them say "card only" (checked 2026-11-08).

### Tests

- `stripe.duck` test: `confirmOptions` is passed through; absent → old call shape.
- `CheckoutPageTransactionHelpers` test for `processCheckoutWithWalletPayment` with a mocked
  `stripe`/`ev`: success → `ev.complete('success')` and `confirm-payment`; Stripe error →
  `ev.complete('fail')` and rejection; `requires_action` → second confirm; offer-purchase
  transaction uses `REQUEST_PAYMENT_AFTER_OFFER`.
- `StripePaymentForm` test: no button when flag off or `canMakePayment` resolves null; click guard
  lets through with shipping and billing fields empty; shipped orders request the address and map it
  onto the order's shipping fields; an incomplete wallet address fails the sheet.
- `yarn test-ci`, `yarn format-ci`, `yarn build` pass.

## Outside the code (operator / Stripe setup)

- **Register payment method domains in the platform's Stripe Dashboard** (Settings → Payment method
  domains): `staging.elogade.com` in **test** mode, `www.elogade.com` (and `elogade.com` if it
  serves pages rather than redirecting) in **live** mode. Sharetribe creates the PaymentIntent with
  the platform's secret key (set in Console), so the platform account should be the one that
  registers. **Unverified:** Stripe's docs say platforms using destination charges register on the
  platform; Sharetribe's guide doesn't say which charge type it uses. If the button doesn't show on
  a registered domain, check this first. Stripe verifies Apple Pay itself; no `.well-known` file in
  our repo is needed unless Stripe's verification asks for one. The button does not appear on
  unregistered domains or over plain HTTP.
- Apple Pay and Google Pay must be enabled under the platform's Stripe payment method settings (they
  are on by default for card-enabled accounts; check).
- `yarn dev` on `localhost` (HTTP) won't show the button. Test on `staging.elogade.com`.

## Testing plan

1. Staging, Chrome with a Google account holding a card, Stripe test keys: Google Pay on a pickup
   order and a shipped order; check the order reaches "purchased", the seller sees it, and the
   delivery address is on the transaction. Repeat once through a price offer.
2. Shipped order with the page's address form left empty: the sheet opens and asks for the address;
   the address picked there is on the transaction.
3. Apple Pay: try Safari on staging first. Sharetribe's guide says Safari won't test with Stripe
   test keys; if so, test on Live after the flag is on there, with a cheap listing of our own, then
   have the seller decline so the pre-authorisation is released (nothing captured).
4. Devices with no wallet: button and divider absent; card checkout unchanged.
5. `/lt` and `/pl`: divider text and button language.

## Stop and ask

- Before adding the Integration API endpoint (see Decisions).
- Before setting the flag on Live (GitHub variable + rebuild).
- If wallets need any transaction process change.
- If Stripe asks for a domain-association file served from our domain (it needs a server route
  mounted before `localeMiddleware`).

## Blocked before build

- Confirm the platform Stripe account's country (assumed `LT`).
- Someone with access to the platform Stripe Dashboard registers the domains above.

## Not in scope

Wallets on the payment methods page (saving a wallet card), Stripe Link, other payment methods
(SEPA, Klarna, bank transfer), booking or negotiation-specific layout work beyond what works out of
the box.
