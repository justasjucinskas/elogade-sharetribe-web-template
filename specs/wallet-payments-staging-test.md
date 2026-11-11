# Apple Pay / Google Pay: staging test

Staging (`https://staging.elogade.com`) runs PR #11 with the wallet button on. It uses the
Sharetribe Test environment (`checkme-test`) and Stripe **test mode**: no real money moves, even
with a real card in your wallet.

Already done for you: the deploy, a buyer account, a card order through the changed code (passed),
and the no-wallet and CSP checks. See `wallet-payments-checklist.md`.

## Before you start (about 5 minutes, once)

1. **Register the staging domain in Stripe.** In the Stripe Dashboard of the platform account
   that `checkme-test` uses, switch to **Test mode** → Settings → Payments → **Payment method
   domains** → Add a new domain → `staging.elogade.com`. Without this the button never appears.
2. **Check Apple Pay and Google Pay are on** in the same test-mode settings (Settings → Payments →
   Payment methods). They usually are by default.
3. **Confirm the Stripe account's country.** The code assumes Lithuania (`LT`). If it's another
   country, tell me before testing; a wrong country can stop the button from showing.
4. **Have a wallet:**
   - **Google Pay:** in Chrome, signed in to your Google account, with a card saved at
     pay.google.com or in Chrome → Settings → Payment methods. Any real card works; Stripe test
     mode doesn't charge it.
   - **Apple Pay (optional):** Safari on an iPhone, or a Mac with Touch ID, with a card in Wallet.
5. **Log in on staging** with the test buyer. The email and password are in your main checkout's
   `.env` as `STAGING_TEST_BUYER_EMAIL` and `STAGING_TEST_BUYER_PASSWORD`. Or use your own
   `checkme-test` account.

## Tests

Each listing below has 1 in stock, so each purchase sells it out on `checkme-test`. Undo it
afterwards (see Clean up).

| # | What | Listing | What to check |
|---|------|---------|---------------|
| 1 | Button shows | any checkout below | Above the card form: a black **Google Pay** (or **Apple Pay**) button, full width, then "or pay with card". Total in the sheet matches the page. |
| 2 | Click guard | [Apple watch band](https://staging.elogade.com/en/l/apple-watch-band/69943ce9-9eb6-4339-a65e-0dc83c1cffe7) (shipping, €10) | Choose shipping, leave the address empty, click the button. The sheet must **not** open; "Fill in the delivery details above first." shows, and the address fields show errors. |
| 3 | Shipped order | same listing | Fill in the shipping address, click the button, pay in the sheet. You land on the order page with "Your payment was successful!" and the shipping address shown. |
| 4 | Pickup order | [BenQ LCD Monitor](https://staging.elogade.com/en/l/benq-lcd-monitor/698db359-fa3c-4d53-a8dd-c8852c000afb) (pickup, €20) | Click the button straight away (no address needed), pay. Order page shows payment successful. |
| 5 | Languages | any checkout, with `/lt/` and `/pl/` instead of `/en/` in the URL | "arba mokėkite kortele" / "lub zapłać kartą" under the button; the sheet is in that language. |
| 6 | Price offer (optional) | [SBS power bank](https://staging.elogade.com/en/l/sbs-power-bank/6995a09d-cd29-4268-b074-c8853d094ef1) (€15) | Needs the seller (Martynas) to accept your offer, so only if you or the client can log in as him. Make an offer → seller accepts → pay with the wallet. |
| 7 | Apple Pay (optional) | any remaining listing, in Safari | Same as 3 or 4. If you have no Apple device, Apple Pay gets its first test on Live. |

If something fails, note the test number, what you saw, and the time, and send me a screenshot. I
can read the staging logs.

## Clean up

In Sharetribe Console (Test environment `checkme-test`) → Transactions, open each test order
and **Cancel** it. That refunds the test payment and puts the item back in stock. This includes
my card-test order for **Logitech wireless mouse** (transaction `6af48224-c37f-446a-ab85-c892f282f9df`).

## After this

Tell me the results. If 1–4 pass, the next step (with your OK) is Live: register `elogade.com`
and `www.elogade.com` in Stripe **live** mode, merge PR #11, set the GitHub variable
`REACT_APP_WALLET_PAYMENTS_ENABLED=true` and rebuild, then one real purchase that the seller
declines, so the hold is released.
