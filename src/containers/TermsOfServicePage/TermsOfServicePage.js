import React from 'react';
import loadable from '@loadable/component';

import LegalPage, { LegalContent } from '../LegalPage/LegalPage';

// Terms of Service text, one code-split chunk per locale. The copy is code-owned (not
// managed in Console): edit ./content/en.js and keep lt.js / pl.js in sync.
const documents = {
  en: loadable.lib(() => import(/* webpackChunkName: "TermsOfServiceEn" */ './content/en')),
  lt: loadable.lib(() => import(/* webpackChunkName: "TermsOfServiceLt" */ './content/lt')),
  pl: loadable.lib(() => import(/* webpackChunkName: "TermsOfServicePl" */ './content/pl')),
};

/**
 * Content-only Terms of Service (no page chrome), used in the sign-up modal.
 *
 * @component
 * @returns {JSX.Element}
 */
export const TermsOfServiceContent = () => (
  <LegalContent pageName="TermsOfServicePage" documents={documents} />
);

/**
 * The Terms of Service page.
 *
 * @component
 * @returns {JSX.Element}
 */
const TermsOfServicePage = () => <LegalPage pageName="TermsOfServicePage" documents={documents} />;

export default TermsOfServicePage;
