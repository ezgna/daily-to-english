import { z } from 'zod';

export const entrySourceSchema = z.enum(['voice', 'text']);
export const splitPolicySchema = z.enum(['meaning_unit', 'small_steps']);
export const translationStyleSchema = z.enum(['native', 'simple']);
export const generationStatusSchema = z.enum(['split', 'translating', 'completed', 'failed', 'discarded']);
export const srsStatusSchema = z.enum(['new', 'learning', 'known']);
export const reviewRatingSchema = z.enum(['again', 'good']);

export const defaultTranslationStyle = 'simple' satisfies TranslationStyle;
export const defaultSplitPolicy = 'small_steps' satisfies SplitPolicy;

export const transcriptWordSchema = z.object({
  index: z.number().int().nonnegative(),
  word: z.string().min(1),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
});

export const entrySchema = z.object({
  id: z.string().uuid(),
  source: entrySourceSchema,
  rawText: z.string(),
  cleanText: z.string(),
  isEdited: z.boolean(),
  summary: z.array(z.string()),
  transcript: z.array(transcriptWordSchema),
  waveform: z.array(z.number()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const generationSchema = z.object({
  id: z.string().uuid(),
  entryId: z.string().uuid(),
  idempotencyKey: z.string(),
  splitPolicy: splitPolicySchema,
  translationStyle: translationStyleSchema,
  status: generationStatusSchema,
  error: z
    .object({
      step: z.enum(['split', 'translate', 'transcribe', 'review']).optional(),
      message: z.string(),
      at: z.string().optional(),
    })
    .nullable(),
  modelInfo: z.record(z.string(), z.unknown()),
  claimedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const cardSchema = z.object({
  id: z.string().uuid(),
  generationId: z.string().uuid(),
  position: z.number().int().positive(),
  ja: z.string(),
  en: z.string().nullable(),
  wordStart: z.number().int().nonnegative().nullable(),
  wordEnd: z.number().int().nonnegative().nullable(),
  audioStartSec: z.number().nullable(),
  audioEndSec: z.number().nullable(),
  srsStatus: srsStatusSchema,
  reviewCount: z.number().int().nonnegative(),
  successStreak: z.number().int().nonnegative(),
  lastReviewedAt: z.string().nullable(),
  dueAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const generationBundleSchema = z.object({
  entry: entrySchema,
  generation: generationSchema,
  cards: z.array(cardSchema),
});

export const transcriptionResponseSchema = z.object({
  rawText: z.string(),
  cleanText: z.string(),
  words: z.array(transcriptWordSchema),
});

export const createGenerationRequestSchema = z.object({
  idempotencyKey: z.string().min(1),
  mode: z.enum(['auto', 'split']),
  source: entrySourceSchema,
  rawText: z.string().min(1).max(4000),
  cleanText: z.string().min(1).max(4000),
  isEdited: z.boolean().default(false),
  splitPolicy: splitPolicySchema,
  translationStyle: translationStyleSchema.default(defaultTranslationStyle),
  transcript: z.array(transcriptWordSchema).default([]),
  waveform: z.array(z.number()).default([]),
});

export const translateGenerationRequestSchema = z.object({
  translationStyle: translationStyleSchema.default(defaultTranslationStyle),
});

export const reviewResponseSchema = z.object({
  card: cardSchema,
});

export const apiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    userMessage: z.string(),
  }),
});

export type EntrySource = z.infer<typeof entrySourceSchema>;
export type SplitPolicy = z.infer<typeof splitPolicySchema>;
export type TranslationStyle = z.infer<typeof translationStyleSchema>;
export type GenerationStatus = z.infer<typeof generationStatusSchema>;
export type SrsStatus = z.infer<typeof srsStatusSchema>;
export type ReviewRating = z.infer<typeof reviewRatingSchema>;
export type TranscriptWord = z.infer<typeof transcriptWordSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type Generation = z.infer<typeof generationSchema>;
export type Card = z.infer<typeof cardSchema>;
export type GenerationBundle = z.infer<typeof generationBundleSchema>;
export type TranscriptionResponse = z.infer<typeof transcriptionResponseSchema>;
export type CreateGenerationRequest = z.infer<typeof createGenerationRequestSchema>;
export type TranslateGenerationRequest = z.infer<typeof translateGenerationRequestSchema>;
export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelopeSchema>;

export function parseApiErrorEnvelope(value: unknown): ApiErrorEnvelope | null {
  const parsed = apiErrorEnvelopeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function isSplitPolicy(value: unknown): value is SplitPolicy {
  return splitPolicySchema.safeParse(value).success;
}

export function isTranslationStyle(value: unknown): value is TranslationStyle {
  return translationStyleSchema.safeParse(value).success;
}
