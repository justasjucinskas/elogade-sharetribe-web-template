import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import FaqPage from './FaqPage';

const { screen, waitFor } = testingLibrary;

describe('FaqPage', () => {
  it('renders the code-owned questions as collapsible items grouped by topic', async () => {
    render(<FaqPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('FaqPage.title');

    await waitFor(() => {
      expect(document.getElementById('faq-shipping')).toHaveTextContent('Shipping and delivery');
    });

    const question = document.getElementById('faq-when-paid');
    expect(question.tagName).toEqual('DETAILS');
    expect(question).toHaveTextContent('When does the seller get paid?');
    expect(question.open).toBe(false);

    expect(screen.getAllByRole('link', { name: /Shipping and delivery/ })[0]).toHaveAttribute(
      'href',
      '#faq-shipping'
    );
    expect(screen.getAllByRole('link', { name: 'support@elogade.com' })[0]).toHaveAttribute(
      'href',
      'mailto:support@elogade.com'
    );
  });

  it('prefixes site-internal links in answers with the reader locale', async () => {
    render(<FaqPage />, { initialState: { locale: { current: 'lt' } } });

    await waitFor(() => {
      expect(document.getElementById('faq-refunds')).toBeInTheDocument();
    });
    const policiesLink = document.getElementById('faq-refunds').querySelector('a');
    expect(policiesLink).toHaveAttribute('href', '/lt/p/market-policies#section-6');
  });
});
