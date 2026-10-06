/**
 * Builds the email templates that get pushed to Sharetribe, with every text in the recipient's
 * language (en / lt / pl). See specs/email-languages.md.
 *
 *   node scripts/build-email-templates.js            # all processes in use
 *   node scripts/build-email-templates.js offer-purchase
 *
 * Input:  ext/transaction-processes/<process>/ (English templates, hand-edited)
 *         ext/email-texts/{lt,pl}.json
 * Output: ext/generated/transaction-processes/<process>/ (git-ignored; never edit by hand)
 *
 * Push the output, not the ext/ folder:
 *   flex-cli process push --process <process> --path ext/generated/transaction-processes/<process> -m <marketplace>
 */
const fs = require('fs');
const path = require('path');
const {
  BUILD_DIR,
  PROCESSES,
  PROCESSES_DIR,
  checkTexts,
  collectKeys,
  readTemplates,
  readTexts,
  transformTemplate,
} = require('./email-templates-lib');

const buildProcess = (processName, texts) => {
  const sourceDir = path.join(PROCESSES_DIR, processName);
  const targetDir = path.join(BUILD_DIR, processName);
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(path.join(sourceDir, 'process.edn'), path.join(targetDir, 'process.edn'));

  const templates = readTemplates(sourceDir);
  templates.forEach(({ template, file, isHtml, source }) => {
    const output = transformTemplate(source, texts, { isHtml, name: `${template}/${file}` });
    fs.mkdirSync(path.join(targetDir, 'templates', template), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'templates', template, file), output);
  });
  const templateCount = new Set(templates.map(t => t.template)).size;
  console.log(
    `${processName}: ${templateCount} templates → ${path.relative(process.cwd(), targetDir)}`
  );
};

const requested = process.argv.slice(2);
const unknown = requested.filter(name => !PROCESSES.includes(name));
if (unknown.length > 0) {
  console.error(`Unknown process: ${unknown.join(', ')}. Known: ${PROCESSES.join(', ')}`);
  process.exit(1);
}

const texts = readTexts();
const problems = checkTexts(collectKeys(), texts);
if (problems.length > 0) {
  problems.forEach(problem => console.error(problem));
  console.error('\nFix ext/email-texts first (node scripts/check-email-texts.js).');
  process.exit(1);
}

(requested.length > 0 ? requested : PROCESSES).forEach(name => buildProcess(name, texts));
