export type SrsStatus = 'new' | 'learning' | 'known';
export type Rating = 'again' | 'good';

export type SrsState = {
  status: SrsStatus;
  reviewCount: number;
  successStreak: number;
  lastReviewedAt: string | null;
  dueAt: string | null;
};

export type ReviewEvent = {
  rating: Rating;
  reviewedAt: string;
};

const AgainIntervalDays = 1;
const SuccessIntervalsDays = [3, 7, 14, 30, 60] as const;
const DayInMilliseconds = 24 * 60 * 60 * 1000;

export function createInitialSrsState(): SrsState {
  return {
    status: 'new',
    reviewCount: 0,
    successStreak: 0,
    lastReviewedAt: null,
    dueAt: null,
  };
}

export function applyReview(state: SrsState, rating: Rating, now: Date): SrsState {
  const reviewedAt = now.toISOString();

  if (rating === 'again') {
    return {
      status: 'learning',
      reviewCount: state.reviewCount + 1,
      successStreak: 0,
      lastReviewedAt: reviewedAt,
      dueAt: addDays(now, AgainIntervalDays).toISOString(),
    };
  }

  const successStreak = state.successStreak + 1;
  const interval =
    SuccessIntervalsDays[Math.min(successStreak - 1, SuccessIntervalsDays.length - 1)] ??
    SuccessIntervalsDays[SuccessIntervalsDays.length - 1];

  return {
    status: 'known',
    reviewCount: state.reviewCount + 1,
    successStreak,
    lastReviewedAt: reviewedAt,
    dueAt: addDays(now, interval).toISOString(),
  };
}

export function replayReviews(events: ReviewEvent[]): SrsState {
  return events
    .slice()
    .sort((first, second) => {
      return new Date(first.reviewedAt).getTime() - new Date(second.reviewedAt).getTime();
    })
    .reduce((state, event) => {
      const reviewedAt = new Date(event.reviewedAt);
      return applyReview(state, event.rating, Number.isNaN(reviewedAt.getTime()) ? new Date() : reviewedAt);
    }, createInitialSrsState());
}

export function isDue(state: SrsState, now = new Date()) {
  if (state.status === 'new' || !state.dueAt) {
    return true;
  }

  const dueAt = new Date(state.dueAt);
  return Number.isNaN(dueAt.getTime()) || dueAt.getTime() <= now.getTime();
}

export function formatDueLabel(state: SrsState, now = new Date()) {
  if (state.status === 'new' || !state.dueAt) {
    return '今日';
  }

  const dueAt = new Date(state.dueAt);

  if (Number.isNaN(dueAt.getTime())) {
    return '今日';
  }

  const diffDays = Math.ceil((startOfLocalDay(dueAt).getTime() - startOfLocalDay(now).getTime()) / DayInMilliseconds);

  if (diffDays <= 0) {
    return '今日';
  }

  if (diffDays === 1) {
    return '明日';
  }

  return `${diffDays}日後`;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}
