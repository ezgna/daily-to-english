import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocalRecordingSettings } from '@/features/settings/local-recording-settings';
import {
  SplitPolicySelector,
  ThemeSchemeSelector,
  TranslationStyleSelector,
} from '@/features/settings/settings-selectors';
import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/shared/legacy/theme';
import { GlideButton } from '@/shared/legacy/ui/glide-button';

export function SettingsScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const palette = useDailyPalette();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: safeAreaInsets.top,
          paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.four,
          paddingLeft: Math.max(safeAreaInsets.left, Spacing.three),
          paddingRight: Math.max(safeAreaInsets.right, Spacing.three),
        },
      ]}
    >
      <View style={styles.container}>
        <Link href="../experiment-lab" asChild>
          <GlideButton
            accessibilityLabel="実験室を開く"
            caption="EXPO UI PLAYGROUND"
            icon={{ ios: 'flask.fill', android: 'science', web: 'science' }}
            label="実験室"
            size="medium"
            tone="violet"
          />
        </Link>
        <ThemeSchemeSelector />
        <SplitPolicySelector />
        <TranslationStyleSelector />
        <LocalRecordingSettings />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { alignItems: 'center', width: '100%' },
  container: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.four },
});
