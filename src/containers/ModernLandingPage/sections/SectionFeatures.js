import React from 'react';
import classNames from 'classnames';

import { useIntl } from '../../../util/reactIntl';
import { useReveal } from '../../../hooks/useReveal';

import { IconHeadphones, IconPhone, IconCamera, IconCheck, IconLock, IconLockOpen } from './icons';
import css from './SectionFeatures.module.css';

/**
 * Scene 1 — message before you buy: a listing row and a short buyer↔seller
 * exchange that plays out with staggered bubbles when the row scrolls into view.
 */
const MessageScene = ({ msg }) => (
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
    <div className={classNames(css.sceneBubble, css.sceneBubbleBuyer)}>{msg('sceneQuestion')}</div>
    <div className={classNames(css.sceneBubble, css.sceneBubbleSeller)}>
      <IconCamera className={css.sceneReplyIcon} />
      {msg('sceneReply')}
    </div>
  </div>
);

// One product across the grading scale — cyan (sealed) → amber (well-loved).
// Reuses the existing condition-badge copy; each grade pairs with a short,
// honest wear note instead of a price.
const CONDITION_TIERS = [
  { key: 'badgeNew', noteKey: 'gradeNoteNew', toneClass: 'tierNew' },
  { key: 'badgeLikeNew', noteKey: 'gradeNoteLikeNew', toneClass: 'tierMid' },
  { key: 'badgePreloved', noteKey: 'gradeNoteUsed', toneClass: 'tierUsed' },
];

/**
 * Scene 2 — new & pre-loved: one product graded on a single honest standard.
 * A vertical spectrum rail (sealed → well-loved) threads through the three
 * grade rows; each row carries its colour-coded grade and a plain-language
 * wear note, so the scale reads without any prices.
 */
const ConditionScene = ({ msg }) => (
  <div className={css.scene}>
    <div className={css.grades}>
      <div className={css.gradesHead}>
        <span className={css.gradesArt}>
          <IconPhone className={css.gradesIcon} />
        </span>
        <span className={css.gradesName}>iPhone 15 Pro</span>
      </div>
      <ul className={css.tiers}>
        {CONDITION_TIERS.map(tier => (
          <li key={tier.key} className={classNames(css.tier, css[tier.toneClass])}>
            <span className={css.tierDot} aria-hidden="true" />
            <span className={css.tierCard}>
              <span className={css.tierBar} aria-hidden="true" />
              <span className={css.tierLabel}>{msg(tier.key)}</span>
              <span className={css.tierNote}>
                <IconCheck className={css.tierNoteCheck} />
                {msg(tier.noteKey)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

const PAYMENT_STAGES = ['railPaid', 'railShipped', 'railDelivered'];

/**
 * Scene 3 — protected payments: an escrow "vault" meter. The ring fills as the
 * order moves paid → shipped → delivered; the buyer's money stays under lock
 * until delivery, when the lock springs open and the funds release to the
 * seller. The composition is visible/complete by default (SSR + reduced motion);
 * the entrance choreography lives in the stylesheet, keyed off the reveal state.
 */
const PaymentsScene = ({ msg }) => (
  <div className={css.scene}>
    <div className={css.escrow}>
      <div className={css.meter}>
        <svg className={css.meterRing} viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <linearGradient id="escrowGrad" x1="0" y1="0" x2="1" y2="1">
              <stop className={css.meterStopA} offset="0%" />
              <stop className={css.meterStopB} offset="100%" />
            </linearGradient>
          </defs>
          <circle className={css.meterTrack} cx="60" cy="60" r="52" />
          <circle className={css.meterProgress} cx="60" cy="60" r="52" />
        </svg>
        <div className={css.meterCore}>
          <span className={css.meterIcon} aria-hidden="true">
            <IconLock className={css.meterLock} />
            <IconLockOpen className={css.meterUnlock} />
          </span>
          <span className={css.meterAmount}>€189</span>
        </div>
      </div>

      <ol className={css.stages}>
        {PAYMENT_STAGES.map(key => (
          <li key={key} className={css.stage}>
            <IconCheck className={css.stageCheck} />
            {msg(key)}
          </li>
        ))}
      </ol>

      <div className={css.railCaption}>
        <IconCheck className={css.railCaptionCheck} />
        {msg('railCaption')}
      </div>
    </div>
  </div>
);

const FEATURES = [
  { key: 'feature1', Scene: MessageScene },
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
