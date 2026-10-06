/**
 * Checks ext/email-texts/{lt,pl}.json against the `t` keys used by the email templates of the
 * processes in use: every key translated, no unknown keys, same {placeholders} and <tags> as the
 * English default. Exits 1 on any problem.
 *
 *   node scripts/check-email-texts.js
 *
 * The same check runs in `yarn test` (src/util/emailTemplates.test.js).
 */
const { collectKeys, readTexts, checkTexts } = require('./email-templates-lib');

const keys = collectKeys();
const problems = checkTexts(keys, readTexts());

if (problems.length > 0) {
  problems.forEach(problem => console.error(problem));
  console.error(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`OK: ${keys.size} keys translated in lt and pl`);
