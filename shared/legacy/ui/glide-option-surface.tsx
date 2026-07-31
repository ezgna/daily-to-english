import type { ReactNode } from 'react';
import { StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/shared/legacy/theme';
import { FoundationSurface } from '@/shared/legacy/ui/foundation-surface';
import {
  GlideFoundationColor,
  GlideFoundationDistance,
  GlideSizeMetrics,
  type GlideSize,
} from '@/shared/legacy/ui/glide-frame';

type GlideOptionSurfaceProps = {
  children: ReactNode;
  selected: boolean;
  onPress: () => void;
  size?: GlideSize;
  accessibilityRole?: PressableProps['accessibilityRole'];
  accessibilityLabel?: string;
  accessibilityState?: PressableProps['accessibilityState'];
  containerStyle?: StyleProp<ViewStyle>;
  foundationColor?: string;
  style?: StyleProp<ViewStyle>;
};

const SelectedFoundationDepth = GlideSizeMetrics.large.foundationDepth;
const RestingFoundationDepth = GlideSizeMetrics.medium.foundationDepth;

export function GlideOptionSurface({
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  children,
  containerStyle,
  foundationColor = GlideFoundationColor,
  onPress,
  selected,
  size = 'large',
  style,
}: GlideOptionSurfaceProps) {
  const sizeMetrics = GlideSizeMetrics[size];

  return (
    <FoundationSurface
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      containerStyle={containerStyle}
      foundationColor={foundationColor}
      foundationDepth={selected ? SelectedFoundationDepth : RestingFoundationDepth}
      foundationDirection="diagonal"
      foundationDistanceScale={GlideFoundationDistance}
      haptic="selection"
      style={[
        styles.surface,
        {
          borderRadius: sizeMetrics.borderRadius,
          borderWidth: sizeMetrics.borderWidth,
          minHeight: sizeMetrics.minHeight,
          paddingHorizontal: sizeMetrics.paddingHorizontal,
          paddingVertical: sizeMetrics.paddingVertical,
        },
        style,
      ]}
      onPress={onPress}
    >
      {children}
    </FoundationSurface>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderCurve: 'continuous',
    borderColor: GlideFoundationColor,
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
