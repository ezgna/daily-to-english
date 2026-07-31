import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SettingsColors } from '@/features/settings/settings-theme';
import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { Spacing } from '@/shared/legacy/theme';
import { AppText } from '@/shared/ui/app-text';

export function SettingsSection({
  accentColor,
  accentTextColor = SettingsColors.ink,
  badge,
  children,
  description,
  title,
}: {
  accentColor: string;
  accentTextColor?: string;
  badge?: string;
  children: ReactNode;
  description: string;
  title: string;
}) {
  const palette = useDailyPalette();
  const isDark = palette.background === '#000000';
  const separatorColor = isDark ? SettingsColors.paper : SettingsColors.ink;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View
          style={[
            styles.titlePill,
            { backgroundColor: accentColor, borderColor: separatorColor },
          ]}
        >
          <AppText
            maxFontSizeMultiplier={1.4}
            selectable={false}
            style={[styles.title, { color: accentTextColor }]}
          >
            {title}
          </AppText>
        </View>

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.rule, { backgroundColor: separatorColor }]}
        />

        {badge ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isDark ? palette.cardAlt : SettingsColors.cream,
                borderColor: separatorColor,
              },
            ]}
          >
            <AppText
              maxFontSizeMultiplier={1.4}
              numberOfLines={2}
              selectable
              style={[styles.badgeText, { color: isDark ? palette.text : SettingsColors.ink }]}
            >
              {badge}
            </AppText>
          </View>
        ) : null}
      </View>

      <AppText
        maxFontSizeMultiplier={1.5}
        selectable
        style={[styles.description, { color: palette.muted }]}
      >
        {description}
      </AppText>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titlePill: {
    maxWidth: '58%',
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },
  rule: {
    flex: 1,
    minWidth: Spacing.two,
    height: 3,
  },
  badge: {
    maxWidth: '44%',
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },
});
