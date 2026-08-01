import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { deleteAllLocalRecordings } from '@/features/recordings/recording-store';
import { SettingsSection } from '@/features/settings/settings-section';
import { SettingsColors } from '@/features/settings/settings-theme';
import { deleteDeveloperData, formatApiError } from '@/shared/api/client';
import { clearReviewOutbox } from '@/shared/api/review-outbox';
import { applyDeletedUserDataState } from '@/shared/api/user-data-reset';
import { Spacing } from '@/shared/legacy/theme';
import { GlideButton } from '@/shared/legacy/ui/glide-button';

export function SettingsDeveloperSection() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!__DEV__) {
    return null;
  }

  function handleDeletePress() {
    Alert.alert(
      t('settings.developer.deleteAll.confirmTitle'),
      t('settings.developer.deleteAll.confirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            void handleDeleteConfirmed();
          },
        },
      ]
    );
  }

  async function handleDeleteConfirmed() {
    setIsDeleting(true);

    try {
      await queryClient.cancelQueries();
      await deleteDeveloperData();
      clearReviewOutbox();
      applyDeletedUserDataState(queryClient);

      try {
        await deleteAllLocalRecordings();
      } catch {
        Alert.alert(
          t('settings.developer.deleteAll.partialTitle'),
          t('settings.developer.deleteAll.partialBody')
        );
        return;
      }

      Alert.alert(
        t('settings.developer.deleteAll.successTitle'),
        t('settings.developer.deleteAll.successBody')
      );
    } catch (error) {
      Alert.alert(t('settings.developer.deleteAll.errorTitle'), formatApiError(error));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <SettingsSection
      accentColor={SettingsColors.purple}
      badge="DEV"
      description={t('settings.developer.description')}
      title={t('settings.developer.title')}
    >
      <View style={styles.actions}>
        <Link asChild href="../experiment-lab">
          <GlideButton
            accessibilityLabel={t('settings.developer.lab.accessibility')}
            caption="EXPO UI PLAYGROUND"
            icon={{ ios: 'flask.fill', android: 'science', web: 'science' }}
            label={t('settings.developer.lab.action')}
            size="medium"
            tone="violet"
          />
        </Link>
        <GlideButton
          accessibilityLabel={t('settings.developer.deleteAll.accessibility')}
          busy={isDeleting}
          disabled={isDeleting}
          icon={{ ios: 'trash.fill', android: 'delete', web: 'delete' }}
          label={t('settings.developer.deleteAll.action')}
          onPress={handleDeletePress}
          size="medium"
          tone="coral"
        />
      </View>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.three,
  },
});
