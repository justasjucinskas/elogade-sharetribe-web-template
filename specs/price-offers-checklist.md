# Price offers — build checklist

Working file for building `specs/price-offers.md`. Tick an item only when its check passed.

## Process

- [x] `ext/transaction-processes/offer-purchase/process.edn` (offer loop + default-purchase copy)
- [x] `flex-cli process` validates the file locally
- [x] Email templates: 10 offer templates + 25 purchase templates copied
- [x] `specs/price-offers-email-texts.json` with the new keys and English texts

## Shared config

- [x] `src/config/configPriceOffers.js` (CommonJS, read by client and server): flag, 50% ratio,
      3-offer cap

## Server

- [x] `server/api-util/priceOffers.js`: validation + agreed price
- [x] `negotiation.js` transition lists extended for offer-purchase (history validation)
- [x] `initiate-privileged.js`: buyer-make-offer metadata + validation
- [x] `transition-privileged.js`: counters, accepts, request-payment-after-offer
- [x] `lineItems.js`: offer-purchase branch keeps `line-item/item` + shipping
- [x] `delete-account.js`: offer-purchase payment states
- [x] Unit tests: below 50 %, ≥ listing price, seller counter ≤ buyer offer, 4th buyer offer, pay
      uses metadata amount

## Client

- [x] `transactionProcessOfferPurchase.js` + registered in `transaction.js` + graph tests
- [x] ListingPage: "Make an offer" button + modal, min/max validation, link to open offer
- [x] TransactionPage: state data for every state × role, counter modal with limits, pay flow, "item
      sold"
- [x] Checkout: `REQUEST_PAYMENT_AFTER_OFFER` in both places, pickup/shipping as purchase
- [x] Inbox: state labels
- [x] Feature flag `REACT_APP_PRICE_OFFERS_ENABLED` (Dockerfile, workflow, env template)
- [x] i18n: en, lt, pl

## Checks

- [ ] `yarn test` (client) and `yarn run test-server` pass
- [ ] `yarn build` passes
- [ ] `yarn run format-ci` clean
- [x] Staging: process pushed + alias (`checkme-test`, offer-purchase v1, `release-1`, 2026-10-05)
- [ ] Staging scenario: offer → accept → pay → ship → received → reviews
- [ ] Staging scenario: offer → counter → counter → accept → pay
- [ ] Staging scenario: offer below 50 % blocked in UI and API
- [ ] Staging scenario: two accepted offers, first pays, second sees "sold"
- [ ] Staging scenario: listing-price buy while offer accepted → offer buyer can't pay
- [ ] Staging scenario: "Buy" unchanged end-to-end
- [ ] Timers checked with shortened periods, then restored
- [ ] Self-review of the diff (fresh-context review 2026-10-05: 1 blocker — checkout message not
      shown on offer-purchase — fixed in 68d6d172c with a test; re-review after staging changes)

## Found along the way

- `transactions.query` supports `listingId` (API reference, checked 2026-10-05): ListingPage links
  to the buyer's open offer instead of offering a new one.
- Locale files: fork-added keys only exist in en/lt/pl (the other 14 files are upstream leftovers
  outside `SUPPORTED_LOCALES`), so offer keys are added to en/lt/pl only.
- `AuthenticationPage.test.js` › "keeps the regular brand panel on the login tab" failed once in the
  full run and passes alone (11/11): load-related flake, file not touched by this work.

- State names `offer-pending` / `offer-accepted` collide with default-negotiation's states in the
  state-based notification query (`user.duck.js` → `getStatesNeeding*Attention`), which would badge
  the wrong party. Renamed to `buyer-offer-pending` / `offer-agreed`.
- Inbox (`InboxPage.duck.js`, via `getSupportedProcessesInfo`) and `delete-account.js` query
  `processNames` including `offer-purchase` even with the flag off. Checked on `checkme-test` before
  the push (process not there yet): the Inbox loads normally, so the API ignores unknown process
  names and merging can't break Live's Inbox before the Live push.
- Sellers need payout details (Stripe Connect, test data on staging) for any payment, incl. paying
  an agreed offer; making/accepting an offer doesn't touch Stripe.
