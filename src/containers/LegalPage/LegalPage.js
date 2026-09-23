import React from 'react';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { DEFAULT_LOCALE } from '../../config/configLocale';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { prependLocale } from '../../util/locale';
import { pathByRouteName } from '../../util/routes';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { Page, LayoutSingleColumn, NamedLink } from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import LegalDocument from './LegalDocument';
import { pickByLocale } from './LegalPage.helpers';

import css from './LegalPage.module.css';

// The legal documents cross-link through this switch, so both pages share one header.
const LEGAL_PAGES = ['TermsOfServicePage', 'PrivacyPolicyPage'];

/**
 * Loads the document for the current locale and renders it. Each locale's
 * content is its own code-split chunk (a `loadable.lib` per locale), so a page
 * only ships the language it shows; SSR collects the chunk so hydration matches.
 */
const LocalizedDocument = props => {
  const { documents, englishHref, ...rest } = props;
  const currentLocale = useSelector(state => state.locale?.current || DEFAULT_LOCALE);
  const { locale, value: DocumentLoader } = pickByLocale(documents, currentLocale);

  return (
    <DocumentLoader fallback={<div className={css.loading} aria-busy="true" />}>
      {({ default: doc }) => (
        <LegalDocument doc={doc} locale={locale} englishHref={englishHref} {...rest} />
      )}
    </DocumentLoader>
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
 * A code-owned legal page (Terms of Service, Privacy Policy). The text is not
 * managed in Console: it lives in `<PageName>/content/{en,lt,pl}.js`.
 *
 * @component
 * @param {Object} props
 * @param {'TermsOfServicePage'|'PrivacyPolicyPage'} props.pageName route name, also the translation key namespace
 * @param {Object} props.documents `{ [locale]: loadable.lib(() => import(...)) }`
 * @returns {JSX.Element}
 */
const LegalPage = props => {
  const { pageName, documents } = props;
  const config = useConfiguration();
  const intl = useIntl();
  const routeConfiguration = useRouteConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);

  const marketplaceName = config.marketplaceName;
  const title = intl.formatMessage({ id: `${pageName}.title` });
  const schemaTitle = intl.formatMessage({ id: `${pageName}.schemaTitle` }, { marketplaceName });
  const schemaDescription = intl.formatMessage(
    { id: `${pageName}.schemaDescription` },
    { marketplaceName }
  );
  const englishHref = prependLocale(pathByRouteName(pageName, routeConfiguration), DEFAULT_LOCALE);

  return (
    <Page
      title={schemaTitle}
      description={schemaDescription}
      scrollingDisabled={scrollingDisabled}
      schema={{
        '@context': 'http://schema.org',
        '@type': 'WebPage',
        name: schemaTitle,
        description: schemaDescription,
      }}
    >
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.root}>
          <header className={css.hero}>
            <div className={css.heroInner}>
              <p className={css.kicker}>
                <FormattedMessage id="LegalPage.kicker" />
              </p>
              <h1 className={css.title}>{title}</h1>
              <p className={css.lead}>
                <FormattedMessage id={`${pageName}.lead`} values={{ marketplaceName }} />
              </p>
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
            </div>
          </header>

          <div className={css.content}>
            <LocalizedDocument documents={documents} englishHref={englishHref} showToc />
          </div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default LegalPage;
