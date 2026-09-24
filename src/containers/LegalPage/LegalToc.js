import React, { useEffect, useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';

import css from './LegalToc.module.css';

/**
 * Highlight the table-of-contents entry of the section currently being read:
 * the last top-level heading above the reading line (upper quarter of the
 * viewport). Purely presentational, so it runs client-side only; SSR renders
 * no active entry.
 *
 * @param {Array<{ id: string }>} toc
 * @param {boolean} enabled
 * @returns {string|null} id of the active entry
 */
export const useActiveSection = (toc, enabled) => {
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
 * Sticky contents rail, shown on large viewports only.
 *
 * @component
 * @param {Object} props
 * @param {Array<{ id: string, number: string, title: string }>} props.toc
 * @param {string|null} props.activeId
 * @param {string} [props.titleId] translation key of the rail title
 * @returns {JSX.Element}
 */
export const TocRail = props => {
  const { toc, activeId, titleId = 'LegalPage.tocTitle' } = props;
  const intl = useIntl();
  return (
    <aside className={css.tocAside}>
      <nav className={css.tocDesktop} aria-label={intl.formatMessage({ id: titleId })}>
        <p className={css.tocTitle}>
          <FormattedMessage id={titleId} />
        </p>
        <TocList toc={toc} activeId={activeId} />
      </nav>
    </aside>
  );
};

/**
 * Collapsible contents, shown below large viewports. Closes after a jump.
 *
 * @component
 * @param {Object} props
 * @param {Array<{ id: string, number: string, title: string }>} props.toc
 * @param {string|null} props.activeId
 * @param {string} [props.titleId] translation key of the summary
 * @returns {JSX.Element}
 */
export const TocDisclosure = props => {
  const { toc, activeId, titleId = 'LegalPage.tocTitle' } = props;
  const closeOnNavigate = e => {
    const details = e.currentTarget.closest('details');
    if (details) details.open = false;
  };
  return (
    <details className={css.tocMobile}>
      <summary className={css.tocSummary}>
        <FormattedMessage id={titleId} />
      </summary>
      <TocList toc={toc} activeId={activeId} onNavigate={closeOnNavigate} />
    </details>
  );
};
