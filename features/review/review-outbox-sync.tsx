import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { qk } from '@/shared/api/query-keys';
import { startReviewOutbox, subscribeToReviewOutbox } from '@/shared/api/review-outbox';

export function ReviewOutboxSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = subscribeToReviewOutbox((event) => {
      if (event !== 'synced') {
        return;
      }

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.reviewQueue }),
        queryClient.invalidateQueries({ queryKey: qk.cardGroups }),
      ]);
    });
    const stop = startReviewOutbox();

    return () => {
      unsubscribe();
      stop();
    };
  }, [queryClient]);

  return null;
}
