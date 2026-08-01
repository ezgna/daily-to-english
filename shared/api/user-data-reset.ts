import type { QueryClient } from '@tanstack/react-query';

import type { Card, Entry, GenerationBundle } from '@just-speak-it/contract';

import { qk } from '@/shared/api/query-keys';

const listeners = new Set<() => void>();

export function applyDeletedUserDataState(queryClient: QueryClient) {
  queryClient.setQueryData<Card[]>(qk.reviewQueue, []);
  queryClient.setQueryData<GenerationBundle[]>(qk.cardGroups, []);
  queryClient.setQueryData<Entry[]>(qk.diaryEntries, []);
  queryClient.setQueryData<GenerationBundle | null>(qk.latestPending, null);

  for (const listener of listeners) {
    listener();
  }
}

export function subscribeToUserDataReset(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
