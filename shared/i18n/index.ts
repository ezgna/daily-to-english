import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from '@/shared/i18n/locales/en';
import { ja } from '@/shared/i18n/locales/ja';
import { getLocalString, setLocalString } from '@/shared/storage/local-storage';

export type AppLanguage = 'en' | 'ja';

const LanguageStorageKey = 'just-speak-it:app-language:v1';

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return value === 'en' || value === 'ja';
}

export function getInitialAppLanguage(): AppLanguage {
  const storedLanguage = getLocalString(LanguageStorageKey);

  if (isAppLanguage(storedLanguage)) {
    return storedLanguage;
  }

  return getLocales()[0]?.languageCode === 'ja' ? 'ja' : 'en';
}

export function saveAppLanguage(language: AppLanguage) {
  setLocalString(LanguageStorageKey, language);
}

const initialLanguage = getInitialAppLanguage();

void i18n.use(initReactI18next).init({
  defaultNS: 'translation',
  fallbackLng: 'ja',
  initAsync: false,
  interpolation: {
    escapeValue: false,
  },
  lng: initialLanguage,
  react: {
    useSuspense: false,
  },
  resources: {
    en: { translation: en },
    ja: { translation: ja },
  },
  supportedLngs: ['en', 'ja'],
});

export { i18n };
