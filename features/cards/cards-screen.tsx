import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { getLocalRecordingUriForEntry } from '@/features/recordings/recording-store';
import { RecordingPlayButton } from '@/features/recordings/recording-play-button';
import { useCardGroups } from '@/shared/api/read-models';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/shared/legacy/theme';
import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { Screen } from '@/shared/ui/screen';
import { AppText } from '@/shared/ui/app-text';
import { EntrySeparator } from '@/shared/ui/entry-separator';

const InkColor = '#111111';
const TimecodeColors = ['#2FDD6C', '#65D7F2', '#FF9F45', '#9B7CFF'] as const;

export function CardsScreen() {
  const colors = useDailyPalette();
  const { i18n, t } = useTranslation();
  const groups = useCardGroups();
  const safeAreaInsets = useSafeAreaInsets();

  if (groups.data?.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.centerState,
            {
              paddingTop: safeAreaInsets.top,
              paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
              paddingLeft: Math.max(safeAreaInsets.left, Spacing.three),
              paddingRight: Math.max(safeAreaInsets.right, Spacing.three),
            },
          ]}
        >
          {groups.isLoading ? (
            <AppText muted>{t('common.loading')}</AppText>
          ) : (
            <View
              style={[
                styles.emptyStateCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.text,
                },
              ]}
            >
              <AppText style={[styles.emptyStateTitle, { color: colors.text }]}>
                {t('phrases.empty.title')}
              </AppText>
              <AppText style={[styles.emptyStateBody, { color: colors.muted }]}>
                {t('phrases.empty.body')}
              </AppText>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <Screen
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{
        paddingTop: safeAreaInsets.top,
        paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.four,
        paddingLeft: Math.max(safeAreaInsets.left, Spacing.three),
        paddingRight: Math.max(safeAreaInsets.right, Spacing.three),
      }}
    >
      {groups.isLoading ? <AppText muted>{t('common.loading')}</AppText> : null}
      <View style={styles.memoList}>
        {groups.data?.map((group) => {
          const recordingUri = getLocalRecordingUriForEntry(group.entry.id);
          const sourceLabel =
            group.entry.source === 'voice'
              ? group.entry.isEdited
                ? t('notes.source.edited', { source: t('notes.source.voice') })
                : t('notes.source.voice')
              : t('notes.source.text');

          return (
            <View key={group.generation.id} style={styles.memoGroup}>
              <EntrySeparator
                dateLabel={formatDate(group.generation.createdAt, i18n.resolvedLanguage)}
                sourceLabel={sourceLabel}
                sourceTone={group.entry.source}
              />

              <View style={styles.transcriptList}>
                {group.cards.map((card, index) => {
                  const tabColor = TimecodeColors[index % TimecodeColors.length];
                  const timecode =
                    typeof card.audioStartSec === 'number' ? formatTranscriptTime(card.audioStartSec) : null;

                  return (
                    <View key={card.id} style={styles.transcriptRow}>
                      <View style={styles.separator}>
                        {timecode ? (
                          <>
                            <RecordingPlayButton
                              uri={recordingUri}
                              startSec={card.audioStartSec}
                              endSec={card.audioEndSec}
                              size={32}
                              iconSize={15}
                              backgroundColor="#FFFFFF"
                              activeBackgroundColor={tabColor}
                              borderColor={InkColor}
                              tintColor={InkColor}
                              activeTintColor={InkColor}
                              style={styles.timecodeAudioButton}
                            />
                            <View style={[styles.timecodeTab, { backgroundColor: tabColor }]}>
                              <AppText style={styles.timecodeText}>{timecode}</AppText>
                            </View>
                          </>
                        ) : null}
                        <View style={[styles.rule, { backgroundColor: colors.border }]} />
                      </View>

                      <View style={styles.copy}>
                        <AppText style={styles.englishText} selectable>
                          {card.en}
                        </AppText>
                        <AppText style={[styles.japaneseText, { color: colors.muted }]} selectable>
                          {card.ja}
                        </AppText>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

function formatDate(value: string, language: string | undefined) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language ?? 'ja', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatTranscriptTime(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center' },
  centerState: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateCard: {
    width: '100%',
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 4,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  emptyStateTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 900,
  },
  emptyStateBody: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: 700,
  },
  memoList: {
    gap: Spacing.four,
  },
  memoGroup: {
    gap: Spacing.three,
  },
  transcriptList: {
    gap: Spacing.three,
  },
  transcriptRow: {
    gap: Spacing.two,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timecodeAudioButton: {
    marginRight: Spacing.one,
  },
  timecodeTab: {
    minWidth: 56,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: InkColor,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  timecodeText: {
    color: InkColor,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: 900,
    fontVariant: ['tabular-nums'],
  },
  rule: {
    flex: 1,
    height: 3,
    borderRadius: 999,
  },
  copy: {
    gap: Spacing.one,
  },
  englishText: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: 900,
  },
  japaneseText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: 700,
  },
});
