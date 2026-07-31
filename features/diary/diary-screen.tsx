import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Entry } from '@just-speak-it/contract';

import { DiaryWaveform } from '@/features/diary/diary-waveform';
import { getLocalRecordingUriForEntry } from '@/features/recordings/recording-store';
import { useDiaryEntries } from '@/shared/api/read-models';
import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing, TopTabInset } from '@/shared/legacy/theme';
import { ThemedText } from '@/shared/legacy/themed-text';
import { FoundationSurface } from '@/shared/legacy/ui/foundation-surface';
import { getLocalString, setLocalString } from '@/shared/storage/local-storage';

type DiaryDisplayMode = 'original' | 'plain' | 'bullets';

const DisplayModeOptions: { label: string; value: DiaryDisplayMode }[] = [
  { label: '原文', value: 'original' },
  { label: '本文', value: 'plain' },
  { label: '箇条書き', value: 'bullets' },
];

const DisplayModeStorageKey = 'just-speak-it:diary-display-mode:v1';
const DefaultDisplayMode: DiaryDisplayMode = 'plain';

const DiaryColors = {
  accent: '#276EF1',
  bodyText: '#111111',
  error: '#E8664F',
  foundation: '#D9E7E1',
  paper: '#F8F6EF',
  voiceAccent: '#168A73',
  voiceAccentMuted: '#8CD6BD',
  voicePaper: '#EAF8F0',
  voiceText: '#102018',
} as const;

const CoralFoundationOffset = 7;

export function DiaryScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const palette = useDailyPalette();
  const entriesQuery = useDiaryEntries();
  const entries = entriesQuery.data ?? [];
  const errorMessage = entriesQuery.error ? getErrorMessage(entriesQuery.error) : null;
  const [displayMode, setDisplayMode] = useState<DiaryDisplayMode>(() => {
    const storedMode = getLocalString(DisplayModeStorageKey);
    return isDiaryDisplayMode(storedMode) ? storedMode : DefaultDisplayMode;
  });
  const [isWaveformScrubbing, setIsWaveformScrubbing] = useState(false);

  const handleDisplayModeChange = useCallback((nextMode: DiaryDisplayMode) => {
    setDisplayMode(nextMode);
    setLocalString(DisplayModeStorageKey, nextMode);
  }, []);

  const refreshEntries = useCallback(() => {
    void entriesQuery.refetch();
  }, [entriesQuery]);

  const emptyStateInsets = {
    paddingTop: safeAreaInsets.top + TopTabInset + Spacing.two,
    paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
    paddingLeft: Math.max(safeAreaInsets.left, Spacing.three),
    paddingRight: Math.max(safeAreaInsets.right, Spacing.three),
  };
  const contentInsets = {
    paddingTop: safeAreaInsets.top + TopTabInset + Spacing.two,
    paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.four,
    paddingLeft: Math.max(safeAreaInsets.left, Spacing.three),
    paddingRight: Math.max(safeAreaInsets.right, Spacing.three),
  };

  if (entries.length === 0) {
    return (
      <View
        style={[styles.screen, { backgroundColor: palette.background }]}
      >
        <View style={[styles.centerState, emptyStateInsets]}>
          {entriesQuery.isLoading ? (
            <DiaryStatePaper>
              <ActivityIndicator color={DiaryColors.accent} />
              <ThemedText style={styles.loadingStateText} selectable>
                日記を読み込んでいます。
              </ThemedText>
            </DiaryStatePaper>
          ) : errorMessage ? (
            <View style={styles.statePanel}>
              <ThemedText style={styles.stateTitle} selectable>
                読み込めませんでした
              </ThemedText>
              <ThemedText style={styles.stateText} selectable>
                {errorMessage}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                disabled={entriesQuery.isRefetching}
                onPress={refreshEntries}
                style={({ pressed }) => [
                  styles.retryButton,
                  { opacity: entriesQuery.isRefetching ? 0.5 : pressed ? 0.74 : 1 },
                ]}
              >
                <ThemedText style={styles.retryButtonText}>再読み込み</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.statePanel}>
              <ThemedText style={styles.stateTitle} selectable>
                日記はまだありません
              </ThemedText>
              <ThemedText style={styles.stateText} selectable>
                今日タブで話すか書くと、この日記タブに表示されます。
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: palette.background }]}
      scrollEnabled={!isWaveformScrubbing}
      contentContainerStyle={[styles.content, contentInsets]}
      refreshControl={
        <RefreshControl
          refreshing={entriesQuery.isRefetching}
          onRefresh={refreshEntries}
          tintColor={palette.primary}
        />
      }
    >
      <View style={styles.container}>
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <ThemedText type="smallBold" style={styles.errorText} selectable>
              {errorMessage}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.diaryPaperList}>
          <DiaryModeSwitch value={displayMode} onChange={handleDisplayModeChange} />
          {entries.map((entry) => (
            <DiaryPaper
              key={entry.id}
              displayMode={displayMode}
              entry={entry}
              onWaveformScrubbingChange={setIsWaveformScrubbing}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function DiaryModeSwitch({
  onChange,
  value,
}: {
  onChange: (value: DiaryDisplayMode) => void;
  value: DiaryDisplayMode;
}) {
  return (
    <View style={styles.modeSwitch} accessibilityRole="radiogroup">
      {DisplayModeOptions.map((option, index) => {
        const isSelected = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.modeButton,
              index > 0 && styles.modeButtonDivider,
              isSelected && styles.modeButtonSelected,
              pressed && styles.modeButtonPressed,
            ]}
          >
            <ThemedText style={[styles.modeButtonText, isSelected && styles.modeButtonTextSelected]}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function DiaryPaper({
  displayMode,
  entry,
  onWaveformScrubbingChange,
}: {
  displayMode: DiaryDisplayMode;
  entry: Entry;
  onWaveformScrubbingChange: (isScrubbing: boolean) => void;
}) {
  if (displayMode === 'bullets') {
    return (
      <View style={styles.diaryOriginalEntry}>
        <View style={styles.diaryOriginalRail} />
        <View style={styles.diaryOriginalContent}>
          <ThemedText style={[styles.diaryPaperDate, styles.diaryOriginalDate]} selectable>
            {formatDate(entry.createdAt)}
          </ThemedText>
          <DiaryBulletList points={entry.summary} />
        </View>
      </View>
    );
  }

  const bodyStyles: StyleProp<TextStyle> =
    displayMode === 'plain'
      ? [styles.diaryPaperBody, styles.diaryPaperBodyReadable, styles.diaryPaperBodyReadableOnMint]
      : [styles.diaryPaperBody, styles.diaryPaperBodyRaw];

  return (
    <View style={styles.diaryOriginalEntry}>
      <View style={styles.diaryOriginalRail} />
      <View style={styles.diaryOriginalContent}>
        <ThemedText style={[styles.diaryPaperDate, styles.diaryOriginalDate]} selectable>
          {formatDate(entry.createdAt)}
        </ThemedText>
        {displayMode === 'original' ? (
          <DiaryWaveform
            peaks={entry.waveform}
            recordingUri={getLocalRecordingUriForEntry(entry.id)}
            onScrubbingChange={onWaveformScrubbingChange}
          />
        ) : null}
        <ThemedText style={bodyStyles} selectable>
          {getDiaryDisplayText(entry, displayMode)}
        </ThemedText>
      </View>
    </View>
  );
}

function DiaryBulletList({ points }: { points: string[] }) {
  const visiblePoints = points.length > 0 ? points : ['本文はありません。'];

  return (
    <View>
      {visiblePoints.map((point, index) => (
        <View key={`${index}-${point}`} style={styles.diaryBulletRow}>
          <View style={styles.diaryBulletDotSlot}>
            <View style={styles.diaryBulletDot} />
          </View>
          <ThemedText style={styles.diaryBulletText} selectable>
            {normalizeDisplayText(point)}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

function DiaryStatePaper({ children }: { children: ReactNode }) {
  return <DiaryPaperSurface style={styles.statePaper}>{children}</DiaryPaperSurface>;
}

function DiaryPaperSurface({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <FoundationSurface
      foundationDepth={12}
      foundationDistanceScale={0.72}
      foundationDirection="diagonal"
      foundationColor={DiaryColors.foundation}
      foundationBorderColor={DiaryColors.bodyText}
      foundationBorderWidth={4}
      foundationOffsetX={CoralFoundationOffset}
      foundationOffsetY={CoralFoundationOffset}
      foundationRadiusMode="concentric"
      pressTravelRatio={0.36}
      pressDiagonalRatio={1}
      pressInDuration={142}
      pressOutDuration={270}
      containerStyle={styles.diaryPaperSurface}
      style={[styles.diaryPaper, style]}
    >
      {children}
    </FoundationSurface>
  );
}

function isDiaryDisplayMode(value: string | null): value is DiaryDisplayMode {
  return value === 'original' || value === 'plain' || value === 'bullets';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '日記を読み込めませんでした。';
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getDiaryDisplayText(entry: Entry, displayMode: Exclude<DiaryDisplayMode, 'bullets'>) {
  if (displayMode === 'original') {
    return normalizeDisplayText(entry.rawText);
  }

  return formatReadableDisplayText(entry.cleanText);
}

function formatReadableDisplayText(value: string) {
  return normalizeDisplayText(value)
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/([。！？!?]+[」』）)]*)\s*/g, '$1\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

function normalizeDisplayText(value: string) {
  const normalizedValue = value.replace(/\n{3,}/g, '\n\n').trim();
  return normalizedValue || '本文はありません。';
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  screen: { flex: 1, alignItems: 'center' },
  content: { alignItems: 'center' },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  centerState: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaryPaperList: { gap: Spacing.three },
  modeSwitch: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 4,
    borderColor: DiaryColors.bodyText,
    backgroundColor: DiaryColors.paper,
  },
  modeButton: {
    flex: 1,
    minHeight: 44,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  modeButtonDivider: { borderLeftWidth: 4, borderLeftColor: DiaryColors.bodyText },
  modeButtonSelected: { backgroundColor: DiaryColors.bodyText },
  modeButtonPressed: { opacity: 0.72 },
  modeButtonText: {
    color: DiaryColors.bodyText,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: 900,
  },
  modeButtonTextSelected: { color: DiaryColors.paper },
  diaryPaperSurface: { alignSelf: 'stretch' },
  diaryPaper: {
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 4,
    borderColor: DiaryColors.bodyText,
    backgroundColor: DiaryColors.paper,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  diaryOriginalEntry: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: Spacing.three,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: DiaryColors.voicePaper,
    padding: Spacing.two,
  },
  diaryOriginalRail: {
    width: 6,
    alignSelf: 'stretch',
    borderRadius: 999,
    backgroundColor: DiaryColors.voiceAccentMuted,
  },
  diaryOriginalContent: { flex: 1, minWidth: 0, gap: Spacing.two },
  diaryPaperDate: {
    color: DiaryColors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 900,
  },
  diaryOriginalDate: {
    color: DiaryColors.voiceAccent,
    fontFamily: Fonts.mono,
    fontVariant: ['tabular-nums'],
  },
  diaryPaperBody: { color: DiaryColors.bodyText },
  diaryPaperBodyRaw: {
    color: DiaryColors.voiceText,
    fontSize: 18,
    lineHeight: 30,
    fontWeight: 800,
  },
  diaryPaperBodyReadable: { fontSize: 19, lineHeight: 33, fontWeight: 900 },
  diaryPaperBodyReadableOnMint: {
    color: DiaryColors.voiceText,
    fontSize: 18,
    lineHeight: 31,
  },
  diaryBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  diaryBulletDotSlot: {
    width: 14,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaryBulletDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: DiaryColors.voiceAccent,
  },
  diaryBulletText: {
    flex: 1,
    minWidth: 0,
    color: DiaryColors.voiceText,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: 900,
  },
  statePaper: { minHeight: 148, alignItems: 'flex-start', justifyContent: 'center' },
  loadingStateText: {
    color: DiaryColors.bodyText,
    fontSize: 17,
    lineHeight: 28,
    fontWeight: 800,
  },
  statePanel: {
    width: '100%',
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 4,
    borderColor: DiaryColors.bodyText,
    backgroundColor: '#FFFFFF',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  stateTitle: {
    color: DiaryColors.bodyText,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: 800,
  },
  stateText: { color: '#5F6670', fontSize: 16, lineHeight: 24, fontWeight: 600 },
  retryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 3,
    borderColor: DiaryColors.bodyText,
    backgroundColor: '#2FDD6C',
    paddingHorizontal: Spacing.three,
  },
  retryButtonText: { color: '#FFFFFF', fontSize: 16, lineHeight: 22, fontWeight: 800 },
  errorBanner: {
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 4,
    borderColor: DiaryColors.bodyText,
    backgroundColor: DiaryColors.paper,
    padding: Spacing.three,
  },
  errorText: { color: DiaryColors.error },
});
