import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import type { Card, ReviewRating } from '@just-speak-it/contract';

import { useDailyPalette } from '@/shared/legacy/just-speak-it-ui';
import { MaxContentWidth, Spacing } from '@/shared/legacy/theme';
import { ThemedText } from '@/shared/legacy/themed-text';

type SlackFlashcardLabProps = {
  cards: Card[];
  disabled?: boolean;
  footerAccessory?: ReactNode;
  headerAccessory?: ReactNode;
  onDueCountChange?: (dueCount: number) => void;
  onReview: (cardId: string, rating: ReviewRating) => Promise<void> | void;
  onUndo?: (cardId: string) => Promise<void> | void;
};

type PracticeCard = {
  audioEndSec: number | null;
  audioStartSec: number | null;
  dueAt: string | null;
  english: string;
  id: string;
  japanese: string;
  position: number;
  reviewCount: number;
  srsStatus: Card['srsStatus'];
  successStreak: number;
};

type UndoEntry = {
  card: PracticeCard;
  cardId: string;
};

const CancelReturnSpringConfig = {
  damping: 30,
  mass: 0.9,
  stiffness: 210,
};
const VisibleCardCount = 3;
const BackCardTranslateY = 38;
const BackCardScale = 0.93;
const DeepCardTranslateY = BackCardTranslateY;
const DeepCardScale = 0.88;
const ActiveBackCardTranslateY = 12;
const ActiveBackCardScale = 0.985;
const DeepCardDragLag = 0.78;
const PromotionDuration = 170;
const PromptTextMetrics = {
  fontSize: 27,
  lineHeight: 37,
};
const AnswerTextMetrics = {
  fontSize: 26,
  lineHeight: 36,
};
const AnswerSoundControlSize = 40;
const EnglishSpeechFallbackPaddingMs = 3200;
const EnglishSpeechFallbackMinMs = 6000;
const EnglishSpeechFallbackMaxMs = 45000;
const DecisionRingSize = 68;
const DecisionRingStrokeWidth = 4;
const DecisionRingStartOffset = 32;
const DecisionRingCenter = DecisionRingSize / 2;
const DecisionRingRadius = (DecisionRingSize - DecisionRingStrokeWidth) / 2;
const DecisionRingCircumference = 2 * Math.PI * DecisionRingRadius;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function SlackFlashcardLab({
  cards,
  disabled = false,
  footerAccessory,
  headerAccessory,
  onDueCountChange,
  onReview,
  onUndo,
}: SlackFlashcardLabProps) {
  const { width, height } = useWindowDimensions();
  const palette = useDailyPalette();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const promotionProgress = useSharedValue(0);
  const swipeOwnerCardId = useSharedValue<string | null>(null);
  const promotionOwnerCardId = useSharedValue<string | null>(null);
  const trailingPromotionOwnerCardId = useSharedValue<string | null>(null);
  const decisionOwnerCardId = useSharedValue<string | null>(null);
  const swipeHapticDecisionDirection = useSharedValue(0);
  const [dismissedCardIds, setDismissedCardIds] = useState<Set<string>>(() => new Set());
  const [frontPinnedCard, setFrontPinnedCard] = useState<PracticeCard | null>(null);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [rootSize, setRootSize] = useState({ width: 0, height: 0 });
  const [visualQueue, setVisualQueue] = useState<PracticeCard[] | null>(null);
  const [pendingVisualQueueRelease, setPendingVisualQueueRelease] = useState(0);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

  const practiceCards = useMemo(() => cards.flatMap(toPracticeCard), [cards]);
  const cardsById = useMemo(() => new Map(practiceCards.map((card) => [card.id, card])), [practiceCards]);
  const rootWidth = rootSize.width > 0 ? rootSize.width : width;
  const cardWidth = Math.min(Math.max(rootWidth, 0), 560);
  const cardHeight = Math.min(Math.max(height * 0.44, 360), 540);
  const stageHeight = cardHeight + BackCardTranslateY + Spacing.two;
  const swipeThreshold = Math.max(88, cardWidth * 0.22);
  const swipeOutDistance = width + 180;

  const displayQueue = useMemo(() => {
    const availableQueue = practiceCards.filter((card) => !dismissedCardIds.has(card.id));

    if (!frontPinnedCard) {
      return availableQueue;
    }

    const pinnedCard = availableQueue.find((card) => card.id === frontPinnedCard.id) ?? frontPinnedCard;

    return [pinnedCard, ...availableQueue.filter((card) => card.id !== frontPinnedCard.id)];
  }, [dismissedCardIds, frontPinnedCard, practiceCards]);

  useEffect(() => {
    setDismissedCardIds((currentIds) => {
      const nextIds = new Set<string>();

      for (const cardId of currentIds) {
        if (cardsById.has(cardId)) {
          nextIds.add(cardId);
        }
      }

      return nextIds.size === currentIds.size ? currentIds : nextIds;
    });
  }, [cardsById]);

  useEffect(() => {
    onDueCountChange?.(displayQueue.length);
  }, [displayQueue.length, onDueCountChange]);

  const renderQueue = visualQueue ?? displayQueue;
  const visibleCards = useMemo(() => renderQueue.slice(0, VisibleCardCount), [renderQueue]);
  const activeCard = renderQueue[0] ?? null;
  const activeCardId = activeCard?.id ?? null;
  const promotedCardId = visibleCards[1]?.id ?? null;
  const trailingPromotedCardId = visibleCards[2]?.id ?? null;

  const handleRootLayout = useCallback((event: LayoutChangeEvent) => {
    const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;

    setRootSize((currentSize) => {
      if (
        Math.abs(currentSize.width - nextWidth) < 1 &&
        Math.abs(currentSize.height - nextHeight) < 1
      ) {
        return currentSize;
      }

      return { width: nextWidth, height: nextHeight };
    });
  }, []);

  const resetCardTranslation = useCallback(() => {
    translateX.set(0);
    translateY.set(0);
  }, [translateX, translateY]);

  const resetCardPosition = useCallback(() => {
    resetCardTranslation();
    promotionProgress.set(0);
    swipeOwnerCardId.set(null);
    promotionOwnerCardId.set(null);
    trailingPromotionOwnerCardId.set(null);
    decisionOwnerCardId.set(null);
    swipeHapticDecisionDirection.set(0);
  }, [
    decisionOwnerCardId,
    promotionOwnerCardId,
    promotionProgress,
    resetCardTranslation,
    swipeHapticDecisionDirection,
    swipeOwnerCardId,
    trailingPromotionOwnerCardId,
  ]);

  useEffect(() => {
    if (pendingVisualQueueRelease !== 0) {
      return;
    }

    if (swipeOwnerCardId.get() && swipeOwnerCardId.get() !== activeCardId) {
      resetCardPosition();
    }
  }, [activeCardId, pendingVisualQueueRelease, resetCardPosition, swipeOwnerCardId]);

  useEffect(() => {
    if (pendingVisualQueueRelease === 0) {
      return;
    }

    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        resetCardPosition();
        setVisualQueue(null);
        setPendingVisualQueueRelease(0);
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [pendingVisualQueueRelease, resetCardPosition]);

  const handleToggleAnswerPress = useCallback(() => {
    setIsAnswerVisible((currentValue) => !currentValue);
  }, []);

  const lockVisualQueue = useCallback(() => {
    setVisualQueue(displayQueue.slice(0, VisibleCardCount));
  }, [displayQueue]);

  const unlockVisualQueue = useCallback(() => {
    setVisualQueue(null);
  }, []);

  const playSwipeThresholdHaptic = useCallback(() => {
    if (process.env.EXPO_OS === 'web') {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, []);

  const restoreAfterReviewError = useCallback((card: PracticeCard) => {
    setDismissedCardIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(card.id);
      return nextIds;
    });
    setFrontPinnedCard(card);
  }, []);

  const completeSwipe = useCallback(
    (status: Card['srsStatus']) => {
      if (!activeCard || disabled) {
        resetCardPosition();
        return;
      }

      const rating: ReviewRating = status === 'known' ? 'good' : 'again';
      const nextVisualQueue = displayQueue.filter((card) => card.id !== activeCard.id).slice(0, VisibleCardCount);

      setVisualQueue(nextVisualQueue);
      setPendingVisualQueueRelease((currentValue) => currentValue + 1);
      setUndoStack((currentStack) => [...currentStack.slice(-4), { cardId: activeCard.id, card: activeCard }]);
      setDismissedCardIds((currentIds) => new Set(currentIds).add(activeCard.id));
      setFrontPinnedCard(null);
      setIsAnswerVisible(false);

      Promise.resolve(onReview(activeCard.id, rating)).catch(() => {
        restoreAfterReviewError(activeCard);
      });
    },
    [activeCard, disabled, displayQueue, onReview, resetCardPosition, restoreAfterReviewError]
  );

  const handleUndoPress = useCallback(() => {
    const undoEntry = undoStack[undoStack.length - 1];

    if (!undoEntry || disabled) {
      return;
    }

    const restoredCard = cardsById.get(undoEntry.cardId) ?? undoEntry.card;

    resetCardPosition();
    setVisualQueue(null);
    setPendingVisualQueueRelease(0);
    setDismissedCardIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(undoEntry.cardId);
      return nextIds;
    });
    setFrontPinnedCard(restoredCard);
    setUndoStack((currentStack) => currentStack.slice(0, -1));
    setIsAnswerVisible(false);

    Promise.resolve(onUndo?.(undoEntry.cardId)).catch(() => undefined);
  }, [cardsById, disabled, onUndo, resetCardPosition, undoStack]);

  const animateCardDecision = useCallback(
    (status: Card['srsStatus'], releaseTranslateY = status === 'known' ? -18 : 18) => {
      const decisionQueue = displayQueue.slice(0, VisibleCardCount);
      const decisionActiveCardId = decisionQueue[0]?.id ?? null;
      const decisionPromotedCardId = decisionQueue[1]?.id ?? null;
      const decisionTrailingPromotedCardId = decisionQueue[2]?.id ?? null;

      if (!decisionActiveCardId || decisionOwnerCardId.get() || disabled) {
        return;
      }

      const direction = status === 'known' ? 1 : -1;

      setVisualQueue(decisionQueue);
      decisionOwnerCardId.set(decisionActiveCardId);
      swipeOwnerCardId.set(decisionActiveCardId);
      promotionOwnerCardId.set(null);
      trailingPromotionOwnerCardId.set(null);
      promotionProgress.set(0);
      swipeHapticDecisionDirection.set(0);
      translateX.set(
        withTiming(direction * swipeOutDistance, { duration: 190 }, (finished) => {
          if (finished) {
            promotionOwnerCardId.set(decisionPromotedCardId);
            trailingPromotionOwnerCardId.set(decisionTrailingPromotedCardId);
            promotionProgress.set(0);
            promotionProgress.set(
              withTiming(1, { duration: PromotionDuration }, (promoted) => {
                if (promoted) {
                  runOnJS(completeSwipe)(status);
                }
              })
            );
          }
        })
      );
      translateY.set(withTiming(releaseTranslateY, { duration: 190 }));
    },
    [
      completeSwipe,
      decisionOwnerCardId,
      disabled,
      displayQueue,
      promotionOwnerCardId,
      promotionProgress,
      swipeHapticDecisionDirection,
      swipeOutDistance,
      swipeOwnerCardId,
      trailingPromotionOwnerCardId,
      translateX,
      translateY,
    ]
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled)
        .onBegin(() => {
          if (activeCardId && !decisionOwnerCardId.get()) {
            runOnJS(lockVisualQueue)();
            swipeOwnerCardId.set(activeCardId);
            promotionOwnerCardId.set(null);
            trailingPromotionOwnerCardId.set(null);
            promotionProgress.set(0);
            swipeHapticDecisionDirection.set(0);
          }
        })
        .onUpdate((event) => {
          if (decisionOwnerCardId.get()) {
            return;
          }

          if (activeCardId && swipeOwnerCardId.get() !== activeCardId) {
            swipeOwnerCardId.set(activeCardId);
          }

          translateX.set(event.translationX);
          translateY.set(event.translationY);

          const decisionDirection =
            event.translationX > swipeThreshold ? 1 : event.translationX < -swipeThreshold ? -1 : 0;
          const currentHapticDecisionDirection = swipeHapticDecisionDirection.get();

          if (decisionDirection === 0) {
            if (currentHapticDecisionDirection !== 0) {
              swipeHapticDecisionDirection.set(0);
            }
            return;
          }

          if (currentHapticDecisionDirection !== decisionDirection) {
            swipeHapticDecisionDirection.set(decisionDirection);
            runOnJS(playSwipeThresholdHaptic)();
          }
        })
        .onEnd((event) => {
          if (decisionOwnerCardId.get()) {
            return;
          }

          const shouldDecide =
            Math.abs(event.translationX) > swipeThreshold || Math.abs(event.velocityX) > 760;

          if (!shouldDecide) {
            translateX.set(
              withSpring(0, CancelReturnSpringConfig, (finished) => {
                if (finished) {
                  swipeOwnerCardId.set(null);
                  runOnJS(unlockVisualQueue)();
                }
              })
            );
            translateY.set(withSpring(0, CancelReturnSpringConfig));
            promotionOwnerCardId.set(null);
            trailingPromotionOwnerCardId.set(null);
            promotionProgress.set(0);
            swipeHapticDecisionDirection.set(0);
            return;
          }

          const status = event.translationX > 0 ? 'known' : 'learning';
          const direction = status === 'known' ? 1 : -1;

          if (!activeCardId) {
            return;
          }

          decisionOwnerCardId.set(activeCardId);
          swipeHapticDecisionDirection.set(0);
          translateX.set(
            withTiming(direction * swipeOutDistance, { duration: 190 }, (finished) => {
              if (finished) {
                promotionOwnerCardId.set(promotedCardId);
                trailingPromotionOwnerCardId.set(trailingPromotedCardId);
                promotionProgress.set(0);
                promotionProgress.set(
                  withTiming(1, { duration: PromotionDuration }, (promoted) => {
                    if (promoted) {
                      runOnJS(completeSwipe)(status);
                    }
                  })
                );
              }
            })
          );
          translateY.set(withTiming(event.translationY * 0.35, { duration: 190 }));
        }),
    [
      activeCardId,
      completeSwipe,
      decisionOwnerCardId,
      disabled,
      lockVisualQueue,
      playSwipeThresholdHaptic,
      promotedCardId,
      promotionOwnerCardId,
      promotionProgress,
      swipeHapticDecisionDirection,
      swipeOutDistance,
      swipeOwnerCardId,
      swipeThreshold,
      trailingPromotedCardId,
      trailingPromotionOwnerCardId,
      translateX,
      translateY,
      unlockVisualQueue,
    ]
  );

  if (!activeCard) {
    return (
      <Animated.View onLayout={handleRootLayout} style={[styles.root, { backgroundColor: palette.background }]}>
        <View style={styles.content}>
          <LabHeader
            dueCount={0}
            onUndo={handleUndoPress}
            rightAccessory={headerAccessory}
            undoDisabled={undoStack.length === 0 || disabled}
          />
          <View style={styles.doneStage}>
            <View style={styles.donePanel}>
              <View style={styles.doneIcon}>
                <SymbolView name="checkmark.circle.fill" size={42} tintColor={LabColors.mint} />
              </View>
              <ThemedText style={styles.doneTitle} selectable>
                今日の復習は完了です
              </ThemedText>
              <ThemedText style={styles.doneText} selectable>
                次に復習日が来たカードから、この画面にまた出ます。
              </ThemedText>
            </View>
          </View>
          {footerAccessory ? <View style={styles.footerAccessory}>{footerAccessory}</View> : null}
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View onLayout={handleRootLayout} style={[styles.root, { backgroundColor: palette.background }]}>
      <View style={styles.content}>
        <LabHeader
          dueCount={displayQueue.length}
          onUndo={handleUndoPress}
          rightAccessory={headerAccessory}
          undoDisabled={undoStack.length === 0 || disabled}
        />

        <View style={styles.reviewBody}>
          <View style={[styles.stage, { width: cardWidth, height: stageHeight }]}>
            <GestureDetector gesture={panGesture}>
              <View collapsable={false} style={styles.cardStack}>
                {visibleCards.map((card, position) => (
                  <SlackCardLayer
                    key={card.id}
                    card={card}
                    cardHeight={cardHeight}
                    cardWidth={cardWidth}
                    isAnswerVisible={position === 0 && isAnswerVisible}
                    onToggleAnswer={position === 0 ? handleToggleAnswerPress : undefined}
                    position={position}
                    promotionOwnerCardId={promotionOwnerCardId}
                    promotionProgress={promotionProgress}
                    swipeOwnerCardId={swipeOwnerCardId}
                    swipeThreshold={swipeThreshold}
                    trailingPromotionOwnerCardId={trailingPromotionOwnerCardId}
                    translateX={translateX}
                    translateY={translateY}
                  />
                ))}
              </View>
            </GestureDetector>
          </View>
        </View>

        <View style={styles.reviewFooter}>
          <View style={styles.actionBar}>
            <DecisionButton disabled={disabled} label="もう一回" tone="keep" onPress={() => animateCardDecision('learning')} />
            <DecisionButton disabled={disabled} label="言えた" tone="read" onPress={() => animateCardDecision('known')} />
          </View>
          {footerAccessory ? <View style={styles.footerAccessory}>{footerAccessory}</View> : null}
        </View>
      </View>
    </Animated.View>
  );
}

const SlackCardLayer = memo(function SlackCardLayer({
  card,
  cardHeight,
  cardWidth,
  isAnswerVisible,
  onToggleAnswer,
  position,
  promotionOwnerCardId,
  promotionProgress,
  swipeOwnerCardId,
  swipeThreshold,
  trailingPromotionOwnerCardId,
  translateX,
  translateY,
}: {
  card: PracticeCard;
  cardHeight: number;
  cardWidth: number;
  isAnswerVisible: boolean;
  onToggleAnswer?: () => void;
  position: number;
  promotionOwnerCardId: SharedValue<string | null>;
  promotionProgress: SharedValue<number>;
  swipeOwnerCardId: SharedValue<string | null>;
  swipeThreshold: number;
  trailingPromotionOwnerCardId: SharedValue<string | null>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
}) {
  const layerStyle = useAnimatedStyle(() => {
    const x = translateX.get();
    const y = translateY.get();
    const absoluteX = Math.abs(x);
    const isSwipeOwner = swipeOwnerCardId.get() === card.id;
    const activeX = isSwipeOwner ? x : 0;
    const activeY = isSwipeOwner ? y : 0;
    const activeAbsoluteX = Math.abs(activeX);

    if (position === 0) {
      return {
        transform: [
          { translateX: activeX },
          { translateY: activeY },
          {
            rotate: `${interpolate(
              activeX,
              [-swipeThreshold * 1.4, 0, swipeThreshold * 1.4],
              [-8, 0, 8],
              Extrapolation.CLAMP
            )}deg`,
          },
          {
            scale: interpolate(activeAbsoluteX, [0, swipeThreshold * 1.6], [1, 0.97], Extrapolation.CLAMP),
          },
        ],
      };
    }

    const swipeProgress = interpolate(absoluteX, [0, swipeThreshold], [0, 1], Extrapolation.CLAMP);
    const promotionOwner = promotionOwnerCardId.get();
    const isPromotionOwner = promotionOwner === card.id;
    const isPromotingStack = promotionOwner !== null;

    if (position === 1) {
      const dragProgress = isPromotionOwner ? 1 : isPromotingStack ? 0 : swipeProgress;
      const promotion = isPromotionOwner ? promotionProgress.get() : 0;
      const previewTranslateY = interpolate(
        dragProgress,
        [0, 1],
        [BackCardTranslateY, ActiveBackCardTranslateY],
        Extrapolation.CLAMP
      );
      const previewScale = interpolate(
        dragProgress,
        [0, 1],
        [BackCardScale, ActiveBackCardScale],
        Extrapolation.CLAMP
      );

      return {
        transform: [
          { translateY: previewTranslateY * (1 - promotion) },
          { scale: previewScale + (1 - previewScale) * promotion },
        ],
      };
    }

    const isTrailingPromotionOwner = trailingPromotionOwnerCardId.get() === card.id;
    const trailingBaseProgress = swipeProgress * DeepCardDragLag;
    const trailingProgress = isTrailingPromotionOwner
      ? DeepCardDragLag + (1 - DeepCardDragLag) * promotionProgress.get()
      : isPromotingStack
        ? 0
        : trailingBaseProgress;
    const previewTranslateY = interpolate(
      trailingProgress,
      [0, 1],
      [DeepCardTranslateY, BackCardTranslateY],
      Extrapolation.CLAMP
    );
    const previewScale = interpolate(
      trailingProgress,
      [0, 1],
      [DeepCardScale, BackCardScale],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY: previewTranslateY }, { scale: previewScale }],
    };
  });

  return (
    <Animated.View
      pointerEvents={position === 0 ? 'auto' : 'none'}
      style={[
        styles.cardLayer,
        {
          height: cardHeight,
          width: cardWidth,
          zIndex: getCardLayerZIndex(position),
        },
        layerStyle,
      ]}
    >
      <View style={styles.cardClip}>
        <SlackCardFace
          card={card}
          cardHeight={cardHeight}
          isAnswerVisible={position === 0 && isAnswerVisible}
          isPreview={position !== 0}
          onToggleAnswer={position === 0 ? onToggleAnswer : undefined}
        />
        {position === 0 ? (
          <DecisionOverlay
            cardId={card.id}
            swipeOwnerCardId={swipeOwnerCardId}
            swipeThreshold={swipeThreshold}
            translateX={translateX}
          />
        ) : null}
      </View>
    </Animated.View>
  );
});

function LabHeader({
  dueCount,
  onUndo,
  rightAccessory,
  undoDisabled,
}: {
  dueCount: number;
  onUndo: () => void;
  rightAccessory?: ReactNode;
  undoDisabled: boolean;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="直前の判定を取り消す"
        accessibilityRole="button"
        disabled={undoDisabled}
        onPress={onUndo}
        style={({ pressed }) => [
          styles.headerIconButton,
          { opacity: undoDisabled ? 0.36 : pressed ? 0.7 : 1 },
        ]}
      >
        <SymbolView name="arrow.uturn.backward" size={22} tintColor={LabColors.bodyText} />
      </Pressable>

      <View pointerEvents="none" style={styles.headerCenter}>
        <ThemedText style={styles.leftCount} selectable>
          残り {dueCount}
        </ThemedText>
      </View>

      <View style={styles.headerRightSlot}>{rightAccessory ?? <View style={styles.headerIconButtonPlaceholder} />}</View>
    </View>
  );
}

const SlackCardFace = memo(function SlackCardFace({
  card,
  cardHeight,
  isAnswerVisible,
  isPreview = false,
  onToggleAnswer,
}: {
  card: PracticeCard;
  cardHeight: number;
  isAnswerVisible: boolean;
  isPreview?: boolean;
  onToggleAnswer?: () => void;
}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechPlaybackIdRef = useRef(0);
  const speechFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flipAccessibilityLabel = isAnswerVisible ? '日本語を表示する' : '英語を表示する';
  const cardBodyText = isAnswerVisible ? card.english : card.japanese;
  const answerBodyMaxLines = Math.max(
    4,
    Math.floor((cardHeight - Spacing.three * 2 - AnswerSoundControlSize * 2) / AnswerTextMetrics.lineHeight)
  );
  const cardBodyMaxLines = isAnswerVisible ? Math.min(7, answerBodyMaxLines) : 8;
  const cardBodyTextStyle = isAnswerVisible ? styles.answerText : styles.promptText;

  const clearSpeechFallbackTimeout = useCallback(() => {
    if (speechFallbackTimeoutRef.current) {
      clearTimeout(speechFallbackTimeoutRef.current);
      speechFallbackTimeoutRef.current = null;
    }
  }, []);

  const finishSpeechPlayback = useCallback(
    (playbackId: number) => {
      if (speechPlaybackIdRef.current !== playbackId) {
        return;
      }

      clearSpeechFallbackTimeout();
      setIsSpeaking(false);
    },
    [clearSpeechFallbackTimeout]
  );

  const stopEnglishSpeech = useCallback(() => {
    speechPlaybackIdRef.current += 1;
    clearSpeechFallbackTimeout();
    setIsSpeaking(false);
    void Speech.stop();
  }, [clearSpeechFallbackTimeout]);

  useEffect(() => {
    if (isPreview) {
      return;
    }

    if (!isAnswerVisible) {
      stopEnglishSpeech();
    }
  }, [isAnswerVisible, isPreview, stopEnglishSpeech]);

  useEffect(() => {
    if (isPreview) {
      return;
    }

    return () => {
      stopEnglishSpeech();
    };
  }, [card.id, isPreview, stopEnglishSpeech]);

  const scheduleSpeechFallbackTimeout = useCallback(
    (playbackId: number, text: string) => {
      clearSpeechFallbackTimeout();
      speechFallbackTimeoutRef.current = setTimeout(() => {
        if (speechPlaybackIdRef.current !== playbackId) {
          return;
        }

        void Speech.stop();
        finishSpeechPlayback(playbackId);
      }, estimateEnglishSpeechFallbackMs(text));
    },
    [clearSpeechFallbackTimeout, finishSpeechPlayback]
  );

  const handleSpeakPress = useCallback(() => {
    if (isSpeaking) {
      stopEnglishSpeech();
      return;
    }

    const playbackId = speechPlaybackIdRef.current + 1;
    speechPlaybackIdRef.current = playbackId;
    setIsSpeaking(true);
    scheduleSpeechFallbackTimeout(playbackId, card.english);

    Speech.speak(card.english, {
      language: 'en-US',
      onDone: () => finishSpeechPlayback(playbackId),
      onError: () => finishSpeechPlayback(playbackId),
      onStopped: () => finishSpeechPlayback(playbackId),
      pitch: 1,
      rate: 0.9,
      volume: 1,
    });
  }, [card.english, finishSpeechPlayback, isSpeaking, scheduleSpeechFallbackTimeout, stopEnglishSpeech]);

  const backgroundTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(!isPreview && typeof onToggleAnswer === 'function')
        .maxDistance(8)
        .maxDuration(260)
        .onEnd((_event, success) => {
          if (success && onToggleAnswer) {
            runOnJS(onToggleAnswer)();
          }
        }),
    [isPreview, onToggleAnswer]
  );
  const contentTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(!isPreview && typeof onToggleAnswer === 'function')
        .maxDistance(8)
        .maxDuration(260)
        .onEnd((_event, success) => {
          if (success && onToggleAnswer) {
            runOnJS(onToggleAnswer)();
          }
        }),
    [isPreview, onToggleAnswer]
  );

  return (
    <View style={styles.cardFace}>
      <GestureDetector gesture={backgroundTapGesture}>
        <View collapsable={false} style={styles.cardFlipTapBackground} />
      </GestureDetector>

      <View pointerEvents="box-none" style={styles.cardContent}>
        <View pointerEvents="box-none" style={styles.cardContentSurface}>
          <GestureDetector gesture={contentTapGesture}>
            <View
              accessibilityLabel={flipAccessibilityLabel}
              accessibilityRole="button"
              accessible={!isPreview}
              onAccessibilityTap={onToggleAnswer}
              style={[styles.answerTouchArea, isAnswerVisible ? styles.answerTouchAreaWithSoundControls : null]}
            >
              <ThemedText
                adjustsFontSizeToFit
                minimumFontScale={0.88}
                numberOfLines={cardBodyMaxLines}
                selectable
                style={cardBodyTextStyle}
              >
                {cardBodyText}
              </ThemedText>
            </View>
          </GestureDetector>

          {!isPreview && isAnswerVisible ? (
            <View pointerEvents="box-none" style={styles.answerSoundRow}>
              <Pressable
                accessibilityLabel="英語を読み上げる"
                accessibilityRole="button"
                hitSlop={8}
                onPress={handleSpeakPress}
                style={[styles.soundButton, { backgroundColor: isSpeaking ? LabColors.mint : LabColors.cardTint }]}
              >
                <SymbolView
                  name={isSpeaking ? 'pause.fill' : 'speaker.wave.2.fill'}
                  size={18}
                  tintColor={LabColors.text}
                />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
});

function DecisionButton({
  disabled,
  label,
  tone,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  tone: 'keep' | 'read';
  onPress: () => void;
}) {
  const isRead = tone === 'read';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.decisionButton,
        isRead ? styles.readButton : styles.keepButton,
        { opacity: disabled ? 0.45 : pressed ? 0.76 : 1 },
      ]}
    >
      <SymbolView
        name={isRead ? 'checkmark.circle.fill' : 'arrow.counterclockwise.circle.fill'}
        size={20}
        tintColor={LabColors.bodyText}
      />
      <ThemedText style={styles.decisionButtonText}>{label}</ThemedText>
    </Pressable>
  );
}

function DecisionOverlay({
  cardId,
  swipeThreshold,
  swipeOwnerCardId,
  translateX,
}: {
  cardId: string;
  swipeThreshold: number;
  swipeOwnerCardId: SharedValue<string | null>;
  translateX: SharedValue<number>;
}) {
  const overlaySurfaceStyle = useAnimatedStyle(() => {
    const x = swipeOwnerCardId.get() === cardId ? translateX.get() : 0;
    const absoluteX = Math.abs(x);

    return {
      backgroundColor: interpolateColor(
        x,
        [-swipeThreshold, 0, swipeThreshold],
        [LabColors.keepOverlay, 'rgba(255, 255, 255, 0)', LabColors.readOverlay]
      ),
      opacity: interpolate(absoluteX, [16, swipeThreshold], [0, 0.92], Extrapolation.CLAMP),
    };
  });
  const keepLabelStyle = useAnimatedStyle(() => {
    const x = swipeOwnerCardId.get() === cardId ? translateX.get() : 0;

    return {
      opacity: interpolate(x, [-swipeThreshold, -28], [1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(x, [-swipeThreshold, 0], [0, 22], Extrapolation.CLAMP),
        },
      ],
    };
  });
  const readLabelStyle = useAnimatedStyle(() => {
    const x = swipeOwnerCardId.get() === cardId ? translateX.get() : 0;

    return {
      opacity: interpolate(x, [28, swipeThreshold], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(x, [0, swipeThreshold], [-22, 0], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <View pointerEvents="none" style={styles.decisionOverlay}>
      <Animated.View style={[styles.decisionOverlaySurface, overlaySurfaceStyle]} />
      <Animated.View style={[styles.overlayLabel, styles.keepOverlayLabel, keepLabelStyle]}>
        <DecisionProgressIcon
          cardId={cardId}
          direction="keep"
          progressColor={LabColors.keepOverlay}
          swipeOwnerCardId={swipeOwnerCardId}
          swipeThreshold={swipeThreshold}
          translateX={translateX}
        >
          <SymbolView name="arrow.counterclockwise" size={32} tintColor={LabColors.keepOverlay} />
        </DecisionProgressIcon>
        <ThemedText style={styles.overlayText}>もう一回</ThemedText>
      </Animated.View>

      <Animated.View style={[styles.overlayLabel, styles.readOverlayLabel, readLabelStyle]}>
        <DecisionProgressIcon
          cardId={cardId}
          direction="read"
          progressColor={LabColors.readOverlay}
          swipeOwnerCardId={swipeOwnerCardId}
          swipeThreshold={swipeThreshold}
          translateX={translateX}
        >
          <SymbolView name="checkmark" size={36} tintColor={LabColors.readOverlay} />
        </DecisionProgressIcon>
        <ThemedText style={styles.overlayText}>言えた</ThemedText>
      </Animated.View>
    </View>
  );
}

function DecisionProgressIcon({
  cardId,
  children,
  direction,
  progressColor,
  swipeOwnerCardId,
  swipeThreshold,
  translateX,
}: {
  cardId: string;
  children: ReactNode;
  direction: 'keep' | 'read';
  progressColor: string;
  swipeOwnerCardId: SharedValue<string | null>;
  swipeThreshold: number;
  translateX: SharedValue<number>;
}) {
  const directionSign = direction === 'keep' ? -1 : 1;
  const animatedRingProps = useAnimatedProps(() => {
    const x = swipeOwnerCardId.get() === cardId ? translateX.get() : 0;
    const dragDistance = Math.max(0, x * directionSign);
    const progressRange = Math.max(1, swipeThreshold - DecisionRingStartOffset);
    const progress = Math.max(0, Math.min(1, (dragDistance - DecisionRingStartOffset) / progressRange));

    return {
      strokeDashoffset: DecisionRingCircumference * (1 - progress),
    };
  });

  return (
    <View style={styles.overlayIcon}>
      <Svg
        height={DecisionRingSize}
        style={styles.overlayProgressRing}
        viewBox={`0 0 ${DecisionRingSize} ${DecisionRingSize}`}
        width={DecisionRingSize}
      >
        <Circle
          cx={DecisionRingCenter}
          cy={DecisionRingCenter}
          fill="none"
          r={DecisionRingRadius}
          stroke={LabColors.ringTrack}
          strokeWidth={DecisionRingStrokeWidth}
        />
        <AnimatedCircle
          animatedProps={animatedRingProps}
          cx={DecisionRingCenter}
          cy={DecisionRingCenter}
          fill="none"
          r={DecisionRingRadius}
          stroke={progressColor}
          strokeDasharray={`${DecisionRingCircumference} ${DecisionRingCircumference}`}
          strokeLinecap="round"
          strokeWidth={DecisionRingStrokeWidth}
          transform={`rotate(-90 ${DecisionRingCenter} ${DecisionRingCenter})`}
        />
      </Svg>
      <View style={styles.overlayIconContent}>{children}</View>
    </View>
  );
}

function toPracticeCard(card: Card): PracticeCard[] {
  if (!card.en) {
    return [];
  }

  return [
    {
      audioEndSec: card.audioEndSec,
      audioStartSec: card.audioStartSec,
      dueAt: card.dueAt,
      english: card.en,
      id: card.id,
      japanese: card.ja,
      position: card.position,
      reviewCount: card.reviewCount,
      srsStatus: card.srsStatus,
      successStreak: card.successStreak,
    },
  ];
}

function getCardLayerZIndex(position: number) {
  return VisibleCardCount + 1 - position;
}

function estimateEnglishSpeechFallbackMs(text: string) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSpeechMs = wordCount * 460 + EnglishSpeechFallbackPaddingMs;

  return Math.min(EnglishSpeechFallbackMaxMs, Math.max(EnglishSpeechFallbackMinMs, estimatedSpeechMs));
}

const LabColors = {
  bodyText: '#111111',
  cardTint: '#FFF6E7',
  coral: '#FF7661',
  keepOverlay: '#FF7661',
  mint: '#2FDD6C',
  mintSoft: '#E9F7EE',
  mutedText: '#5F6670',
  readOverlay: '#2FDD6C',
  ringTrack: 'rgba(17, 17, 17, 0.16)',
  text: '#111111',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignItems: 'center',
    gap: Spacing.three,
  },
  header: {
    width: '100%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  headerIconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: LabColors.bodyText,
    backgroundColor: LabColors.white,
    zIndex: 1,
  },
  headerIconButtonPlaceholder: {
    width: 48,
    height: 48,
  },
  headerRightSlot: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1,
  },
  headerCenter: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftCount: {
    color: LabColors.bodyText,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    fontWeight: 900,
    lineHeight: 31,
  },
  reviewBody: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 1,
  },
  cardStack: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLayer: {
    position: 'absolute',
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 4,
    borderColor: LabColors.bodyText,
    backgroundColor: LabColors.white,
  },
  cardClip: {
    flex: 1,
    borderRadius: 19.5,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: LabColors.white,
  },
  cardFace: {
    flex: 1,
    position: 'relative',
    backgroundColor: LabColors.white,
  },
  cardContent: {
    flex: 1,
    position: 'relative',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  cardFlipTapBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  cardContentSurface: {
    flex: 1,
    zIndex: 1,
  },
  answerTouchArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  answerTouchAreaWithSoundControls: {
    paddingVertical: AnswerSoundControlSize,
  },
  promptText: {
    color: LabColors.text,
    fontSize: PromptTextMetrics.fontSize,
    lineHeight: PromptTextMetrics.lineHeight,
    fontWeight: 900,
  },
  answerText: {
    width: '100%',
    color: LabColors.text,
    fontSize: AnswerTextMetrics.fontSize,
    lineHeight: AnswerTextMetrics.lineHeight,
    fontWeight: 900,
  },
  soundButton: {
    width: AnswerSoundControlSize,
    height: AnswerSoundControlSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: LabColors.bodyText,
  },
  answerSoundRow: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  decisionOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
  },
  decisionOverlaySurface: {
    position: 'absolute',
    top: -4,
    right: -4,
    bottom: -4,
    left: -4,
  },
  overlayLabel: {
    position: 'absolute',
    top: Spacing.four,
    gap: Spacing.two,
  },
  keepOverlayLabel: {
    right: Spacing.four,
    alignItems: 'flex-end',
  },
  readOverlayLabel: {
    left: Spacing.four,
    alignItems: 'flex-start',
  },
  overlayIcon: {
    width: DecisionRingSize,
    height: DecisionRingSize,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: LabColors.white,
  },
  overlayProgressRing: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  overlayIconContent: {
    zIndex: 1,
  },
  overlayText: {
    color: LabColors.bodyText,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: 900,
  },
  reviewFooter: {
    width: '100%',
    gap: Spacing.four,
    zIndex: 4,
  },
  footerAccessory: {
    width: '100%',
  },
  actionBar: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  decisionButton: {
    flex: 1,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderCurve: 'continuous',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  keepButton: {
    borderWidth: 3,
    borderColor: LabColors.bodyText,
    backgroundColor: LabColors.coral,
  },
  readButton: {
    borderWidth: 3,
    borderColor: LabColors.bodyText,
    backgroundColor: LabColors.mint,
  },
  decisionButtonText: {
    color: LabColors.bodyText,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 900,
  },
  doneStage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donePanel: {
    width: '100%',
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 4,
    borderColor: LabColors.bodyText,
    backgroundColor: LabColors.white,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  doneIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: LabColors.mintSoft,
  },
  doneTitle: {
    color: LabColors.text,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 900,
  },
  doneText: {
    color: LabColors.mutedText,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 700,
  },
});
