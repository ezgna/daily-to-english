import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { MaxContentWidth, Spacing } from '@/shared/legacy/theme';
import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';

type ScreenProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  contentInsetAdjustmentBehavior?: ScrollViewProps['contentInsetAdjustmentBehavior'];
};

export function Screen({
  children,
  contentContainerStyle,
  contentInsetAdjustmentBehavior = 'automatic',
}: ScreenProps) {
  const colors = useDailyPalette();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
      keyboardShouldPersistTaps="handled"
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
    >
      <View style={styles.inner}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: Spacing.three,
    paddingBottom: Spacing.four,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.four,
  },
});
