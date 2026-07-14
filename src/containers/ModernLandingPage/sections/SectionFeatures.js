import React from 'react';
import classNames from 'classnames';

import { useIntl } from '../../../util/reactIntl';
import { useConfiguration } from '../../../context/configurationContext';
import { useReveal } from '../../../hooks/useReveal';

import { IconHeadphones, IconPhone, IconCheck } from './icons';
import css from './SectionFeatures.module.css';

/**
 * Scene 1 — offer negotiation: a listing row and a short "haggle" exchange
 * that plays out with staggered bubbles when the row scrolls into view.
 */
const OfferScene = ({ msg }) => (
  <div className={css.scene}>
    <div className={css.sceneListing}>
      <span className={css.sceneListingArt}>
        <IconHeadphones className={css.sceneListingIcon} />
      </span>
      <span className={css.sceneListingMeta}>
        <span className={css.sceneListingName}>Sony WH-1000XM5</span>
        <span className={css.sceneListingSub}>{msg('sceneAsking')}</span>
      </span>
      <span className={css.sceneListingPrice}>€189</span>
    </div>
    <div className={classNames(css.sceneBubble, css.sceneBubbleBuyer)}>
      {msg('sceneOfferLabel')} · <strong className={css.sceneBubbleStrong}>€165</strong>
    </div>
    <div className={classNames(css.sceneBubble, css.sceneBubbleSeller)}>
      <IconCheck className={css.sceneCheck} />
      {msg('sceneAccepted')}
    </div>
  </div>
);

/**
 * Scene 2 — new & pre-loved: the same product listed in both markets,
 * side by side with honest condition badges.
 */
const ConditionScene = ({ msg }) => (
  <div className={css.scene}>
    <div className={css.sceneCards}>
      <div className={classNames(css.sceneCard, css.sceneCardNew)}>
        <span className={css.sceneCardArt}>
          <IconPhone className={css.sceneCardIcon} />
        </span>
        <span className={css.sceneCardName}>iPhone 15 Pro</span>
        <span className={css.sceneCardPrice}>€999</span>
        <span className={css.sceneCardBadge}>{msg('badgeNew')}</span>
      </div>
      <div className={classNames(css.sceneCard, css.sceneCardUsed)}>
        <span className={css.sceneCardArt}>
          <IconPhone className={css.sceneCardIcon} />
        </span>
        <span className={css.sceneCardName}>iPhone 15 Pro</span>
        <span className={css.sceneCardPrice}>€749</span>
        <span className={classNames(css.sceneCardBadge, css.sceneCardBadgeUsed)}>
          {msg('badgePreloved')}
        </span>
      </div>
    </div>
  </div>
);

/**
 * Scene 3 — protected payments: a fulfilment rail whose progress fills as it
 * reveals; funds release at the final checkpoint.
 */
const PaymentsScene = ({ msg }) => (
  <div className={css.scene}>
    <div className={css.railWrap}>
      <div className={css.rail}>
        <span className={css.railProgress} />
        <span className={classNames(css.railNode, css.railNode1)} />
        <span className={classNames(css.railNode, css.railNode2)} />
        <span className={classNames(css.railNode, css.railNode3)} />
      </div>
      <div className={css.railLabels}>
        <span className={css.railLabel}>{msg('railPaid')}</span>
        <span className={css.railLabel}>{msg('railShipped')}</span>
        <span className={css.railLabel}>{msg('railDelivered')}</span>
      </div>
      <div className={css.railCaption}>
        <IconCheck className={css.railCaptionCheck} />
        {msg('railCaption')}
      </div>
    </div>
  </div>
);

const FEATURES = [
  { key: 'feature1', Scene: OfferScene },
  { key: 'feature2', Scene: ConditionScene },
  { key: 'feature3', Scene: PaymentsScene },
];

const FeatureRow = ({ feature, index, msg }) => {
  const { ref, enabled, revealed } = useReveal();
  const { key, Scene } = feature;

  return (
    <div
      ref={ref}
      className={classNames(css.row, {
        [css.rowReverse]: index % 2 === 1,
        [css.revealReady]: enabled,
        [css.isRevealed]: revealed,
      })}
    >
      <div className={css.rowText}>
        <p className={css.rowKicker}>{msg(`${key}Kicker`)}</p>
        <h3 className={css.rowTitle}>{msg(`${key}Title`)}</h3>
        <p className={css.rowBody}>{msg(`${key}Body`)}</p>
      </div>
      <div className={css.rowVisual}>
        <Scene msg={msg} />
      </div>
    </div>
  );
};

const SectionFeatures = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const header = useReveal();

  const msg = (id, values) => intl.formatMessage({ id: `ModernLandingPage.${id}` }, values);

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
          <p className={css.kicker}>
            {msg('featuresKicker', { marketplaceName: config.marketplaceName })}
          </p>
          <h2 className={css.title}>{msg('featuresTitle')}</h2>
        </header>

        <div className={css.rows}>
          {FEATURES.map((feature, i) => (
            <FeatureRow key={feature.key} feature={feature} index={i} msg={msg} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SectionFeatures;
