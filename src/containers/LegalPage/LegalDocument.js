import React, { Children, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';

import { DEFAULT_LOCALE } from '../../config/configLocale';
import { FormattedMessage, useIntl } from '../../util/reactIntl';

import renderMarkdown from '../PageBuilder/markdownProcessor';

import { extractToc, parseHeading } from './LegalPage.helpers';

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
  const isExternal = /^https?:\/\//.test(href || '');
  return (
    <a
      className={css.link}
      href={href}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );
};

// The body only uses these Markdown constructs; each maps to a classed element
// (the styling guide forbids element selectors).
const markdownComponents = {
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
 * Highlight the table-of-contents entry of the section currently being read:
 * the last top-level heading above the reading line (upper quarter of the
 * viewport). Purely presentational, so it runs client-side only; SSR renders
 * no active entry.
 */
const useActiveSection = (toc, enabled) => {
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return undefined;
    }
    let frame = null;
    const update = () => {
      frame = null;
      const readingLine = window.innerHeight * 0.25;
      // Looked up per update (cheap: one per section) so re-rendered nodes are never stale.
      const headings = toc.map(item => document.getElementById(item.id)).filter(Boolean);
      const current = headings.filter(h => h.getBoundingClientRect().top <= readingLine).pop();
      setActiveId(current ? current.id : null);
    };
    const onScroll = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [toc, enabled]);

  return activeId;
};

const TocList = ({ toc, activeId, onNavigate }) => (
  <ol className={css.tocList}>
    {toc.map(({ id, number, title }) => (
      <li key={id} className={css.tocItem}>
        <a
          href={`#${id}`}
          className={classNames(css.tocLink, { [css.tocLinkActive]: id === activeId })}
          aria-current={id === activeId ? 'location' : undefined}
          onClick={onNavigate}
        >
          <span className={css.tocNumber}>{number}</span>
          <span>{title}</span>
        </a>
      </li>
    ))}
  </ol>
);

/**
 * Renders one legal document (Terms of Service or Privacy Policy).
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
  const closeMobileToc = e => {
    const details = e.currentTarget.closest('details');
    if (details) details.open = false;
  };

  const tocTitle = <FormattedMessage id="LegalPage.tocTitle" />;

  return (
    <div className={classNames(css.root, { [css.withToc]: showToc })}>
      {showToc && toc.length > 0 ? (
        <aside className={css.tocAside}>
          <nav
            className={css.tocDesktop}
            aria-label={intl.formatMessage({ id: 'LegalPage.tocTitle' })}
          >
            <p className={css.tocTitle}>{tocTitle}</p>
            <TocList toc={toc} activeId={activeId} />
          </nav>
        </aside>
      ) : null}

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

        {showToc && toc.length > 0 ? (
          <details className={css.tocMobile}>
            <summary className={css.tocSummary}>{tocTitle}</summary>
            <TocList toc={toc} activeId={activeId} onNavigate={closeMobileToc} />
          </details>
        ) : null}

        <div className={css.body}>{content}</div>
      </article>
    </div>
  );
};

export default LegalDocument;
