import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import type { SplitPolicy, TranslationStyle } from '@just-speak-it/contract';

import { useSettings, type ThemeScheme } from '@/features/settings/settings-store';
import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { Spacing } from '@/shared/legacy/theme';
import { ThemedText } from '@/shared/legacy/themed-text';
import { GlideOptionSurface } from '@/shared/legacy/ui/glide-option-surface';

type SelectorOption<T extends string> = {
  activeBackgroundColor: string;
  activeCaptionColor?: string;
  activeTextColor: string;
  caption?: string;
  icon: SymbolViewProps['name'];
  label: string;
  value: T;
};

const Colors = {
  aqua: '#65D7F2',
  blue: '#276EF1',
  coral: '#FF7661',
  cream: '#FFFFFF',
  dark: '#111111',
  ink: '#111111',
  lemon: '#F4E75E',
  mint: '#2FDD6C',
  orange: '#FF9F45',
  paper: '#FFF6E7',
  purple: '#9B7CFF',
  white: '#FFFFFF',
} as const;

const ThemeOptions: SelectorOption<ThemeScheme>[] = [
  {
    value: 'light',
    label: 'ライト',
    icon: { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' },
    activeBackgroundColor: Colors.lemon,
    activeTextColor: Colors.ink,
  },
  {
    value: 'dark',
    label: 'ダーク',
    icon: { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' },
    activeBackgroundColor: Colors.dark,
    activeTextColor: Colors.white,
  },
];

const SplitPolicyOptions: SelectorOption<SplitPolicy>[] = [
  {
    value: 'meaning_unit',
    label: '自然なまとまり',
    caption: '流れを保って分ける',
    icon: { ios: 'text.bubble.fill', android: 'chat_bubble', web: 'chat_bubble' },
    activeBackgroundColor: Colors.blue,
    activeTextColor: Colors.white,
    activeCaptionColor: 'rgba(255, 255, 255, 0.82)',
  },
  {
    value: 'small_steps',
    label: '細かく分ける',
    caption: '短いカードにする',
    icon: { ios: 'rectangle.split.2x1.fill', android: 'splitscreen', web: 'splitscreen' },
    activeBackgroundColor: Colors.orange,
    activeTextColor: Colors.ink,
  },
];

const TranslationStyleOptions: SelectorOption<TranslationStyle>[] = [
  {
    value: 'native',
    label: '自然さ優先',
    caption: 'ネイティブ表現',
    icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
    activeBackgroundColor: Colors.purple,
    activeTextColor: Colors.white,
    activeCaptionColor: 'rgba(255, 255, 255, 0.82)',
  },
  {
    value: 'simple',
    label: '簡単さ優先',
    caption: 'やさしい語彙と文',
    icon: { ios: 'textformat.size', android: 'format_size', web: 'format_size' },
    activeBackgroundColor: Colors.mint,
    activeTextColor: Colors.ink,
  },
];

export function ThemeSchemeSelector() {
  const settings = useSettings();

  return (
    <SettingsOptionSection
      currentValue={settings.themeScheme}
      kicker="Look"
      kickerColor={Colors.mint}
      minOptionWidth={128}
      onChange={settings.setThemeScheme}
      options={ThemeOptions}
      title="表示モード"
    />
  );
}

export function SplitPolicySelector() {
  const settings = useSettings();

  return (
    <SettingsOptionSection
      currentValue={settings.splitPolicy}
      kicker="Build"
      kickerColor={Colors.coral}
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
      currentValue={settings.translationStyle}
      kicker="Translate"
      kickerColor={Colors.mint}
      minOptionWidth={184}
      onChange={settings.setTranslationStyle}
      options={TranslationStyleOptions}
      stacked
      title="英訳スタイル"
    />
  );
}

function SettingsOptionSection<T extends string>({
  currentValue,
  kicker,
  kickerColor,
  minOptionWidth,
  onChange,
  options,
  stacked = false,
  title,
}: {
  currentValue: T;
  kicker: string;
  kickerColor: string;
  minOptionWidth: number;
  onChange: (value: T) => void;
  options: SelectorOption<T>[];
  stacked?: boolean;
  title: string;
}) {
  const palette = useDailyPalette();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionKicker, { backgroundColor: kickerColor }]}>
          <ThemedText style={styles.sectionKickerText}>{kicker}</ThemedText>
        </View>
        <ThemedText style={[styles.sectionTitle, { color: palette.text }]} selectable>
          {title}
        </ThemedText>
      </View>

      <View
        style={[styles.optionRow, stacked ? styles.stackedOptionRow : null]}
        accessibilityRole="radiogroup"
      >
        {options.map((option) => {
          const isSelected = option.value === currentValue;
          const textColor = isSelected ? option.activeTextColor : Colors.ink;
          const captionColor = isSelected
            ? option.activeCaptionColor ?? 'rgba(17, 17, 17, 0.66)'
            : 'rgba(17, 17, 17, 0.66)';

          return (
            <GlideOptionSurface
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              containerStyle={
                stacked
                  ? styles.stackedOptionSurface
                  : [styles.optionSurface, { minWidth: minOptionWidth }]
              }
              onPress={() => onChange(option.value)}
              selected={isSelected}
              style={[
                styles.optionButton,
                {
                  backgroundColor: isSelected
                    ? option.activeBackgroundColor
                    : Colors.paper,
                },
              ]}
            >
              <View style={[styles.iconBadge, !option.caption && styles.themeIconBadge]}>
                <SymbolView
                  name={option.icon}
                  size={option.caption ? 19 : 18}
                  tintColor={Colors.ink}
                  fallback={<ThemedText style={styles.iconFallback}>{'>'}</ThemedText>}
                />
              </View>
              {option.caption ? (
                <View style={styles.optionCopy}>
                  <ThemedText numberOfLines={1} style={[styles.optionLabel, { color: textColor }]}>
                    {option.label}
                  </ThemedText>
                  <ThemedText
                    numberOfLines={1}
                    style={[styles.optionCaption, { color: captionColor }]}
                  >
                    {option.caption}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText
                  numberOfLines={1}
                  style={[styles.optionLabel, styles.themeOptionLabel, { color: textColor }]}
                >
                  {option.label}
                </ThemedText>
              )}
              <View
                style={[
                  styles.selectionDot,
                  {
                    backgroundColor: isSelected ? textColor : 'transparent',
                    borderColor: textColor,
                  },
                ]}
              />
            </GlideOptionSurface>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.three },
  sectionHeader: { gap: Spacing.two },
  sectionKicker: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: Colors.ink,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  sectionKickerText: {
    color: Colors.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 900,
    textTransform: 'uppercase',
  },
  sectionTitle: { fontSize: 26, lineHeight: 32, fontWeight: 900 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  stackedOptionRow: { flexDirection: 'column', flexWrap: 'nowrap' },
  optionSurface: { flex: 1 },
  stackedOptionSurface: { width: '100%' },
  optionButton: { alignItems: 'center', justifyContent: 'center' },
  iconBadge: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderCurve: 'continuous',
    borderWidth: 3,
    borderColor: Colors.ink,
    backgroundColor: Colors.cream,
  },
  themeIconBadge: { width: 34, height: 34, borderRadius: 12 },
  iconFallback: { color: Colors.ink, fontSize: 14, lineHeight: 18, fontWeight: 900 },
  optionCopy: { flex: 1, minWidth: 0, gap: Spacing.half },
  optionLabel: { fontSize: 17, lineHeight: 22, fontWeight: 900 },
  themeOptionLabel: { flex: 1, minWidth: 0 },
  optionCaption: { fontSize: 12, lineHeight: 16, fontWeight: 900 },
  selectionDot: { width: 16, height: 16, borderRadius: 999, borderWidth: 3 },
});
