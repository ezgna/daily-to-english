import { Host } from '@expo/ui';
import { Picker, Text } from '@expo/ui/swift-ui';
import {
  controlSize,
  labelsHidden,
  pickerStyle,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/shared/legacy/theme';
import { AppText } from '@/shared/ui/app-text';

import type { SwiftUIPickerVariantsProps } from './swift-ui-picker-variants.types';

export function SwiftUIPickerVariants({
  options,
  value,
  onChange,
  tintColor,
}: SwiftUIPickerVariantsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.variant}>
        <AppText muted variant="caption">
          SWIFTUI / SEGMENTED / MINI
        </AppText>
        <Host matchContents={{ vertical: true }} seedColor={tintColor} style={styles.host}>
          <Picker
            label="表示モード"
            modifiers={[pickerStyle('segmented'), controlSize('mini'), labelsHidden()]}
            onSelectionChange={onChange}
            selection={value}
          >
            {options.map((option) => (
              <Text key={option.value} modifiers={[tag(option.value)]}>
                {option.label}
              </Text>
            ))}
          </Picker>
        </Host>
      </View>

      <View style={styles.variant}>
        <AppText muted variant="caption">
          SWIFTUI / SEGMENTED / LARGE
        </AppText>
        <Host matchContents={{ vertical: true }} seedColor={tintColor} style={styles.host}>
          <Picker
            label="表示モード"
            modifiers={[pickerStyle('segmented'), controlSize('large'), labelsHidden()]}
            onSelectionChange={onChange}
            selection={value}
          >
            {options.map((option) => (
              <Text key={option.value} modifiers={[tag(option.value)]}>
                {option.label}
              </Text>
            ))}
          </Picker>
        </Host>
      </View>

      <PickerVariant
        label="PALETTE"
        onChange={onChange}
        options={options}
        style="palette"
        tintColor={tintColor}
        value={value}
      />
      <PickerVariant
        label="MENU"
        onChange={onChange}
        options={options}
        style="menu"
        tintColor={tintColor}
        value={value}
      />
      <PickerVariant
        label="WHEEL"
        onChange={onChange}
        options={options}
        style="wheel"
        tintColor={tintColor}
        value={value}
      />
    </View>
  );
}

type PickerVariantProps = SwiftUIPickerVariantsProps & {
  label: string;
  style: 'menu' | 'palette' | 'wheel';
};

function PickerVariant({
  label,
  onChange,
  options,
  style,
  tintColor,
  value,
}: PickerVariantProps) {
  return (
    <View style={styles.variant}>
      <AppText muted variant="caption">
        {label}
      </AppText>
      <Host matchContents={{ vertical: true }} seedColor={tintColor} style={styles.host}>
        <Picker
          label="表示モード"
          modifiers={[pickerStyle(style), labelsHidden()]}
          onSelectionChange={onChange}
          selection={value}
        >
          {options.map((option) => (
            <Text key={option.value} modifiers={[tag(option.value)]}>
              {option.label}
            </Text>
          ))}
        </Picker>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  variant: {
    gap: Spacing.two,
  },
  host: {
    alignSelf: 'stretch',
    width: '100%',
  },
});
