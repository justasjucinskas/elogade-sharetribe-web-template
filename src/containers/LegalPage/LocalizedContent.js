import React from 'react';
import { useSelector } from 'react-redux';

import { DEFAULT_LOCALE } from '../../config/configLocale';

import { pickByLocale } from './LegalPage.helpers';

/**
 * Loads the content module for the current locale (falling back to English) and
 * passes it to `children`. Each locale's content is its own code-split chunk (a
 * `loadable.lib` per locale), so a page only ships the language it shows; SSR
 * collects the chunk so hydration matches.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.documents `{ [locale]: loadable.lib(() => import(...)) }`
 * @param {ReactNode} [props.fallback] rendered while a chunk loads on client-side navigation
 * @param {function(Object, string): ReactNode} props.children `(contentModule, locale) => …`
 * @returns {JSX.Element}
 */
const LocalizedContent = props => {
  const { documents, fallback = null, children } = props;
  const currentLocale = useSelector(state => state.locale?.current || DEFAULT_LOCALE);
  const { locale, value: ContentLoader } = pickByLocale(documents, currentLocale);

  return (
    <ContentLoader fallback={fallback}>
      {({ default: content }) => children(content, locale)}
    </ContentLoader>
  );
};

export default LocalizedContent;
