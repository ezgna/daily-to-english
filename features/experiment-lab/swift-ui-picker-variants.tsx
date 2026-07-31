import { View } from 'react-native';
import { AppText } from '@/shared/ui/app-text';

import type { SwiftUIPickerVariantsProps } from './swift-ui-picker-variants.types';

export function SwiftUIPickerVariants(_: SwiftUIPickerVariantsProps) {
  return (
    <View>
      <AppText muted variant="caption">
        SWIFTUI / IOS ONLY
      </AppText>
    </View>
  );
}
