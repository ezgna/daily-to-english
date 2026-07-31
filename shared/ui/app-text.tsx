import type { ComponentProps } from 'react';
import { Text } from 'react-native';

import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { ThemedText } from '@/shared/legacy/themed-text';

type AppTextProps = ComponentProps<typeof Text> & {
  muted?: boolean;
  variant?: 'title' | 'subtitle' | 'body' | 'caption';
};

export function AppText({ muted, variant = 'body', style, ...props }: AppTextProps) {
  const colors = useDailyPalette();
  return (
    <ThemedText
      selectable={variant !== 'caption'}
      type={themedTextTypeByVariant[variant]}
      style={[muted ? { color: colors.muted } : null, style]}
      {...props}
    />
  );
}

const themedTextTypeByVariant = {
  title: 'title',
  subtitle: 'subtitle',
  body: 'default',
  caption: 'code',
} as const;
