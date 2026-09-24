import React from 'react';

import { useConfiguration } from '../../context/configurationContext';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { DEFAULT_LOCALE } from '../../config/configLocale';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { prependLocale } from '../../util/locale';
import { pathByRouteName } from '../../util/routes';

import { NamedLink } from '../../components';

import ContentPageLayout from './ContentPageLayout';
import LegalDocument from './LegalDocument';
import LocalizedContent from './LocalizedContent';

import css from './LegalPage.module.css';

// The legal documents cross-link through this switch, so all of them share one header.
const LEGAL_PAGES = ['TermsOfServicePage', 'PrivacyPolicyPage', 'MarketplacePoliciesPage'];

const LocalizedDocument = props => {
  const { documents, ...rest } = props;
  return (
    <LocalizedContent
      documents={documents}
      fallback={<div className={css.loading} aria-busy="true" />}
    >
      {(doc, locale) => <LegalDocument doc={doc} locale={locale} {...rest} />}
    </LocalizedContent>
  );
};

/**
 * Content-only variant (no page chrome, no table of contents) for modals,
 * e.g. the Terms/Privacy links on the sign-up form.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.documents `{ [locale]: loadable.lib(() => import(...)) }`
 * @param {string} props.pageName route name, also the translation key namespace
 * @returns {JSX.Element}
 */
export const LegalContent = props => {
  const { documents, pageName } = props;
  const intl = useIntl();
  const routeConfiguration = useRouteConfiguration();
  const englishHref = prependLocale(pathByRouteName(pageName, routeConfiguration), DEFAULT_LOCALE);

  return (
    <LocalizedDocument
      documents={documents}
      englishHref={englishHref}
      title={intl.formatMessage({ id: `${pageName}.title` })}
    />
  );
};

/**
 * A code-owned legal page (Terms of Service, Privacy Policy, Marketplace Policies).
 * The text is not managed in Console: it lives in `<PageName>/content/{en,lt,pl}.js`.
 *
 * @component
 * @param {Object} props
 * @param {'TermsOfServicePage'|'PrivacyPolicyPage'|'MarketplacePoliciesPage'} props.pageName route name, also the translation key namespace
 * @param {Object} props.documents `{ [locale]: loadable.lib(() => import(...)) }`
 * @returns {JSX.Element}
 */
const LegalPage = props => {
  const { pageName, documents } = props;
  const config = useConfiguration();
  const intl = useIntl();
  const routeConfiguration = useRouteConfiguration();

  const marketplaceName = config.marketplaceName;
  const englishHref = prependLocale(pathByRouteName(pageName, routeConfiguration), DEFAULT_LOCALE);

  const switcher = (
    <nav
      className={css.switcher}
      aria-label={intl.formatMessage({ id: 'LegalPage.switcherLabel' })}
    >
      {LEGAL_PAGES.map(name => (
        <NamedLink
          key={name}
          name={name}
          className={css.switcherLink}
          activeClassName={css.switcherLinkActive}
        >
          <FormattedMessage id={`${name}.title`} />
        </NamedLink>
      ))}
    </nav>
  );

  return (
    <ContentPageLayout
      metaTitle={intl.formatMessage({ id: `${pageName}.schemaTitle` }, { marketplaceName })}
      metaDescription={intl.formatMessage(
        { id: `${pageName}.schemaDescription` },
        { marketplaceName }
      )}
      kicker={<FormattedMessage id="LegalPage.kicker" />}
      title={intl.formatMessage({ id: `${pageName}.title` })}
      lead={<FormattedMessage id={`${pageName}.lead`} values={{ marketplaceName }} />}
      heroExtras={switcher}
    >
      <LocalizedDocument documents={documents} englishHref={englishHref} showToc />
    </ContentPageLayout>
  );
};

export default LegalPage;
