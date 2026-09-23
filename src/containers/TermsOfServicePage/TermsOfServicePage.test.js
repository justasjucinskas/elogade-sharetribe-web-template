import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import TermsOfServicePage, { TermsOfServiceContent } from './TermsOfServicePage';

const { screen, waitFor } = testingLibrary;

describe('TermsOfServicePage', () => {
  it('renders the code-owned document with a table of contents', async () => {
    render(<TermsOfServicePage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('TermsOfServicePage.title');

    await waitFor(() => {
      expect(document.getElementById('section-1')).toHaveTextContent(
        'Interpretation and Definitions'
      );
    });
    expect(document.getElementById('section-7-8-1')).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: /Interpretation and Definitions/ })[0]
    ).toHaveAttribute('href', '#section-1');
    // English is the original, so no translation notice.
    expect(screen.queryByText('LegalPage.translationNotice')).not.toBeInTheDocument();
  });

  it('renders content-only for the sign-up modal', async () => {
    render(<TermsOfServiceContent />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: 'TermsOfServicePage.title' })
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByText('LegalPage.tocTitle')).not.toBeInTheDocument();
  });
});
