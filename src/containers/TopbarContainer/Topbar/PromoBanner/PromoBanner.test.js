import React from 'react';
import '@testing-library/jest-dom';

import { createCurrentUser } from '../../../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../../../util/testHelpers';

import PromoBanner from './PromoBanner';

// A promotion that runs "forever" by default; individual tests end it.
jest.mock('../../../../config/configPromo', () => ({
  promo: { id: 'test-promo', startsAt: null, endsAt: '2999-01-01T00:00:00Z' },
}));
const { promo } = jest.requireMock('../../../../config/configPromo');

const { screen, fireEvent } = testingLibrary;

const noop = () => null;

const renderBanner = (props = {}, initialState = {}) =>
  render(
    <PromoBanner
      currentPage="SearchPage"
      isAuthenticated={false}
      showCreateListingsLink={true}
      {...props}
    />,
    { initialState }
  );

describe('PromoBanner', () => {
  beforeEach(() => {
    window.localStorage.clear();
    promo.endsAt = '2999-01-01T00:00:00Z';
  });

  it('asks logged-out visitors to sign up', () => {
    renderBanner();
    expect(screen.getByText('PromoBanner.text')).toBeInTheDocument();
    expect(screen.getByText('PromoBanner.signupLink')).toBeInTheDocument();
    expect(screen.queryByText('PromoBanner.textMember')).not.toBeInTheDocument();
  });

  it('sends logged-in users to create a listing', () => {
    renderBanner({ isAuthenticated: true });
    expect(screen.getByText('PromoBanner.textMember')).toBeInTheDocument();
    expect(screen.getByText('PromoBanner.createListingLink')).toBeInTheDocument();
    expect(screen.queryByText('PromoBanner.signupLink')).not.toBeInTheDocument();
  });

  it('sends logged-in users who cannot create listings to browse', () => {
    renderBanner({ isAuthenticated: true, showCreateListingsLink: false });
    expect(screen.getByText('PromoBanner.browseLink')).toBeInTheDocument();
    expect(screen.queryByText('PromoBanner.createListingLink')).not.toBeInTheDocument();
  });

  it('hides and remembers the promo id when dismissed', () => {
    const { container } = renderBanner();
    fireEvent.click(screen.getByLabelText('PromoBanner.dismiss'));
    expect(container).toBeEmptyDOMElement();
    expect(window.localStorage.getItem('PromoBanner.dismissed')).toBe('test-promo');
  });

  it('stays hidden for a visitor who dismissed this promo', () => {
    window.localStorage.setItem('PromoBanner.dismissed', 'test-promo');
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows again for a visitor who dismissed an earlier promo', () => {
    window.localStorage.setItem('PromoBanner.dismissed', 'older-promo');
    renderBanner();
    expect(screen.getByText('PromoBanner.text')).toBeInTheDocument();
  });

  it('renders nothing on the sign-up and checkout pages', () => {
    expect(renderBanner({ currentPage: 'SignupPage' }).container).toBeEmptyDOMElement();
    expect(renderBanner({ currentPage: 'CheckoutPage' }).container).toBeEmptyDOMElement();
  });

  it('renders nothing once the promotion has ended', () => {
    promo.endsAt = '2000-01-01T00:00:00Z';
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('gives way to the payout warning', () => {
    const { container } = renderBanner(
      { isAuthenticated: true },
      {
        user: {
          currentUser: createCurrentUser('seller-id', { stripeConnected: false }),
          currentUserHasListings: true,
        },
      }
    );
    expect(container).toBeEmptyDOMElement();
  });
});

export default noop;
