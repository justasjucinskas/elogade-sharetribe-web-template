import React from 'react';
import '@testing-library/jest-dom';

import { fakeIntl } from '../../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';

import TransactionFields from './TransactionFields';

const { screen } = testingLibrary;

describe('TransactionFields', () => {
  const props = processName => ({
    intl: fakeIntl,
    processName,
    role: 'customer',
    isCustomerBanned: false,
    isProviderBanned: false,
    isOfferOrRequest: false,
    protectedData: { customerDefaultMessage: 'Please ship on Friday' },
    transactionFieldConfigs: [],
  });

  it('shows the buyer checkout message on a purchase', () => {
    render(<TransactionFields {...props('default-purchase')} />);
    expect(screen.getByText('Please ship on Friday')).toBeInTheDocument();
  });

  it('shows the buyer checkout message on a paid price offer (offer-purchase)', () => {
    render(<TransactionFields {...props('offer-purchase')} />);
    expect(screen.getByText('Please ship on Friday')).toBeInTheDocument();
  });
});
