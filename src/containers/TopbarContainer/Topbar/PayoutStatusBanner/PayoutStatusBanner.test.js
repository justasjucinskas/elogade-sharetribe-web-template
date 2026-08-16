import React from 'react';
import '@testing-library/jest-dom';

import { createCurrentUser } from '../../../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../../../util/testHelpers';

import PayoutStatusBanner from './PayoutStatusBanner';

const { screen } = testingLibrary;

const noop = () => null;

const sellerState = ({ stripeConnected, stripeAccountData = null, hasListings = true }) => ({
  user: {
    currentUser: createCurrentUser('seller-id', { stripeConnected }),
    currentUserHasListings: hasListings,
  },
  stripeConnectAccount: {
    stripeAccount: stripeAccountData
      ? { id: { uuid: 'stripe-account-id' }, attributes: { stripeAccountData } }
      : null,
    fetchStripeAccountInProgress: false,
    fetchStripeAccountError: null,
  },
});

describe('PayoutStatusBanner', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('shows the missing-payout-details tier for a seller with listings', () => {
    render(<PayoutStatusBanner currentPage="ManageListingsPage" />, {
      initialState: sellerState({ stripeConnected: false }),
    });
    expect(screen.getByText('PayoutStatusBanner.missingText')).toBeInTheDocument();
    expect(screen.getByText('PayoutStatusBanner.missingAction')).toBeInTheDocument();
    // Tier 1 is dismissible
    expect(screen.getByLabelText('PayoutStatusBanner.dismiss')).toBeInTheDocument();
  });

  it('shows the restricted tier without a dismiss button when requirements are past due', () => {
    render(<PayoutStatusBanner currentPage="ManageListingsPage" />, {
      initialState: sellerState({
        stripeConnected: true,
        stripeAccountData: { requirements: { past_due: ['individual.id_number'] } },
      }),
    });
    expect(screen.getByText('PayoutStatusBanner.restrictedText')).toBeInTheDocument();
    expect(screen.queryByLabelText('PayoutStatusBanner.dismiss')).not.toBeInTheDocument();
  });

  it('renders nothing for a seller without listings', () => {
    const { container } = render(<PayoutStatusBanner currentPage="ManageListingsPage" />, {
      initialState: sellerState({ stripeConnected: false, hasListings: false }),
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an onboarded seller with no outstanding requirements', () => {
    const { container } = render(<PayoutStatusBanner currentPage="ManageListingsPage" />, {
      initialState: sellerState({
        stripeConnected: true,
        stripeAccountData: { requirements: { past_due: [], currently_due: [] } },
      }),
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing on StripePayoutPage itself', () => {
    const { container } = render(<PayoutStatusBanner currentPage="StripePayoutPage" />, {
      initialState: sellerState({ stripeConnected: false }),
    });
    expect(container).toBeEmptyDOMElement();
  });
});

export default noop;
