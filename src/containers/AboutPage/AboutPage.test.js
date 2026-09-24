import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import AboutPage from './AboutPage';

import aboutEn from './content/en';
import aboutLt from './content/lt';
import aboutPl from './content/pl';

const { screen, waitFor } = testingLibrary;

describe('AboutPage', () => {
  it('renders the code-owned story, highlights and related pages', async () => {
    render(<AboutPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('AboutPage.title');

    await waitFor(() => {
      expect(screen.getByText(/Buying pre-owned technology online/)).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { level: 2, name: 'Buyer protection' })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /FaqPage\.title/ })).toHaveAttribute('href', '/p/faq');
    expect(screen.getByRole('link', { name: /MarketplacePoliciesPage\.title/ })).toHaveAttribute(
      'href',
      '/p/market-policies'
    );
  });
});

describe('About content', () => {
  const ids = doc => doc.highlights.map(h => h.id);

  it.each([
    ['lt', aboutLt],
    ['pl', aboutPl],
  ])('%s keeps the English highlights', (_locale, doc) => {
    expect(ids(doc)).toEqual(ids(aboutEn));
    expect(doc.body.trim().split(/\n{2,}/)).toHaveLength(aboutEn.body.trim().split(/\n{2,}/).length);
  });
});
