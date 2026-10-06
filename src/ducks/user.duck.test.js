import { createCurrentUser } from '../util/testData';
import configureStore from '../store';
import { fetchCurrentUser, updateCurrentUserLocale } from './user.duck';

const userWithPublicData = publicData =>
  createCurrentUser('test-user', {
    profile: { displayName: 'Test user', publicData },
  });

const createSdk = currentUser => ({
  authInfo: jest.fn(() => Promise.resolve({})),
  currentUser: {
    show: jest.fn(() => Promise.resolve({ data: { data: currentUser, include: [] } })),
    updateProfile: jest.fn(() => Promise.resolve({ data: { data: currentUser, include: [] } })),
  },
});

const createStore = ({ sdk, currentUser = null, locale = 'lt', isLoggedInAs = false }) =>
  configureStore({
    initialState: {
      auth: { isAuthenticated: true, isLoggedInAs, authInfoLoaded: true },
      user: { currentUser, currentUserHasListings: true },
      locale: { current: locale },
    },
    sdk,
  });

// Profile updates that set the locale (the unread-message check writes privateData).
const localeWrites = sdk =>
  sdk.currentUser.updateProfile.mock.calls.filter(([params]) => params.publicData);

describe('updateCurrentUserLocale', () => {
  it('stores a new locale and updates the store', async () => {
    const currentUser = userWithPublicData({ locale: 'en' });
    const sdk = createSdk(currentUser);
    const store = createStore({ sdk, currentUser });

    const result = await store.dispatch(updateCurrentUserLocale('pl'));

    expect(result).toBe('pl');
    expect(sdk.currentUser.updateProfile).toHaveBeenCalledWith({ publicData: { locale: 'pl' } });
    expect(store.getState().user.currentUser.attributes.profile.publicData).toEqual({
      locale: 'pl',
    });
  });

  it('does not write an unchanged, unsupported or logged-out value', async () => {
    const currentUser = userWithPublicData({ locale: 'lt' });
    const sdk = createSdk(currentUser);

    await createStore({ sdk, currentUser }).dispatch(updateCurrentUserLocale('lt'));
    await createStore({ sdk, currentUser }).dispatch(updateCurrentUserLocale('de'));
    await createStore({ sdk, currentUser: null }).dispatch(updateCurrentUserLocale('en'));

    expect(sdk.currentUser.updateProfile).not.toHaveBeenCalled();
  });

  it('does not write when an operator is logged in as the user', async () => {
    const currentUser = userWithPublicData({});
    const sdk = createSdk(currentUser);
    const store = createStore({ sdk, currentUser, isLoggedInAs: true });

    const result = await store.dispatch(updateCurrentUserLocale('en'));

    expect(result).toBeNull();
    expect(sdk.currentUser.updateProfile).not.toHaveBeenCalled();
  });

  it('resolves to null when the write fails', async () => {
    const currentUser = userWithPublicData({});
    const sdk = createSdk(currentUser);
    sdk.currentUser.updateProfile = jest.fn(() => Promise.reject(new Error('network')));
    const store = createStore({ sdk, currentUser });

    await expect(store.dispatch(updateCurrentUserLocale('en'))).resolves.toBeNull();
  });
});

describe('fetchCurrentUser locale backfill', () => {
  it('stores the URL locale once for a user without one', async () => {
    const sdk = createSdk(userWithPublicData({ userType: 'member' }));
    const store = createStore({ sdk, locale: 'pl' });

    await store.dispatch(fetchCurrentUser({ updateNotifications: false }));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(localeWrites(sdk)).toEqual([[{ publicData: { locale: 'pl' } }]]);
    expect(store.getState().user.currentUser.attributes.profile.publicData).toEqual({
      userType: 'member',
      locale: 'pl',
    });
  });

  it('keeps a stored locale even when the URL locale differs', async () => {
    const sdk = createSdk(userWithPublicData({ locale: 'lt' }));
    const store = createStore({ sdk, locale: 'en' });

    await store.dispatch(fetchCurrentUser({ updateNotifications: false }));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(localeWrites(sdk)).toEqual([]);
  });

  it('does not treat a user fetched without publicData as missing a locale', async () => {
    const sdk = createSdk(createCurrentUser('test-user'));
    const store = createStore({ sdk, locale: 'en' });

    await store.dispatch(fetchCurrentUser({ updateNotifications: false }));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(localeWrites(sdk)).toEqual([]);
  });
});
