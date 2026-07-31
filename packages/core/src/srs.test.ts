import { describe, expect, it } from 'vitest';

import { applyReview, createInitialSrsState, replayReviews } from './srs';

describe('SRS', () => {
  it('again は learning と翌日復習にする', () => {
    const now = new Date('2026-07-05T12:00:00.000Z');
    const next = applyReview(createInitialSrsState(), 'again', now);

    expect(next.status).toBe('learning');
    expect(next.reviewCount).toBe(1);
    expect(next.successStreak).toBe(0);
    expect(next.dueAt).toBe('2026-07-06T12:00:00.000Z');
  });

  it('good は 3/7 日の間隔で successStreak を伸ばす', () => {
    const first = applyReview(createInitialSrsState(), 'good', new Date('2026-07-05T00:00:00.000Z'));
    const second = applyReview(first, 'good', new Date('2026-07-08T00:00:00.000Z'));

    expect(first.status).toBe('known');
    expect(first.dueAt).toBe('2026-07-08T00:00:00.000Z');
    expect(second.successStreak).toBe(2);
    expect(second.dueAt).toBe('2026-07-15T00:00:00.000Z');
  });

  it('review event から同じ状態を再計算する', () => {
    const state = replayReviews([
      { rating: 'good', reviewedAt: '2026-07-05T00:00:00.000Z' },
      { rating: 'again', reviewedAt: '2026-07-06T00:00:00.000Z' },
    ]);

    expect(state.status).toBe('learning');
    expect(state.reviewCount).toBe(2);
    expect(state.successStreak).toBe(0);
    expect(state.dueAt).toBe('2026-07-07T00:00:00.000Z');
  });
});
