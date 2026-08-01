import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

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
  const [isDeleting, setIsDeleting] = useState(false);

  if (!__DEV__) {
    return null;
  }

  function handleDeletePress() {
    Alert.alert(
      'すべてのデータを削除',
      '作成した日記・カード・復習履歴・利用履歴・保存済み録音を削除します。設定は残ります。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
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
          '一部削除できませんでした',
          '作成データは削除しましたが、一部の録音ファイルが端末に残っています。'
        );
        return;
      }

      Alert.alert('削除しました', '作成データと保存済み録音を削除しました。');
    } catch (error) {
      Alert.alert('削除できませんでした', formatApiError(error));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <SettingsSection
      accentColor={SettingsColors.purple}
      accentTextColor={SettingsColors.white}
      badge="DEV"
      description="表示や操作を試すための開発用メニューです。"
      title="開発者向け"
    >
      <View style={styles.actions}>
        <Link asChild href="../experiment-lab">
          <GlideButton
            accessibilityLabel="UI実験室を開く"
            caption="EXPO UI PLAYGROUND"
            icon={{ ios: 'flask.fill', android: 'science', web: 'science' }}
            label="UI実験室を開く"
            size="medium"
            tone="violet"
          />
        </Link>
        <GlideButton
          accessibilityLabel="すべてのデータを削除"
          busy={isDeleting}
          disabled={isDeleting}
          icon={{ ios: 'trash.fill', android: 'delete', web: 'delete' }}
          label="すべてのデータを削除"
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
