import React, { act } from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { fakeIntl } from '../../util/testData';

import AuthenticationPage from './AuthenticationPage';

// Promo surfaces depend on the date. Keep the promotion ended by default so these tests
// don't change behaviour with the calendar; the promo tests below switch it on.
jest.mock('../../config/configPromo', () => ({
  promo: { id: 'test-promo', startsAt: null, endsAt: '2000-01-01T00:00:00Z' },
}));
const { promo } = jest.requireMock('../../config/configPromo');

const { screen, waitFor, userEvent } = testingLibrary;

const noop = () => null;

const props = {
  tab: 'login',
  isAuthenticated: false,
  authInProgress: false,
  scrollingDisabled: false,
  onLogout: noop,
  onManageDisableScrolling: noop,
  onResendVerificationEmail: noop,
  submitLogin: noop,
  submitSignup: noop,
  sendVerificationEmailInProgress: false,

  location: { state: { from: '/protected' } },

  intl: fakeIntl,
};

describe('AuthenticationPage', () => {
  beforeEach(() => {
    // This is not defined by default on test env. AuthenticationPage needs it.
    window.scrollTo = jest.fn();

    process.env = Object.assign(process.env, { REACT_APP_FACEBOOK_APP_ID: '' });
    process.env = Object.assign(process.env, { REACT_APP_GOOGLE_CLIENT_ID: '' });
  });

  afterAll(() => {
    // Remove window.scrollTo
    jest.clearAllMocks();
  });

  it('has just email and password inputs in login tab if social logins are not enabled', async () => {
    // We want to make sure that during the test the env variables
    // for social logins are as we expect them to be
    process.env = Object.assign(process.env, { REACT_APP_FACEBOOK_APP_ID: '' });
    process.env = Object.assign(process.env, { REACT_APP_GOOGLE_CLIENT_ID: '' });

    await act(async () => {
      render(<AuthenticationPage {...props} />);
    });

    expect(screen.getByRole('textbox', { name: 'LoginForm.emailLabel' })).toBeInTheDocument();
    expect(screen.getByLabelText('LoginForm.passwordLabel')).toBeInTheDocument();

    // The standard getBy methods throw an error when they can't find an element,
    // so if you want to make an assertion that an element is not present in the DOM,
    // you can use queryBy APIs instead:
    expect(
      screen.queryByRole('button', { name: 'AuthenticationPage.loginWithFacebook' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'AuthenticationPage.loginWithGoogle' })
    ).not.toBeInTheDocument();
  });

  it('does not mount the legal documents until their modal is opened', async () => {
    await act(async () => {
      render(<AuthenticationPage {...props} tab="signup" />, { withPortals: true });
    });

    expect(document.getElementById('section-1')).not.toBeInTheDocument();
    expect(screen.queryByText('TermsOfServicePage.title')).not.toBeInTheDocument();
  });

  it('changes the login form to sign up form by clicking "Sign up" ', async () => {
    // We want to make sure that during the test the env variables
    // for social logins are as we expect them to be
    process.env = Object.assign(process.env, { REACT_APP_FACEBOOK_APP_ID: '' });
    process.env = Object.assign(process.env, { REACT_APP_GOOGLE_CLIENT_ID: '' });
    const user = userEvent.setup();

    render(<AuthenticationPage {...props} />);

    // First we can check that login button is in the document
    expect(screen.getByRole('button', { name: 'LoginForm.logIn' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'AuthenticationPage.signupLinkText' }));

    // Then we can check that login sign up button is in the document
    waitFor(() =>
      expect(screen.findByRole('button', { name: 'SignupForm.signUp' })).toBeInTheDocument()
    );
  });
});

describe('AuthenticationPage during a promotion', () => {
  beforeEach(() => {
    window.scrollTo = jest.fn();
    // TopbarSimplified (the slim header on the promo sign-up page) needs matchMedia.
    window.matchMedia = jest.fn(() => ({
      matches: false,
      addEventListener: noop,
      removeEventListener: noop,
    }));
    process.env = Object.assign(process.env, { REACT_APP_FACEBOOK_APP_ID: '' });
    process.env = Object.assign(process.env, { REACT_APP_GOOGLE_CLIENT_ID: '' });
    promo.endsAt = '2999-01-01T00:00:00Z';
  });

  afterEach(() => {
    promo.endsAt = '2000-01-01T00:00:00Z';
    delete window.matchMedia;
  });

  it('shows the offer next to the sign-up form', async () => {
    await act(async () => {
      render(<AuthenticationPage {...props} tab="signup" />);
    });

    expect(screen.getByText('AuthenticationPage.promoTitleLead')).toBeInTheDocument();
    expect(screen.getByText('AuthenticationPage.promoSubtitle')).toBeInTheDocument();
    expect(screen.queryByText('AuthenticationPage.brandTitleSignupLead')).not.toBeInTheDocument();
  });

  it('keeps the regular brand panel on the login tab', async () => {
    await act(async () => {
      render(<AuthenticationPage {...props} tab="login" />);
    });

    expect(screen.getByText('AuthenticationPage.brandTitleLoginLead')).toBeInTheDocument();
    expect(screen.queryByText('AuthenticationPage.promoTitleLead')).not.toBeInTheDocument();
  });
});

describe('AuthenticationPage with SSO', () => {
  beforeEach(() => {
    // This is not defined by default on test env. AuthenticationPage needs it.
    window.scrollTo = jest.fn();
  });

  afterAll(() => {
    // Remove window.scrollTo
    jest.clearAllMocks();
  });

  it('has social login buttons on login tab when the env variables are in place', () => {
    // We want to make sure that during the test the env variables
    // for social logins are as we expect them to be
    process.env = Object.assign(process.env, { REACT_APP_FACEBOOK_APP_ID: 'test-fb' });
    process.env = Object.assign(process.env, { REACT_APP_GOOGLE_CLIENT_ID: 'test-google' });

    render(<AuthenticationPage {...props} />);

    expect(
      screen.getByRole('button', { name: 'AuthenticationPage.loginWithFacebook' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'AuthenticationPage.loginWithGoogle' })
    ).toBeInTheDocument();
  });
});
