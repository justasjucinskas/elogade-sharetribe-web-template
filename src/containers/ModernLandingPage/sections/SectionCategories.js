import React from 'react';
import classNames from 'classnames';

import { useIntl } from '../../../util/reactIntl';
import { formatCategoryName } from '../../../util/hostedLabels';
import { useReveal } from '../../../hooks/useReveal';

import { NamedLink } from '../../../components';

import { IconArrow } from './icons';
import { CATEGORY_TILES } from './categoryTiles';
import css from './SectionCategories.module.css';

const SectionCategories = ({ categoryCounts = {} }) => {
  const intl = useIntl();
  const header = useReveal();
  const grid = useReveal();

  const msg = id => intl.formatMessage({ id: `ModernLandingPage.${id}` });

  // Cursor-tracked spotlight: delegated on the grid (NamedLink doesn't forward
  // arbitrary handlers) — set the hovered tile's local pointer coordinates as
  // CSS vars so its .tileSpot radial follows the cursor. Direct style mutation,
  // no React re-render.
  const handleSpotlight = e => {
    const tile = e.target.closest(`.${css.tile}`);
    if (!tile) {
      return;
    }
    const rect = tile.getBoundingClientRect();
    tile.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    tile.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  return (
    <section className={css.root}>
      <div className={css.inner}>
        <header
          ref={header.ref}
          className={classNames(css.header, {
            [css.revealReady]: header.enabled,
            [css.isRevealed]: header.revealed,
          })}
        >
          <h2 className={css.title}>{msg('categoriesTitle')}</h2>
          <p className={css.subtitle}>{msg('categoriesSubtitle')}</p>
        </header>

        <div
          ref={grid.ref}
          onMouseMove={handleSpotlight}
          className={classNames(css.grid, {
            [css.revealReady]: grid.enabled,
            [css.isRevealed]: grid.revealed,
          })}
        >
          {CATEGORY_TILES.map(tile => {
            const Icon = tile.icon;
            const count = categoryCounts[tile.id];
            return (
              <NamedLink
                key={tile.id}
                name="SearchPage"
                to={{ search: `?pub_categoryLevel1=${tile.id}` }}
                className={classNames(css.tile, tile.tileClass ? css[tile.tileClass] : null)}
              >
                <span className={css.tileGlow} aria-hidden="true" />
                <span className={css.tileSpot} aria-hidden="true" />
                <Icon className={css.tileIcon} />
                <span className={css.tileHead}>
                  <span className={css.tileName}>
                    {formatCategoryName(intl, tile.id, tile.fallback)}
                  </span>
                  {typeof count === 'number' ? (
                    <span className={css.tileCount}>
                      {intl.formatMessage({ id: 'ModernLandingPage.categoryCount' }, { count })}
                    </span>
                  ) : null}
                </span>
                <span className={css.tileCta}>
                  {msg('categoryCta')}
                  <IconArrow className={css.tileCtaArrow} />
                </span>
              </NamedLink>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SectionCategories;
