import { createSlice } from '@reduxjs/toolkit';

import { DEFAULT_LOCALE, isSupportedLocale } from '../config/configLocale';

// ================ Slice ================ //

const initialState = {
  current: DEFAULT_LOCALE,
};

const localeSlice = createSlice({
  name: 'locale',
  initialState,
  reducers: {
    setLocale: (state, action) => {
      const next = action.payload;
      state.current = isSupportedLocale(next) ? next : DEFAULT_LOCALE;
    },
  },
});

// ================ Exports ================ //

export const { setLocale } = localeSlice.actions;
export default localeSlice.reducer;
