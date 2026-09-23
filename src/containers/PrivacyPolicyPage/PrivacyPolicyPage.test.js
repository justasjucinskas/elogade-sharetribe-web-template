import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import PrivacyPolicyPage from './PrivacyPolicyPage';

const { screen, waitFor } = testingLibrary;

describe('PrivacyPolicyPage', () => {
  it('renders the code-owned document with a table of contents', async () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('PrivacyPolicyPage.title');

    await waitFor(() => {
      expect(document.getElementById('section-6')).toHaveTextContent('GDPR Privacy');
    });
    expect(document.getElementById('section-3-1-4')).toHaveTextContent(
      'Tracking Technologies and Cookies'
    );
    expect(screen.getByRole('link', { name: 'support@elogade.com' })).toHaveAttribute(
      'href',
      'mailto:support@elogade.com'
    );
    expect(screen.getByRole('link', { name: 'https://stripe.com/us/privacy' })).toHaveAttribute(
      'target',
      '_blank'
    );
  });
});
