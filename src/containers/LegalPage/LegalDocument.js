import React, { Children, useMemo } from 'react';
import { useSelector } from 'react-redux';
import classNames from 'classnames';

import { DEFAULT_LOCALE } from '../../config/configLocale';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { prependLocale } from '../../util/locale';

import renderMarkdown from '../PageBuilder/markdownProcessor';

import { extractToc, parseHeading } from './LegalPage.helpers';
import { TocDisclosure, TocRail, useActiveSection } from './LegalToc';

import css from './LegalDocument.module.css';

const textOf = children =>
  Children.toArray(children)
    .filter(child => typeof child === 'string')
    .join('');

// Numbered headings get a locale-independent anchor id and a separate number label.
const numberedHeading = (Tag, className) => {
  const NumberedHeading = ({ children }) => {
    const { number, title, id } = parseHeading(textOf(children));
    return (
      <Tag id={id || undefined} className={className}>
        {number ? <span className={css.sectionNumber}>{number}</span> : null}
        <span>{number ? title : children}</span>
      </Tag>
    );
  };
  return NumberedHeading;
};

const Link = ({ href, children }) => {
  const currentLocale = useSelector(state => state.locale?.current || DEFAULT_LOCALE);
  const isExternal = /^https?:\/\//.test(href || '');
  // Site-internal paths ("/p/faq") are written locale-free in the content; this is a
  // plain <a> (outside React Router's basename), so add the reader's locale here.
  const isInternalPath = /^\/(?!\/)/.test(href || '');
  return (
    <a
      className={css.link}
      href={isInternalPath ? prependLocale(href, currentLocale) : href}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );
};

// The content only uses these Markdown constructs; each maps to a classed element
// (the styling guide forbids element selectors). Also used by the FAQ and About pages.
export const markdownComponents = {
  h2: numberedHeading('h2', css.h2),
  h3: numberedHeading('h3', css.h3),
  h4: numberedHeading('h4', css.h4),
  p: props => <p className={css.p}>{props.children}</p>,
  ul: props => <ul className={css.ul}>{props.children}</ul>,
  ol: props => <ol className={css.ol}>{props.children}</ol>,
  li: props => <li className={css.li}>{props.children}</li>,
  strong: props => <strong className={css.strong}>{props.children}</strong>,
  a: Link,
};

/**
 * Renders one legal document (Terms of Service, Privacy Policy, Marketplace Policies).
 *
 * @component
 * @param {Object} props
 * @param {{ lastUpdated: string, body: string }} props.doc the document content module
 * @param {string} props.locale locale the doc is written in ('en', 'lt', 'pl')
 * @param {string} [props.englishHref] absolute path of the English original, shown on translations
 * @param {string} [props.title] optional in-document title (used inside modals, where the page header is absent)
 * @param {boolean} [props.showToc] render the table of contents (full page only)
 * @returns {JSX.Element}
 */
const LegalDocument = props => {
  const { doc, locale, englishHref, title, showToc = false } = props;
  const intl = useIntl();

  const body = doc?.body || '';
  const toc = useMemo(() => extractToc(body), [body]);
  const content = useMemo(() => renderMarkdown(body, markdownComponents), [body]);
  const activeId = useActiveSection(toc, showToc);

  const lastUpdated = doc?.lastUpdated
    ? intl.formatDate(new Date(`${doc.lastUpdated}T00:00:00Z`), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : null;

  const isTranslation = locale !== DEFAULT_LOCALE;
  const hasToc = showToc && toc.length > 0;

  return (
    <div className={classNames(css.root, { [css.withToc]: showToc })}>
      {hasToc ? <TocRail toc={toc} activeId={activeId} /> : null}

      <article className={css.article}>
        <header className={css.meta}>
          {title ? <h2 className={css.inlineTitle}>{title}</h2> : null}
          {lastUpdated ? (
            <p className={css.updated}>
              <FormattedMessage
                id="LegalPage.lastUpdated"
                values={{
                  date: <time dateTime={doc.lastUpdated}>{lastUpdated}</time>,
                }}
              />
            </p>
          ) : null}
        </header>

        {isTranslation && englishHref ? (
          <p className={css.translationNotice}>
            <FormattedMessage id="LegalPage.translationNotice" />{' '}
            {/* New tab: navigating this tab would drop the reader's locale and, inside
                the sign-up modal, the half-filled form. */}
            <a
              className={css.link}
              href={englishHref}
              hrefLang={DEFAULT_LOCALE}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FormattedMessage id="LegalPage.readInEnglish" />
            </a>
          </p>
        ) : null}

        {hasToc ? <TocDisclosure toc={toc} activeId={activeId} /> : null}

        <div className={css.body}>{content}</div>
      </article>
    </div>
  );
};

export default LegalDocument;
