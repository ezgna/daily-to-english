import { StyleSheet, View } from 'react-native';

import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { Spacing } from '@/shared/legacy/theme';
import { AppText } from '@/shared/ui/app-text';

const InkColor = '#111111';

export function EntrySeparator({
  dateLabel,
  sourceLabel,
  sourceTone,
}: {
  dateLabel: string;
  sourceLabel: string;
  sourceTone: 'text' | 'voice';
}) {
  const palette = useDailyPalette();
  const isDark = palette.background === '#000000';
  const separatorInk = isDark ? '#F8F6EF' : InkColor;

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.pill,
          styles.sourcePill,
          {
            backgroundColor: sourceTone === 'voice' ? '#DDF3E8' : '#FFF6E7',
            borderColor: separatorInk,
          },
        ]}
      >
        <AppText
          maxFontSizeMultiplier={1.4}
          numberOfLines={1}
          selectable={false}
          style={styles.sourceText}
        >
          {sourceLabel}
        </AppText>
      </View>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.rule, { backgroundColor: separatorInk }]}
      />

      <View
        style={[
          styles.pill,
          styles.datePill,
          {
            backgroundColor: isDark ? palette.cardAlt : '#FFFFFF',
            borderColor: separatorInk,
          },
        ]}
      >
        <AppText
          maxFontSizeMultiplier={1.4}
          numberOfLines={1}
          selectable
          style={[styles.dateText, { color: isDark ? palette.text : InkColor }]}
        >
          {dateLabel}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    minHeight: 30,
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  sourcePill: {
    maxWidth: '44%',
  },
  datePill: {
    maxWidth: '50%',
  },
  sourceText: {
    color: InkColor,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  dateText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  rule: {
    flex: 1,
    height: 3,
  },
});
