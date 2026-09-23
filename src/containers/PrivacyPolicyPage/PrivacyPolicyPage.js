import React from 'react';
import loadable from '@loadable/component';

import LegalPage, { LegalContent } from '../LegalPage/LegalPage';

// Privacy Policy text, one code-split chunk per locale. The copy is code-owned (not
// managed in Console): edit ./content/en.js and keep lt.js / pl.js in sync.
const documents = {
  en: loadable.lib(() => import(/* webpackChunkName: "PrivacyPolicyEn" */ './content/en')),
  lt: loadable.lib(() => import(/* webpackChunkName: "PrivacyPolicyLt" */ './content/lt')),
  pl: loadable.lib(() => import(/* webpackChunkName: "PrivacyPolicyPl" */ './content/pl')),
};

/**
 * Content-only Privacy Policy (no page chrome), used in the sign-up modal.
 *
 * @component
 * @returns {JSX.Element}
 */
export const PrivacyPolicyContent = () => (
  <LegalContent pageName="PrivacyPolicyPage" documents={documents} />
);

/**
 * The Privacy Policy page.
 *
 * @component
 * @returns {JSX.Element}
 */
const PrivacyPolicyPage = () => <LegalPage pageName="PrivacyPolicyPage" documents={documents} />;

export default PrivacyPolicyPage;
