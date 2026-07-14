import React from 'react';
import classNames from 'classnames';

import { useIntl } from '../../../util/reactIntl';
import { useReveal } from '../../../hooks/useReveal';

import css from './SectionHowItWorks.module.css';

const STEPS = [
  { key: 'how1', number: '01' },
  { key: 'how2', number: '02' },
  { key: 'how3', number: '03' },
];

const SectionHowItWorks = () => {
  const intl = useIntl();
  const { ref, enabled, revealed } = useReveal();

  const msg = id => intl.formatMessage({ id: `ModernLandingPage.${id}` });

  return (
    <section className={css.root}>
      <div
        ref={ref}
        className={classNames(css.inner, {
          [css.revealReady]: enabled,
          [css.isRevealed]: revealed,
        })}
      >
        <header className={css.header}>
          <p className={css.kicker}>{msg('howKicker')}</p>
          <h2 className={css.title}>{msg('howTitle')}</h2>
        </header>

        <ol className={css.steps}>
          {STEPS.map(step => (
            <li key={step.key} className={css.step}>
              <div className={css.stepTop}>
                <span className={css.stepNumber}>{step.number}</span>
                <span className={css.stepLine} aria-hidden="true" />
              </div>
              <h3 className={css.stepTitle}>{msg(`${step.key}Title`)}</h3>
              <p className={css.stepBody}>{msg(`${step.key}Body`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default SectionHowItWorks;
