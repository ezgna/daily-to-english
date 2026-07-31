import { Pressable, StyleSheet, View } from 'react-native';

import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { Spacing } from '@/shared/legacy/theme';
import { AppText } from '@/shared/ui/app-text';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const colors = useDailyPalette();

  return (
    <View style={[styles.root, { backgroundColor: colors.cardAlt, borderColor: colors.text }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            onPress={() => onChange(option.value)}
            style={[
              styles.option,
              selected && [styles.optionSelected, { borderColor: colors.text }],
            ]}
          >
            <AppText variant="caption" muted={!selected} style={selected ? styles.selectedLabel : undefined}>
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
    borderWidth: 3,
    padding: Spacing.one,
    gap: Spacing.one,
  },
  option: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  optionSelected: {
    backgroundColor: '#2FDD6C',
  },
  selectedLabel: {
    color: '#111111',
    fontWeight: '900',
  },
});
