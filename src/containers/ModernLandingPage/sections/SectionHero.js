import React from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../../context/configurationContext';
import { useIntl } from '../../../util/reactIntl';
import { formatMoney } from '../../../util/currency';
import { useReveal } from '../../../hooks/useReveal';

import { NamedLink, ResponsiveImage } from '../../../components';

import {
  IconPhone,
  IconLaptop,
  IconHeadphones,
  IconController,
  IconWatch,
  IconCamera,
  IconArrow,
} from './icons';
import css from './SectionHero.module.css';

// Two vertical columns cascade down the right edge. Each column is cycled up to
// this many cards so its content is always taller than the column viewport —
// the seamless (duplicated) marquee track needs that to loop without a gap.
const COLUMN_COUNT = 2;
const CARDS_PER_COLUMN = 5;

// The seller credited on a listing card. Deleted/banned authors carry no
// profile, in which case the card simply omits the name.
const sellerName = listing => listing.author?.attributes?.profile?.displayName || null;

// Round-robin the descriptors into COLUMN_COUNT columns, then cycle each column
// up to CARDS_PER_COLUMN so every column is tall enough to loop seamlessly.
const buildColumns = descriptors => {
  const columns = Array.from({ length: COLUMN_COUNT }, () => []);
  descriptors.forEach((d, i) => columns[i % COLUMN_COUNT].push(d));
  return columns.map(col => {
    if (col.length === 0) {
      return col;
    }
    const target = Math.max(CARDS_PER_COLUMN, col.length);
    return Array.from({ length: target }, (_, i) => col[i % col.length]);
  });
};

const SectionHero = props => {
  const { listings = [] } = props;
  const intl = useIntl();
  const config = useConfiguration();
  const { ref, enabled, revealed } = useReveal();

  const msg = id => intl.formatMessage({ id: `ModernLandingPage.${id}` });

  const variantPrefix = config.layout?.listingImage?.variantPrefix || 'listing-card';

  // Real listings (with photos) carry the waterfall; below a small threshold we
  // fall back to iconized placeholders so the composition never looks empty.
  const usableListings = listings.filter(l => l.images?.length > 0);
  const useReal = usableListings.length >= 4;

  const listingDescriptors = usableListings.map(listing => {
    const { title, price } = listing.attributes;
    const firstImage = listing.images?.[0];
    const imageVariants = firstImage
      ? Object.keys(firstImage.attributes.variants).filter(k => k.startsWith(variantPrefix))
      : [];
    return {
      type: 'listing',
      key: listing.id.uuid,
      title,
      priceText: price ? formatMoney(intl, price) : null,
      seller: sellerName(listing),
      image: firstImage,
      imageVariants,
    };
  });

  // Placeholder composition — only rendered when too few photographed listings
  // exist. Real product names read better than "Item A"; the seller names are
  // deliberately generic first-name-plus-initial stand-ins.
  const placeholderDescriptors = [
    {
      key: 'phone',
      icon: <IconPhone className={css.cardIcon} />,
      title: 'iPhone 15 Pro · 128 GB',
      priceText: '€749',
      seller: 'Tomas K.',
    },
    {
      key: 'audio',
      icon: <IconHeadphones className={css.cardIcon} />,
      title: 'Sony WH-1000XM5',
      priceText: '€189',
      seller: 'Rūta M.',
    },
    {
      key: 'laptop',
      icon: <IconLaptop className={css.cardIcon} />,
      title: 'MacBook Air M2',
      priceText: '€829',
      seller: 'Andrius P.',
    },
    {
      key: 'console',
      icon: <IconController className={css.cardIcon} />,
      title: 'DualSense Edge',
      priceText: '€159',
      seller: 'Gabija V.',
    },
    {
      key: 'watch',
      icon: <IconWatch className={css.cardIcon} />,
      title: 'Apple Watch Series 9',
      priceText: '€329',
      seller: 'Mantas B.',
    },
    {
      key: 'camera',
      icon: <IconCamera className={css.cardIcon} />,
      title: 'Canon EOS R50',
      priceText: '€679',
      seller: 'Ieva S.',
    },
  ].map(p => ({ type: 'placeholder', ...p }));

  const columns = buildColumns(useReal ? listingDescriptors : placeholderDescriptors);

  // A single card. The whole waterfall is a decorative, non-interactive
  // showcase (see the parent's aria-hidden), so every card is a plain div —
  // clicks are funnelled to the "Browse listings" CTA instead. This keeps the
  // continuously moving strip consistent and accessible: no moving link targets.
  const renderCard = (d, key) => (
    <div key={key} className={css.card}>
      {d.type === 'listing' ? (
        <>
          <div className={css.cardArt}>
            <ResponsiveImage
              rootClassName={css.cardImage}
              alt=""
              image={d.image}
              variants={d.imageVariants}
              sizes="300px"
            />
            <div className={css.cardShade} />
          </div>
          <div className={css.cardMeta}>
            <span className={css.cardName}>{d.title}</span>
            <span className={css.cardRow}>
              <span className={css.cardPrice}>{d.priceText}</span>
              {d.seller ? <span className={css.cardSeller}>{d.seller}</span> : null}
            </span>
          </div>
        </>
      ) : (
        <>
          <div className={css.cardArt}>
            <div className={css.cardGlow} />
            {d.icon}
          </div>
          <div className={css.cardMeta}>
            <span className={css.cardName}>{d.title}</span>
            <span className={css.cardRow}>
              <span className={css.cardPrice}>{d.priceText}</span>
              <span className={css.cardSeller}>{d.seller}</span>
            </span>
          </div>
        </>
      )}
    </div>
  );

  return (
    <section className={css.root}>
      <div className={css.backdrop} aria-hidden="true">
        <div className={css.gridLines} />
        <div className={css.orbA} />
        <div className={css.orbB} />
      </div>

      <div className={css.inner}>
        <div
          ref={ref}
          className={classNames(css.content, {
            [css.revealReady]: enabled,
            [css.isRevealed]: revealed,
          })}
        >
          <h1 className={css.title}>
            <span className={css.titleWord}>
              <span className={classNames(css.titleWordInner, css.titleWordInner1)}>
                {msg('heroWord1')}
              </span>
            </span>{' '}
            <span className={css.titleWord}>
              <span className={classNames(css.titleWordInner, css.titleWordInner2)}>
                {msg('heroWord2')}
              </span>
            </span>{' '}
            <span className={css.titleWord}>
              <span
                className={classNames(css.titleWordInner, css.titleWordInner3, css.titleWordAccent)}
              >
                {msg('heroWord3')}
              </span>
            </span>
          </h1>

          <p className={css.subtitle}>{msg('heroSubtitle')}</p>

          <div className={css.ctas}>
            <NamedLink name="SearchPage" className={css.ctaPrimary}>
              {msg('heroCtaBrowse')}
              <IconArrow className={css.ctaArrow} />
            </NamedLink>
            <NamedLink name="NewListingPage" className={css.ctaGhost}>
              {msg('heroCtaSell')}
            </NamedLink>
          </div>
        </div>
      </div>

      <div className={css.waterfall} aria-hidden="true">
        {columns.map((col, colIndex) =>
          col.length === 0 ? null : (
            <div
              key={colIndex}
              className={classNames(css.column, colIndex % 2 === 0 ? css.columnA : css.columnB)}
            >
              <div className={css.columnTrack}>
                {col.map((d, i) => renderCard(d, `${colIndex}-a-${i}`))}
                {col.map((d, i) => renderCard(d, `${colIndex}-b-${i}`))}
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
};

export default SectionHero;
