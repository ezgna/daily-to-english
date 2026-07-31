import SegmentedControl from '@expo/ui/community/segmented-control';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSettings } from '@/features/settings/settings-store';
import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { Spacing } from '@/shared/legacy/theme';
import { AppText } from '@/shared/ui/app-text';
import { Screen } from '@/shared/ui/screen';

import { SwiftUIPickerVariants } from './swift-ui-picker-variants';
import type {
  NoteDisplayMode,
  NoteDisplayModeOption,
} from './swift-ui-picker-variants.types';

const DisplayModeOptions = [
  { label: '原文', value: 'original' },
  { label: '本文', value: 'plain' },
  { label: '箇条書き', value: 'bullets' },
] as const satisfies readonly NoteDisplayModeOption[];

const PreviewContent = {
  original:
    'えーと、今日は帰り道に駅前でコーヒーを買いました。なんか、少し遠回りして帰りました。',
  plain:
    '今日は帰り道に駅前でコーヒーを買い、少し遠回りして帰りました。',
  bullets: ['帰り道に駅前でコーヒーを買った', '少し遠回りして帰った'],
} as const;

export function ExperimentLabScreen() {
  const colors = useDailyPalette();
  const settings = useSettings();
  const [displayMode, setDisplayMode] = useState<NoteDisplayMode>('plain');
  const selectedIndex = DisplayModeOptions.findIndex((option) => option.value === displayMode);
  const selectedOption = DisplayModeOptions[selectedIndex];
  const segmentLabels = DisplayModeOptions.map((option) => option.label);

  const handleSegmentChange = (nextIndex: number) => {
    const nextMode = DisplayModeOptions[nextIndex]?.value;

    if (nextMode) {
      setDisplayMode(nextMode);
    }
  };

  return (
    <Screen>
      <View style={styles.controlArea}>
        <AppText muted variant="caption">
          EXPO UI / COMMUNITY
        </AppText>
        <SegmentedControl
          appearance={settings.themeScheme}
          onChange={({ nativeEvent }) => handleSegmentChange(nativeEvent.selectedSegmentIndex)}
          selectedIndex={selectedIndex}
          style={styles.segmentedControl}
          testID="note-display-mode-segmented-control"
          tintColor={colors.primary}
          values={segmentLabels}
        />
      </View>

      <View style={styles.controlArea}>
        <AppText muted variant="caption">
          COMMUNITY / COMPACT WIDTH
        </AppText>
        <SegmentedControl
          appearance={settings.themeScheme}
          onChange={({ nativeEvent }) => handleSegmentChange(nativeEvent.selectedSegmentIndex)}
          selectedIndex={selectedIndex}
          style={styles.compactSegmentedControl}
          tintColor={colors.teal}
          values={segmentLabels}
        />
      </View>

      <View style={styles.controlArea}>
        <AppText muted variant="caption">
          COMMUNITY / LARGE SCALE
        </AppText>
        <View style={styles.largeControlFrame}>
          <SegmentedControl
            appearance={settings.themeScheme}
            onChange={({ nativeEvent }) => handleSegmentChange(nativeEvent.selectedSegmentIndex)}
            selectedIndex={selectedIndex}
            style={styles.largeSegmentedControl}
            tintColor={colors.coral}
            values={segmentLabels}
          />
        </View>
      </View>

      <View style={styles.controlArea}>
        <AppText muted variant="caption">
          COMMUNITY / DARK
        </AppText>
        <SegmentedControl
          appearance="dark"
          onChange={({ nativeEvent }) => handleSegmentChange(nativeEvent.selectedSegmentIndex)}
          selectedIndex={selectedIndex}
          style={styles.segmentedControl}
          tintColor={colors.primary}
          values={segmentLabels}
        />
      </View>

      <View style={styles.controlArea}>
        <AppText muted variant="caption">
          COMMUNITY / DISABLED
        </AppText>
        <SegmentedControl
          appearance={settings.themeScheme}
          enabled={false}
          selectedIndex={selectedIndex}
          style={styles.segmentedControl}
          tintColor={colors.primary}
          values={segmentLabels}
        />
      </View>

      <SwiftUIPickerVariants
        onChange={setDisplayMode}
        options={DisplayModeOptions}
        tintColor={colors.primary}
        value={displayMode}
      />

      <View
        style={[
          styles.preview,
          {
            backgroundColor: colors.tealSoft,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.previewHeader}>
          <AppText style={{ color: colors.teal }} variant="caption">
            7月31日 18:42
          </AppText>
          <View style={[styles.modeBadge, { backgroundColor: colors.card }]}>
            <AppText style={{ color: colors.teal }} variant="caption">
              {selectedOption.label}
            </AppText>
          </View>
        </View>

        {displayMode === 'bullets' ? (
          <View style={styles.bulletList}>
            {PreviewContent.bullets.map((point) => (
              <View key={point} style={styles.bulletRow}>
                <AppText style={{ color: colors.teal }}>•</AppText>
                <AppText style={styles.previewText}>{point}</AppText>
              </View>
            ))}
          </View>
        ) : (
          <AppText style={styles.previewText}>{PreviewContent[displayMode]}</AppText>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  controlArea: {
    gap: Spacing.two,
  },
  segmentedControl: {
    alignSelf: 'stretch',
    minHeight: 36,
    width: '100%',
  },
  compactSegmentedControl: {
    alignSelf: 'center',
    maxWidth: 260,
    minHeight: 32,
    width: '76%',
  },
  largeControlFrame: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  largeSegmentedControl: {
    alignSelf: 'center',
    minHeight: 36,
    transform: [{ scale: 1.15 }],
    width: '95%',
  },
  preview: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    borderCurve: 'continuous',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  modeBadge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  previewText: {
    flex: 1,
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 30,
  },
  bulletList: {
    gap: Spacing.two,
  },
  bulletRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
