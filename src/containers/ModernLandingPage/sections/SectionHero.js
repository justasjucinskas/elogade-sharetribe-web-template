import React from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../../context/configurationContext';
import { useIntl } from '../../../util/reactIntl';
import { formatMoney } from '../../../util/currency';
import { createSlug } from '../../../util/urlHelpers';
import { formatCategoryName, formatListingFieldOption } from '../../../util/hostedLabels';
import { useReveal } from '../../../hooks/useReveal';

import { NamedLink, ResponsiveImage } from '../../../components';

import { IconPhone, IconHeadphones, IconController, IconArrow } from './icons';
import css from './SectionHero.module.css';

// Top-level Console category ids + English fallback names for the ticker.
const TICKER_CATEGORIES = [
  { id: 'phonesaccessories', fallback: 'Phones & Accessories' },
  { id: 'computerstablets', fallback: 'Computers & Tablets' },
  { id: 'audiodevices', fallback: 'Audio Devices' },
  { id: 'gameconsoles', fallback: 'Game Consoles' },
  { id: 'videogames', fallback: 'Video Games' },
  { id: 'wearablessmartdevices', fallback: 'Wearables & Smart Devices' },
  { id: 'camerasvideo', fallback: 'Cameras & Video' },
  { id: 'consoleaccessories', fallback: 'Console Accessories' },
];

/**
 * Condition badge for a listing card: the `productcondition` enum option,
 * translated through the hostedLabels overlay with the Console label as
 * fallback.
 */
const conditionBadge = (intl, config, listing) => {
  const conditionKey = listing.attributes.publicData?.productcondition;
  if (!conditionKey) {
    return null;
  }
  const fieldConfig = config.listing?.listingFields?.find(f => f.key === 'productcondition');
  const optionConfig = fieldConfig?.enumOptions?.find(o => o.option === conditionKey);
  return formatListingFieldOption(
    intl,
    'productcondition',
    conditionKey,
    optionConfig?.label || conditionKey
  );
};

const SectionHero = props => {
  const { listings = [] } = props;
  const intl = useIntl();
  const config = useConfiguration();
  const { ref, enabled, revealed } = useReveal();

  const msg = id => intl.formatMessage({ id: `ModernLandingPage.${id}` });

  const tickerItems = [
    ...TICKER_CATEGORIES.map(c => formatCategoryName(intl, c.id, c.fallback)),
    msg('tickerOffers'),
    msg('tickerProtection'),
    msg('tickerPayout'),
  ];

  // Real listings carry the showcase when at least three (with photos) exist;
  // the iconized placeholders keep the composition intact otherwise. Up to five
  // lead cards fan out on desktop; on mobile they become a swipeable strip.
  const variantPrefix = config.layout?.listingImage?.variantPrefix || 'listing-card';

  // Fan slot per listing index (0 = newest). Desktop places each into the fan
  // via CSS `order` (centre, then inner pair, then outer pair); the array stays
  // newest-first so the mobile strip opens on the newest listing.
  const FAN_SLOTS = [
    css.cardCenter,
    css.cardLeft,
    css.cardRight,
    css.cardFarLeft,
    css.cardFarRight,
  ];
  const fanCount = listings.length >= 5 ? 5 : listings.length >= 3 ? 3 : 0;
  const showcaseListings = fanCount
    ? listings.slice(0, fanCount).map((listing, i) => ({ listing, cardClass: FAN_SLOTS[i] }))
    : null;

  // Placeholder composition mirrors the real fan (centre card first for the
  // mobile strip) when fewer than three photographed listings are available.
  const placeholderCards = [
    {
      key: 'phone',
      icon: <IconPhone className={css.cardIcon} />,
      name: 'iPhone 15 Pro · 128 GB',
      price: '€749',
      badge: msg('badgePreloved'),
      cardClass: css.cardCenter,
    },
    {
      key: 'audio',
      icon: <IconHeadphones className={css.cardIcon} />,
      name: 'Sony WH-1000XM5',
      price: '€189',
      badge: msg('badgeLikeNew'),
      cardClass: css.cardLeft,
    },
    {
      key: 'console',
      icon: <IconController className={css.cardIcon} />,
      name: 'DualSense Edge',
      price: '€159',
      badge: msg('badgeNew'),
      cardClass: css.cardRight,
    },
  ];

  return (
    <section className={css.root}>
      <div className={css.backdrop} aria-hidden="true">
        <div className={css.gridLines} />
        <div className={css.orbA} />
        <div className={css.orbB} />
        <div className={css.orbC} />
      </div>

      <div
        ref={ref}
        className={classNames(css.inner, {
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

        <div className={css.showcase}>
          {showcaseListings
            ? showcaseListings.map(({ listing, cardClass }) => {
                const { title, price } = listing.attributes;
                const firstImage = listing.images?.[0];
                const imageVariants = firstImage
                  ? Object.keys(firstImage.attributes.variants).filter(k =>
                      k.startsWith(variantPrefix)
                    )
                  : [];
                const badge = conditionBadge(intl, config, listing);
                return (
                  <NamedLink
                    key={listing.id.uuid}
                    name="ListingPage"
                    params={{ id: listing.id.uuid, slug: createSlug(title) }}
                    className={classNames(css.card, cardClass)}
                  >
                    <div className={css.cardArt}>
                      <ResponsiveImage
                        rootClassName={css.cardImage}
                        alt={title}
                        image={firstImage}
                        variants={imageVariants}
                        sizes="264px"
                      />
                      <div className={css.cardShade} />
                    </div>
                    <div className={css.cardMeta}>
                      <span className={css.cardName}>{title}</span>
                      <span className={css.cardRow}>
                        <span className={css.cardPrice}>
                          {price ? formatMoney(intl, price) : null}
                        </span>
                        {badge ? <span className={css.cardBadge}>{badge}</span> : null}
                      </span>
                    </div>
                  </NamedLink>
                );
              })
            : placeholderCards.map(card => (
                <div key={card.key} className={classNames(css.card, card.cardClass)}>
                  <div className={css.cardArt}>
                    <div className={css.cardGlow} />
                    {card.icon}
                  </div>
                  <div className={css.cardMeta}>
                    <span className={css.cardName}>{card.name}</span>
                    <span className={css.cardRow}>
                      <span className={css.cardPrice}>{card.price}</span>
                      <span className={css.cardBadge}>{card.badge}</span>
                    </span>
                  </div>
                </div>
              ))}
        </div>
      </div>

      <div className={css.ticker} aria-hidden="true">
        <div className={css.tickerTrack}>
          {[0, 1].map(copy => (
            <div key={copy} className={css.tickerGroup}>
              {tickerItems.map((item, i) => (
                <span key={`${copy}-${i}`} className={css.tickerItem}>
                  {item}
                  <span className={css.tickerDot} />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SectionHero;
