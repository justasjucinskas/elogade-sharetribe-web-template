/**
 * Renders every generated email template through Sharetribe's preview API (read-only) for each
 * recipient language, and fails on render errors and leftover placeholders. Also renders the
 * current English templates from ext/ and checks that the generated English output is identical.
 * See specs/email-languages.md.
 *
 *   node scripts/build-email-templates.js
 *   node scripts/render-email-previews.js [-m checkme-test] [offer-purchase|default-purchase]
 *
 * Needs a logged-in `flex-cli` on PATH. Uses that marketplace's hosted email texts and branding.
 * Output: ext/generated/email-previews/<process>/*.html and ext/generated/email-previews/report.md
 *
 * The CLI's preview command starts a local server on :3535 and opens a browser; this script
 * stops the browser from opening and fetches the preview from that server, swapping the template
 * files and the context between requests.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');
const {
  BUILD_DIR,
  BUILT_IN,
  BUILT_IN_DIR,
  GENERATED_DIR,
  PROCESSES_DIR,
  SOURCES,
} = require('./email-templates-lib');

const PREVIEW_PORT = 3535;
const LOCALES = ['en', 'lt', 'pl'];
const DELIVERY_METHODS = ['shipping', 'pickup'];
const OUT_DIR = path.join(GENERATED_DIR, 'email-previews');

const args = process.argv.slice(2);
const marketplaceIndex = args.indexOf('-m');
const marketplace = marketplaceIndex >= 0 ? args[marketplaceIndex + 1] : 'checkme-test';
const processes = args.filter(
  (a, i) => marketplaceIndex < 0 || (i !== marketplaceIndex && i !== marketplaceIndex + 1)
);
const selectedProcesses = (processes.length > 0 ? processes : SOURCES).filter(
  name => name !== BUILT_IN || fs.existsSync(path.join(BUILT_IN_DIR, 'templates'))
);

// ---------- context ----------

const money = (amount, currency = 'EUR') => ({ amount, currency });

const user = (id, displayName, locale) => ({
  id,
  'first-name': displayName.split(' ')[0],
  'last-name': displayName.split(' ')[1] || '',
  'display-name': displayName,
  'public-data': locale ? { locale } : {},
  'private-data': {},
  'protected-data': {},
  metadata: {},
});

/**
 * A complete transaction email context (a --context file replaces the sample one entirely).
 *
 * @param {Object} params
 * @param {'customer'|'provider'} params.role recipient's role
 * @param {string|null} params.locale recipient's stored locale (null = none stored)
 * @param {'shipping'|'pickup'} params.deliveryMethod
 */
const buildContext = ({ role, locale, deliveryMethod }) => {
  const otherLocale = 'en';
  const customer = user(
    '5f1f2b4e-0000-4000-8000-000000000001',
    'Jonas B',
    role === 'customer' ? locale : otherLocale
  );
  const provider = user(
    '5f1f2b4e-0000-4000-8000-000000000002',
    'Agnė K',
    role === 'provider' ? locale : otherLocale
  );
  const recipient = role === 'customer' ? customer : provider;
  const otherParty = role === 'customer' ? provider : customer;
  const both = ['customer', 'provider'];
  const lineItems = [
    {
      code: 'line-item/item',
      'include-for': both,
      quantity: 1,
      'unit-price': money(450),
      'line-total': money(450),
      reversal: false,
    },
    deliveryMethod === 'shipping'
      ? {
          code: 'line-item/shipping-fee',
          'include-for': both,
          quantity: 1,
          'unit-price': money(4.99),
          'line-total': money(4.99),
          reversal: false,
        }
      : {
          code: 'line-item/pickup-fee',
          'include-for': both,
          quantity: 1,
          'unit-price': money(0),
          'line-total': money(0),
          reversal: false,
        },
    {
      code: 'line-item/provider-commission',
      'include-for': ['provider'],
      quantity: 1,
      'unit-price': money(-22.5),
      'line-total': money(-22.5),
      reversal: false,
    },
  ];
  return {
    recipient,
    'recipient-role': role,
    'other-party': otherParty,
    marketplace: { name: 'Elogade', url: 'https://www.elogade.com' },
    transaction: {
      id: '68e3c0a1-1111-4222-8333-444455556666',
      'process-name': 'offer-purchase',
      'process-version': 1,
      'last-transition': 'transition/request-payment',
      'delayed-transition': { 'run-at': '2026-10-08T15:30:00.000Z' },
      'protected-data': { deliveryMethod },
      metadata: {},
      'payin-total': money(454.99),
      'payout-total': money(432.49),
      'tx-line-items': lineItems,
      customer,
      provider,
      listing: {
        id: '68e3c0a1-aaaa-4bbb-8ccc-dddddddddddd',
        title: 'iPhone 13 Pro 128GB',
        'availability-plan': { timezone: 'Europe/Vilnius' },
        'public-data': {},
        metadata: {},
      },
      reviews: [
        {
          rating: 5,
          content: 'Puikus pardavėjas!',
          type: 'of-provider',
          author: otherParty,
          subject: recipient,
        },
      ],
    },
  };
};

// Built-in emails (password reset, verify email, …) get the keys of every built-in context.
const buildBuiltInContext = ({ role = 'customer', locale }) => {
  const context = buildContext({ role, locale, deliveryMethod: 'shipping' });
  return {
    ...context,
    'password-reset': { token: 'b1c2d3e4f5', 'email-address': 'jonas@example.com' },
    'email-verification': { token: 'a1b2c3d4e5' },
    listing: context.transaction.listing,
    message: {
      id: '68e3c0a1-9999-4aaa-8bbb-cccccccccccc',
      content: 'Labas! Ar dar parduodate?',
      sender: context['other-party'],
      'public-file-attachments': [
        { id: '68e3c0a1-7777-4aaa-8bbb-cccccccccccc', name: 'photo.jpg' },
      ],
    },
    sender: context['other-party'],
    // Console's sample: one key per changed permission, "allow" or "deny".
    'changed-permissions': { read: 'allow', postListings: 'deny', initiateTransactions: 'allow' },
  };
};

// Every role a template is sent to, from process.edn.
const recipientRoles = processName => {
  const edn = fs.readFileSync(path.join(PROCESSES_DIR, processName, 'process.edn'), 'utf8');
  const roles = {};
  const re = /:to\s+:actor\.role\/(customer|provider),\s*:template\s+:([a-z0-9-]+)/g;
  let match;
  while ((match = re.exec(edn))) {
    roles[match[2]] = [...new Set([...(roles[match[2]] || []), match[1]])].sort();
  }
  return roles;
};

// ---------- preview server ----------

// FLEX_CLI=/path/to/flex-cli overrides the lookup. Otherwise ask the user's interactive shell,
// where PATH entries like ~/.yarn/bin are usually set.
const flexCliScript = () => {
  const shell = process.env.SHELL || '/bin/sh';
  const bin =
    process.env.FLEX_CLI ||
    execSync(`${shell} -lic 'command -v flex-cli' 2>/dev/null`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .pop();
  return fs.realpathSync(bin);
};

const fetchPreview = () =>
  new Promise((resolve, reject) => {
    http
      .get({ host: 'localhost', port: PREVIEW_PORT, path: '/' }, res => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => (body += chunk));
        res.on('end', () => resolve(body));
      })
      .on('error', reject);
  });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const startServer = async workDir => {
  const noOpen = path.join(workDir, 'no-open.js');
  fs.writeFileSync(
    noOpen,
    `const Module = require('module');
const load = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'open') return async () => ({});
  return load.call(this, request, ...rest);
};
`
  );
  let log = '';
  const child = spawn(
    process.execPath,
    [
      '-r',
      noOpen,
      flexCliScript(),
      'notifications',
      'preview',
      '-m',
      marketplace,
      '--template',
      path.join(workDir, 'preview-template'),
      '--context',
      path.join(workDir, 'context.json'),
    ],
    { cwd: workDir }
  );
  child.stdout.on('data', d => (log += d));
  child.stderr.on('data', d => (log += d));
  for (let i = 0; i < 50 && !log.includes('Opening preview'); i++) {
    await sleep(200);
  }
  if (!log.includes('Opening preview')) {
    child.kill();
    throw new Error(`Preview server did not start:\n${log}`);
  }
  return { child, getLog: () => log };
};

// ---------- checks ----------

const problemsIn = ({ html, subject }, expectedLang) => {
  const problems = [];
  if (/Invalid template|Error in API call/.test(html.slice(0, 500))) {
    problems.push('render error');
    return problems;
  }
  if (!subject) problems.push('empty subject');
  const text = `${subject}\n${html.replace(/<style[\s\S]*?<\/style>/g, '')}`;
  const leftovers = text.match(/\{[A-Za-z][\w-]*(\s*,[^}]*)?\}/g);
  if (leftovers) problems.push(`leftover placeholders ${[...new Set(leftovers)].join(' ')}`);
  const tags = text.match(/<(salelink|orderlink|link|reviewlink)>/g);
  if (tags) problems.push(`unrendered tags ${[...new Set(tags)].join(' ')}`);
  const lang = (html.match(/<html lang="([^"]*)"/) || [])[1];
  if (expectedLang && lang !== expectedLang) problems.push(`lang="${lang}"`);
  return problems;
};

// ---------- main ----------

const writeTemplate = (workDir, sourceDir, template) => {
  const target = path.join(workDir, 'preview-template');
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target);
  ['html.html', 'subject.txt'].forEach(suffix => {
    fs.copyFileSync(
      path.join(sourceDir, template, `${template}-${suffix}`),
      path.join(target, `preview-template-${suffix}`)
    );
  });
};

// The subject is only printed by the CLI ("Subject: …"), so read it from the server output.
const render = async (server, workDir, sourceDir, template, context) => {
  writeTemplate(workDir, sourceDir, template);
  fs.writeFileSync(path.join(workDir, 'context.json'), JSON.stringify(context));
  const offset = server.getLog().length;
  const html = await fetchPreview();
  let output = '';
  for (let i = 0; i < 50 && !/Subject: .*\n|Error|error/.test(output); i++) {
    await sleep(20);
    output = server.getLog().slice(offset);
  }
  const subject = (output.match(/Subject: (.*)\n/) || [])[1]?.trim() || '';
  return { html, subject };
};

const main = async () => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'email-previews-'));
  fs.mkdirSync(path.join(workDir, 'preview-template'));
  fs.writeFileSync(path.join(workDir, 'context.json'), '{}');
  ['html.html', 'subject.txt'].forEach(s =>
    fs.writeFileSync(path.join(workDir, 'preview-template', `preview-template-${s}`), '')
  );
  const server = await startServer(workDir);
  const rows = [];
  let failures = 0;

  try {
    for (const processName of selectedProcesses) {
      const isBuiltIn = processName === BUILT_IN;
      const builtDir = isBuiltIn
        ? path.join(GENERATED_DIR, BUILT_IN)
        : path.join(BUILD_DIR, processName, 'templates');
      const originalDir = isBuiltIn
        ? path.join(BUILT_IN_DIR, 'templates')
        : path.join(PROCESSES_DIR, processName, 'templates');
      const contextFor = isBuiltIn ? buildBuiltInContext : buildContext;
      if (!fs.existsSync(builtDir)) {
        throw new Error(`${builtDir} missing: run node scripts/build-email-templates.js first`);
      }
      const outDir = path.join(OUT_DIR, processName);
      fs.mkdirSync(outDir, { recursive: true });
      const templates = fs.readdirSync(builtDir).sort();
      const roles = isBuiltIn
        ? Object.fromEntries(
            templates.map(t => [t, t === 'new-message' ? ['customer', 'provider'] : ['customer']])
          )
        : recipientRoles(processName);
      const deliveryMethods = isBuiltIn ? ['shipping'] : DELIVERY_METHODS;

      for (const template of templates) {
        for (const role of roles[template] || []) {
          for (const deliveryMethod of deliveryMethods) {
            const results = {};
            // `null` = a user with no stored locale: must get Lithuanian.
            for (const locale of [...LOCALES, null]) {
              const context = contextFor({ role, locale, deliveryMethod });
              const rendered = await render(server, workDir, builtDir, template, context);
              const shown = locale || 'none';
              const problems = problemsIn(rendered, locale || 'lt');
              if (
                locale === null &&
                (rendered.html !== results.lt?.html || rendered.subject !== results.lt?.subject)
              ) {
                problems.push('differs from the lt render');
              }
              results[shown] = { ...rendered, problems };
              fs.writeFileSync(
                path.join(outDir, `${template}.${role}.${deliveryMethod}.${shown}.html`),
                `<!-- Subject: ${rendered.subject} -->\n${rendered.html}`
              );
            }
            // English must be what the current templates send.
            const original = await render(
              server,
              workDir,
              originalDir,
              template,
              contextFor({ role, locale: 'en', deliveryMethod })
            );
            const normalize = h => h.replace(/<html lang="[^"]*">/, '<html>');
            if (
              normalize(original.html) !== normalize(results.en.html) ||
              original.subject !== results.en.subject
            ) {
              results.en.problems.push('English differs from the current template');
            }
            const cells = ['en', 'lt', 'pl', 'none'].map(l => {
              const { problems } = results[l];
              if (problems.length) failures++;
              return problems.length ? `FAIL: ${problems.join('; ')}` : 'ok';
            });
            const subjects = ['en', 'lt', 'pl'].map(l => results[l].subject);
            rows.push({ processName, template, role, deliveryMethod, cells, subjects });
            console.log(
              `${processName} ${template} → ${role} (${deliveryMethod}): ${cells.join(' | ')}`
            );
          }
        }
      }
    }
  } finally {
    server.child.kill();
  }

  const report = [
    `# Email preview renders (${marketplace}, ${new Date().toISOString()})`,
    '',
    'Columns: recipient locale en / lt / pl / none stored (must equal lt). "en ok" includes',
    '"identical to the current English template".',
    '',
    '| Process | Template | To | Delivery | en | lt | pl | none | lt subject | pl subject |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      r =>
        `| ${r.processName} | ${r.template} | ${r.role} | ${r.deliveryMethod} | ${r.cells.join(
          ' | '
        )} | ${r.subjects[1].replace(/\|/g, '\\|')} | ${r.subjects[2].replace(/\|/g, '\\|')} |`
    ),
    '',
    `${rows.length} template × recipient × delivery combinations, ${rows.length *
      4} renders, ${failures} failing.`,
  ].join('\n');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'report.md'), `${report}\n`);
  console.log(
    `\n${rows.length * 4} renders, ${failures} failing. Report: ${path.relative(
      process.cwd(),
      OUT_DIR
    )}/report.md`
  );
  process.exit(failures > 0 ? 1 : 0);
};

main().catch(e => {
  console.error(e);
  process.exit(1);
});
