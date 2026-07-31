import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import {
  deleteAllLocalRecordings,
  getLocalRecordingStats,
  subscribeToLocalRecordings,
  type LocalRecordingStats,
} from '@/features/recordings/recording-store';
import { SettingsSection } from '@/features/settings/settings-section';
import { useSettings } from '@/features/settings/settings-store';
import { SettingsColors } from '@/features/settings/settings-theme';
import { Spacing } from '@/shared/legacy/theme';
import { ThemedText } from '@/shared/legacy/themed-text';
import { FoundationSurface } from '@/shared/legacy/ui/foundation-surface';
import { GlideButton } from '@/shared/legacy/ui/glide-button';

export function LocalRecordingSettings() {
  const settings = useSettings();
  const [stats, setStats] = useState<LocalRecordingStats>(getLocalRecordingStats);
  const [isDeleting, setIsDeleting] = useState(false);
  const formattedStats = formatRecordingStats(stats);

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
    <SettingsSection
      accentColor={SettingsColors.mint}
      badge={formattedStats}
      description="元の音声を端末に残すか、保存済みデータを管理します。"
      title="録音とデータ"
    >
      <View style={styles.panel}>
        <FoundationSurface
          containerStyle={styles.toggleSurface}
          foundationBorderColor={SettingsColors.ink}
          foundationBorderWidth={2}
          foundationColor={SettingsColors.foundation}
          foundationDepth={7}
          foundationDirection="diagonal"
          foundationDistanceScale={0.72}
          foundationRadiusMode="concentric"
          style={styles.toggleCard}
        >
          <View style={styles.iconBadge}>
            <SymbolView
              name={{ ios: 'mic.badge.plus', android: 'mic', web: 'mic' }}
              size={20}
              tintColor={SettingsColors.ink}
            />
          </View>
          <View style={styles.toggleCopy}>
            <ThemedText
              maxFontSizeMultiplier={1.4}
              selectable
              style={styles.toggleLabel}
            >
              端末に残す
            </ThemedText>
            <ThemedText
              maxFontSizeMultiplier={1.5}
              selectable
              style={styles.toggleCaption}
            >
              カードから元の音声を再生できます。
            </ThemedText>
          </View>
          <Switch
            accessibilityHint="カードから元の音声を再生できるようにします"
            accessibilityLabel="録音を端末に保存"
            ios_backgroundColor="#D8D0C1"
            onValueChange={settings.setSaveRecordings}
            thumbColor={SettingsColors.cream}
            trackColor={{ false: '#D8D0C1', true: SettingsColors.mint }}
            value={settings.saveRecordings}
          />
        </FoundationSurface>

        <GlideButton
          accessibilityLabel={`保存済み録音をすべて削除、${formattedStats}`}
          badge={formattedStats}
          busy={isDeleting}
          disabled={stats.count === 0 || isDeleting}
          icon={{ ios: 'trash.fill', android: 'delete', web: 'delete' }}
          label="保存済み録音を削除"
          onPress={handleDeletePress}
          size="medium"
          tone="coral"
        />
      </View>
    </SettingsSection>
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
  panel: {
    gap: Spacing.three,
  },
  toggleSurface: {
    alignSelf: 'stretch',
  },
  toggleCard: {
    minHeight: 78,
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 3,
    borderColor: SettingsColors.ink,
    backgroundColor: SettingsColors.paper,
    padding: Spacing.three,
  },
  iconBadge: {
    width: 42,
    height: 42,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 3,
    borderColor: SettingsColors.ink,
    backgroundColor: SettingsColors.cream,
  },
  toggleCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  toggleLabel: {
    color: SettingsColors.ink,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  toggleCaption: {
    color: SettingsColors.mutedInk,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
});
