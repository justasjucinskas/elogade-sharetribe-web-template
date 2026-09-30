import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import PromoNotice from './PromoNotice';

jest.mock('../../config/configPromo', () => ({
  promo: { id: 'test-promo', startsAt: null, endsAt: '2999-01-01T00:00:00Z' },
}));
const { promo } = jest.requireMock('../../config/configPromo');

const { screen } = testingLibrary;

describe('PromoNotice', () => {
  beforeEach(() => {
    promo.endsAt = '2999-01-01T00:00:00Z';
  });

  it('shows the seller copy by default', () => {
    render(<PromoNotice />);
    expect(screen.getByText('PromoNotice.sellerTitle')).toBeInTheDocument();
    expect(screen.getByText('PromoNotice.sellerText')).toBeInTheDocument();
  });

  it('shows the buyer copy for the buyer variant', () => {
    render(<PromoNotice variant="buyer" />);
    expect(screen.getByText('PromoNotice.buyerTitle')).toBeInTheDocument();
    expect(screen.queryByText('PromoNotice.sellerTitle')).not.toBeInTheDocument();
  });

  it('renders nothing once the promotion has ended', () => {
    promo.endsAt = '2000-01-01T00:00:00Z';
    const { container } = render(<PromoNotice />);
    expect(container).toBeEmptyDOMElement();
  });
});
