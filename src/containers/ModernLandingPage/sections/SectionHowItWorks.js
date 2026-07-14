import React from 'react';
import classNames from 'classnames';

import { useIntl } from '../../../util/reactIntl';
import { useReveal } from '../../../hooks/useReveal';

import { IconCamera, IconChevron, IconHandshake, IconTruck } from './icons';
import css from './SectionHowItWorks.module.css';

const STEPS = [
  { key: 'how1', number: '01', Icon: IconCamera },
  { key: 'how2', number: '02', Icon: IconHandshake },
  { key: 'how3', number: '03', Icon: IconTruck },
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
          {STEPS.map((step, i) => {
            const { Icon } = step;
            return (
              <React.Fragment key={step.key}>
                <li className={css.step}>
                  <article className={css.card}>
                    <div className={css.cardTop}>
                      <span className={css.iconTile}>
                        <Icon className={css.iconGlyph} />
                      </span>
                      <span className={css.stepNumber}>{step.number}</span>
                    </div>
                    <h3 className={css.stepTitle}>{msg(`${step.key}Title`)}</h3>
                    <p className={css.stepBody}>{msg(`${step.key}Body`)}</p>
                  </article>
                </li>

                {i < STEPS.length - 1 && (
                  <li className={css.connector} aria-hidden="true">
                    <span className={css.connectorLine} />
                    <IconChevron className={css.connectorChevron} />
                  </li>
                )}
              </React.Fragment>
            );
          })}
        </ol>
      </div>
    </section>
  );
};

export default SectionHowItWorks;
