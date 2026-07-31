import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';

import {
  defaultSplitPolicy,
  defaultTranslationStyle,
  isSplitPolicy,
  isTranslationStyle,
  type SplitPolicy,
  type TranslationStyle,
} from '@just-speak-it/contract';

import { getLocalString, setLocalString } from '@/shared/storage/local-storage';

export type ThemeScheme = 'light' | 'dark';

type SettingsValue = {
  themeScheme: ThemeScheme;
  splitPolicy: SplitPolicy;
  translationStyle: TranslationStyle;
  saveRecordings: boolean;
  setThemeScheme: (value: ThemeScheme) => void;
  setSplitPolicy: (value: SplitPolicy) => void;
  setTranslationStyle: (value: TranslationStyle) => void;
  setSaveRecordings: (value: boolean) => void;
};

const SplitPolicyStorageKey = 'just-speak-it:card-split-policy:v2';
const TranslationStyleStorageKey = 'just-speak-it:translation-style:v2';
const SaveRecordingsStorageKey = 'just-speak-it:save-local-recordings:v2';
const ThemeSchemeStorageKey = 'just-speak-it:theme-scheme:v1';
const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [themeScheme, setThemeSchemeState] = useState<ThemeScheme>(() => {
    const stored = getLocalString(ThemeSchemeStorageKey);
    return stored === 'light' || stored === 'dark'
      ? stored
      : Appearance.getColorScheme() === 'dark'
        ? 'dark'
        : 'light';
  });
  const [splitPolicy, setSplitPolicyState] = useState<SplitPolicy>(() => {
    const stored = getLocalString(SplitPolicyStorageKey);
    return isSplitPolicy(stored) ? stored : defaultSplitPolicy;
  });
  const [translationStyle, setTranslationStyleState] = useState<TranslationStyle>(() => {
    const stored = getLocalString(TranslationStyleStorageKey);
    return isTranslationStyle(stored) ? stored : defaultTranslationStyle;
  });
  const [saveRecordings, setSaveRecordingsState] = useState(() => {
    return getLocalString(SaveRecordingsStorageKey) !== 'false';
  });

  useEffect(() => {
    Appearance.setColorScheme(themeScheme);
  }, [themeScheme]);

  const setThemeScheme = useCallback((value: ThemeScheme) => {
    setThemeSchemeState(value);
    setLocalString(ThemeSchemeStorageKey, value);
  }, []);

  const setSplitPolicy = useCallback((value: SplitPolicy) => {
    setSplitPolicyState(value);
    setLocalString(SplitPolicyStorageKey, value);
  }, []);

  const setTranslationStyle = useCallback((value: TranslationStyle) => {
    setTranslationStyleState(value);
    setLocalString(TranslationStyleStorageKey, value);
  }, []);

  const setSaveRecordings = useCallback((value: boolean) => {
    setSaveRecordingsState(value);
    setLocalString(SaveRecordingsStorageKey, value ? 'true' : 'false');
  }, []);

  const value = useMemo(
    () => ({
      themeScheme,
      splitPolicy,
      translationStyle,
      saveRecordings,
      setThemeScheme,
      setSplitPolicy,
      setTranslationStyle,
      setSaveRecordings,
    }),
    [
      themeScheme,
      splitPolicy,
      translationStyle,
      saveRecordings,
      setThemeScheme,
      setSplitPolicy,
      setTranslationStyle,
      setSaveRecordings,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = use(SettingsContext);

  if (!context) {
    throw new Error('useSettings must be used inside SettingsProvider.');
  }

  return context;
}
