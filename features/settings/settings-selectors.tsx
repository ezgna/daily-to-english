import type { SplitPolicy, TranslationStyle } from '@just-speak-it/contract';
import { useTranslation } from 'react-i18next';

import {
  SettingsOptionSection,
  type SettingsSelectorOption,
} from '@/features/settings/settings-option-section';
import { useSettings, type ThemeScheme } from '@/features/settings/settings-store';
import { SettingsColors } from '@/features/settings/settings-theme';
import type { AppLanguage } from '@/shared/i18n';

export function LanguageSelector() {
  const settings = useSettings();
  const { t } = useTranslation();
  const options: SettingsSelectorOption<AppLanguage>[] = [
    {
      value: 'ja',
      label: t('settings.language.japanese'),
      icon: { ios: 'character', android: 'translate', web: 'translate' },
      activeBackgroundColor: SettingsColors.blue,
    },
    {
      value: 'en',
      label: t('settings.language.english'),
      icon: { ios: 'textformat.abc', android: 'language', web: 'language' },
      activeBackgroundColor: SettingsColors.mint,
    },
  ];

  return (
    <SettingsOptionSection
      accentColor={SettingsColors.blue}
      currentValue={settings.appLanguage}
      description={t('settings.language.description')}
      minOptionWidth={128}
      onChange={settings.setAppLanguage}
      options={options}
      title={t('settings.language.title')}
    />
  );
}

export function ThemeSchemeSelector() {
  const settings = useSettings();
  const { t } = useTranslation();
  const options: SettingsSelectorOption<ThemeScheme>[] = [
    {
      value: 'light',
      label: t('settings.appearance.light'),
      icon: { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' },
      activeBackgroundColor: SettingsColors.lemon,
    },
    {
      value: 'dark',
      label: t('settings.appearance.dark'),
      icon: { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' },
      activeBackgroundColor: SettingsColors.slate,
    },
  ];

  return (
    <SettingsOptionSection
      accentColor={SettingsColors.lemon}
      currentValue={settings.themeScheme}
      description={t('settings.appearance.description')}
      minOptionWidth={128}
      onChange={settings.setThemeScheme}
      options={options}
      title={t('settings.appearance.title')}
    />
  );
}

export function SplitPolicySelector() {
  const settings = useSettings();
  const { t } = useTranslation();
  const options: SettingsSelectorOption<SplitPolicy>[] = [
    {
      value: 'meaning_unit',
      label: t('settings.cardSplit.meaningUnit.label'),
      caption: t('settings.cardSplit.meaningUnit.caption'),
      icon: { ios: 'text.bubble.fill', android: 'chat_bubble', web: 'chat_bubble' },
      activeBackgroundColor: SettingsColors.blue,
    },
    {
      value: 'small_steps',
      label: t('settings.cardSplit.smallSteps.label'),
      caption: t('settings.cardSplit.smallSteps.caption'),
      icon: { ios: 'rectangle.split.2x1.fill', android: 'splitscreen', web: 'splitscreen' },
      activeBackgroundColor: SettingsColors.orange,
    },
  ];

  return (
    <SettingsOptionSection
      accentColor={SettingsColors.orange}
      currentValue={settings.splitPolicy}
      description={t('settings.cardSplit.description')}
      minOptionWidth={184}
      onChange={settings.setSplitPolicy}
      options={options}
      stacked
      title={t('settings.cardSplit.title')}
    />
  );
}

export function TranslationStyleSelector() {
  const settings = useSettings();
  const { t } = useTranslation();
  const options: SettingsSelectorOption<TranslationStyle>[] = [
    {
      value: 'native',
      label: t('settings.translationStyle.native.label'),
      caption: t('settings.translationStyle.native.caption'),
      icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
      activeBackgroundColor: SettingsColors.purple,
    },
    {
      value: 'simple',
      label: t('settings.translationStyle.simple.label'),
      caption: t('settings.translationStyle.simple.caption'),
      icon: { ios: 'textformat.size', android: 'format_size', web: 'format_size' },
      activeBackgroundColor: SettingsColors.mint,
    },
  ];

  return (
    <SettingsOptionSection
      accentColor={SettingsColors.purple}
      currentValue={settings.translationStyle}
      description={t('settings.translationStyle.description')}
      minOptionWidth={184}
      onChange={settings.setTranslationStyle}
      options={options}
      stacked
      title={t('settings.translationStyle.title')}
    />
  );
}
