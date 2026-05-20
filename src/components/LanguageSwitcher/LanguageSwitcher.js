import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { prependLocale, stripLocaleFromPath } from '../../util/locale';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_TO_INTL_CODE,
  SUPPORTED_LOCALES,
} from '../../config/configLocale';

import css from './LanguageSwitcher.module.css';

const INTL_CODE_TO_LOCALE = Object.fromEntries(
  Object.entries(LOCALE_TO_INTL_CODE).map(([locale, intlCode]) => [intlCode, locale])
);

const LABEL_BY_LOCALE = {
  en: 'LanguageSwitcher.english',
  lt: 'LanguageSwitcher.lithuanian',
};

const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const writeLocaleCookie = locale => {
  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(
    locale
  )}; max-age=${COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
};

const navigateToLocale = locale => {
  const { pathname, search, hash } = window.location;
  // Strip any existing locale prefix from the *full* path before re-prepending.
  // window.location.pathname includes the prefix; React Router's basename is
  // unrelated here since we're hitting the browser API directly.
  const strippedPath = stripLocaleFromPath(pathname);
  const target = `${prependLocale(strippedPath, locale)}${search}${hash}`;
  window.location.assign(target);
};

/**
 * Inline toggle that lets the user switch between supported UI locales.
 * Switching is a full page navigation (cookie write + window.location.assign)
 * so the IntlProvider re-mounts cleanly with the new locale and the server
 * gets a chance to re-pick the hosted translation overlay.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className]
 * @param {string} [props.rootClassName]
 * @param {'desktop'|'mobile'} [props.variant='desktop']
 */
const LanguageSwitcher = props => {
  const { className, rootClassName, variant = 'desktop' } = props;
  const intl = useIntl();
  const currentLocale = INTL_CODE_TO_LOCALE[intl.locale] || DEFAULT_LOCALE;

  const handleSelect = newLocale => () => {
    if (newLocale === currentLocale) return;
    writeLocaleCookie(newLocale);
    navigateToLocale(newLocale);
  };

  const rootClasses = classNames(rootClassName || css.root, className, {
    [css.mobile]: variant === 'mobile',
  });

  return (
    <div
      className={rootClasses}
      role="group"
      aria-label={intl.formatMessage({ id: 'LanguageSwitcher.ariaLabel' })}
    >
      {SUPPORTED_LOCALES.map((locale, index) => {
        const isActive = locale === currentLocale;
        return (
          <React.Fragment key={locale}>
            {index > 0 ? (
              <span className={css.separator} aria-hidden="true">
                ·
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleSelect(locale)}
              className={classNames(css.option, { [css.optionActive]: isActive })}
              aria-pressed={isActive}
              lang={locale}
            >
              <FormattedMessage id={LABEL_BY_LOCALE[locale]} />
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;
