import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../../context/configurationContext';
import { useIntl } from '../../../util/reactIntl';
import { useReveal } from '../../../hooks/useReveal';

import css from './SectionVideo.module.css';
import posterImage from './intro-video-poster-1280.jpg';

// The marketplace intro video on YouTube ("What is ELOGADE?", 41 s).
const VIDEO_ID = 'xHKuwg5jRdw';
const VIDEO_DURATION = '0:41';

/* Filled play glyph — the shared lucide wrappers pin fill to none, and an
   outlined triangle reads too thin at play-button size. */
const IconPlay = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M8 5.5v13c0 .83.92 1.33 1.62.88l10.15-6.5c.64-.41.64-1.35 0-1.76L9.62 4.62A1.05 1.05 0 0 0 8 5.5z"
      fill="currentColor"
    />
  </svg>
);

/**
 * Intro-video section: a poster showing the video's title frame (bundled as a
 * first-party asset over a brand-dark scrim) that swaps to a privacy-enhanced
 * YouTube embed on click. Nothing is loaded from YouTube until the visitor
 * asks for the video.
 */
const SectionVideo = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const { ref, enabled, revealed } = useReveal();
  const [playing, setPlaying] = useState(false);
  const iframeRef = useRef(null);

  const msg = (id, values) => intl.formatMessage({ id: `ModernLandingPage.${id}` }, values);
  const cardTitle = msg('videoCardTitle', { marketplaceName: config.marketplaceName });

  // The poster <button> unmounts when the embed swaps in; hand focus to the
  // iframe so keyboard users aren't dropped back to the top of the document.
  useEffect(() => {
    if (playing) {
      iframeRef.current?.focus();
    }
  }, [playing]);

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
          <h2 className={css.title}>{msg('videoTitle')}</h2>
          <p className={css.lede}>{msg('videoBody')}</p>
        </header>

        <div className={css.videoCard}>
          {playing ? (
            <iframe
              ref={iframeRef}
              className={css.videoFrame}
              src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
              title={cardTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              className={css.poster}
              aria-label={`${msg('videoPlay')} — ${cardTitle}`}
              onClick={() => setPlaying(true)}
            >
              <img
                className={css.posterImage}
                src={posterImage}
                alt=""
                loading="lazy"
                decoding="async"
              />
              <span className={css.posterScrim} aria-hidden="true" />
              <span className={css.durationChip}>{VIDEO_DURATION}</span>
              <span className={css.playButton} aria-hidden="true">
                <IconPlay className={css.playGlyph} />
              </span>
              <span className={css.posterTitle}>{cardTitle}</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default SectionVideo;
