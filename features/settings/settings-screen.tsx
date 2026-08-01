import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsDeveloperSection } from '@/features/settings/settings-developer-section';
import { LocalRecordingSettings } from '@/features/settings/local-recording-settings';
import {
  LanguageSelector,
  SplitPolicySelector,
  ThemeSchemeSelector,
  TranslationStyleSelector,
} from '@/features/settings/settings-selectors';
import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/shared/legacy/theme';

export function SettingsScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const palette = useDailyPalette();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: safeAreaInsets.top,
          paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.four,
          paddingLeft: Math.max(safeAreaInsets.left, Spacing.three),
          paddingRight: Math.max(safeAreaInsets.right, Spacing.three),
        },
      ]}
      style={[styles.screen, { backgroundColor: palette.background }]}
    >
      <View style={styles.container}>
        <LanguageSelector />
        <SplitPolicySelector />
        <TranslationStyleSelector />
        <ThemeSchemeSelector />
        <LocalRecordingSettings />
        <SettingsDeveloperSection />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.five,
    paddingTop: Spacing.three,
  },
});
