import { useQuery } from '@tanstack/react-query';

import type { Card, Entry, Generation, GenerationBundle } from '@just-speak-it/contract';

import { ensureAnonymousSession } from '@/shared/api/auth';
import { qk } from '@/shared/api/query-keys';
import { getPendingReviewCardIds } from '@/shared/api/review-outbox';
import { requireSupabaseClient } from '@/shared/supabase/client';

type Row = Record<string, any>;

export function useReviewQueue() {
  return useQuery({
    queryKey: qk.reviewQueue,
    queryFn: async () => {
      await ensureAnonymousSession();
      const now = new Date().toISOString();
      const { data, error } = await requireSupabaseClient()
        .from('cards')
        .select('*')
        .not('en', 'is', null)
        .or(`due_at.is.null,due_at.lte.${now}`)
        .order('due_at', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: true })
        .limit(30);

      if (error) {
        throw error;
      }

      const pendingCardIds = getPendingReviewCardIds();
      return (data ?? []).filter((row) => !pendingCardIds.has(row.id)).map(toCard);
    },
  });
}

export function useCardGroups() {
  return useQuery({
    queryKey: qk.cardGroups,
    queryFn: async () => {
      await ensureAnonymousSession();
      const { data, error } = await requireSupabaseClient()
        .from('generations')
        .select('*, entry:entries(*), cards(*)')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      return (data ?? []).map(toGenerationBundleFromJoin);
    },
  });
}

export function useDiaryEntries() {
  return useQuery({
    queryKey: qk.diaryEntries,
    queryFn: async () => {
      await ensureAnonymousSession();
      const { data, error } = await requireSupabaseClient()
        .from('entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        throw error;
      }

      return (data ?? []).map(toEntry);
    },
  });
}

export function useLatestPendingGeneration() {
  return useQuery({
    queryKey: qk.latestPending,
    queryFn: async () => {
      await ensureAnonymousSession();
      const { data, error } = await requireSupabaseClient()
        .from('generations')
        .select('*, entry:entries(*), cards(*)')
        .in('status', ['split', 'translating', 'failed'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toGenerationBundleFromJoin(data) : null;
    },
  });
}

function toGenerationBundleFromJoin(row: Row): GenerationBundle {
  const cards = Array.isArray(row.cards) ? row.cards.map(toCard).sort((a, b) => a.position - b.position) : [];
  return {
    entry: toEntry(row.entry),
    generation: toGeneration(row),
    cards,
  };
}

export function toEntry(row: Row): Entry {
  return {
    id: row.id,
    source: row.source,
    rawText: row.raw_text,
    cleanText: row.clean_text,
    isEdited: row.is_edited,
    summary: normalizeStringArray(row.summary),
    transcript: [],
    waveform: normalizeNumberArray(row.waveform),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toGeneration(row: Row): Generation {
  return {
    id: row.id,
    entryId: row.entry_id,
    idempotencyKey: row.idempotency_key,
    splitPolicy: row.split_policy,
    translationStyle: row.translation_style,
    status: row.status,
    error: row.error,
    modelInfo: row.model_info ?? {},
    claimedAt: row.claimed_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCard(row: Row): Card {
  return {
    id: row.id,
    generationId: row.generation_id,
    position: row.position,
    ja: row.ja,
    en: row.en,
    wordStart: row.word_start,
    wordEnd: row.word_end,
    audioStartSec: row.audio_start_sec,
    audioEndSec: row.audio_end_sec,
    srsStatus: row.srs_status,
    reviewCount: row.review_count,
    successStreak: row.success_streak,
    lastReviewedAt: row.last_reviewed_at,
    dueAt: row.due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.flatMap((item) => (typeof item === 'string' ? [item] : [])) : [];
}

function normalizeNumberArray(value: unknown) {
  return Array.isArray(value) ? value.flatMap((item) => (typeof item === 'number' ? [item] : [])) : [];
}
