import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import {
  deleteAllLocalRecordings,
  getLocalRecordingStats,
  subscribeToLocalRecordings,
  type LocalRecordingStats,
} from '@/features/recordings/recording-store';
import { useSettings } from '@/features/settings/settings-store';
import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { Spacing } from '@/shared/legacy/theme';
import { ThemedText } from '@/shared/legacy/themed-text';
import { GlideButton } from '@/shared/legacy/ui/glide-button';

const Colors = {
  cream: '#FFFFFF',
  ink: '#111111',
  mint: '#2FDD6C',
  paper: '#FFF6E7',
} as const;

export function LocalRecordingSettings() {
  const settings = useSettings();
  const palette = useDailyPalette();
  const [stats, setStats] = useState<LocalRecordingStats>(getLocalRecordingStats);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setStats(getLocalRecordingStats());
    return subscribeToLocalRecordings(() => setStats(getLocalRecordingStats()));
  }, []);

  function handleDeletePress() {
    Alert.alert('保存済み録音を削除', '端末に保存された録音ファイルをすべて削除します。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          setIsDeleting(true);
          void deleteAllLocalRecordings()
            .catch(() => {
              Alert.alert('削除できませんでした', '一部の録音ファイルが端末に残っています。');
            })
            .finally(() => setIsDeleting(false));
        },
      },
    ]);
  }

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <ThemedText style={[styles.sectionTitle, { color: palette.text }]} selectable>
          録音保存
        </ThemedText>
        <View style={styles.currentBadge}>
          <ThemedText style={styles.currentBadgeText}>{formatRecordingStats(stats)}</ThemedText>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.toggleRow}>
          <View style={styles.iconBadge}>
            <SymbolView
              name={{ ios: 'mic.badge.plus', android: 'mic', web: 'mic' }}
              size={20}
              tintColor={Colors.ink}
            />
          </View>
          <View style={styles.toggleCopy}>
            <ThemedText style={styles.toggleLabel} selectable>
              端末に残す
            </ThemedText>
            <ThemedText style={styles.toggleCaption} selectable>
              カードから元の音声を再生できます。
            </ThemedText>
          </View>
          <Switch
            accessibilityLabel="録音を端末に保存"
            onValueChange={settings.setSaveRecordings}
            thumbColor={Colors.cream}
            trackColor={{ false: '#D8D0C1', true: Colors.mint }}
            value={settings.saveRecordings}
          />
        </View>

        <GlideButton
          accessibilityLabel="保存済み録音をすべて削除"
          busy={isDeleting}
          disabled={stats.count === 0 || isDeleting}
          icon={{ ios: 'trash.fill', android: 'delete', web: 'delete' }}
          label="保存済み録音を削除"
          onPress={handleDeletePress}
          size="medium"
          tone="coral"
        />
      </View>
    </View>
  );
}

function formatRecordingStats(stats: LocalRecordingStats) {
  if (stats.count === 0) {
    return '0件';
  }

  return `${stats.count}件 / ${formatBytes(stats.sizeBytes)}`;
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))}KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)}MB`;
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
    borderLeftWidth: 7,
    borderLeftColor: Colors.mint,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    paddingLeft: Spacing.three,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionTitle: { fontSize: 26, lineHeight: 32, fontWeight: 900 },
  currentBadge: {
    borderRadius: 999,
    borderWidth: 3,
    borderColor: Colors.ink,
    backgroundColor: Colors.cream,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  currentBadgeText: { color: Colors.ink, fontSize: 12, lineHeight: 16, fontWeight: 900 },
  panel: { gap: Spacing.three },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 3,
    borderColor: Colors.ink,
    backgroundColor: Colors.paper,
    padding: Spacing.three,
  },
  iconBadge: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 3,
    borderColor: Colors.ink,
    backgroundColor: Colors.cream,
  },
  toggleCopy: { flex: 1, minWidth: 0, gap: Spacing.half },
  toggleLabel: { color: Colors.ink, fontSize: 17, lineHeight: 22, fontWeight: 900 },
  toggleCaption: {
    color: 'rgba(17, 17, 17, 0.66)',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 700,
  },
});
