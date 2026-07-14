import React from 'react';
import classNames from 'classnames';

import { useIntl } from '../../../util/reactIntl';
import { formatCategoryName } from '../../../util/hostedLabels';
import { useReveal } from '../../../hooks/useReveal';

import { NamedLink } from '../../../components';

import {
  IconPhone,
  IconLaptop,
  IconHeadphones,
  IconConsole,
  IconController,
  IconDisc,
  IconWatch,
  IconCamera,
  IconArrow,
} from './icons';
import css from './SectionCategories.module.css';

// Top-level Console category ids; tiles deep-link into SearchPage filters.
const CATEGORY_TILES = [
  {
    id: 'phonesaccessories',
    fallback: 'Phones & Accessories',
    icon: IconPhone,
    tileClass: 'tileFeature',
  },
  { id: 'computerstablets', fallback: 'Computers & Tablets', icon: IconLaptop },
  { id: 'audiodevices', fallback: 'Audio Devices', icon: IconHeadphones },
  { id: 'gameconsoles', fallback: 'Game Consoles', icon: IconConsole },
  { id: 'wearablessmartdevices', fallback: 'Wearables & Smart Devices', icon: IconWatch },
  { id: 'camerasvideo', fallback: 'Cameras & Video', icon: IconCamera, tileClass: 'tileWide' },
  { id: 'videogames', fallback: 'Video Games', icon: IconDisc },
  { id: 'consoleaccessories', fallback: 'Console Accessories', icon: IconController },
];

const SectionCategories = () => {
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
          <p className={css.kicker}>{msg('categoriesKicker')}</p>
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
                <span className={css.tileName}>
                  {formatCategoryName(intl, tile.id, tile.fallback)}
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
