import { StyleSheet, View } from 'react-native';

import { getLocalRecordingUriForEntry } from '@/features/recordings/recording-store';
import { RecordingPlayButton } from '@/features/recordings/recording-play-button';
import { useCardGroups } from '@/shared/api/read-models';
import { Spacing } from '@/shared/legacy/theme';
import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { Screen } from '@/shared/ui/screen';
import { AppText } from '@/shared/ui/app-text';

const InkColor = '#111111';
const TimecodeColors = ['#2FDD6C', '#65D7F2', '#FF9F45', '#9B7CFF'] as const;

export function CardsScreen() {
  const colors = useDailyPalette();
  const groups = useCardGroups();

  return (
    <Screen>
      {groups.isLoading ? <AppText muted>読み込み中</AppText> : null}
      {groups.data?.length === 0 ? <AppText muted>まだカードはありません。</AppText> : null}
      <View style={styles.memoList}>
        {groups.data?.map((group) => {
          const recordingUri = getLocalRecordingUriForEntry(group.entry.id);
          const sourceLabel =
            group.entry.source === 'voice'
              ? group.entry.isEdited
                ? 'Voice · Edited'
                : 'Voice'
              : 'Text';

          return (
            <View key={group.generation.id} style={styles.memoGroup}>
              <View style={styles.memoSeparator}>
                <View style={styles.memoSourcePill}>
                  <AppText style={styles.memoSourceText}>{sourceLabel}</AppText>
                </View>
                <View style={styles.memoRule} />
                <View style={styles.memoDatePill}>
                  <AppText style={styles.memoDateText} selectable>
                    {formatDate(group.generation.createdAt)}
                  </AppText>
                </View>
              </View>

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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ja-JP', {
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
  memoList: {
    gap: Spacing.four,
  },
  memoGroup: {
    gap: Spacing.three,
  },
  memoSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memoSourcePill: {
    borderWidth: 2,
    borderColor: InkColor,
    backgroundColor: '#FFF6E7',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  memoDatePill: {
    borderWidth: 2,
    borderColor: InkColor,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  memoSourceText: {
    color: InkColor,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 900,
  },
  memoDateText: {
    color: InkColor,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: 800,
    fontVariant: ['tabular-nums'],
  },
  memoRule: {
    flex: 1,
    height: 3,
    backgroundColor: InkColor,
    borderRadius: 999,
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
