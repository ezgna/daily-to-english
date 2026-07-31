import { useCallback, type ReactNode } from 'react';

import type { Card, ReviewRating } from '@just-speak-it/contract';

import { SlackFlashcardLab } from '@/features/review/slack-flashcard-lab';
import { enqueueReview, enqueueReviewUndo } from '@/shared/api/review-outbox';

export function ReviewDeck({
  cards,
  headerAccessory,
}: {
  cards: Card[];
  headerAccessory?: ReactNode;
}) {
  const handleReview = useCallback(
    (cardId: string, rating: ReviewRating) => {
      return enqueueReview(cardId, rating);
    },
    []
  );

  const handleUndo = useCallback(
    (cardId: string, reviewEventId: string) => {
      enqueueReviewUndo(cardId, reviewEventId);
    },
    []
  );

  return (
    <SlackFlashcardLab
      cards={cards}
      headerAccessory={headerAccessory}
      onReview={handleReview}
      onUndo={handleUndo}
    />
  );
}
