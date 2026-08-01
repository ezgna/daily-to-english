import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [stats, setStats] = useState<LocalRecordingStats>(getLocalRecordingStats);
  const [isDeleting, setIsDeleting] = useState(false);
  const countLabel = t(
    stats.count === 1
      ? 'settings.recordings.stats.count_one'
      : 'settings.recordings.stats.count_other',
    { count: stats.count }
  );
  const formattedStats =
    stats.count === 0
      ? countLabel
      : t('settings.recordings.stats.withSize', {
          countLabel,
          size: formatBytes(stats.sizeBytes, settings.appLanguage),
        });

  useEffect(() => {
    setStats(getLocalRecordingStats());
    return subscribeToLocalRecordings(() => setStats(getLocalRecordingStats()));
  }, []);

  function handleDeletePress() {
    Alert.alert(t('settings.recordings.delete.confirmTitle'), t('settings.recordings.delete.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          setIsDeleting(true);
          void deleteAllLocalRecordings()
            .catch(() => {
              Alert.alert(
                t('settings.recordings.delete.errorTitle'),
                t('settings.recordings.delete.errorBody')
              );
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
      description={t('settings.recordings.description')}
      title={t('settings.recordings.title')}
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
              {t('settings.recordings.keep.label')}
            </ThemedText>
            <ThemedText
              maxFontSizeMultiplier={1.5}
              selectable
              style={styles.toggleCaption}
            >
              {t('settings.recordings.keep.caption')}
            </ThemedText>
          </View>
          <Switch
            accessibilityHint={t('settings.recordings.accessibility.saveHint')}
            accessibilityLabel={t('settings.recordings.accessibility.saveLabel')}
            ios_backgroundColor="#D8D0C1"
            onValueChange={settings.setSaveRecordings}
            thumbColor={SettingsColors.cream}
            trackColor={{ false: '#D8D0C1', true: SettingsColors.mint }}
            value={settings.saveRecordings}
          />
        </FoundationSurface>

        <GlideButton
          accessibilityLabel={t('settings.recordings.accessibility.deleteAll', {
            stats: formattedStats,
          })}
          badge={formattedStats}
          busy={isDeleting}
          disabled={stats.count === 0 || isDeleting}
          icon={{ ios: 'trash.fill', android: 'delete', web: 'delete' }}
          label={t('settings.recordings.delete.action')}
          onPress={handleDeletePress}
          size="medium"
          tone="coral"
        />
      </View>
    </SettingsSection>
  );
}

function formatBytes(value: number, language: string) {
  const wholeNumberFormatter = new Intl.NumberFormat(language, { maximumFractionDigits: 0 });

  if (value < 1024 * 1024) {
    return `${wholeNumberFormatter.format(Math.max(1, Math.round(value / 1024)))}KB`;
  }

  return `${new Intl.NumberFormat(language, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value / 1024 / 1024)}MB`;
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
