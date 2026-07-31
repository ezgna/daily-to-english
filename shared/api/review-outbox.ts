import { AppState } from 'react-native';

import { reviewRatingSchema, type ReviewRating } from '@just-speak-it/contract';

import { formatApiError, reviewCard, undoReview } from '@/shared/api/client';
import { getLocalString, setLocalStringOrThrow } from '@/shared/storage/local-storage';

type ReviewOperation = OutboxOperationBase & {
  kind: 'review';
  rating: ReviewRating;
};

type UndoOperation = OutboxOperationBase & {
  kind: 'undo';
  reviewEventId: string;
};

type OutboxOperationBase = {
  attemptCount: number;
  cardId: string;
  createdAt: string;
  id: string;
  lastAttemptAt: string | null;
  lastError: string | null;
};

type ReviewOutboxOperation = ReviewOperation | UndoOperation;
type ReviewOutboxEvent = 'changed' | 'synced';

const StorageKey = 'just-speak-it:review-outbox:v1';
const MaxRetryDelayMs = 60_000;
const listeners = new Set<(event: ReviewOutboxEvent) => void>();

let activeOperationId: string | null = null;
let flushPromise: Promise<void> | null = null;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;

export function enqueueReview(cardId: string, rating: ReviewRating) {
  const eventId = createOperationId();
  appendOperation({
    attemptCount: 0,
    cardId,
    createdAt: new Date().toISOString(),
    id: eventId,
    kind: 'review',
    lastAttemptAt: null,
    lastError: null,
    rating,
  });
  requestFlush();
  return eventId;
}

export function enqueueReviewUndo(cardId: string, reviewEventId: string) {
  const operations = readOperations();
  const reviewIndex = operations.findIndex((operation) => {
    return operation.kind === 'review' && operation.id === reviewEventId;
  });
  const reviewOperation = reviewIndex >= 0 ? operations[reviewIndex] : null;

  if (
    reviewOperation?.kind === 'review' &&
    reviewOperation.attemptCount === 0 &&
    activeOperationId !== reviewOperation.id
  ) {
    operations.splice(reviewIndex, 1);
    writeOperations(operations);
    emit('changed');
    return;
  }

  appendOperation({
    attemptCount: 0,
    cardId,
    createdAt: new Date().toISOString(),
    id: createOperationId(),
    kind: 'undo',
    lastAttemptAt: null,
    lastError: null,
    reviewEventId,
  });
  requestFlush();
}

export function getPendingReviewCardIds() {
  const cardIds = new Set<string>();

  for (const operation of readOperations()) {
    if (operation.kind === 'review') {
      cardIds.add(operation.cardId);
    } else {
      cardIds.delete(operation.cardId);
    }
  }

  return cardIds;
}

export function subscribeToReviewOutbox(listener: (event: ReviewOutboxEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function startReviewOutbox() {
  requestFlush(true);
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      requestFlush(true);
    }
  });

  return () => {
    subscription.remove();
    clearRetryTimeout();
  };
}

function requestFlush(force = false) {
  if (retryTimeout && !force) {
    return;
  }

  if (force) {
    clearRetryTimeout();
  }

  if (flushPromise) {
    return;
  }

  const nextFlush = drainOutbox().finally(() => {
    if (flushPromise === nextFlush) {
      flushPromise = null;
    }
  });
  flushPromise = nextFlush;
}

async function drainOutbox() {
  let didSync = false;

  while (true) {
    const operation = readOperations()[0];

    if (!operation) {
      break;
    }

    const attemptedOperation: ReviewOutboxOperation = {
      ...operation,
      attemptCount: operation.attemptCount + 1,
      lastAttemptAt: new Date().toISOString(),
      lastError: null,
    };

    try {
      replaceOperation(attemptedOperation);
      activeOperationId = attemptedOperation.id;
      await sendOperation(attemptedOperation);
      removeOperation(attemptedOperation.id);
      activeOperationId = null;
      didSync = true;
      emit('changed');
    } catch (error) {
      activeOperationId = null;
      recordOperationError(attemptedOperation.id, formatApiError(error));
      scheduleRetry(attemptedOperation.attemptCount);

      if (didSync) {
        emit('synced');
      }

      return;
    }
  }

  if (didSync) {
    emit('synced');
  }
}

async function sendOperation(operation: ReviewOutboxOperation) {
  if (operation.kind === 'review') {
    await reviewCard(operation.cardId, operation.rating, operation.id);
    return;
  }

  await undoReview(operation.cardId, operation.reviewEventId);
}

function appendOperation(operation: ReviewOutboxOperation) {
  writeOperations([...readOperations(), operation]);
  emit('changed');
}

function replaceOperation(operation: ReviewOutboxOperation) {
  const operations = readOperations();
  const index = operations.findIndex((candidate) => candidate.id === operation.id);

  if (index < 0) {
    return;
  }

  operations[index] = operation;
  writeOperations(operations);
}

function removeOperation(id: string) {
  writeOperations(readOperations().filter((operation) => operation.id !== id));
}

function recordOperationError(id: string, message: string) {
  const operations = readOperations();
  const index = operations.findIndex((operation) => operation.id === id);

  if (index < 0) {
    return;
  }

  operations[index] = { ...operations[index], lastError: message };

  try {
    writeOperations(operations);
    emit('changed');
  } catch {
    return;
  }
}

function readOperations(): ReviewOutboxOperation[] {
  const stored = getLocalString(StorageKey);

  if (!stored) {
    return [];
  }

  try {
    const value: unknown = JSON.parse(stored);
    return Array.isArray(value) ? value.filter(isReviewOutboxOperation) : [];
  } catch {
    return [];
  }
}

function writeOperations(operations: ReviewOutboxOperation[]) {
  setLocalStringOrThrow(StorageKey, JSON.stringify(operations));
}

function isReviewOutboxOperation(value: unknown): value is ReviewOutboxOperation {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const hasBaseFields =
    typeof candidate.id === 'string' &&
    typeof candidate.cardId === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.attemptCount === 'number' &&
    (candidate.lastAttemptAt === null || typeof candidate.lastAttemptAt === 'string') &&
    (candidate.lastError === null || typeof candidate.lastError === 'string');

  if (!hasBaseFields) {
    return false;
  }

  if (candidate.kind === 'review') {
    return reviewRatingSchema.safeParse(candidate.rating).success;
  }

  return candidate.kind === 'undo' && typeof candidate.reviewEventId === 'string';
}

function scheduleRetry(attemptCount: number) {
  clearRetryTimeout();
  const delay = Math.min(MaxRetryDelayMs, 2_000 * 2 ** Math.min(Math.max(attemptCount - 1, 0), 5));
  retryTimeout = setTimeout(() => {
    retryTimeout = null;
    requestFlush();
  }, delay);
}

function clearRetryTimeout() {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
}

function emit(event: ReviewOutboxEvent) {
  for (const listener of listeners) {
    listener(event);
  }
}

function createOperationId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
