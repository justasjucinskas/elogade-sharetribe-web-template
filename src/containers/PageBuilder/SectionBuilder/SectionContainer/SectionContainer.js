import React from 'react';
import classNames from 'classnames';

import { useReveal } from '../../../../hooks/useReveal';
import Field from '../../Field';

import css from './SectionContainer.module.css';

/**
 * @typedef {Object} FieldComponentConfig
 * @property {ReactNode} component
 * @property {Function} pickValidProps
 */

/**
 * This component can be used to wrap some common styles and features of Section-level components.
 * E.g: const SectionHero = props => (<SectionContainer><H1>Hello World!</H1></SectionContainer>);
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string?} props.id id of the section
 * @param {string?} props.as tag/element name. Defaults to 'section'.
 * @param {ReactNode} props.children
 * @param {Object} props.appearance
 * @param {boolean?} props.revealDisabled skip the scroll-reveal entrance (e.g. the hero handles its own)
 * @param {Object} props.options extra options for the section component (e.g. custom fieldComponents)
 * @param {Object<string,FieldComponentConfig>?} props.options.fieldComponents custom fields
 * @returns {JSX.Element} containing wrapper that can be used inside Block components.
 */
const SectionContainer = props => {
  const {
    className,
    rootClassName,
    id,
    as,
    children,
    appearance,
    options,
    revealDisabled,
    ...otherProps
  } = props;
  const Tag = as || 'section';
  const classes = classNames(rootClassName || css.root, className);

  // Fade the section content up as it enters the viewport (SSR-safe; see useReveal).
  const { ref, enabled, revealed } = useReveal();
  const contentClasses = classNames(css.sectionContent, {
    [css.revealReady]: enabled && !revealDisabled,
    [css.isRevealed]: revealed && !revealDisabled,
  });

  return (
    <Tag className={classes} id={id} ref={revealDisabled ? undefined : ref} {...otherProps}>
      {appearance?.fieldType === 'customAppearance' ? (
        <Field
          data={{ alt: `Background image for ${id}`, ...appearance }}
          className={className}
          options={options}
        />
      ) : null}

      <div className={contentClasses}>{children}</div>
    </Tag>
  );
};

export default SectionContainer;
