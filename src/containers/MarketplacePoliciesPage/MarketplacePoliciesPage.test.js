import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import MarketplacePoliciesPage from './MarketplacePoliciesPage';

const { screen, waitFor } = testingLibrary;

describe('MarketplacePoliciesPage', () => {
  it('renders the code-owned policies with a table of contents and the legal switcher', async () => {
    render(<MarketplacePoliciesPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'MarketplacePoliciesPage.title'
    );

    await waitFor(() => {
      expect(document.getElementById('section-1')).toHaveTextContent('Buyer Protection');
    });
    expect(document.getElementById('section-1-17-1')).toHaveTextContent('Strictly Prohibited');
    expect(screen.getAllByRole('link', { name: /Fees & Commissions/ })[0]).toHaveAttribute(
      'href',
      '#section-5'
    );

    const switcher = screen.getByRole('navigation', { name: 'LegalPage.switcherLabel' });
    expect(switcher).toHaveTextContent('TermsOfServicePage.title');
    expect(switcher).toHaveTextContent('PrivacyPolicyPage.title');
    expect(switcher).toHaveTextContent('MarketplacePoliciesPage.title');
  });
});
