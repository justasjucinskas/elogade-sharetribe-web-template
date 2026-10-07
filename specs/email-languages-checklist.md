# Email languages — build checklist

Working file for building `specs/email-languages.md`. Tick an item only when its check passed.

## Spike results (2026-10-06, headless `flex-cli notifications preview -m checkme-test`)

- [x] `set-locale` works inside an `{{#eq}}` branch (lt_LT → `1 234,50`), in the HTML and the
      subject
- [x] `{{else eq …}}` chains render
- [x] `@root.…` and plain parent-scope lookups both work inside `{{#with}}` / `{{#each}}`
- [x] `format-text` does **not** apply `html-tag` arguments: `<salelink>…</salelink>` comes out
      literally. `t` with a key that is not in the hosted asset falls back to its default text
      **and** renders the link. → the generator emits `{{t "lt.<Key>" "<lt text>" …}}` instead of
      `format-text` (prefixed keys are also the future "edit in Console" path from the spec)
- [x] A `--context` file replaces the whole sample context (no merge) → the render script ships a
      full context of its own
- [x] Several templates go to both roles (review published/unpublished, offer closed/expired,
      accepted-offer expired). The docs list `recipient.public-data` in the transaction context, so
      the generator reads `recipient.public-data.locale` rather than a fixed role per template
- [x] Built-in emails (verify email, password reset) also get `recipient.public-data` (docs). They
      are Console-only templates: out of scope, listed as a follow-up
- [x] In-flight transactions stay on the process version they started with (Sharetribe docs), so
      they keep English emails until they finish
- [x] Deployed processes match the repo: `process pull` of `default-purchase` and `offer-purchase`
      (`release-1`) from `checkme-test` and `checkme` differ from `ext/` only by CRLF line endings
      and EDN comments/whitespace, so pushing the generated folder reverts nothing

## App: store the locale

- [x] Signup (email) stores `publicData.locale`; test (`AuthenticationPage.helpers.test.js`)
- [x] Signup (IdP confirm) stores `publicData.locale`; test
- [x] `getExtendedDataMaybe` returns `{}` without extra form values → `addLocaleToExtendedData` adds
      the locale after it; user-field values win; tests for both
- [x] Backfill after `fetchCurrentUser`: client only, only when `publicData` was fetched and has no
      locale, not for an operator logged in as the user; tests (`user.duck.test.js`)
- [x] LanguageSwitcher stores the choice before reloading (max 3 s wait, failures ignored); tests
      (`LanguageSwitcher.test.js`)
- [x] `server/api/auth/createUserWithIdp.js` forwards the body (`...rest`) to `createWithIdp`;
      `loginWithIdp.js` only logs existing users in → no server change

## Emails

- [x] `scripts/build-email-templates.js` → `ext/generated/transaction-processes/<process>/` (moved
      from `build/`: `yarn build` empties `build/`)
- [x] `ext/email-texts/lt.json` (213 keys) — **awaiting native review by the user**
- [x] `ext/email-texts/pl.json` (213 keys) — **unreviewed**
- [x] Key/placeholder/tag/full-stop check runs in `yarn test` (`src/util/emailTemplates.test.js`); a
      deliberately removed key makes `node scripts/check-email-texts.js` exit 1
- [x] `scripts/render-email-previews.js` on `checkme-test` (2026-10-06): 35 templates, every
      recipient role they go to (process.edn), shipping + pickup = 134 combinations × en/lt/pl/none
      = **536 renders, 0 failing** (no render error, no leftover `{placeholder}` or `<tag>`, right
      `<html lang>`, "none" identical to lt). Report: `ext/generated/email-previews/report.md`
- [x] English output identical to the current templates: all 134 combinations (same script renders
      `ext/` and compares HTML + subject)
- [x] The check catches real problems: run against Live (`-m checkme default-purchase`, read-only) →
      4 failing, all English, `leftover placeholders {marketplaceName}` (the Live bug below); lt/pl
      ok

## Checks

- [x] `yarn run test-server`: 264 passed
- [x] `yarn test` (client): 93 suites, 1313 passed. First run had 2 ProfilePage failures (they count
      dispatched actions; the backfill added one) → filtered like `fetchCurrentUser`
- [x] `yarn build` (exit 0; only the existing CSS-order warnings)
- [x] `yarn run format-ci` clean
- [x] Docs: `deploy/README.md`, spec "As built" section
- [ ] `CLAUDE.md` — git-ignored, lives only in the main checkout (a hook blocks editing it from the
      worktree). Apply this section at merge time, before "Things that frequently trip people up":

  > ## Transaction emails are per-recipient language (en / lt / pl)
  >
  > Spec: `specs/email-languages.md`. Each user's language is `publicData.locale`, written at signup
  > (`addLocaleToExtendedData`), backfilled once on the client after `fetchCurrentUser`, and updated
  > by `LanguageSwitcher` (`updateCurrentUserLocale`) before its reload. No locale → Lithuanian.
  >
  > - English stays in `ext/transaction-processes/<process>/templates/`; Lithuanian/Polish are
  >   `ext/email-texts/{lt,pl}.json`, same keys. `src/util/emailTemplates.test.js` fails on a
  >   missing/unknown key, changed `{placeholders}`/`<tags>`, or a doubled full stop.
  > - `node scripts/build-email-templates.js` → `ext/generated/transaction-processes/<process>/`
  >   (git-ignored, not `build/`). **Push that folder, never `ext/transaction-processes/`.**
  > - `node scripts/render-email-previews.js [-m checkme-test]` renders every template × en/lt/pl
  >   (read-only preview API) and checks English is unchanged.

- [x] Self-review of the diff (fresh-context review 2026-10-06): no blockers

## Staging (needs the user)

- [x] Push `offer-purchase` to `checkme-test` + alias: v3, `release-1` → 3 (2026-10-06 17:28;
      rollback: alias → 1). Pulled back: 70 template files identical to the generated ones
- [x] Push `default-purchase` to `checkme-test` (user approved 2026-10-06): v2, `release-1` → 2
      (rollback: alias → 1). Pulled back: 50 template files identical
- [x] Staging app redeployed from this branch (user approved 2026-10-06): container healthy,
      `staging.elogade.com/lt` 200, bundle contains `user/updateCurrentUserLocale`; Live untouched
- [ ] Scenarios with en/lt/pl test users (purchase, offer → counter → accept, no-locale user,
      English unchanged)
- [ ] Real email confirms `recipient.public-data.locale` is filled when Sharetribe sends (the
      preview only proves it with our own context)

## Built-in emails (Console-only)

- [x] Reset password: Console source copied (user paste, matched the editor's checksum), en/lt/pl
      generated, 4 renders ok (English identical), saved on `checkme-test` 2026-10-07; Console
      preview shows Lithuanian for its sample user. Live untouched
- [ ] Real reset email received in the account's language (user test)
- [x] 7 more saved on `checkme-test` 2026-10-07: verify email address, user joined, user approved,
      password changed, email changed, listing approved, new message (user pasted the Console
      source; every file matched the editor's checksum; 36 renders ok incl. new message to both
      roles; after saving, each Console editor reloaded and matched the generated file)
- [ ] Verify changed email address, user permissions changed: Console source not copied yet
- [ ] Live (`checkme`): none of the built-in emails changed; needs the text review first

## Found along the way

- **Live English bug: `{marketplaceName}` not passed** (confirmed by rendering against `checkme`:
  buyers read „…reach out to {marketplaceName} support.“). Console's English for
  `PurchaseOrderMarkedAsDelivered.ContentShipped`/`ContentDelivered` and `PurchaseOrderReceipt.Body`
  mentions `{marketplaceName}`, but those `t` calls don't pass it. lt/pl say „our support team“
  instead. **Fixed 2026-10-06 at the user's request:** the three calls now pass
  `marketplaceName=marketplace.name` (both processes). English output of the receipt and
  marked-as-delivered emails changes from „{marketplaceName} support“ to „Elogade support“ once the
  processes are pushed; until then Live keeps the bug.
- **Live English bug: doubled full stop.** The template adds "." after
  `PurchaseMarkOrderReceivedReminder.ContentParagraph2`, `PurchaseOrderDisputed.ContentParagraph1`/
  `2`, `PurchaseOrderOperatorMarkedAsDelivered.ContentDelivered`,
  `PurchaseShippingTimeExpiredProvider.DeliveryContent`, and Console's English ends with "." too.
  Fix: drop the final "." in Console. lt/pl are guarded by the check.
- **Live English: `{date,date,::YYYYMMMd}`** in the reminder's ContentParagraph2 is ICU's week-based
  year (wrong year in the last days of December). lt/pl use `yyyy`.
- English subjects of `PurchaseOrder(Auto)CanceledFromDisputedProvider` say "which you disputed" to
  the seller; lt/pl say "a disputed order".
- Email links (`marketplace.url/sale/…`) have no locale prefix; the server's locale middleware picks
  the language from the cookie / `Accept-Language`. Could add `/<locale>` later.
- `checkme-test` has an unaliased `offer-purchase` v2 (the 5-minute timer test); a push creates v3.
