# Price offers ("Siūlyti kainą")

Status: spec, not built. Written 2026-10-05.

## Goal

Vinted-style price offers on product listings, next to the existing "Buy" button, without changing
how "Buy" works today.

Client's requirement (paraphrased from Lithuanian):

- A "Make an offer" button next to "Buy". The buyer enters an amount and sends it to the seller.
- The seller can accept, reject, or counter.
- If accepted, **that buyer** can buy the item for the agreed price. Accepting does not reserve the
  item or mark it sold; it is sold only after a successful payment.
- Meanwhile other buyers can still buy at the listing price.
- An accepted offer is valid for a limited time, e.g. 24 h.
- An offer must be at least 50% of the listing price (100 € item → no offers below 50 €).
- The offer feature runs in parallel with the current purchase process and does not change it.

## Why not Sharetribe's built-in negotiation process

`default-negotiation` (already in this template) is service-oriented: the seller makes the first
offer, it has no stock and no shipping/pickup, and its post-payment flow is "deliver → request
changes → accept deliverable". A listing type also maps to exactly one process, so switching
`newproducts`/`usedproducts` to it would remove "Buy". See
https://www.sharetribe.com/docs/concepts/transactions/negotiation-process/.

## Design

### A separate process, listing types untouched

- New process **`offer-purchase`**, alias `offer-purchase/release-1`, in
  `ext/transaction-processes/offer-purchase/`.
- `newproducts` and `usedproducts` stay on `default-purchase` in Console. **Listing types are not
  changed.** "Buy" keeps initiating `default-purchase` exactly as today. No Console change is needed
  (see Emails).
- "Make an offer" initiates a transaction on `offer-purchase` explicitly (the Marketplace API takes
  the process alias at initiate; the listing type is a template concept). TransactionPage and inbox
  already resolve the flow from `transaction.attributes.processName`, so offer transactions render
  with their own state data.
- Register the process in `src/transactions/transaction.js` (new
  `transactionProcessOfferPurchase.js`
  - `TransactionPage.stateDataOfferPurchase.js`).

### Process graph

Offer loop in front, then a copy of `default-purchase` from `pending-payment` onwards (same states,
transitions, timers and actions — shipping/pickup, received, disputes, reviews).

```
initial
  └─ transition/buyer-make-offer (customer, privileged) ─────────► offer-pending
offer-pending          (buyer's offer waiting for seller)
  ├─ transition/seller-accept-offer (provider, privileged) ──────► offer-accepted
  ├─ transition/seller-decline-offer (provider) ─────────────────► offer-declined
  ├─ transition/seller-counter-offer (provider, privileged) ─────► counter-offer-pending
  ├─ transition/buyer-withdraw-offer (customer) ─────────────────► offer-declined
  └─ transition/expire-offer (system, last-entered + 48h) ───────► offer-expired
counter-offer-pending  (seller's counter waiting for buyer)
  ├─ transition/buyer-accept-counter-offer (customer, privileged) ► offer-accepted
  ├─ transition/buyer-decline-counter-offer (customer) ──────────► offer-declined
  ├─ transition/buyer-counter-offer (customer, privileged) ──────► offer-pending
  └─ transition/expire-counter-offer (system, last-entered + 48h) ► offer-expired
offer-accepted         (agreed price, item NOT reserved)
  ├─ transition/request-payment-after-offer (customer, privileged,
  │     create-pending-stock-reservation + privileged-set-line-items + Stripe as in
  │     request-payment-after-inquiry) ──────────────────────────► pending-payment
  ├─ transition/buyer-cancel-accepted-offer (customer) ──────────► offer-declined
  └─ transition/expire-accepted-offer (system, last-entered + 24h) ► offer-expired
pending-payment … (identical to default-purchase from here on)
```

Transition names deliberately differ from `default-negotiation`'s (`make-offer`,
`customer-make-counter-offer`, …): server code in `initiate-privileged.js`,
`transition-privileged.js` and `negotiation.js` branches on transition names alone, so reusing them
would trigger negotiation-specific logic by accident.

Every offer-carrying transition also runs `:action/privileged-update-metadata` (as
`default-negotiation` does) and the operator gets a reject transition from each pending state.
Timers use `:time/last-entered-state` so each round gets its own deadline
(https://www.sharetribe.com/docs/references/transaction-process-time-expressions/).

### Price integrity (server-enforced)

- Offer history lives in transaction **metadata**, which only our server writes via privileged
  transitions. Reuse `server/api-util/negotiation.js` (`addOfferToMetadata`,
  `getAmountFromPreviousOffer`, history validation) — extend its transition lists for the new
  process rather than forking it.
- Line items: every offer-carrying transition sets line items to the current offer (as
  `default-negotiation` does), so the existing breakdown/Offer UI shows the amount on the table. No
  Stripe charge happens before `request-payment-after-offer`.
- `request-payment-after-offer`: the server sets the item line item from the **accepted amount in
  metadata**, never from the request body. Quantity is 1 (listings use `oneItem` stock). Shipping
  fee and commissions are added exactly as for "Buy" (`server/api-util/lineItems.js`).
- Validation in the privileged endpoints (reject with 400 otherwise):
  - every amount is in the listing currency and > 0;
  - **buyer offers** (`buyer-make-offer`, `buyer-counter-offer`): ≥ 50% of the current listing price
    (`Math.ceil` in subunits) and < listing price;
  - **seller counter**: > the buyer's latest offer and < listing price (so ≥ 50% automatically);
  - the buyer cannot make an offer on their own listing; listing must be open with stock > 0.
- 50% is a constant in local config (`src/config/configListing.js`, e.g. `minimumOfferRatio: 0.5`)
  read by both client validation and server.

### Decisions taken (user delegated: "decide what's most logical")

| Question                                        | Decision                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 50% rule on seller's counter?                   | Not needed — a counter must exceed the buyer's latest offer, which was already ≥ 50%.                                                                                                                                                                                                                             |
| Round cap                                       | Buyer may make at most **3** offers per transaction (initial + 2 counters). After that the counter button is hidden and the server rejects further counters; buyer can only accept/reject. Keeps far below the 100-transition limit.                                                                              |
| Unanswered offer / counter                      | Expires after **48 h**.                                                                                                                                                                                                                                                                                           |
| Accepted offer                                  | Buyer must pay within **24 h** (client's example).                                                                                                                                                                                                                                                                |
| Several accepted offers on one item             | Allowed. First to pay wins: payment reserves stock, so the next buyer's payment fails on the stock reservation and the UI says "This item has already been sold".                                                                                                                                                 |
| One buyer, several open offers on the same item | The listing page links to the buyer's open offer instead of starting a new one **if** the API lets us find it cheaply (query own transactions on `offer-purchase` and match listing). If not, allow it — the round cap and expiries still bound it. Verify, don't guess.                                          |
| Open offers after the item sells                | Cannot be auto-declined by the process (a process does not react to other transactions). They expire on their timers. Transaction page hides offer/pay actions and shows "Item sold" when the listing is closed or stock is 0. "Make an offer" is hidden whenever "Buy" is (out of stock / closed / own listing). |
| Delivery method                                 | Chosen at checkout after acceptance, as with "Buy". The offer is for the item price; shipping is added on top.                                                                                                                                                                                                    |
| Commission                                      | Same rules as "Buy", applied to the agreed price (the 0% promo applies equally).                                                                                                                                                                                                                                  |

### UI

- **ListingPage / OrderPanel**: secondary "Make an offer" button under "Buy" (product listings with
  stock only). Opens a modal (Final Form, `FieldCurrencyInput`) showing the listing price and the
  minimum, plus an optional message. Reuse `MakeOfferPage` / `MakeCounterOfferModal` / `Offer`
  components where they fit; don't fork them if a prop will do.
- **TransactionPage**: per-state actions — seller: Accept / Counter / Decline; buyer: Accept /
  Counter / Decline on a counter, Withdraw on their own pending offer, "Pay €X" on accepted with the
  deadline shown. Offer history displayed in the activity feed.
- **Checkout**: from `offer-accepted`, same path as purchase-after-inquiry, with
  `request-payment-after-offer`; order breakdown shows the agreed price.
- **Inbox**: state labels for the new states.
- **Feature flag**: a config flag hides the button; turning it off stops new offers while existing
  offer transactions keep working.
- **i18n**: new keys in every `src/translations/*.json` present in the repo (lt, pl, en, …).
- **Emails**: templates in `ext/transaction-processes/offer-purchase/templates/` for: offer received
  (seller), counter received (buyer), offer accepted with pay-by deadline (buyer), offer declined,
  offer/accepted offer expired; the purchase-phase templates copied from `default-purchase`.
  Templates read wording from the hosted asset `content/email-texts.json` (Console → Content → Email
  texts) and fall back to the default text written in the template (`{{t "Key" "Default text"}}`)
  when a key is missing. As of 2026-10-05 Live and staging both have locale `lt`, yet none of their
  hosted email texts (521 on Live) is Lithuanian, so every email goes out in English today. New
  templates therefore get **English default texts**, matching the rest; no Console step is needed
  for them to work. The build also writes the new keys and texts to
  `specs/price-offers-email-texts.json` so they can be added in Console whenever the emails are
  translated.

## Code touchpoints (checked 2026-10-05)

- `server/api-util/lineItems.js:150-170` only uses `orderData.offer` for `offer`/`request` unit
  types. Our listings are `item`, so add a branch keyed on the **process** (offer-purchase) that
  takes the price from the offer/accepted amount, keeping `line-item/item` and shipping as for Buy.
- `server/api/transition-privileged.js` already fetches the transaction (`transactions.show`) and
  merges metadata (`getUpdatedMetadata`) — extend it for the new transitions plus the validation
  rules above (it needs the listing's price and `currentStock`, so include `listing.currentStock`).
- `server/api/initiate-privileged.js:18-45` builds offer metadata for the first offer — extend for
  `buyer-make-offer`.
- Checkout picks the payment transition in two places — `CheckoutPageWithPayment.js:202` and
  `CheckoutPageTransactionHelpers.js:209` — add a `REQUEST_PAYMENT_AFTER_OFFER` branch. Checkout
  already resolves the process from `transaction.attributes.processName` when a transaction exists
  (`CheckoutPage.js:54`). Keep purchase checkout behaviour (delivery method, shipping fee,
  initial-message rules); only the price source differs.
- `CheckoutPageSessionHelpers.js:39` detects negotiation by `unitType` — make sure the stored order
  data for an offer-purchase checkout passes its validation.
- TransactionPage resolves process by `processName` (`TransactionPage.js:390`); add
  `TransactionPage.stateDataOfferPurchase.js` and wire it in `TransactionPage.stateData.js`.

## Open — verify during build, decision already made for each outcome

- Whether Marketplace API `transactions/query` can filter by listing (for "link to your open
  offer"). If not: skip that nicety (see decisions table).
- Whether a closed listing still lets `request-payment-after-offer` reserve stock. Either way the UI
  hides "Pay" when the listing is closed or out of stock.

## Done means

1. `offer-purchase` process files in `ext/`, graph mirrored in `transactionProcessOfferPurchase.js`,
   with graph tests.
2. Server validation and pricing with unit tests covering: below 50% rejected, ≥ listing price
   rejected, seller counter ≤ buyer offer rejected, 4th buyer offer rejected, pay-after-offer uses
   the metadata amount even if the request body sends another.
3. UI for every state, both roles; `yarn test` and `yarn build` pass; prettier clean.
4. Scenarios pass on **staging** with Stripe test cards (screenshots as evidence):
   - offer → accept → pay → ship → received → reviews;
   - offer → counter → counter → accept → pay;
   - offer below 50% blocked in UI and by API;
   - two buyers with accepted offers: first pays, second sees "sold";
   - someone buys at listing price while an offer is accepted → offer buyer can't pay;
   - "Buy" flow unchanged end-to-end.
5. Timers checked on staging (temporarily shortened periods in a test version, then restored).
6. Self-review of the diff; blocking problems fixed.

## Environments

"Production" in this spec means **Live** — the environment behind www.elogade.com, client id
`34ce3207…` (GitHub Actions var + Hetzner VM env; it is **not** in `.env`). Staging is the client id
active in `.env` (`76bc4e…`). The commented-out `.env` id `960f1e…` is a **different** environment
(different hosted-asset versions than Live), role unconfirmed — never treat it as production and
never push there. Live was checked on 2026-10-05: same listing types as staging
(`newproducts`/`usedproducts` on `default-purchase/release-1`, `oneItem` stock), locale `lt`.

## Stop and ask before

- Pushing the process to **production (Live)** (Sharetribe CLI `process create` + `create-alias`,
  later `push` + `update-alias`). Order on Live: push the process **before** deploying code with the
  flag on — initiating on a missing alias fails.
- **Staging pushes are pre-approved** (user, 2026-10-05): `process create`, `push`, `create-alias`
  and `update-alias` for `offer-purchase` on the staging marketplace may run without asking. Only
  that process, only staging; no other CLI writes (`search set`, `stripe update-version`, other
  processes' aliases).
- CLI: `flex-cli` (installed with yarn at `~/.yarn/bin/flex-cli`, on PATH via `~/.zshrc`), logged
  in. Marketplace IDs: staging = `TODO`, Live = `checkme` — get them from the user if still TODO
  (the part after `/m/` in the Console URL); confirm each with `flex-cli process list -m <id>`
  (read-only). The Live marketplace ID must belong to the environment of client id `34ce3207…`, not
  `960f1e…`.
  - Checked 2026-10-05 (read-only `flex-cli events --resource`): a www.elogade.com listing is in
    `checkme`, so **`checkme` is Live**. `checkme-test` and `checkme-dev` are its idle Test/Dev
    environments (no events in 90 days). Staging (`76bc4e…`) is **not** among them: a staging
    listing created 2026-09-07 has no events there. The CLI's API key can write to `checkme` (Live)
    but gets "Access denied" for the `elogade*` IDs tried.
- (Resolved 2026-10-05: user confirmed staging uses Stripe **test** keys — test-card payments on
  staging are fine.)
- Any Console change (none needed).
- Deploying to Hetzner / Live.
- Any requirement turning out impossible on Sharetribe, or a decision above not holding up.

## Risks and rollback

- Rollback: turn the feature flag off and redeploy. Process versions can't be deleted but an unused
  process is inert. "Buy" never depends on the new process.
- Upstream template merges will touch the same TransactionPage/CheckoutPage files — keep new logic
  in new files and keep edits to shared files small.
