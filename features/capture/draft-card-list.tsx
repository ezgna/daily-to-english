import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Card } from '@just-speak-it/contract';

import { Spacing } from '@/shared/legacy/theme';
import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { AppText } from '@/shared/ui/app-text';

const RailColors = ['#2FDD6C', '#65D7F2', '#FF9F45', '#9B7CFF'] as const;

export function DraftCardList({ cards }: { cards: Card[] }) {
  const colors = useDailyPalette();
  const { t } = useTranslation();
  const visibleCards = cards.filter((card) => card.ja.trim().length > 0);

  return (
    <View style={styles.container}>
      <ScrollView
        accessibilityLabel={t('capture.accessibility.generatedJapaneseCards')}
        alwaysBounceVertical={false}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.railList}
      >
        {visibleCards.length > 0 ? (
          <View accessible={false} style={[styles.railLine, { backgroundColor: colors.border }]} />
        ) : null}
        {visibleCards.map((card, index) => (
          <View key={card.id} style={styles.railItem}>
            <View
              accessible={false}
              style={[
                styles.railDot,
                {
                  backgroundColor: RailColors[index % RailColors.length],
                },
              ]}
            />
            <AppText style={styles.railText}>{card.ja.trim()}</AppText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  railList: {
    position: 'relative',
    gap: Spacing.three,
    paddingLeft: 30,
    paddingBottom: Spacing.half,
  },
  railLine: {
    position: 'absolute',
    left: 8,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 999,
  },
  railItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  railDot: {
    width: 19,
    height: 19,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#111111',
    marginLeft: -30,
    marginTop: 5,
  },
  railText: {
    flex: 1,
    minWidth: 0,
    fontSize: 19,
    lineHeight: 29,
    fontWeight: 700,
  },
});
