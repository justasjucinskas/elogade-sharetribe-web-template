import React from 'react';
import { Route } from 'react-router-dom';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import { CMSPageComponent } from './CMSPage';
import { loadData } from './CMSPage.duck';

const { screen } = testingLibrary;

describe('CMSPage', () => {
  it.each(['terms-of-service', 'privacy-policy'])(
    'does not fetch the stale Console asset for code-owned /p/%s',
    async pageId => {
      const dispatch = jest.fn();
      await loadData({ pageId })(dispatch, () => ({ locale: { current: 'lt' } }));
      expect(dispatch).not.toHaveBeenCalled();
    }
  );

  it('redirects code-owned slugs to their named route', async () => {
    render(
      <>
        <CMSPageComponent params={{ pageId: 'privacy-policy' }} inProgress={false} error={null} />
        <Route render={({ location }) => <output>{location.pathname}</output>} />
      </>
    );
    expect(await screen.findByRole('status')).toHaveTextContent('/privacy-policy');
  });
});
