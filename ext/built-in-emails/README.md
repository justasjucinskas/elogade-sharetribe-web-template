# Built-in emails (Console-only templates)

Password reset, email verification, welcome, new message and the other built-in emails can only be
edited in Sharetribe Console (Build → Advanced → Email notifications); there is no CLI for them.

- `templates/<name>/<name>-{subject.txt,html.html}` — exact copies of the English Console source
  (checked against the Console editor's content before use).
- `node scripts/build-email-templates.js built-in-emails` → `ext/generated/built-in-emails/<name>/`:
  paste those two files into the Console editor and save. Same en/lt/pl switch on
  `recipient.public-data.locale` as the transaction emails; texts in `ext/email-texts/{lt,pl}.json`.
- `pending-texts/{lt,pl}.json` — translations for built-in emails whose Console source is not copied
  here yet. Move a template's keys into `ext/email-texts/` when adding its source (the check rejects
  keys no template uses).

| Template       | `checkme-test`              | `checkme` (Live)   |
| -------------- | --------------------------- | ------------------ |
| reset-password | generated, saved 2026-10-07 | English (original) |
