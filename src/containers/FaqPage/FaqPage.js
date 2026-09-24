import React, { useEffect, useMemo } from 'react';
import loadable from '@loadable/component';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';

import { NamedLink } from '../../components';

import renderMarkdown from '../PageBuilder/markdownProcessor';
import ContentPageLayout from '../LegalPage/ContentPageLayout';
import LocalizedContent from '../LegalPage/LocalizedContent';
import { markdownComponents } from '../LegalPage/LegalDocument';
import { TocDisclosure, TocRail, useActiveSection } from '../LegalPage/LegalToc';

import { buildFaqPageSchema, faqAnchorId, faqToc } from './FaqPage.helpers';

import css from './FaqPage.module.css';

// FAQ content, one code-split chunk per locale. The copy is code-owned (not managed in
// Console): edit ./content/en.js and keep lt.js / pl.js in sync.
const documents = {
  en: loadable.lib(() => import(/* webpackChunkName: "FaqEn" */ './content/en')),
  lt: loadable.lib(() => import(/* webpackChunkName: "FaqLt" */ './content/lt')),
  pl: loadable.lib(() => import(/* webpackChunkName: "FaqPl" */ './content/pl')),
};

/**
 * Open the question a URL hash points at (#faq-when-paid), on load and on
 * in-page anchor jumps. Closed <details> would otherwise hide the answer.
 */
const useOpenHashTarget = enabled => {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return undefined;
    }
    const openTarget = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (target && target.tagName === 'DETAILS' && !target.open) {
        target.open = true;
        target.scrollIntoView();
      }
    };
    openTarget();
    window.addEventListener('hashchange', openTarget);
    return () => window.removeEventListener('hashchange', openTarget);
  }, [enabled]);
};

const Markdown = ({ text }) => {
  const content = useMemo(() => renderMarkdown(text, markdownComponents), [text]);
  return <div className={css.markdown}>{content}</div>;
};

const FaqSections = props => {
  const { sections, supportEmail } = props;
  const toc = useMemo(() => faqToc(sections), [sections]);
  const activeId = useActiveSection(toc, true);
  useOpenHashTarget(true);

  return (
    <div className={css.layout}>
      <TocRail toc={toc} activeId={activeId} titleId="FaqPage.tocTitle" />

      <div className={css.main}>
        <TocDisclosure toc={toc} activeId={activeId} titleId="FaqPage.tocTitle" />

        {sections.map((section, index) => (
          <section key={section.id} className={css.section}>
            <h2 id={faqAnchorId(section.id)} className={css.sectionTitle}>
              <span className={css.sectionNumber}>{index + 1}</span>
              <span>{section.title}</span>
            </h2>
            {section.intro ? (
              <div className={css.sectionIntro}>
                <Markdown text={section.intro} />
              </div>
            ) : null}

            <div className={css.items}>
              {section.items.map(item => (
                <details key={item.id} id={faqAnchorId(item.id)} className={css.item}>
                  <summary className={css.question}>
                    <h3 className={css.questionText}>{item.question}</h3>
                    <span className={css.chevron} aria-hidden="true" />
                  </summary>
                  <div className={css.answer}>
                    <Markdown text={item.answer} />
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        <aside className={css.moreHelp}>
          <h2 className={css.moreHelpTitle}>
            <FormattedMessage id="FaqPage.moreHelpTitle" />
          </h2>
          <p className={css.moreHelpText}>
            <FormattedMessage id="FaqPage.moreHelpText" />
          </p>
          <div className={css.moreHelpActions}>
            {supportEmail ? (
              <a className={css.primaryButton} href={`mailto:${supportEmail}`}>
                <FormattedMessage id="FaqPage.emailSupport" />
              </a>
            ) : null}
            <NamedLink name="MarketplacePoliciesPage" className={css.secondaryButton}>
              <FormattedMessage id="MarketplacePoliciesPage.title" />
            </NamedLink>
          </div>
        </aside>
      </div>
    </div>
  );
};

/**
 * The FAQ page, served at the former Console page URL /p/faq. Questions are
 * collapsible (<details>, so they work without JS and stay in the SSR markup)
 * and published as schema.org FAQPage structured data.
 *
 * @component
 * @returns {JSX.Element}
 */
const FaqPage = () => {
  const config = useConfiguration();
  const intl = useIntl();

  const marketplaceName = config.marketplaceName;
  const supportEmail = config.siteContactEmail;
  const metaTitle = intl.formatMessage({ id: 'FaqPage.schemaTitle' }, { marketplaceName });
  const metaDescription = intl.formatMessage(
    { id: 'FaqPage.schemaDescription' },
    { marketplaceName }
  );

  const contact = supportEmail ? (
    <p className={css.heroContact}>
      <FormattedMessage
        id="FaqPage.heroContact"
        values={{
          email: (
            <a className={css.heroContactLink} href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
          ),
        }}
      />
    </p>
  ) : null;

  // The whole page waits for the locale chunk so the FAQPage schema can list the
  // questions; SSR collects the chunk, so this only defers client-side navigation.
  const renderPage = doc => (
    <ContentPageLayout
      metaTitle={metaTitle}
      metaDescription={metaDescription}
      schema={
        doc
          ? buildFaqPageSchema(doc.sections, { name: metaTitle, description: metaDescription })
          : null
      }
      kicker={<FormattedMessage id="FaqPage.kicker" />}
      title={intl.formatMessage({ id: 'FaqPage.title' })}
      lead={<FormattedMessage id="FaqPage.lead" values={{ marketplaceName }} />}
      heroExtras={contact}
    >
      {doc ? (
        <FaqSections sections={doc.sections} supportEmail={supportEmail} />
      ) : (
        <div className={css.loading} aria-busy="true" />
      )}
    </ContentPageLayout>
  );

  return (
    <LocalizedContent documents={documents} fallback={renderPage(null)}>
      {doc => renderPage(doc)}
    </LocalizedContent>
  );
};

export default FaqPage;
