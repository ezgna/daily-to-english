import type { SplitPolicy, TranslationStyle } from '@just-speak-it/contract';

import {
  SettingsOptionSection,
  type SettingsSelectorOption,
} from '@/features/settings/settings-option-section';
import { useSettings, type ThemeScheme } from '@/features/settings/settings-store';
import { SettingsColors } from '@/features/settings/settings-theme';

const ThemeOptions: SettingsSelectorOption<ThemeScheme>[] = [
  {
    value: 'light',
    label: 'ライト',
    icon: { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' },
    activeBackgroundColor: SettingsColors.lemon,
    activeTextColor: SettingsColors.ink,
  },
  {
    value: 'dark',
    label: 'ダーク',
    icon: { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' },
    activeBackgroundColor: SettingsColors.darkSurface,
    activeTextColor: SettingsColors.white,
    selectedBorderColor: SettingsColors.white,
  },
];

const SplitPolicyOptions: SettingsSelectorOption<SplitPolicy>[] = [
  {
    value: 'meaning_unit',
    label: '自然なまとまり',
    caption: '話の流れを保って分ける',
    icon: { ios: 'text.bubble.fill', android: 'chat_bubble', web: 'chat_bubble' },
    activeBackgroundColor: SettingsColors.blue,
    activeTextColor: SettingsColors.white,
    activeCaptionColor: 'rgba(255, 255, 255, 0.82)',
  },
  {
    value: 'small_steps',
    label: '細かく分ける',
    caption: '短いカードで少しずつ覚える',
    icon: { ios: 'rectangle.split.2x1.fill', android: 'splitscreen', web: 'splitscreen' },
    activeBackgroundColor: SettingsColors.orange,
    activeTextColor: SettingsColors.ink,
  },
];

const TranslationStyleOptions: SettingsSelectorOption<TranslationStyle>[] = [
  {
    value: 'native',
    label: '自然さ優先',
    caption: '英語らしい自然な表現にする',
    icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
    activeBackgroundColor: SettingsColors.purple,
    activeTextColor: SettingsColors.white,
    activeCaptionColor: 'rgba(255, 255, 255, 0.82)',
  },
  {
    value: 'simple',
    label: '簡単さ優先',
    caption: 'やさしい語彙と短い文にする',
    icon: { ios: 'textformat.size', android: 'format_size', web: 'format_size' },
    activeBackgroundColor: SettingsColors.mint,
    activeTextColor: SettingsColors.ink,
  },
];

export function ThemeSchemeSelector() {
  const settings = useSettings();

  return (
    <SettingsOptionSection
      accentColor={SettingsColors.lemon}
      currentValue={settings.themeScheme}
      description="アプリ全体の明るさを切り替えます。"
      minOptionWidth={128}
      onChange={settings.setThemeScheme}
      options={ThemeOptions}
      title="見た目"
    />
  );
}

export function SplitPolicySelector() {
  const settings = useSettings();

  return (
    <SettingsOptionSection
      accentColor={SettingsColors.orange}
      currentValue={settings.splitPolicy}
      description="話した内容を、練習カードへ分ける粒度です。"
      minOptionWidth={184}
      onChange={settings.setSplitPolicy}
      options={SplitPolicyOptions}
      stacked
      title="カードの分け方"
    />
  );
}

export function TranslationStyleSelector() {
  const settings = useSettings();

  return (
    <SettingsOptionSection
      accentColor={SettingsColors.purple}
      accentTextColor={SettingsColors.white}
      currentValue={settings.translationStyle}
      description="日本語から作る英語の方向性を選びます。"
      minOptionWidth={184}
      onChange={settings.setTranslationStyle}
      options={TranslationStyleOptions}
      stacked
      title="英語の仕上がり"
    />
  );
}
