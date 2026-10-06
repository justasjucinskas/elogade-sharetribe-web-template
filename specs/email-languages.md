# Email languages (en / lt / pl per recipient)

Status: **built 2026-10-06, not yet on staging or Live** (branch
`claude/email-languages-spec-0a4368`). Progress and evidence: `specs/email-languages-checklist.md`.
Written 2026-10-06.

## As built — where it differs from the design below

- **`t` with a prefixed key, not `format-text`.** `format-text` prints `<salelink>…</salelink>`
  literally instead of a link. The lt/pl branches are `{{t "lt.<Key>" "<lt text>" args…}}`: that key
  is not in Console's `email-texts.json`, so `t` uses the repo text and renders links as usual.
  Bonus: adding `lt.<Key>` to Console later overrides the repo text (the "edit without rebuilding"
  path under Limits).
- **Recipient from `recipient.public-data.locale`, not a role per template.** Five templates go to
  both roles (review published/unpublished, offer closed/expired, accepted offer expired), so the
  role in `process.edn` can't pick one locale. Sharetribe's email context has `recipient` with
  `public-data`.
- **Output in `ext/generated/` (git-ignored), not `build/`.** `yarn build` empties `build/`.
- **English source for the translations is what Live sends** (Console `email-texts.json` on
  `checkme`, 521 texts), not the template defaults: 38 keys differ (operator edits such as the
  electronics tips). Offer keys are not in Console, so their template defaults are the source.
- **Open questions, answered:** `set-locale` works inside a branch; `{{else eq …}}` chains render;
  in-flight transactions stay on their process version (Sharetribe docs), so they keep English
  emails until they finish; built-in emails (verify email, password reset) also get
  `recipient.public-data` but are Console-only templates — out of scope; `getExtendedDataMaybe`
  returns `{}` when the form has no extra values, so the locale is added after it
  (`addLocaleToExtendedData`), with user-field values winning.

## Goal

Every transactional email goes out in the language of the person who receives it — Lithuanian,
Polish or English — instead of English for everyone.

Today every template starts with `{{set-translations (asset "content/email-texts.json")}}` and calls
`{{t "Key" "English default"}}`. That asset is one file in Console, one language at a time, and none
of the 521 hosted texts on Live is Lithuanian, so everything is English although the marketplace
locale is `lt`. Sharetribe has no per-recipient language setting.

## Decisions taken (user, 2026-10-06)

| Question                         | Decision                                                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Where do translations live?      | **In the repo**, as JSON, like the legal pages and the landing page. Not in Console's Email texts editor.                    |
| Language for users with none set | **Lithuanian (`lt`)**.                                                                                                       |
| Later: edit without rebuilding   | Possible future step, not part of this build. Keep the JSON the single source of truth so moving it is cheap (see "Limits"). |

## What the spike proved (2026-10-06, `flex-cli notifications preview -m checkme-test`, read-only)

- A template can read the recipient's stored language: `customer.public-data.locale` /
  `provider.public-data.locale`, and branch on it with `{{#eq … "lt"}}…{{else}}…{{/eq}}`. Worked.
- `{{t (concat "Purchase" "NewOrder.Title") "default"}}` (a dynamic key) and
  `(asset (concat "content/email-" "texts.json"))` (a dynamic asset path) both work, **but are not
  used here**: there is no per-language asset (the CLI has no assets command) and the texts are not
  going to Console.
- `set-translations` pointing at a missing asset does not error; keys fall back to the default text.
- Console → Content → Email texts is a raw JSON editor (single `email-texts.json`). Not used.

## Design

### 1. Know each user's language

- Store `locale` (`en` | `lt` | `pl`) in the user's **publicData**. Public data is readable in
  templates (`transaction.customer.public-data`, `transaction.provider.public-data`) and is harmless
  here; it is also visible through the API to other users.
- **Signup**: add `publicData: { locale }` from `state.locale.current` in `getHandleSubmitSignup`
  and in `getHandleSubmitConfirm` (the social-login confirm step) in
  `src/containers/AuthenticationPage/AuthenticationPage.helpers.js`. Check how
  `getExtendedDataMaybe` merges into `publicData` so user-field values are not overwritten.
- **Existing users**: when a logged-in user's `publicData.locale` is missing, write it once from the
  current URL locale after `fetchCurrentUser` (`updateProfile`, a small new thunk in
  `src/ducks/user.duck.js`). Users who never visit again stay on the Lithuanian fallback.
- **Switching language**: `LanguageSwitcher` already reloads the page; when the user is logged in,
  update `publicData.locale` first and then reload, so emails follow the language they chose on
  purpose. Merely opening an `/en/…` link does **not** change it.
- Validation: only supported codes from `SUPPORTED_LOCALES` (`src/config/configLocale.js`); anything
  else is ignored.

### 2. Translations in the repo

- `ext/email-texts/{lt,pl}.json` — flat `"Key": "text"` files, keys identical to the existing `t`
  keys (`PurchaseNewOrder.Title`, `OfferPurchaseNewOffer.Content`, …). Values use the same ICU
  syntax as today (`{customerDisplayName}`, `{amount,number,::.00}`, plurals).
- English is **not** a file: it stays `{{t "Key" "English default"}}`, i.e. whatever Console holds
  today, so English emails are byte-for-byte what they are now.
- Scope: the two processes in use, `default-purchase` and `offer-purchase`. The 25 purchase-phase
  templates in `offer-purchase` are identical copies of `default-purchase` (checked), so about 35
  distinct emails, **213 distinct keys / 281 `t` uses**, each with a subject and an HTML part.
  `default-booking`, `default-negotiation`, `default-inquiry`, `default-download` are not used by
  this marketplace and are left alone.
- First drafts of the `lt` and `pl` text are written by Claude and **reviewed by the user** (native
  Lithuanian) before anything reaches Live. Polish gets a native review too if someone is available;
  mark the file as unreviewed until then.

### 3. A generator writes the templates that get pushed

- `scripts/build-email-templates.js` (plain Node, no new dependency):
  - input: the existing templates in `ext/transaction-processes/<process>/templates/` (stay the
    hand-edited English source, with `{{t}}`) + `ext/email-texts/{lt,pl}.json`;
  - for every `{{t "Key" "default" args…}}` it emits
    `{{#eq loc "lt"}}{{format-text "<lt text>" args…}}{{else}}{{#eq loc "pl"}}{{format-text "<pl text>" args…}}{{else}}{{t "Key" "default" args…}}{{/eq}}{{/eq}}`
    (`format-text` is already used by these templates for money; named args pass through);
  - `loc` is the **recipient's** locale: the generator reads each notification's recipient
    (`:to :actor.role/customer|provider`) from the process's `process.edn`, so a template sent to
    the provider reads `provider.public-data.locale`; missing or unsupported → `lt`;
  - also makes `<html lang="…">` and `{{set-locale …}}` follow the recipient (`lt_LT`, `pl_PL`,
    `en_US`) so dates and decimal commas match. Whether `set-locale` works inside a branch is **to
    verify first** (see Open);
  - output: `build/transaction-processes/<process>/` (git-ignored) with `process.edn` copied
    unchanged. That folder is what `flex-cli process push --path` uploads.
- `scripts/check-email-texts.js` (run in `yarn test` or as a Jest test): fails if any `t` key used
  by a template is missing from `lt.json` or `pl.json`, if a translation has unknown keys, or if its
  `{placeholders}` differ from the English default's. This stops drift when the English template
  changes.
- Rendering check: for each language, render every template with `flex-cli notifications preview`
  and a context file
  (`{"transaction":{"customer":{…,"public-data":{"locale":"lt"}},"provider":{…}}}`), failing on a
  render error and on a leftover `{`-placeholder. Slow, so a script, not part of `yarn test`.

### Limits (be honest about "edit without rebuilding")

A Sharetribe template cannot read a file from the server or repo; the only dictionary it can read is
a Console asset. So after this build, changing an email translation means: edit the JSON → run the
generator → `flex-cli process push` + `update-alias` (staging, then Live). The web app is not
rebuilt, but it is not instant either. A truly runtime-editable source needs one of: Console's
`email-texts.json` (prefixed keys, `t` with `concat`; the spike shows it works), or sending the
emails from our own server. Both reuse the same JSON, so this design does not block them.

## Code touchpoints

- `src/containers/AuthenticationPage/AuthenticationPage.helpers.js:83` (`getHandleSubmitSignup`) and
  the confirm handler below it — add `publicData.locale`.
- `src/ducks/user.duck.js` (`fetchCurrentUser`, line ~536) — one-time backfill;
  `src/ducks/locale.duck.js` holds the current locale;
  `src/components/LanguageSwitcher/LanguageSwitcher.js` — persist on switch.
- `server/api/auth/loginWithIdp.js` — social signup goes through the confirm form (cookie
  `st-authinfo` → `getHandleSubmitConfirm`), so no server change is expected; verify.
- `ext/transaction-processes/{default-purchase,offer-purchase}/templates/*` stay as they are; the
  generator reads them.
- New: `ext/email-texts/`, `scripts/build-email-templates.js`, `scripts/check-email-texts.js`,
  tests, `.gitignore` entry for `build/`, a short section in `deploy/README.md` and `CLAUDE.md`.

## Open — verify during build, decision already made for each outcome

- `set-locale` inside an `{{#eq}}` branch (it may only apply at the top of the template). If it does
  not work: set it once at the top from a single `{{#eq}}` chain that picks the string, or keep
  `en_US` and put numbers/dates through `format-text` with an explicit locale. Prices already come
  out with `{{format-text "{amount,number,::.00} {currency}"}}`.
- Whether `{{else eq …}}` chains render; if not, nested `{{#eq}}` as written above.
- Does a transaction already in flight stay on its old process version after `update-alias`
  (expected: yes)? If yes, in-flight transactions keep English emails until they finish; say so in
  the release note rather than migrating them.
- Non-transaction emails (verify email, password reset, welcome): do they see the user's
  `public-data`? If not they stay English/one language; out of scope for this build, list the
  result.
- Whether `getExtendedDataMaybe` can carry `publicData.locale` without clobbering user-field values.

## Done means

1. Signup (email and Google/Facebook) stores `publicData.locale`; unit tests for both handlers, the
   backfill thunk and the switcher.
2. `ext/email-texts/{lt,pl}.json` cover all 213 keys; `check-email-texts` passes in `yarn test`.
3. Generator output for both processes; the notification preview of every template renders in `en`,
   `lt` and `pl` without error, with evidence (list of 35 × 3 results).
4. `yarn test`, `yarn build` and prettier pass.
5. On **staging** (`checkme-test`), with three test users (en, lt, pl — plus-addressed Gmail
   accounts so the mail can be read), real emails received and shown (screenshots or text):
   - a purchase: seller and buyer each get their own language;
   - an offer → counter → accept: each side in their own language;
   - a user with no stored language gets Lithuanian;
   - an English user's emails are unchanged from today (diff against a pre-change render).
6. Self-review of the diff; blocking problems fixed.

## Stop and ask before

- **Any `flex-cli` write on staging for `default-purchase`.** The earlier staging pre-approval
  covers `offer-purchase` only. Pushing `offer-purchase` to staging for this work is covered;
  anything on `default-purchase` needs a fresh yes.
- **Anything on Live (`checkme`)**: `process push`, `update-alias`. The CLI key can write Live.
  Order: push the process version and update the alias on Live **after** the signup code that stores
  `locale` is deployed, so new users are not missed.
- Any Console change (none needed).
- Deploying to Hetzner / Live.
- Adding a dependency (none expected).
- Any requirement turning out impossible on Sharetribe, or a decision above not holding up.

## Risks and rollback

- Rollback: `flex-cli process update-alias` back to the previous version. Process versions are
  immutable; the old one stays. The app change (storing `locale`) is harmless on its own.
- A bad translation is user-facing text in someone's inbox: the native review before Live is the
  control, and the placeholder check catches broken `{…}` arguments.
- The pushed templates are generated, not the repo files: always push from `build/`, and never
  hand-edit it. The `check` script and the staging scenarios are the guard.
- Upstream template merges touch `ext/transaction-processes/` rarely; the generator reads the files
  as they are, so a merge needs only new `lt`/`pl` keys (the check names them).
