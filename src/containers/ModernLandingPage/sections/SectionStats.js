import React from 'react';
import classNames from 'classnames';

import { useIntl } from '../../../util/reactIntl';
import { useReveal } from '../../../hooks/useReveal';

import css from './SectionStats.module.css';

const STATS = ['stat1', 'stat2', 'stat3'];

const SectionStats = () => {
  const intl = useIntl();
  const { ref, enabled, revealed } = useReveal();

  return (
    <section className={css.root}>
      <dl
        ref={ref}
        className={classNames(css.inner, {
          [css.revealReady]: enabled,
          [css.isRevealed]: revealed,
        })}
      >
        {STATS.map(stat => (
          <div key={stat} className={css.stat}>
            <dt className={css.value}>
              {intl.formatMessage({ id: `ModernLandingPage.${stat}Value` })}
            </dt>
            <dd className={css.label}>
              {intl.formatMessage({ id: `ModernLandingPage.${stat}Label` })}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default SectionStats;
