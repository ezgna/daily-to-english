import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Entry } from '@just-speak-it/contract';

import { DiaryWaveform } from '@/features/diary/diary-waveform';
import { DiaryColors } from '@/features/diary/diary-theme';
import { getLocalRecordingUriForEntry } from '@/features/recordings/recording-store';
import { Spacing } from '@/shared/legacy/theme';
import { ThemedText } from '@/shared/legacy/themed-text';
import { FoundationSurface } from '@/shared/legacy/ui/foundation-surface';
import { EntrySeparator } from '@/shared/ui/entry-separator';

export type DiaryDisplayMode = 'original' | 'plain' | 'bullets';

export function DiaryEntryCard({
  displayMode,
  entry,
  onWaveformScrubbingChange,
}: {
  displayMode: DiaryDisplayMode;
  entry: Entry;
  onWaveformScrubbingChange: (isScrubbing: boolean) => void;
}) {
  const { i18n, t } = useTranslation();
  const source = entry.source === 'voice' ? t('notes.source.voice') : t('notes.source.text');
  const sourceLabel = entry.isEdited ? t('notes.source.edited', { source }) : source;
  const noContentLabel = t('notes.noContent');

  return (
    <View style={styles.entry}>
      <EntrySeparator
        dateLabel={formatEntryDate(entry.createdAt, i18n.resolvedLanguage)}
        sourceLabel={sourceLabel}
        sourceTone={entry.source}
      />

      <FoundationSurface
        containerStyle={styles.surface}
        foundationBorderColor={DiaryColors.ink}
        foundationBorderWidth={3}
        foundationColor={DiaryColors.foundation}
        foundationDepth={10}
        foundationDirection="diagonal"
        foundationDistanceScale={0.72}
        foundationRadiusMode="concentric"
        style={styles.paper}
      >
        {displayMode === 'original' ? (
          <DiaryWaveform
            peaks={entry.waveform}
            recordingUri={getLocalRecordingUriForEntry(entry.id)}
            onScrubbingChange={onWaveformScrubbingChange}
          />
        ) : null}

        {displayMode === 'bullets' ? (
          <DiaryBulletList emptyLabel={noContentLabel} points={entry.summary} />
        ) : (
          <ThemedText
            maxFontSizeMultiplier={1.5}
            selectable
            style={getDiaryBodyStyle(displayMode)}
          >
            {getDiaryDisplayText(entry, displayMode, noContentLabel)}
          </ThemedText>
        )}
      </FoundationSurface>
    </View>
  );
}

function DiaryBulletList({ emptyLabel, points }: { emptyLabel: string; points: string[] }) {
  const visiblePoints = points.length > 0 ? points : [emptyLabel];

  return (
    <View style={styles.bulletList}>
      {visiblePoints.map((point, index) => (
        <View key={`${index}-${point}`} style={styles.bulletRow}>
          <View style={styles.bulletDotSlot}>
            <View style={styles.bulletDot} />
          </View>
          <ThemedText
            maxFontSizeMultiplier={1.5}
            selectable
            style={styles.bulletText}
          >
            {normalizeDisplayText(point, emptyLabel)}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

function getDiaryBodyStyle(
  displayMode: Exclude<DiaryDisplayMode, 'bullets'>
): StyleProp<TextStyle> {
  return displayMode === 'plain' ? styles.readableBody : styles.originalBody;
}

function getDiaryDisplayText(
  entry: Entry,
  displayMode: Exclude<DiaryDisplayMode, 'bullets'>,
  emptyLabel: string
) {
  return displayMode === 'original'
    ? normalizeDisplayText(entry.rawText, emptyLabel)
    : formatReadableDisplayText(entry.cleanText, emptyLabel);
}

function formatReadableDisplayText(value: string, emptyLabel: string) {
  return normalizeDisplayText(value, emptyLabel)
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/([。！？!?]+[」』）)]*)\s*/g, '$1\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

function normalizeDisplayText(value: string, emptyLabel: string) {
  const normalizedValue = value.replace(/\n{3,}/g, '\n\n').trim();
  return normalizedValue || emptyLabel;
}

function formatEntryDate(value: string, language: string | undefined) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language ?? 'ja', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const styles = StyleSheet.create({
  entry: {
    gap: Spacing.two,
  },
  surface: {
    alignSelf: 'stretch',
  },
  paper: {
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 4,
    borderColor: DiaryColors.ink,
    backgroundColor: DiaryColors.paper,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  readableBody: {
    color: DiaryColors.ink,
    fontSize: 17,
    lineHeight: 29,
    fontWeight: '700',
  },
  originalBody: {
    color: DiaryColors.rawText,
    fontSize: 16,
    lineHeight: 27,
    fontWeight: '500',
  },
  bulletList: {
    gap: Spacing.one,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  bulletDotSlot: {
    width: 14,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: DiaryColors.ink,
  },
  bulletText: {
    flex: 1,
    minWidth: 0,
    color: DiaryColors.ink,
    fontSize: 17,
    lineHeight: 28,
    fontWeight: '700',
  },
});
