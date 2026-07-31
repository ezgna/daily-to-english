import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { Spacing } from '@/shared/legacy/theme';
import { AppText } from '@/shared/ui/app-text';

export function SegmentedControl<T extends string>({
  accessibilityLabel,
  haptics = false,
  options,
  testID,
  value,
  onChange,
}: {
  accessibilityLabel?: string;
  haptics?: boolean;
  options: { label: string; value: T }[];
  testID?: string;
  value: T;
  onChange: (value: T) => void;
}) {
  const colors = useDailyPalette();

  function handleChange(nextValue: T) {
    if (nextValue === value) {
      return;
    }

    if (haptics && process.env.EXPO_OS === 'ios') {
      void Haptics.selectionAsync().catch(() => undefined);
    }

    onChange(nextValue);
  }

  return (
    <View
      style={[styles.root, { backgroundColor: colors.cardAlt, borderColor: colors.text }]}
      testID={testID}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityLabel={
              accessibilityLabel
                ? `${accessibilityLabel}、${option.label}、${index + 1}/${options.length}`
                : `${option.label}、${index + 1}/${options.length}`
            }
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => handleChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              selected && [styles.optionSelected, { borderColor: colors.text }],
              pressed && styles.optionPressed,
            ]}
            testID={testID ? `${testID}-${option.value}` : undefined}
          >
            <AppText
              maxFontSizeMultiplier={1.4}
              muted={!selected}
              numberOfLines={1}
              selectable={false}
              style={[styles.label, selected && styles.selectedLabel]}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 3,
    padding: Spacing.one,
    gap: Spacing.one,
  },
  option: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  optionSelected: {
    backgroundColor: '#2FDD6C',
  },
  optionPressed: {
    opacity: 0.72,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  selectedLabel: {
    color: '#111111',
    fontWeight: '900',
  },
});
