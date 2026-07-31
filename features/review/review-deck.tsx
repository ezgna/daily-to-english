import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import type { Card, ReviewRating } from '@just-speak-it/contract';

import { SlackFlashcardLab } from '@/features/review/slack-flashcard-lab';
import { reviewCard, undoReview } from '@/shared/api/client';
import { qk } from '@/shared/api/query-keys';

export function ReviewDeck({ cards }: { cards: Card[] }) {
  const queryClient = useQueryClient();
  const [pendingCardIds, setPendingCardIds] = useState<Set<string>>(() => new Set());
  const reviewMutation = useMutation({
    mutationFn: ({ cardId, rating }: { cardId: string; rating: ReviewRating }) => {
      return reviewCard(cardId, rating);
    },
    onSettled: async (_data, _error, variables) => {
      setPendingCardIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(variables.cardId);
        return nextIds;
      });
      await invalidateReviewQueries(queryClient);
    },
  });
  const undoMutation = useMutation({
    mutationFn: (cardId: string) => undoReview(cardId),
    onSettled: async (_data, _error, cardId) => {
      setPendingCardIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(cardId);
        return nextIds;
      });
      await invalidateReviewQueries(queryClient);
    },
  });

  const handleReview = useCallback(
    async (cardId: string, rating: ReviewRating) => {
      setPendingCardIds((currentIds) => new Set(currentIds).add(cardId));
      await reviewMutation.mutateAsync({ cardId, rating });
    },
    [reviewMutation]
  );

  const handleUndo = useCallback(
    async (cardId: string) => {
      setPendingCardIds((currentIds) => new Set(currentIds).add(cardId));
      await undoMutation.mutateAsync(cardId);
    },
    [undoMutation]
  );

  return (
    <SlackFlashcardLab
      cards={cards}
      disabled={pendingCardIds.size > 0}
      onReview={handleReview}
      onUndo={handleUndo}
    />
  );
}

async function invalidateReviewQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.reviewQueue }),
    queryClient.invalidateQueries({ queryKey: qk.cardGroups }),
  ]);
}
