// About page — English (source of truth).
//
// Translations live next to this file (lt.js, pl.js) and must keep the same
// highlight ids, in the same order. The page title and lead are UI strings
// (AboutPage.* in src/translations/*.json); everything below them lives here.
//
// `body` is Markdown, rendered through PageBuilder's sanitized markdown processor.

const body = `
Buying pre-owned technology online can often feel uncertain, especially on platforms where payments happen directly between strangers and there are limited protections if something goes wrong. ELOGADE was created to solve this problem by introducing a more structured and secure marketplace experience.

Our platform combines secure payment processing, buyer protection, and transparent transaction rules to help create an environment where users can trade electronics with greater confidence. Whether someone is upgrading their phone, selling a laptop they no longer use, or looking for a better deal on technology, ELOGADE makes the process simple and reliable.

Instead of acting as a traditional retailer, ELOGADE operates as an independent marketplace that connects buyers and sellers while providing the tools, payment infrastructure, and safeguards needed for secure transactions.

By focusing specifically on electronics, we aim to build a specialized community where trading tech is easier, safer, and more transparent for everyone.
`;

const highlights = [
  {
    id: 'payments',
    title: 'Secure payments',
    text: 'Payments are processed by Stripe and held until the order is complete.',
  },
  {
    id: 'protection',
    title: 'Buyer protection',
    text: 'Buyers get 48 hours after delivery to inspect the item and report a problem.',
  },
  {
    id: 'rules',
    title: 'Transparent rules',
    text: 'Clear listing standards and every fee shown before you pay.',
  },
];

export default { body, highlights };
