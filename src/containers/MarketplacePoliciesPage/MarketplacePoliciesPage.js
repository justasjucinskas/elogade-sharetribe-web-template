import React from 'react';
import loadable from '@loadable/component';

import LegalPage from '../LegalPage/LegalPage';

// Marketplace Policies text, one code-split chunk per locale. The copy is code-owned (not
// managed in Console): edit ./content/en.js and keep lt.js / pl.js in sync.
const documents = {
  en: loadable.lib(() => import(/* webpackChunkName: "MarketplacePoliciesEn" */ './content/en')),
  lt: loadable.lib(() => import(/* webpackChunkName: "MarketplacePoliciesLt" */ './content/lt')),
  pl: loadable.lib(() => import(/* webpackChunkName: "MarketplacePoliciesPl" */ './content/pl')),
};

/**
 * The Marketplace Policies page (buyer protection, seller rules, fees, refunds),
 * served at the former Console page URL /p/market-policies.
 *
 * @component
 * @returns {JSX.Element}
 */
const MarketplacePoliciesPage = () => (
  <LegalPage pageName="MarketplacePoliciesPage" documents={documents} />
);

export default MarketplacePoliciesPage;
