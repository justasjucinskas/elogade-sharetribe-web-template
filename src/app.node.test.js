/**
 * @jest-environment node
 */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { getHostedConfiguration } from './util/testHelpers';
import { ServerApp } from './app';
import configureStore from './store';

const render = (url, context) => {
  const store = configureStore({});

  const helmetContext = {};

  const body = ReactDOMServer.renderToString(
    <ServerApp
      url={url}
      context={context}
      helmetContext={helmetContext}
      store={store}
      hostedConfig={getHostedConfiguration()}
    />
  );

  const { helmet: head } = helmetContext;
  return { head, body };
};

describe('Application - node environment', () => {
  it('renders in the server without crashing', () => {
    render('/', {});
  });

  it('renders the styleguide without crashing', () => {
    render('/styleguide', {});
  });

  it('server renders redirects for pages that require authentication', () => {
    // ServerApp wraps StaticRouter with basename=`/${locale}` (default locale 'en'),
    // so React Router prefixes generated redirect URLs with `/en`.
    const loginPath = '/en/login';
    const signupPath = '/en/signup';
    const urlRedirects = {
      '/l/new': signupPath,
      '/l/listing-title-slug/1234/new/description': signupPath,
      '/l/listing-title-slug/1234/checkout': signupPath,
      '/profile-settings': loginPath,
      '/inbox': loginPath,
      '/inbox/orders': loginPath,
      '/inbox/sales': loginPath,
      '/order/1234': loginPath,
      '/sale/1234': loginPath,
      '/listings': loginPath,
      '/account': loginPath,
      '/account/contact-details': loginPath,
      '/account/change-password': loginPath,
      '/account/payments': loginPath,
      '/verify-email': loginPath,
    };
    Object.entries(urlRedirects).forEach(([url, redirectPath]) => {
      const context = {};
      render(url, context);
      expect(context.url).toEqual(redirectPath);
    });
  });

  it('redirects to correct URLs', () => {
    // Same basename-prefix reason as the previous test.
    const urlRedirects = { '/l': '/en/', '/u': '/en/' };
    Object.entries(urlRedirects).forEach(([url, redirectPath]) => {
      const context = {};
      render(url, context);
      expect(context.url).toEqual(redirectPath);
    });
  });
});
