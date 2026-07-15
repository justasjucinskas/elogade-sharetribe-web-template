import React, { useEffect, useRef, useState } from 'react';
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
  const scrollerRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);

  const msg = id => intl.formatMessage({ id: `ModernLandingPage.${id}` });

  // Light the pager dot for whichever card is centered in the mobile swipe
  // strip. IntersectionObserver (rather than a scroll listener) keeps this cheap
  // and jank-free; on desktop the strip isn't scrollable, so it simply no-ops.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const cards = scroller.querySelectorAll('[data-step-card]');
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveStep(Number(entry.target.getAttribute('data-step-card')));
          }
        });
      },
      { root: scroller, threshold: 0.6 }
    );
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  const goToStep = i => {
    const card = scrollerRef.current?.querySelector(`[data-step-card="${i}"]`);
    card?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };

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
          <h2 className={css.title}>{msg('howTitle')}</h2>
        </header>

        <ol className={css.steps} ref={scrollerRef}>
          {STEPS.map((step, i) => {
            const { Icon } = step;
            return (
              <React.Fragment key={step.key}>
                <li className={css.step} data-step-card={i}>
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

        {/* Mobile-only pager: makes the strip's swipeability explicit and offers
            tap-to-jump. Hidden on desktop where all three steps are visible. */}
        <div className={css.pager}>
          {STEPS.map((step, i) => (
            <button
              key={step.key}
              type="button"
              className={classNames(css.dot, { [css.dotActive]: i === activeStep })}
              aria-label={msg(`${step.key}Title`)}
              aria-current={i === activeStep ? 'true' : undefined}
              onClick={() => goToStep(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SectionHowItWorks;
