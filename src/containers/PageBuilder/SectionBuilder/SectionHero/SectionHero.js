import React from 'react';
import classNames from 'classnames';

import { useReveal } from '../../../../hooks/useReveal';
import Field, { hasDataInFields } from '../../Field';

import SectionContainer from '../SectionContainer';
import css from './SectionHero.module.css';

/**
 * @typedef {Object} FieldComponentConfig
 * @property {ReactNode} component
 * @property {Function} pickValidProps
 */

/**
 * Section component for a website's hero section
 * The Section Hero doesn't have any Blocks by default, all the configurations are made in the Section Hero settings
 *
 * This template renders a bespoke, animated hero: a Console-driven title /
 * description / CTA with a decorative drifting aura behind it and a staggered
 * entrance animation. All content (text, CTA, background) is still edited in
 * Console — only the presentation is customised here.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {Object} props.defaultClasses
 * @param {string} props.defaultClasses.sectionDetails
 * @param {string} props.defaultClasses.title
 * @param {string} props.defaultClasses.description
 * @param {string} props.defaultClasses.ctaButton
 * @param {string} props.sectionId id of the section
 * @param {'hero'} props.sectionType
 * @param {Object?} props.title
 * @param {Object?} props.description
 * @param {Object?} props.appearance
 * @param {Object?} props.callToAction
 * @param {Object} props.options extra options for the section component (e.g. custom fieldComponents)
 * @param {Object<string,FieldComponentConfig>?} props.options.fieldComponents custom fields
 * @returns {JSX.Element} Section for article content
 */
const SectionHero = props => {
  const {
    sectionId,
    className,
    rootClassName,
    defaultClasses,
    title,
    description,
    appearance,
    callToAction,
    options,
  } = props;

  // If external mapping has been included for fields
  // E.g. { h1: { component: MyAwesomeHeader } }
  const fieldComponents = options?.fieldComponents;
  const fieldOptions = { fieldComponents };

  const hasHeaderFields = hasDataInFields([title, description, callToAction], fieldOptions);

  // Staggered entrance for the hero content (SSR-safe; see useReveal).
  const { ref, enabled, revealed } = useReveal();

  return (
    <SectionContainer
      id={sectionId}
      className={className}
      rootClassName={classNames(rootClassName || css.root)}
      appearance={appearance}
      options={fieldOptions}
      revealDisabled
    >
      {/* Decorative animated backdrop — sits above the Console background, below the text. */}
      <div className={css.heroAura} aria-hidden="true" />

      {hasHeaderFields ? (
        <header
          ref={ref}
          className={classNames(defaultClasses.sectionDetails, css.heroContent, {
            [css.revealReady]: enabled,
            [css.isRevealed]: revealed,
          })}
        >
          <Field data={title} className={defaultClasses.title} options={fieldOptions} />
          <Field data={description} className={defaultClasses.description} options={fieldOptions} />
          <Field
            data={callToAction}
            className={classNames(defaultClasses.ctaButton, css.heroCta)}
            options={fieldOptions}
          />
        </header>
      ) : null}
    </SectionContainer>
  );
};

export default SectionHero;
