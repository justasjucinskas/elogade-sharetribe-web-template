import React, { useMemo } from 'react';
import loadable from '@loadable/component';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';

import { NamedLink } from '../../components';

import renderMarkdown from '../PageBuilder/markdownProcessor';
import ContentPageLayout from '../LegalPage/ContentPageLayout';
import LocalizedContent from '../LegalPage/LocalizedContent';
import { markdownComponents } from '../LegalPage/LegalDocument';

import css from './AboutPage.module.css';

// About copy, one code-split chunk per locale. The copy is code-owned (not managed in
// Console): edit ./content/en.js and keep lt.js / pl.js in sync.
const documents = {
  en: loadable.lib(() => import(/* webpackChunkName: "AboutEn" */ './content/en')),
  lt: loadable.lib(() => import(/* webpackChunkName: "AboutLt" */ './content/lt')),
  pl: loadable.lib(() => import(/* webpackChunkName: "AboutPl" */ './content/pl')),
};

// Other code-owned pages worth reading next; each card shows the page's own title and lead.
const RELATED_PAGES = ['FaqPage', 'MarketplacePoliciesPage', 'TermsOfServicePage'];

// Larger body copy than the legal documents: this page is read, not referenced.
const aboutMarkdownComponents = {
  ...markdownComponents,
  p: props => <p className={css.paragraph}>{props.children}</p>,
};

const AboutContent = ({ content }) => {
  const { body, highlights = [] } = content || {};
  const renderedBody = useMemo(() => renderMarkdown(body || '', aboutMarkdownComponents), [body]);

  return (
    <>
      <div className={css.body}>{renderedBody}</div>

      {highlights.length > 0 ? (
        <ul className={css.highlights}>
          {highlights.map((highlight, index) => (
            <li key={highlight.id} className={css.highlight}>
              <span className={css.highlightNumber}>{String(index + 1).padStart(2, '0')}</span>
              <h2 className={css.highlightTitle}>{highlight.title}</h2>
              <p className={css.highlightText}>{highlight.text}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
};

/**
 * The About page, served at the former Console page URL /p/about.
 *
 * @component
 * @returns {JSX.Element}
 */
const AboutPage = () => {
  const config = useConfiguration();
  const intl = useIntl();
  const marketplaceName = config.marketplaceName;

  return (
    <ContentPageLayout
      metaTitle={intl.formatMessage({ id: 'AboutPage.schemaTitle' }, { marketplaceName })}
      metaDescription={intl.formatMessage(
        { id: 'AboutPage.schemaDescription' },
        { marketplaceName }
      )}
      kicker={<FormattedMessage id="AboutPage.kicker" values={{ marketplaceName }} />}
      title={intl.formatMessage({ id: 'AboutPage.title' })}
      lead={<FormattedMessage id="AboutPage.lead" values={{ marketplaceName }} />}
    >
      <LocalizedContent
        documents={documents}
        fallback={<div className={css.loading} aria-busy="true" />}
      >
        {content => <AboutContent content={content} />}
      </LocalizedContent>

      <nav className={css.related} aria-label={intl.formatMessage({ id: 'AboutPage.relatedTitle' })}>
        <h2 className={css.relatedTitle}>
          <FormattedMessage id="AboutPage.relatedTitle" />
        </h2>
        <ul className={css.relatedList}>
          {RELATED_PAGES.map(name => (
            <li key={name} className={css.relatedItem}>
              <NamedLink name={name} className={css.relatedLink}>
                <span className={css.relatedLinkTitle}>
                  <FormattedMessage id={`${name}.title`} />
                </span>
                <span className={css.relatedLinkLead}>
                  <FormattedMessage id={`${name}.lead`} values={{ marketplaceName }} />
                </span>
                <span className={css.relatedArrow} aria-hidden="true">
                  →
                </span>
              </NamedLink>
            </li>
          ))}
        </ul>
      </nav>
    </ContentPageLayout>
  );
};

export default AboutPage;
