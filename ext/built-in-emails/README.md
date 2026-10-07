# Built-in emails (Console-only templates)

Password reset, email verification, welcome, new message and the other built-in emails can only be
edited in Sharetribe Console (Build → Advanced → Email notifications); there is no CLI for them.

- `templates/<name>/<name>-{subject.txt,html.html}` — exact copies of the English Console source
  (checked against the Console editor's content before use).
- `node scripts/build-email-templates.js built-in-emails` → `ext/generated/built-in-emails/<name>/`:
  paste those two files into the Console editor and save. Same en/lt/pl switch on
  `recipient.public-data.locale` as the transaction emails; texts in `ext/email-texts/{lt,pl}.json`.

| Template                     | `checkme-test`              | `checkme` (Live)            |
| ---------------------------- | --------------------------- | --------------------------- |
| reset-password               | generated, saved 2026-10-07 | generated, saved 2026-10-07 |
| verify-email-address         | generated, saved 2026-10-07 | generated, saved 2026-10-07 |
| user-joined                  | generated, saved 2026-10-07 | generated, saved 2026-10-07 |
| user-approved                | generated, saved 2026-10-07 | generated, saved 2026-10-07 |
| password-changed             | generated, saved 2026-10-07 | generated, saved 2026-10-07 |
| email-changed                | generated, saved 2026-10-07 | generated, saved 2026-10-07 |
| listing-approved             | generated, saved 2026-10-07 | generated, saved 2026-10-07 |
| new-message                  | generated, saved 2026-10-07 | generated, saved 2026-10-07 |
| verify-changed-email-address | generated, saved 2026-10-07 | generated, saved 2026-10-07 |
| user-permissions-changed     | generated, saved 2026-10-07 | generated, saved 2026-10-07 |

Console addresses: `…/advanced/email-notifications/<name>` (the folder names here). Each save was
checked by reloading the Console editor and comparing its content with the generated file.
