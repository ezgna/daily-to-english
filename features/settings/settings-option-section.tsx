import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { SettingsSection } from '@/features/settings/settings-section';
import { SettingsColors } from '@/features/settings/settings-theme';
import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { Spacing } from '@/shared/legacy/theme';
import { ThemedText } from '@/shared/legacy/themed-text';
import { GlideOptionSurface } from '@/shared/legacy/ui/glide-option-surface';

export type SettingsSelectorOption<T extends string> = {
  activeBackgroundColor: string;
  activeCaptionColor?: string;
  activeTextColor: string;
  caption?: string;
  icon: SymbolViewProps['name'];
  label: string;
  selectedBorderColor?: string;
  value: T;
};

export function SettingsOptionSection<T extends string>({
  accentColor,
  accentTextColor,
  currentValue,
  description,
  minOptionWidth,
  onChange,
  options,
  stacked = false,
  title,
}: {
  accentColor: string;
  accentTextColor?: string;
  currentValue: T;
  description: string;
  minOptionWidth: number;
  onChange: (value: T) => void;
  options: SettingsSelectorOption<T>[];
  stacked?: boolean;
  title: string;
}) {
  const palette = useDailyPalette();
  const currentOption = options.find((option) => option.value === currentValue);
  const optionFoundationColor =
    palette.background === '#000000' ? SettingsColors.foundation : undefined;

  return (
    <SettingsSection
      accentColor={accentColor}
      accentTextColor={accentTextColor}
      badge={currentOption?.label}
      description={description}
      title={title}
    >
      <View
        accessibilityLabel={title}
        accessibilityRole="radiogroup"
        style={[styles.optionRow, stacked ? styles.stackedOptionRow : null]}
      >
        {options.map((option) => {
          const isSelected = option.value === currentValue;
          const textColor = isSelected ? option.activeTextColor : SettingsColors.ink;
          const captionColor = isSelected
            ? option.activeCaptionColor ?? SettingsColors.mutedInk
            : SettingsColors.mutedInk;

          return (
            <GlideOptionSurface
              key={option.value}
              accessibilityLabel={
                option.caption ? `${option.label}、${option.caption}` : option.label
              }
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              containerStyle={
                stacked
                  ? styles.stackedOptionSurface
                  : [styles.optionSurface, { minWidth: minOptionWidth }]
              }
              foundationColor={optionFoundationColor}
              onPress={() => onChange(option.value)}
              selected={isSelected}
              style={[
                styles.optionButton,
                {
                  backgroundColor: isSelected
                    ? option.activeBackgroundColor
                    : SettingsColors.paper,
                  borderColor:
                    isSelected && option.selectedBorderColor
                      ? option.selectedBorderColor
                      : SettingsColors.ink,
                },
              ]}
            >
              <View style={[styles.iconBadge, !option.caption && styles.themeIconBadge]}>
                <SymbolView
                  fallback={<ThemedText style={styles.iconFallback}>{'>'}</ThemedText>}
                  name={option.icon}
                  size={option.caption ? 19 : 18}
                  tintColor={SettingsColors.ink}
                />
              </View>

              <View style={styles.optionCopy}>
                <ThemedText
                  maxFontSizeMultiplier={1.4}
                  selectable={false}
                  style={[styles.optionLabel, { color: textColor }]}
                >
                  {option.label}
                </ThemedText>
                {option.caption ? (
                  <ThemedText
                    maxFontSizeMultiplier={1.5}
                    selectable={false}
                    style={[styles.optionCaption, { color: captionColor }]}
                  >
                    {option.caption}
                  </ThemedText>
                ) : null}
              </View>

              <View
                style={[
                  styles.selectionMark,
                  {
                    backgroundColor: isSelected ? SettingsColors.cream : 'transparent',
                    borderColor: isSelected ? SettingsColors.ink : textColor,
                  },
                ]}
              >
                {isSelected ? (
                  <SymbolView
                    fallback={<ThemedText style={styles.checkFallback}>✓</ThemedText>}
                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                    size={11}
                    tintColor={SettingsColors.ink}
                  />
                ) : null}
              </View>
            </GlideOptionSurface>
          );
        })}
      </View>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  stackedOptionRow: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
  },
  optionSurface: {
    flex: 1,
  },
  stackedOptionSurface: {
    width: '100%',
  },
  optionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderCurve: 'continuous',
    borderWidth: 3,
    borderColor: SettingsColors.ink,
    backgroundColor: SettingsColors.cream,
  },
  themeIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  iconFallback: {
    color: SettingsColors.ink,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  optionLabel: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  optionCaption: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  selectionMark: {
    width: 22,
    height: 22,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 3,
  },
  checkFallback: {
    color: SettingsColors.ink,
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '900',
  },
});
