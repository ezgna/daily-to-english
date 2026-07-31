import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DiaryDisplayModeOptions,
  DiaryEntryCard,
  type DiaryDisplayMode,
} from '@/features/diary/diary-entry-card';
import { DiaryColors } from '@/features/diary/diary-theme';
import { useDiaryEntries } from '@/shared/api/read-models';
import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/shared/legacy/theme';
import { FoundationSurface } from '@/shared/legacy/ui/foundation-surface';
import { GlideButton } from '@/shared/legacy/ui/glide-button';
import { getLocalString, setLocalString } from '@/shared/storage/local-storage';
import { AppText } from '@/shared/ui/app-text';
import { SegmentedControl } from '@/shared/ui/segmented-control';

const DisplayModeStorageKey = 'just-speak-it:diary-display-mode:v1';
const DefaultDisplayMode: DiaryDisplayMode = 'plain';

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
    paddingTop: safeAreaInsets.top,
    paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
    paddingLeft: Math.max(safeAreaInsets.left, Spacing.three),
    paddingRight: Math.max(safeAreaInsets.right, Spacing.three),
  };
  const modeSwitchInsets = {
    paddingTop: safeAreaInsets.top,
    paddingLeft: Math.max(safeAreaInsets.left, Spacing.three),
    paddingRight: Math.max(safeAreaInsets.right, Spacing.three),
  };
  const scrollContentInsets = {
    paddingTop: Spacing.two,
    paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.four,
    paddingLeft: Math.max(safeAreaInsets.left, Spacing.three),
    paddingRight: Math.max(safeAreaInsets.right, Spacing.three),
  };

  if (entries.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: palette.background }]}>
        <View style={[styles.centerState, emptyStateInsets]}>
          {entriesQuery.isLoading ? (
            <DiaryStateCard
              body="保存済みのノートを読み込んでいます。"
              loading
              title="ノートを読み込んでいます"
            />
          ) : errorMessage ? (
            <DiaryStateCard
              body={errorMessage}
              onRetry={refreshEntries}
              retrying={entriesQuery.isRefetching}
              title="読み込めませんでした"
            />
          ) : (
            <DiaryStateCard
              body="ホームで話すか書くと、あなたの言葉がここに積み重なります。"
              title="ノートはまだありません"
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <View style={[styles.modeSwitchBand, modeSwitchInsets]}>
        <View style={styles.modeSwitchDock}>
          <SegmentedControl
            accessibilityLabel="ノートの表示方法"
            haptics
            onChange={handleDisplayModeChange}
            options={DiaryDisplayModeOptions}
            testID="diary-display-mode-segmented-control"
            value={displayMode}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, scrollContentInsets]}
        refreshControl={
          <RefreshControl
            onRefresh={refreshEntries}
            refreshing={entriesQuery.isRefetching}
            tintColor={DiaryColors.accentDeep}
          />
        }
        scrollEnabled={!isWaveformScrubbing}
        style={styles.scrollView}
      >
        <View style={styles.container}>
          {errorMessage ? (
            <DiaryInlineError
              message={errorMessage}
              onRetry={refreshEntries}
              retrying={entriesQuery.isRefetching}
            />
          ) : null}

          <View style={styles.entryList}>
            {entries.map((entry) => (
              <DiaryEntryCard
                key={entry.id}
                displayMode={displayMode}
                entry={entry}
                onWaveformScrubbingChange={setIsWaveformScrubbing}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function DiaryStateCard({
  body,
  loading = false,
  onRetry,
  retrying = false,
  title,
}: {
  body: string;
  loading?: boolean;
  onRetry?: () => void;
  retrying?: boolean;
  title: string;
}) {
  return (
    <FoundationSurface
      containerStyle={styles.stateSurface}
      foundationBorderColor={DiaryColors.ink}
      foundationBorderWidth={3}
      foundationColor={DiaryColors.foundation}
      foundationDepth={10}
      foundationDirection="diagonal"
      foundationDistanceScale={0.72}
      foundationRadiusMode="concentric"
      style={styles.stateCard}
    >
      {loading ? <ActivityIndicator color={DiaryColors.accentDeep} size="small" /> : null}
      <View style={styles.stateCopy}>
        <AppText maxFontSizeMultiplier={1.4} selectable style={styles.stateTitle}>
          {title}
        </AppText>
        <AppText maxFontSizeMultiplier={1.5} selectable style={styles.stateBody}>
          {body}
        </AppText>
      </View>
      {onRetry ? (
        <GlideButton
          busy={retrying}
          disabled={retrying}
          label="再読み込み"
          onPress={onRetry}
          size="medium"
          tone="mint"
        />
      ) : null}
    </FoundationSurface>
  );
}

function DiaryInlineError({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <View style={styles.errorBanner}>
      <View style={styles.errorCopy}>
        <AppText maxFontSizeMultiplier={1.4} style={styles.errorTitle}>
          更新できませんでした
        </AppText>
        <AppText maxFontSizeMultiplier={1.5} selectable style={styles.errorText}>
          {message}
        </AppText>
      </View>
      <GlideButton
        busy={retrying}
        disabled={retrying}
        fullWidth={false}
        label="再試行"
        onPress={onRetry}
        size="compact"
        tone="coral"
      />
    </View>
  );
}

function isDiaryDisplayMode(value: string | null): value is DiaryDisplayMode {
  return value === 'original' || value === 'plain' || value === 'bullets';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'ノートを読み込めませんでした。';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    alignSelf: 'stretch',
  },
  content: {
    alignItems: 'center',
  },
  container: {
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
  modeSwitchBand: {
    width: '100%',
    alignItems: 'center',
  },
  modeSwitchDock: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingVertical: Spacing.two,
  },
  entryList: {
    gap: Spacing.four,
  },
  stateSurface: {
    alignSelf: 'stretch',
  },
  stateCard: {
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 4,
    borderColor: DiaryColors.ink,
    backgroundColor: DiaryColors.paper,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  stateCopy: {
    gap: Spacing.two,
  },
  stateTitle: {
    color: DiaryColors.ink,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '900',
  },
  stateBody: {
    color: DiaryColors.rawText,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '700',
  },
  errorBanner: {
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 3,
    borderColor: DiaryColors.ink,
    backgroundColor: '#FFF0EC',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  errorCopy: {
    gap: Spacing.one,
  },
  errorTitle: {
    color: DiaryColors.ink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
  errorText: {
    color: DiaryColors.error,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
});
