import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { GlideButton, type GlideButtonTone } from '@/shared/legacy/ui/glide-button';

export function Button({
  children,
  disabled,
  kind = 'primary',
  loading,
  onPress,
  style,
}: {
  children: ReactNode;
  disabled?: boolean;
  kind?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <GlideButton
      label={String(children)}
      tone={buttonToneByKind[kind]}
      busy={loading}
      disabled={disabled}
      onPress={onPress}
      containerStyle={style}
      size="large"
    />
  );
}

const buttonToneByKind: Record<'primary' | 'secondary' | 'danger', GlideButtonTone> = {
  primary: 'blue',
  secondary: 'cream',
  danger: 'coral',
};
