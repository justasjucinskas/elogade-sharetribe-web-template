import {
  addLocaleToExtendedData,
  getHandleSubmitConfirm,
  getHandleSubmitSignup,
} from './AuthenticationPage.helpers';

const userTypes = [{ userType: 'member' }];
const userFields = [
  {
    key: 'phone',
    scope: 'public',
    schemaType: 'text',
    userTypeConfig: { limitToUserTypeIds: false },
  },
];

const signupValues = {
  userType: 'member',
  email: 'jane@example.com',
  password: 'secret123',
  fname: ' Jane ',
  lname: ' Doe ',
  pub_phone: '123',
  terms: ['tos-and-privacy-accepted'],
};

describe('addLocaleToExtendedData', () => {
  it('adds a supported locale to publicData', () => {
    const extendedData = { publicData: { userType: 'member' }, privateData: {} };
    expect(addLocaleToExtendedData(extendedData, 'pl')).toEqual({
      publicData: { locale: 'pl', userType: 'member' },
      privateData: {},
    });
  });

  it('creates publicData when there is no extended data', () => {
    expect(addLocaleToExtendedData({}, 'lt')).toEqual({ publicData: { locale: 'lt' } });
  });

  it('ignores unsupported or missing locales', () => {
    expect(addLocaleToExtendedData({}, 'de')).toEqual({});
    expect(addLocaleToExtendedData({}, undefined)).toEqual({});
  });

  it('does not overwrite a user-field value with the same key', () => {
    expect(addLocaleToExtendedData({ publicData: { locale: 'custom' } }, 'en')).toEqual({
      publicData: { locale: 'custom' },
    });
  });
});

describe('getHandleSubmitSignup', () => {
  it('stores the UI locale next to the user-field values', () => {
    const submitSignup = jest.fn();
    getHandleSubmitSignup({ submitSignup, userFields, userTypes, locale: 'lt' })(signupValues);

    expect(submitSignup).toHaveBeenCalledTimes(1);
    const params = submitSignup.mock.calls[0][0];
    expect(params.firstName).toBe('Jane');
    expect(params.publicData).toEqual({ locale: 'lt', userType: 'member', phone: '123' });
  });

  it('stores the locale even when the form has no extra values', () => {
    const submitSignup = jest.fn();
    const { pub_phone, terms, ...minimalValues } = signupValues;
    getHandleSubmitSignup({ submitSignup, userFields: [], userTypes, locale: 'pl' })(minimalValues);

    expect(submitSignup.mock.calls[0][0].publicData).toEqual({ locale: 'pl' });
  });

  it('leaves publicData.locale out without a supported locale', () => {
    const submitSignup = jest.fn();
    getHandleSubmitSignup({ submitSignup, userFields, userTypes })(signupValues);

    expect(submitSignup.mock.calls[0][0].publicData).toEqual({
      userType: 'member',
      phone: '123',
    });
  });
});

describe('getHandleSubmitConfirm', () => {
  it('stores the UI locale for a social-login signup', () => {
    const submitSingupWithIdp = jest.fn();
    const authInfo = { email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe' };
    getHandleSubmitConfirm({
      authInfo,
      submitSingupWithIdp,
      userFields,
      userTypes,
      locale: 'en',
    })({
      userType: 'member',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      pub_phone: '123',
    });

    expect(submitSingupWithIdp).toHaveBeenCalledTimes(1);
    expect(submitSingupWithIdp.mock.calls[0][0].publicData).toEqual({
      locale: 'en',
      userType: 'member',
      phone: '123',
    });
  });
});
