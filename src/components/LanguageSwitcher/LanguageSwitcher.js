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

// Imported by path rather than via the components barrel on purpose:
// LanguageSwitcher is exported from src/components/index.js *before* Menu* and
// would resolve to `undefined` if pulled from the barrel at module-eval time.
import Menu from '../Menu/Menu';
import MenuLabel from '../MenuLabel/MenuLabel';
import MenuContent from '../MenuContent/MenuContent';
import MenuItem from '../MenuItem/MenuItem';
import IconArrowHead from '../IconArrowHead/IconArrowHead';
import IconCheckmark from '../IconCheckmark/IconCheckmark';

import css from './LanguageSwitcher.module.css';

const INTL_CODE_TO_LOCALE = Object.fromEntries(
  Object.entries(LOCALE_TO_INTL_CODE).map(([locale, intlCode]) => [intlCode, locale])
);

const LABEL_BY_LOCALE = {
  en: 'LanguageSwitcher.english',
  lt: 'LanguageSwitcher.lithuanian',
  pl: 'LanguageSwitcher.polish',
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

// How long a language switch waits for onSelectLocale before reloading anyway.
const PERSIST_TIMEOUT_MS = 3000;

/**
 * Switches the UI language: remembers it in the cookie, lets `onSelectLocale` store it on the
 * logged-in user (the language of their emails), then reloads in the new locale. A failed call,
 * or one slower than `timeoutMs`, does not block the reload.
 *
 * @param {string} locale new locale
 * @param {Object} [options]
 * @param {(locale: string) => Promise|void} [options.onSelectLocale]
 * @param {(locale: string) => void} [options.navigate] defaults to a full page navigation
 * @param {number} [options.timeoutMs]
 * @returns {Promise<void>} resolves after navigate was called
 */
export const switchLocale = (locale, options = {}) => {
  const { onSelectLocale, navigate = navigateToLocale, timeoutMs = PERSIST_TIMEOUT_MS } = options;
  writeLocaleCookie(locale);
  const persist = Promise.resolve()
    .then(() => onSelectLocale?.(locale))
    .catch(() => null);
  const timeout = new Promise(resolve => setTimeout(resolve, timeoutMs));
  return Promise.race([persist, timeout]).then(() => navigate(locale));
};

// Minimal globe glyph; inherits the surrounding text color via currentColor.
const IconGlobe = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    xmlns="http://www.w3.org/2000/svg"
    role="none"
  >
    <circle cx="8" cy="8" r="6.5" />
    <line x1="1.5" y1="8" x2="14.5" y2="8" />
    <ellipse cx="8" cy="8" rx="3" ry="6.5" />
  </svg>
);

/**
 * Lets the user switch between supported UI locales.
 *
 * Switching is a full page navigation (cookie write + window.location.assign)
 * so the IntlProvider re-mounts cleanly with the new locale and the server gets
 * a chance to re-pick the hosted translation overlay.
 *
 * Two layouts, driven by `variant`:
 *  - 'desktop' (default): a dropdown built on the shared Menu primitive — the
 *    same one the topbar profile menu uses — so keyboard navigation, focus
 *    handling and click-outside-to-close come for free. The trigger shows a
 *    globe + the active locale code; the open menu lists every language with
 *    the active one checkmarked.
 *  - 'mobile': a flat vertical list of language rows, suited to the slide-out
 *    menu panel where an absolutely-positioned popup would be awkward.
 *
 * Both layouts scale to any number of SUPPORTED_LOCALES.
 *
 * When `onSelectLocale` is given, it is called with the new locale before the reload, so that a
 * logged-in user's choice is stored as the language of their emails (specs/email-languages.md).
 * See switchLocale.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className]
 * @param {string} [props.rootClassName]
 * @param {'desktop'|'mobile'} [props.variant='desktop']
 * @param {(locale: string) => Promise|void} [props.onSelectLocale]
 */
const LanguageSwitcher = props => {
  const { className, rootClassName, variant = 'desktop', onSelectLocale } = props;
  const intl = useIntl();
  const currentLocale = INTL_CODE_TO_LOCALE[intl.locale] || DEFAULT_LOCALE;

  const selectLocale = newLocale => () => {
    if (newLocale === currentLocale) return;
    switchLocale(newLocale, { onSelectLocale });
  };

  const ariaLabel = intl.formatMessage({ id: 'LanguageSwitcher.ariaLabel' });

  if (variant === 'mobile') {
    return (
      <div
        className={classNames(rootClassName || css.mobileRoot, className)}
        role="group"
        aria-label={ariaLabel}
      >
        {SUPPORTED_LOCALES.map(locale => {
          const isActive = locale === currentLocale;
          return (
            <button
              key={locale}
              type="button"
              lang={locale}
              onClick={selectLocale(locale)}
              className={classNames(css.mobileOption, { [css.optionActive]: isActive })}
              aria-current={isActive ? 'true' : undefined}
            >
              <FormattedMessage id={LABEL_BY_LOCALE[locale]} />
              {isActive ? <IconCheckmark className={css.checkmark} size="small" /> : null}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Menu className={classNames(rootClassName, className)}>
      <MenuLabel
        className={css.menuLabel}
        isOpenClassName={css.menuLabelOpen}
        ariaLabel={ariaLabel}
      >
        <IconGlobe className={css.globe} />
        <span className={css.currentCode}>{currentLocale.toUpperCase()}</span>
        <IconArrowHead className={css.arrow} direction="down" size="tiny" />
      </MenuLabel>
      <MenuContent className={css.menuContent}>
        {SUPPORTED_LOCALES.map(locale => {
          const isActive = locale === currentLocale;
          return (
            <MenuItem key={locale}>
              <button
                type="button"
                lang={locale}
                onClick={selectLocale(locale)}
                className={classNames(css.option, { [css.optionActive]: isActive })}
                aria-current={isActive ? 'true' : undefined}
              >
                <span className={css.menuItemBorder} />
                <span className={css.optionLabel}>
                  <FormattedMessage id={LABEL_BY_LOCALE[locale]} />
                </span>
                {isActive ? <IconCheckmark className={css.checkmark} size="small" /> : null}
              </button>
            </MenuItem>
          );
        })}
      </MenuContent>
    </Menu>
  );
};

export default LanguageSwitcher;
