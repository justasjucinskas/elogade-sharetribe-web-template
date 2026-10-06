import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import LanguageSwitcher, { switchLocale } from './LanguageSwitcher';

const { screen, fireEvent } = testingLibrary;

describe('switchLocale', () => {
  it('stores the new locale before navigating', async () => {
    const calls = [];
    const onSelectLocale = jest.fn(locale =>
      Promise.resolve().then(() => calls.push(`store ${locale}`))
    );
    const navigate = jest.fn(locale => calls.push(`navigate ${locale}`));

    await switchLocale('pl', { onSelectLocale, navigate });

    expect(calls).toEqual(['store pl', 'navigate pl']);
    expect(document.cookie).toContain('locale=pl');
  });

  it('navigates even when storing fails', async () => {
    const navigate = jest.fn();
    await switchLocale('lt', {
      onSelectLocale: () => Promise.reject(new Error('network')),
      navigate,
    });
    expect(navigate).toHaveBeenCalledWith('lt');
  });

  it('does not wait longer than the timeout', async () => {
    const navigate = jest.fn();
    await switchLocale('en', {
      onSelectLocale: () => new Promise(() => {}),
      navigate,
      timeoutMs: 10,
    });
    expect(navigate).toHaveBeenCalledWith('en');
  });

  it('works without onSelectLocale', async () => {
    const navigate = jest.fn();
    await switchLocale('pl', { navigate });
    expect(navigate).toHaveBeenCalledWith('pl');
  });
});

describe('LanguageSwitcher', () => {
  it('passes the chosen locale to onSelectLocale', () => {
    jest.useFakeTimers();
    // Never resolves and the timers are not advanced, so the test never reaches the reload.
    const onSelectLocale = jest.fn(() => new Promise(() => {}));
    render(<LanguageSwitcher variant="mobile" onSelectLocale={onSelectLocale} />);

    fireEvent.click(screen.getByText('LanguageSwitcher.polish'));
    return Promise.resolve().then(() => {
      expect(onSelectLocale).toHaveBeenCalledWith('pl');
      jest.useRealTimers();
    });
  });

  it('does nothing when the current language is chosen', () => {
    const onSelectLocale = jest.fn();
    render(<LanguageSwitcher variant="mobile" onSelectLocale={onSelectLocale} />);

    fireEvent.click(screen.getByText('LanguageSwitcher.english'));
    expect(onSelectLocale).not.toHaveBeenCalled();
  });
});
