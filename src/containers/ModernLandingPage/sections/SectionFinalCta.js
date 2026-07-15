import React from 'react';
import classNames from 'classnames';

import { useIntl } from '../../../util/reactIntl';
import { useReveal } from '../../../hooks/useReveal';

import { NamedLink } from '../../../components';

import { IconArrow } from './icons';
import css from './SectionFinalCta.module.css';

const SectionFinalCta = () => {
  const intl = useIntl();
  const { ref, enabled, revealed } = useReveal();

  const msg = id => intl.formatMessage({ id: `ModernLandingPage.${id}` });

  return (
    <section className={css.root}>
      <div className={css.backdrop} aria-hidden="true" />
      <div
        ref={ref}
        className={classNames(css.inner, {
          [css.revealReady]: enabled,
          [css.isRevealed]: revealed,
        })}
      >
        <NamedLink name="SearchPage" className={css.ctaRow}>
          <span className={css.ctaTitle}>{msg('ctaBuyTitle')}</span>
          <span className={css.ctaAction}>
            {msg('ctaBuyAction')}
            <IconArrow className={css.ctaArrow} />
          </span>
        </NamedLink>

        <NamedLink name="NewListingPage" className={css.ctaRow}>
          <span className={css.ctaTitle}>{msg('ctaSellTitle')}</span>
          <span className={css.ctaAction}>
            {msg('ctaSellAction')}
            <IconArrow className={css.ctaArrow} />
          </span>
        </NamedLink>
      </div>
    </section>
  );
};

export default SectionFinalCta;
