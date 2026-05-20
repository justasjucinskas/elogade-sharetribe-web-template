import React, { useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, StaticRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import loadable from '@loadable/component';
import moment from 'moment';

// Configs and store setup
import defaultConfig from './config/configDefault';
import appSettings from './config/settings';
import configureStore from './store';

// utils
import { RouteConfigurationProvider } from './context/routeConfigurationContext';
import { ConfigurationProvider } from './context/configurationContext';
import { parse } from './util/urlHelpers';
import { difference, isEmpty } from './util/common';
import { mergeConfig } from './util/configHelpers';
import { IntlProvider } from './util/reactIntl';
import {
  clearReferralDataIfExpired,
  filterValidReferralData,
  storeReferralData,
} from './util/webStorageHelpers';
import { includeCSSProperties } from './util/style';
import { IncludeScripts } from './util/includeScripts';

import { MaintenanceMode } from './components';

// routing
import routeConfiguration from './routing/routeConfiguration';
import Routes from './routing/Routes';

// Sharetribe Web Template uses English translations as default (fallback) translations.
// Lithuanian translations are loaded on demand for `/lt` routes.
//
// The priority order at runtime is:
//   1. hosted translations.json from Console (English-only — Console hosts a single language)
//      — applied only when the URL locale is `en`, since Console's strings are English.
//   2. messagesInLocale (e.g. lt.json)
//   3. defaultMessages (en.json) as the catch-all fallback
import defaultMessages from './translations/en.json';
import lithuanianMessages from './translations/lt.json';

import { DEFAULT_LOCALE, toIntlLocale } from './config/configLocale';

const messagesByLocale = {
  en: {},
  lt: lithuanianMessages,
};

// If translation key is missing from `messagesInLocale` (e.g. lt.json),
// fall back to the key from `defaultMessages` (en.json) so users never see
// a raw FormattedMessage id in the UI.
const addMissingTranslations = (sourceLangTranslations, targetLangTranslations) => {
  const sourceKeys = Object.keys(sourceLangTranslations);
  const targetKeys = Object.keys(targetLangTranslations);

  // if there's no translations defined for target language, return source translations
  if (targetKeys.length === 0) {
    return sourceLangTranslations;
  }
  const missingKeys = difference(sourceKeys, targetKeys);

  const addMissingTranslation = (translations, missingKey) => ({
    ...translations,
    [missingKey]: sourceLangTranslations[missingKey],
  });

  return missingKeys.reduce(addMissingTranslation, targetLangTranslations);
};

const isTestEnv = process.env.NODE_ENV === 'test';

// Build the messages object for a given URL locale.
//
// Note: Locale should not affect the tests. We ensure this by providing
//       messages with the key as the value of each message and discard the value.
//       { 'My.translationKey1': 'My.translationKey1', 'My.translationKey2': 'My.translationKey2' }
const buildMessages = (locale, hostedTranslations) => {
  if (isTestEnv) {
    return Object.fromEntries(Object.entries(defaultMessages).map(([key]) => [key, key]));
  }
  const messagesInLocale = messagesByLocale[locale] || {};
  const merged = addMissingTranslations(defaultMessages, messagesInLocale);
  // Console-hosted translations are always English. Overlay them only when the
  // URL locale is English; otherwise they would replace Lithuanian strings
  // with English ones.
  return locale === 'en' ? { ...merged, ...hostedTranslations } : merged;
};

// For customized apps, this dynamic loading of locale files is not necessary.
// It helps locale change from configDefault.js file or hosted configs, but customizers should probably
// just remove this and directly import the necessary locale on step 2.
const MomentLocaleLoader = props => {
  const { children, locale } = props;
  const isAlreadyImportedLocale =
    typeof hardCodedLocale !== 'undefined' && locale === hardCodedLocale;

  // Moment's built-in locale does not need loader
  const NoLoader = props => <>{props.children()}</>;

  // The default locale is en (en-US). Here we dynamically load one of the other common locales.
  // However, the default is to include all supported locales package from moment library.
  const MomentLocale =
    ['en', 'en-US'].includes(locale) || isAlreadyImportedLocale
      ? NoLoader
      : ['lt', 'lt-LT'].includes(locale)
      ? loadable.lib(() => import(/* webpackChunkName: "lt" */ 'moment/locale/lt'))
      : ['fr', 'fr-FR'].includes(locale)
      ? loadable.lib(() => import(/* webpackChunkName: "fr" */ 'moment/locale/fr'))
      : ['de', 'de-DE'].includes(locale)
      ? loadable.lib(() => import(/* webpackChunkName: "de" */ 'moment/locale/de'))
      : ['es', 'es-ES'].includes(locale)
      ? loadable.lib(() => import(/* webpackChunkName: "es" */ 'moment/locale/es'))
      : ['fi', 'fi-FI'].includes(locale)
      ? loadable.lib(() => import(/* webpackChunkName: "fi" */ 'moment/locale/fi'))
      : ['nl', 'nl-NL'].includes(locale)
      ? loadable.lib(() => import(/* webpackChunkName: "nl" */ 'moment/locale/nl'))
      : loadable.lib(() => import(/* webpackChunkName: "locales" */ 'moment/min/locales.min'));

  return (
    <MomentLocale>
      {() => {
        // Set the Moment locale globally
        // See: http://momentjs.com/docs/#/i18n/changing-locale/
        moment.locale(locale);
        return children;
      }}
    </MomentLocale>
  );
};

const Configurations = props => {
  const { appConfig, intlLocale, children } = props;
  const routeConfig = routeConfiguration(appConfig.layout, appConfig?.accessControl);
  const locale = isTestEnv ? 'en' : intlLocale || appConfig.localization.locale;

  return (
    <ConfigurationProvider value={appConfig}>
      <MomentLocaleLoader locale={locale}>
        <RouteConfigurationProvider value={routeConfig}>{children}</RouteConfigurationProvider>
      </MomentLocaleLoader>
    </ConfigurationProvider>
  );
};

const MaintenanceModeError = props => {
  const { locale, messages, helmetContext } = props;
  return (
    <IntlProvider locale={locale} messages={messages} textComponent="span">
      <HelmetProvider context={helmetContext}>
        <MaintenanceMode />
      </HelmetProvider>
    </IntlProvider>
  );
};

// This displays a warning if environment variable key contains a string "SECRET"
const EnvironmentVariableWarning = props => {
  const suspiciousEnvKey = props.suspiciousEnvKey;
  // https://github.com/sharetribe/flex-integration-api-examples#warning-usage-with-your-web-app--website
  const containsINTEG = str => str.toUpperCase().includes('INTEG');
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <div style={{ width: '600px' }}>
        <p>
          Are you sure you want to reveal to the public web an environment variable called:{' '}
          <b>{suspiciousEnvKey}</b>
        </p>
        <p>
          All the environment variables that start with <i>REACT_APP_</i> prefix will be part of the
          published React app that's running on a browser. Those variables are, therefore, visible
          to anyone on the web. Secrets should only be used on a secure environment like the server.
        </p>
        {containsINTEG(suspiciousEnvKey) ? (
          <p>
            {'Note: '}
            <span style={{ color: 'red' }}>
              Do not use Integration API directly from the web app.
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
};

/**
 * Client App
 * @param {Object} props
 * @param {Object} props.store
 * @param {Object} props.hostedTranslations
 * @param {Object} props.hostedConfig
 * @param {string} props.locale URL locale segment ('en' | 'lt')
 * @returns {JSX.Element}
 */
export const ClientApp = props => {
  const { store, hostedTranslations = {}, hostedConfig = {}, locale = DEFAULT_LOCALE } = props;
  const appConfig = mergeConfig(hostedConfig, defaultConfig);
  const intlLocale = toIntlLocale(locale);
  const messages = buildMessages(locale, hostedTranslations);

  useEffect(() => {
    // Clear referral data from session storage the expiration time has passed
    clearReferralDataIfExpired();

    // If URL contains new referral data, store it
    const urlReferralParams = parse(window?.location?.search);
    const { userTypes = [] } = appConfig.user;
    const isAuthenticated = store.getState()?.auth?.isAuthenticated;

    // Check if URL contains valid referral params.
    const validReferralParams = filterValidReferralData(urlReferralParams, userTypes);
    // Don't store referral data if the user is authenticated - meaning they have already completed
    // signup and have been redirected back here
    if (!isAuthenticated && !isEmpty(validReferralParams)) {
      storeReferralData(validReferralParams);
    }
  }, []);

  // Show warning on the localhost:3000, if the environment variable key contains "SECRET"
  if (appSettings.dev) {
    const envVars = process.env || {};
    const envVarKeys = Object.keys(envVars);
    const containsSECRET = str => str.toUpperCase().includes('SECRET');
    const suspiciousSECRETKey = envVarKeys.find(
      key => key.startsWith('REACT_APP_') && containsSECRET(key)
    );

    if (suspiciousSECRETKey) {
      return <EnvironmentVariableWarning suspiciousEnvKey={suspiciousSECRETKey} />;
    }
  }

  // Show MaintenanceMode if the mandatory configurations are not available
  if (!appConfig.hasMandatoryConfigurations) {
    return <MaintenanceModeError locale={intlLocale} messages={messages} />;
  }

  // Marketplace color and the color for <PrimaryButton> come from configs
  // If set, we need to create CSS Property and set it to DOM (documentElement is selected here)
  // This provides marketplace color for everything under <html> tag (including modals/portals)
  // Note: This is also set on Page component to provide server-side rendering.
  const elem = window.document.documentElement;
  includeCSSProperties(appConfig.branding, elem);

  // This gives good input for debugging issues on live environments, but with test it's not needed.
  const logLoadDataCalls = appSettings?.env !== 'test';

  return (
    <Configurations appConfig={appConfig} intlLocale={intlLocale}>
      <IntlProvider locale={intlLocale} messages={messages} textComponent="span">
        <Provider store={store}>
          <HelmetProvider>
            <IncludeScripts config={appConfig} initialPathname={window.location.pathname} />
            <BrowserRouter basename={`/${locale}`}>
              <Routes logLoadDataCalls={logLoadDataCalls} />
            </BrowserRouter>
          </HelmetProvider>
        </Provider>
      </IntlProvider>
    </Configurations>
  );
};

/**
 * Server App
 * @param {Object} props
 * @param {string} props.url
 * @param {Object} props.context
 * @param {Object} props.helmetContext
 * @param {Object} props.store
 * @param {Object} props.hostedTranslations
 * @param {Object} props.hostedConfig
 * @param {string} props.locale URL locale segment ('en' | 'lt')
 * @returns {JSX.Element}
 */
export const ServerApp = props => {
  const {
    url,
    context,
    helmetContext,
    store,
    hostedTranslations = {},
    hostedConfig = {},
    locale = DEFAULT_LOCALE,
  } = props;
  const appConfig = mergeConfig(hostedConfig, defaultConfig);
  const intlLocale = toIntlLocale(locale);
  const messages = buildMessages(locale, hostedTranslations);
  HelmetProvider.canUseDOM = false;

  // Show MaintenanceMode if the mandatory configurations are not available
  if (!appConfig.hasMandatoryConfigurations) {
    return (
      <MaintenanceModeError locale={intlLocale} messages={messages} helmetContext={helmetContext} />
    );
  }

  return (
    <Configurations appConfig={appConfig} intlLocale={intlLocale}>
      <IntlProvider locale={intlLocale} messages={messages} textComponent="span">
        <Provider store={store}>
          <HelmetProvider context={helmetContext}>
            <IncludeScripts config={appConfig} initialPathname={url} />
            <StaticRouter location={url} context={context} basename={`/${locale}`}>
              <Routes />
            </StaticRouter>
          </HelmetProvider>
        </Provider>
      </IntlProvider>
    </Configurations>
  );
};

/**
 * Render the given route.
 *
 * @param {String} url Path to render
 * @param {Object} serverContext Server rendering context from react-router
 *
 * @returns {Object} Object with keys:
 *  - {String} body: Rendered application body of the given route
 *  - {Object} head: Application head metadata from react-helmet
 */
export const renderApp = (
  url,
  serverContext,
  preloadedState,
  hostedTranslations,
  hostedConfig,
  collectChunks,
  locale
) => {
  // Don't pass an SDK instance since we're only rendering the
  // component tree with the preloaded store state and components
  // shouldn't do any SDK calls in the (server) rendering lifecycle.
  const store = configureStore({ initialState: preloadedState });

  const helmetContext = {};

  // When rendering the app on server, we wrap the app with webExtractor.collectChunks
  // This is needed to figure out correct chunks/scripts to be included to server-rendered page.
  // https://loadable-components.com/docs/server-side-rendering/#3-setup-chunkextractor-server-side
  const WithChunks = collectChunks(
    <ServerApp
      url={url}
      context={serverContext}
      helmetContext={helmetContext}
      store={store}
      hostedTranslations={hostedTranslations}
      hostedConfig={hostedConfig}
      locale={locale}
    />
  );

  // Let's keep react-dom/server out of the main code-chunk.
  return import('react-dom/server').then(mod => {
    const { default: ReactDOMServer } = mod;
    const body = ReactDOMServer.renderToString(WithChunks);
    const { helmet: head } = helmetContext;
    return { head, body };
  });
};
