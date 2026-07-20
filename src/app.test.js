import React, { act } from 'react';
import ReactDOMClient from 'react-dom/client';
import { getHostedConfiguration } from './util/testHelpers';
import { ClientApp } from './app';
import configureStore from './store';

const jsdomScroll = window.scroll;
beforeAll(() => {
  // Mock window.scroll - otherwise, Jest/JSDOM will print a not-implemented error.
  window.scroll = () => {};
});

afterAll(() => {
  window.scroll = jsdomScroll;
});

describe('Application - JSDOM environment', () => {
  it('renders the landing page without crashing', async () => {
    window.google = { maps: {} };

    // The app boot still fetches hosted assets through hostedAsset > sdk.assetByVersion,
    // and the landing page's loadData queries listings.
    const pageData = {
      data: {
        sections: [],
        _schema: './schema.json',
      },
      meta: {
        version: 'bCsMYVYVawc8SMPzZWJpiw',
      },
    };
    const resolvePageAssetCall = () => Promise.resolve({ data: pageData, status: 200 });
    const fakeSdk = {
      assetByVersion: resolvePageAssetCall,
      assetByAlias: resolvePageAssetCall,
      listings: {
        query: () => Promise.resolve({ data: { data: [], included: [], meta: { totalItems: 0 } } }),
      },
    };
    const store = configureStore({ initialState: {}, sdk: fakeSdk });
    const div = document.createElement('div');
    const root = ReactDOMClient.createRoot(div);

    await act(async () => {
      root.render(<ClientApp store={store} hostedConfig={getHostedConfiguration()} />);
    });
    delete window.google;
  });
});
