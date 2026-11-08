# Apple Pay / Google Pay — build checklist

Spec: `specs/wallet-payments.md`. Tick an item only when its check passes; note the evidence.

## Before build

- [ ] Platform Stripe account country confirmed (assumed `LT`)
- [ ] `staging.elogade.com` registered as a payment method domain (Stripe test mode)
- [ ] `www.elogade.com` (+ `elogade.com` if it serves pages) registered (Stripe live mode)

## Code

- [ ] Flag `REACT_APP_WALLET_PAYMENTS_ENABLED` wired (config, Dockerfile, GH workflow, staging script + env example)
- [ ] `configStripe.js` country
- [ ] `stripe.duck.js` `confirmOptions` + test
- [ ] Shared `fnRequestPayment` / `fnConfirmPayment`; `processCheckoutWithWalletPayment` + tests
- [ ] `StripePaymentForm` button, `canMakePayment`, total update, click guard, unmount + tests
- [ ] `CheckoutPageWithPayment` `handleWalletPayment` + props
- [ ] `server/csp.js` additions
- [ ] CSS + `en/lt/pl` keys
- [ ] `yarn test-ci`, `yarn format-ci`, `yarn build` pass
- [ ] Own diff reviewed (or fresh-context subagent review)

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

