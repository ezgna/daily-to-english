import { Hono } from 'hono';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js/cors';

import {
  applyReview,
  replayReviews,
  type Rating,
  type SrsState,
} from '../../../packages/core/src/srs.ts';
import {
  normalizeBulletPoints,
  normalizeContentForHash,
} from '../../../packages/core/src/text.ts';
import {
  createGenerationRequestSchema,
  generationBundleSchema,
  reviewRatingSchema,
  translateGenerationRequestSchema,
  type Card,
  type Entry,
  type Generation,
  type GenerationBundle,
  type SplitPolicy,
  type TranscriptWord,
  type TranslationStyle,
} from '../../../packages/contract/src/index.ts';
import {
  CleanPromptVersion,
  SplitPromptVersion,
  SplitSchemaVersion,
  TranslatePromptVersion,
  TranslateSchemaVersion,
  createCleanInstructions,
  createSplitInstructions,
  createTranslationInstructions,
} from './prompts.ts';

type Variables = {
  db: SupabaseClient;
  userId: string;
};

type JsonSchema = Record<string, unknown>;

type OpenAIUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
};

type OpenAIJsonResult<T> = {
  data: T;
  model: string;
  usage: OpenAIUsage;
};

type SplitOutput = {
  bulletPoints: string[];
  cards: {
    japanese: string;
    sourceWordStartIndex: number | null;
    sourceWordEndIndex: number | null;
  }[];
};

type TranslateOutput = {
  cards: {
    id: string;
    english: string;
  }[];
};

type CleanOutput = {
  cleaned_text: string;
};

type Row = Record<string, any>;

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public userMessage = message,
    public status = 400
  ) {
    super(message);
  }
}

const splitSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['bulletPoints', 'cards'],
  properties: {
    bulletPoints: { type: 'array', minItems: 1, items: { type: 'string' } },
    cards: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['japanese', 'sourceWordStartIndex', 'sourceWordEndIndex'],
        properties: {
          japanese: { type: 'string' },
          sourceWordStartIndex: { type: ['integer', 'null'] },
          sourceWordEndIndex: { type: ['integer', 'null'] },
        },
      },
    },
  },
};

const translateSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cards'],
  properties: {
    cards: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'english'],
        properties: {
          id: { type: 'string' },
          english: { type: 'string' },
        },
      },
    },
  },
};

const cleanSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cleaned_text'],
  properties: {
    cleaned_text: { type: 'string' },
  },
};

const app = new Hono<{ Variables: Variables }>();

app.options('*', (c) => new Response('ok', { headers: corsHeaders }));

app.use('*', async (c, next) => {
  const userId = readUserId(c.req.raw);
  const db = createServiceClient();
  await ensureProfile(db, userId);
  c.set('db', db);
  c.set('userId', userId);
  await next();
});

app.post('/transcriptions', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  await enforceDailyLimit(db, userId, 'transcribe');

  const apiKey = readOpenAIKey();
  const formData = await c.req.raw.formData();
  const audio = formData.get('audio');

  if (!(audio instanceof File)) {
    throw new ApiError('bad_request', 'audioファイルが必要です。');
  }

  if (audio.size > 25 * 1024 * 1024) {
    throw new ApiError('audio_too_large', '音声ファイルは25MB以下にしてください。');
  }

  const sttModel = Deno.env.get('OPENAI_STT_MODEL') ?? 'whisper-1';
  const transcriptionForm = new FormData();
  transcriptionForm.append('file', audio, audio.name || 'daily-recording.m4a');
  transcriptionForm.append('model', sttModel);
  transcriptionForm.append('language', 'ja');
  transcriptionForm.append('response_format', 'verbose_json');
  transcriptionForm.append('timestamp_granularities[]', 'word');

  const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: transcriptionForm,
  });

  if (!transcriptionResponse.ok) {
    throw new ApiError(
      'transcription_failed',
      await transcriptionResponse.text(),
      '文字起こしに失敗しました。',
      502
    );
  }

  const transcriptionPayload = await transcriptionResponse.json();
  const rawText = typeof transcriptionPayload.text === 'string' ? transcriptionPayload.text.trim() : '';

  if (!rawText) {
    throw new ApiError('empty_transcription', '文字起こし結果が空でした。', '文字起こし結果が空でした。', 502);
  }

  await recordUsage(db, userId, {
    kind: 'transcribe',
    model: sttModel,
    inputTokens: null,
    outputTokens: null,
    audioSeconds: null,
  });

  const clean = await createOpenAIJsonResponse<CleanOutput>({
    instructions: createCleanInstructions(),
    input: rawText,
    schemaName: 'daily_to_english_clean_transcript_v2',
    schema: cleanSchema,
    maxOutputTokens: 8000,
  });

  await recordUsage(db, userId, {
    kind: 'clean',
    model: clean.model,
    inputTokens: clean.usage.inputTokens,
    outputTokens: clean.usage.outputTokens,
    audioSeconds: null,
  });

  const cleanText = clean.data.cleaned_text.trim();

  if (!cleanText) {
    throw new ApiError('empty_clean_text', '整形後の文字起こし結果が空でした。', '整形後の文字起こし結果が空でした。', 502);
  }

  return json(c, {
    rawText,
    cleanText,
    words: readTranscriptWords(transcriptionPayload),
  });
});

app.post('/generations', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const request = createGenerationRequestSchema.parse(await c.req.json().catch(() => null));

  const existing = await fetchGenerationByIdempotencyKey(db, userId, request.idempotencyKey);

  if (existing) {
    return json(c, await fetchBundle(db, userId, existing.id));
  }

  await enforceDailyLimit(db, userId, 'split');

  const split = await createOpenAIJsonResponse<SplitOutput>({
    instructions: createSplitInstructions(request.splitPolicy, request.transcript.length > 0),
    input: JSON.stringify({
      plainText: request.cleanText,
      transcriptWords: request.transcript,
    }),
    schemaName: SplitSchemaVersion,
    schema: splitSchema,
    maxOutputTokens: 12000,
  });

  await recordUsage(db, userId, {
    kind: 'split',
    model: split.model,
    inputTokens: split.usage.inputTokens,
    outputTokens: split.usage.outputTokens,
    audioSeconds: null,
  });

  const bundle = await saveSplitResult(db, userId, request, split);

  if (request.mode === 'auto') {
    return json(c, await translateGeneration(db, userId, bundle.generation.id, request.translationStyle));
  }

  return json(c, bundle);
});

app.post('/generations/:id/translate', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const request = translateGenerationRequestSchema.parse(await c.req.json().catch(() => ({})));
  return json(c, await translateGeneration(db, userId, c.req.param('id'), request.translationStyle));
});

app.post('/generations/:id/discard', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const generationId = c.req.param('id');
  const { data, error } = await db
    .from('generations')
    .update({ status: 'discarded', error: null })
    .eq('id', generationId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new ApiError('db_error', error.message, '下書きを破棄できませんでした。', 500);
  }

  if (!data) {
    throw new ApiError('not_found', '生成を確認できませんでした。', '下書きを確認できませんでした。', 404);
  }

  return json(c, await fetchBundle(db, userId, generationId));
});

app.post('/cards/:id/reviews', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const cardId = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const rating = reviewRatingSchema.parse(body?.rating);
  const card = await fetchCard(db, userId, cardId);
  const now = new Date();
  const previous = toSrsState(card);
  const next = applyReview(previous, rating, now);

  const { error: insertError } = await db.from('review_events').insert({
    user_id: userId,
    card_id: cardId,
    rating,
    reviewed_at: now.toISOString(),
  });

  if (insertError) {
    throw new ApiError('db_error', insertError.message, '復習結果を保存できませんでした。', 500);
  }

  const updated = await updateCardSrs(db, userId, cardId, next);
  return json(c, { card: updated });
});

app.post('/cards/:id/reviews/undo', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const cardId = c.req.param('id');
  await fetchCard(db, userId, cardId);

  const { data: latest, error: latestError } = await db
    .from('review_events')
    .select('id')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .is('undone_at', null)
    .order('reviewed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw new ApiError('db_error', latestError.message, 'Undoできませんでした。', 500);
  }

  if (!latest) {
    throw new ApiError('not_found', '取り消せる復習履歴がありません。', '取り消せる復習履歴がありません。', 404);
  }

  const { error: undoError } = await db
    .from('review_events')
    .update({ undone_at: new Date().toISOString() })
    .eq('id', latest.id)
    .eq('user_id', userId);

  if (undoError) {
    throw new ApiError('db_error', undoError.message, 'Undoできませんでした。', 500);
  }

  const { data: events, error: eventsError } = await db
    .from('review_events')
    .select('rating, reviewed_at')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .is('undone_at', null)
    .order('reviewed_at', { ascending: true });

  if (eventsError) {
    throw new ApiError('db_error', eventsError.message, '復習状態を再計算できませんでした。', 500);
  }

  const next = replayReviews(
    (events ?? []).map((event) => ({
      rating: event.rating as Rating,
      reviewedAt: event.reviewed_at as string,
    }))
  );
  const updated = await updateCardSrs(db, userId, cardId, next);
  return json(c, { card: updated });
});

app.notFound((c) => json(c, { error: { code: 'not_found', message: 'Not found', userMessage: 'APIが見つかりません。' } }, 404));

app.onError((error, c) => {
  if (error instanceof ApiError) {
    return json(c, {
      error: {
        code: error.code,
        message: error.message,
        userMessage: error.userMessage,
      },
    }, error.status);
  }

  if (isZodError(error)) {
    return json(c, {
      error: {
        code: 'bad_request',
        message: error.message,
        userMessage: '入力内容を確認してください。',
      },
    }, 400);
  }

  console.error(error);
  return json(c, {
    error: {
      code: 'internal_error',
      message: error instanceof Error ? error.message : 'Unknown error',
      userMessage: '処理に失敗しました。',
    },
  }, 500);
});

Deno.serve((req) => app.fetch(normalizeFunctionRequest(req)));

async function translateGeneration(
  db: SupabaseClient,
  userId: string,
  generationId: string,
  translationStyle: TranslationStyle
): Promise<GenerationBundle> {
  const generation = await fetchGeneration(db, userId, generationId);

  if (generation.status === 'completed') {
    return await fetchBundle(db, userId, generationId);
  }

  if (generation.status === 'discarded') {
    throw new ApiError('discarded', 'この下書きは破棄されています。', 'この下書きは破棄されています。', 409);
  }

  if (!canClaim(generation)) {
    throw new ApiError('conflict', 'この下書きは英訳できる状態ではありません。', 'この下書きは英訳できる状態ではありません。', 409);
  }

  await enforceDailyLimit(db, userId, 'translate');

  const modelInfo = {
    ...(generation.modelInfo ?? {}),
    translate: {
      model: getOpenAITextModel(),
      promptVersion: TranslatePromptVersion,
      schemaVersion: TranslateSchemaVersion,
    },
  };

  const { error: claimError } = await db
    .from('generations')
    .update({
      status: 'translating',
      translation_style: translationStyle,
      claimed_at: new Date().toISOString(),
      error: null,
      model_info: modelInfo,
    })
    .eq('id', generationId)
    .eq('user_id', userId);

  if (claimError) {
    throw new ApiError('db_error', claimError.message, '英訳を開始できませんでした。', 500);
  }

  const cards = await fetchGenerationCards(db, userId, generationId);
  const output = await createOpenAIJsonResponse<TranslateOutput>({
    instructions: createTranslationInstructions(translationStyle),
    input: JSON.stringify({
      cards: cards.map((card) => ({
        id: card.id,
        japanese: card.ja,
      })),
    }),
    schemaName: TranslateSchemaVersion,
    schema: translateSchema,
    maxOutputTokens: 12000,
  });

  await recordUsage(db, userId, {
    kind: 'translate',
    model: output.model,
    inputTokens: output.usage.inputTokens,
    outputTokens: output.usage.outputTokens,
    audioSeconds: null,
  });

  const translations = validateTranslations(cards, output.data.cards);

  for (const card of translations) {
    const { error } = await db
      .from('cards')
      .update({ en: card.en })
      .eq('id', card.id)
      .eq('user_id', userId);

    if (error) {
      await markGenerationFailed(db, userId, generationId, '英訳カードを保存できませんでした。');
      throw new ApiError('db_error', error.message, '英訳カードを保存できませんでした。', 500);
    }
  }

  const { error: completeError } = await db
    .from('generations')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      claimed_at: null,
      error: null,
    })
    .eq('id', generationId)
    .eq('user_id', userId);

  if (completeError) {
    await markGenerationFailed(db, userId, generationId, completeError.message);
    throw new ApiError('db_error', completeError.message, '英訳を完了できませんでした。', 500);
  }

  return await fetchBundle(db, userId, generationId);
}

async function saveSplitResult(
  db: SupabaseClient,
  userId: string,
  request: ReturnType<typeof createGenerationRequestSchema.parse>,
  split: OpenAIJsonResult<SplitOutput>
) {
  const cardDrafts = split.data.cards
    .map((card, index) => ({
      position: index + 1,
      ja: card.japanese.trim(),
      ...createCardTimestampFields(card, request.transcript),
    }))
    .filter((card) => card.ja.length > 0);

  if (cardDrafts.length === 0) {
    throw new ApiError('no_cards', '英語カードにできる内容が見つかりませんでした。', '英語カードにできる内容が見つかりませんでした。', 502);
  }

  const { data: entry, error: entryError } = await db
    .from('entries')
    .insert({
      user_id: userId,
      source: request.source,
      raw_text: request.rawText,
      clean_text: request.cleanText,
      is_edited: request.isEdited,
      summary: normalizeBulletPoints(split.data.bulletPoints, request.cleanText),
      transcript: request.transcript,
      waveform: request.waveform,
      content_hash: await createContentHash(request.cleanText),
    })
    .select('*')
    .single();

  if (entryError || !entry) {
    throw new ApiError('db_error', entryError?.message ?? '日記を保存できませんでした。', '日記を保存できませんでした。', 500);
  }

  const { data: generation, error: generationError } = await db
    .from('generations')
    .insert({
      user_id: userId,
      entry_id: entry.id,
      idempotency_key: request.idempotencyKey,
      split_policy: request.splitPolicy,
      translation_style: request.translationStyle,
      status: 'split',
      model_info: {
        split: {
          model: split.model,
          promptVersion: SplitPromptVersion,
          schemaVersion: SplitSchemaVersion,
        },
      },
    })
    .select('*')
    .single();

  if (generationError || !generation) {
    throw new ApiError('db_error', generationError?.message ?? '生成ジョブを保存できませんでした。', '生成ジョブを保存できませんでした。', 500);
  }

  const { error: cardsError } = await db.from('cards').insert(
    cardDrafts.map((card) => ({
      user_id: userId,
      generation_id: generation.id,
      position: card.position,
      ja: card.ja,
      word_start: card.wordStart,
      word_end: card.wordEnd,
      audio_start_sec: card.audioStartSec,
      audio_end_sec: card.audioEndSec,
    }))
  );

  if (cardsError) {
    throw new ApiError('db_error', cardsError.message, 'カード下書きを保存できませんでした。', 500);
  }

  return await fetchBundle(db, userId, generation.id);
}

async function fetchBundle(db: SupabaseClient, userId: string, generationId: string): Promise<GenerationBundle> {
  const generation = await fetchGeneration(db, userId, generationId);
  const { data: entry, error: entryError } = await db
    .from('entries')
    .select('*')
    .eq('id', generation.entryId)
    .eq('user_id', userId)
    .single();

  if (entryError || !entry) {
    throw new ApiError('db_error', entryError?.message ?? '日記を確認できませんでした。', '日記を確認できませんでした。', 500);
  }

  const cards = await fetchGenerationCards(db, userId, generationId);
  const bundle = {
    entry: toEntry(entry),
    generation,
    cards,
  };
  return generationBundleSchema.parse(bundle);
}

async function fetchGeneration(db: SupabaseClient, userId: string, generationId: string): Promise<Generation> {
  const { data, error } = await db
    .from('generations')
    .select('*')
    .eq('id', generationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new ApiError('db_error', error.message, '生成状態を確認できませんでした。', 500);
  }

  if (!data) {
    throw new ApiError('not_found', '生成を確認できませんでした。', '生成を確認できませんでした。', 404);
  }

  return toGeneration(data);
}

async function fetchGenerationByIdempotencyKey(db: SupabaseClient, userId: string, key: string) {
  const { data, error } = await db
    .from('generations')
    .select('*')
    .eq('user_id', userId)
    .eq('idempotency_key', key)
    .maybeSingle();

  if (error) {
    throw new ApiError('db_error', error.message, '生成状態を確認できませんでした。', 500);
  }

  return data ? toGeneration(data) : null;
}

async function fetchGenerationCards(db: SupabaseClient, userId: string, generationId: string): Promise<Card[]> {
  const { data, error } = await db
    .from('cards')
    .select('*')
    .eq('generation_id', generationId)
    .eq('user_id', userId)
    .order('position', { ascending: true });

  if (error) {
    throw new ApiError('db_error', error.message, 'カードを確認できませんでした。', 500);
  }

  return (data ?? []).map(toCard);
}

async function fetchCard(db: SupabaseClient, userId: string, cardId: string): Promise<Card> {
  const { data, error } = await db
    .from('cards')
    .select('*')
    .eq('id', cardId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new ApiError('db_error', error.message, 'カードを確認できませんでした。', 500);
  }

  if (!data) {
    throw new ApiError('not_found', 'カードが見つかりません。', 'カードが見つかりません。', 404);
  }

  return toCard(data);
}

async function updateCardSrs(db: SupabaseClient, userId: string, cardId: string, state: SrsState) {
  const { data, error } = await db
    .from('cards')
    .update({
      srs_status: state.status,
      review_count: state.reviewCount,
      success_streak: state.successStreak,
      last_reviewed_at: state.lastReviewedAt,
      due_at: state.dueAt,
    })
    .eq('id', cardId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new ApiError('db_error', error?.message ?? '復習状態を保存できませんでした。', '復習状態を保存できませんでした。', 500);
  }

  return toCard(data);
}

async function markGenerationFailed(db: SupabaseClient, userId: string, generationId: string, message: string) {
  await db
    .from('generations')
    .update({
      status: 'failed',
      claimed_at: null,
      error: {
        step: 'translate',
        message,
        at: new Date().toISOString(),
      },
    })
    .eq('id', generationId)
    .eq('user_id', userId);
}

function validateTranslations(sourceCards: Card[], outputCards: TranslateOutput['cards']) {
  const sourceIds = new Set(sourceCards.map((card) => card.id));
  const byId = new Map<string, string>();

  for (const card of outputCards) {
    const id = card.id.trim();
    const english = card.english.trim();

    if (!sourceIds.has(id) || !english) {
      throw new ApiError('invalid_llm_output', '英語カードの生成結果が壊れていました。', '英語カードの生成結果が壊れていました。', 502);
    }

    byId.set(id, english);
  }

  if (byId.size !== sourceCards.length) {
    throw new ApiError('invalid_llm_output', '英語カードの生成結果が不足しています。', '英語カードの生成結果が不足しています。', 502);
  }

  return sourceCards.map((card) => ({
    id: card.id,
    en: byId.get(card.id) ?? '',
  }));
}

function createCardTimestampFields(
  card: SplitOutput['cards'][number],
  transcriptWords: TranscriptWord[]
) {
  const startIndex = card.sourceWordStartIndex;
  const endIndex = card.sourceWordEndIndex;

  if (
    typeof startIndex !== 'number' ||
    typeof endIndex !== 'number' ||
    startIndex < 0 ||
    endIndex < startIndex ||
    endIndex >= transcriptWords.length
  ) {
    return {
      wordStart: null,
      wordEnd: null,
      audioStartSec: null,
      audioEndSec: null,
    };
  }

  const startWord = transcriptWords[startIndex];
  const endWord = transcriptWords[endIndex];

  if (!startWord || !endWord || endWord.end < startWord.start) {
    return {
      wordStart: null,
      wordEnd: null,
      audioStartSec: null,
      audioEndSec: null,
    };
  }

  return {
    wordStart: startIndex,
    wordEnd: endIndex,
    audioStartSec: startWord.start,
    audioEndSec: endWord.end,
  };
}

async function createOpenAIJsonResponse<T>({
  instructions,
  input,
  schemaName,
  schema,
  maxOutputTokens = 8000,
}: {
  instructions: string;
  input: string;
  schemaName: string;
  schema: JsonSchema;
  maxOutputTokens?: number;
}): Promise<OpenAIJsonResult<T>> {
  const model = getOpenAITextModel();
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${readOpenAIKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
      reasoning: { effort: 'medium' },
      text: {
        verbosity: 'low',
        format: {
          type: 'json_schema',
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new ApiError('openai_failed', await response.text(), 'AI生成に失敗しました。', 502);
  }

  const payload = await response.json();
  const outputText = readOpenAIOutputText(payload);

  if (!outputText) {
    throw new ApiError('openai_empty_output', 'OpenAIのJSON出力を読み取れませんでした。', 'AI生成に失敗しました。', 502);
  }

  try {
    return {
      data: JSON.parse(outputText) as T,
      model,
      usage: readOpenAIUsage(payload),
    };
  } catch (error) {
    throw new ApiError(
      'openai_invalid_json',
      error instanceof Error ? error.message : 'OpenAIのJSON出力が壊れていました。',
      'AI生成結果を読み取れませんでした。',
      502
    );
  }
}

async function recordUsage(
  db: SupabaseClient,
  userId: string,
  event: {
    kind: 'transcribe' | 'clean' | 'split' | 'translate';
    model: string;
    inputTokens: number | null;
    outputTokens: number | null;
    audioSeconds: number | null;
  }
) {
  const { error } = await db.from('usage_events').insert({
    user_id: userId,
    kind: event.kind,
    model: event.model,
    input_tokens: event.inputTokens,
    output_tokens: event.outputTokens,
    audio_seconds: event.audioSeconds,
  });

  if (error) {
    console.warn('usage_events insert failed', error.message);
  }
}

async function enforceDailyLimit(
  db: SupabaseClient,
  userId: string,
  kind: 'transcribe' | 'split' | 'translate'
) {
  const limit =
    kind === 'transcribe'
      ? readIntegerEnv('DAILY_TRANSCRIPTION_LIMIT', 30)
      : readIntegerEnv('DAILY_GENERATION_LIMIT', 30);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const countedKind = kind === 'translate' ? 'split' : kind;
  const { count, error } = await db
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', countedKind)
    .gte('created_at', today.toISOString());

  if (error) {
    throw new ApiError('db_error', error.message, '利用回数を確認できませんでした。', 500);
  }

  if ((count ?? 0) >= limit) {
    throw new ApiError('rate_limited', `${kind} daily limit exceeded`, '今日の生成回数の上限に達しました。', 429);
  }
}

function toEntry(row: Row): Entry {
  return {
    id: row.id,
    source: row.source,
    rawText: row.raw_text,
    cleanText: row.clean_text,
    isEdited: row.is_edited,
    summary: normalizeStringArray(row.summary),
    transcript: normalizeTranscriptWords(row.transcript),
    waveform: normalizeNumberArray(row.waveform),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toGeneration(row: Row): Generation {
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

function toCard(row: Row): Card {
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

function toSrsState(card: Card): SrsState {
  return {
    status: card.srsStatus,
    reviewCount: card.reviewCount,
    successStreak: card.successStreak,
    lastReviewedAt: card.lastReviewedAt,
    dueAt: card.dueAt,
  };
}

function canClaim(generation: Generation) {
  if (generation.status === 'split' || generation.status === 'failed') {
    return true;
  }

  if (generation.status !== 'translating' || !generation.claimedAt) {
    return false;
  }

  return new Date(generation.claimedAt).getTime() < Date.now() - 10 * 60 * 1000;
}

function readTranscriptWords(payload: unknown): TranscriptWord[] {
  if (!isRecord(payload) || !Array.isArray(payload.words)) {
    return [];
  }

  return normalizeTranscriptWords(
    payload.words.map((word, index) => {
      if (!isRecord(word)) {
        return null;
      }

      return {
        index,
        word: typeof word.word === 'string' ? word.word : typeof word.text === 'string' ? word.text : '',
        start: word.start,
        end: word.end,
      };
    })
  );
}

function normalizeTranscriptWords(value: unknown): TranscriptWord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((word, fallbackIndex) => {
    if (
      !isRecord(word) ||
      typeof word.word !== 'string' ||
      typeof word.start !== 'number' ||
      typeof word.end !== 'number' ||
      !word.word.trim()
    ) {
      return [];
    }

    return [{
      index: typeof word.index === 'number' ? word.index : fallbackIndex,
      word: word.word.trim(),
      start: word.start,
      end: word.end,
    }];
  });
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.flatMap((item) => (typeof item === 'string' ? [item] : [])) : [];
}

function normalizeNumberArray(value: unknown) {
  return Array.isArray(value) ? value.flatMap((item) => (typeof item === 'number' ? [item] : [])) : [];
}

async function createContentHash(value: string) {
  const bytes = new TextEncoder().encode(normalizeContentForHash(value));
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function ensureProfile(db: SupabaseClient, userId: string) {
  await db.from('profiles').upsert({ user_id: userId }, { onConflict: 'user_id' });
}

function createServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceKey) {
    throw new ApiError('server_not_configured', 'SUPABASE_URLまたはSUPABASE_SERVICE_ROLE_KEYが未設定です。', 'サーバー設定が不足しています。', 500);
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function readUserId(req: Request) {
  const authorization = req.headers.get('authorization') ?? '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    throw new ApiError('unauthorized', 'Authorization header is missing.', 'ログイン状態を確認できませんでした。', 401);
  }

  const payload = decodeJwtPayload(token);
  const userId = typeof payload.sub === 'string' ? payload.sub : typeof payload.id === 'string' ? payload.id : null;

  if (!userId) {
    throw new ApiError('unauthorized', 'JWT user id is missing.', 'ユーザーIDを確認できませんでした。', 401);
  }

  return userId;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];

  if (!payload) {
    throw new ApiError('unauthorized', 'JWT payload is missing.', 'ログイン状態を確認できませんでした。', 401);
  }

  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);

  try {
    return JSON.parse(atob(padded));
  } catch {
    throw new ApiError('unauthorized', 'JWT payload is invalid.', 'ログイン状態を確認できませんでした。', 401);
  }
}

function readOpenAIKey() {
  const apiKey = Deno.env.get('OPENAI_API_KEY');

  if (!apiKey) {
    throw new ApiError('server_not_configured', 'OPENAI_API_KEYが未設定です。', 'AI生成の設定が不足しています。', 500);
  }

  return apiKey;
}

function getOpenAITextModel() {
  return Deno.env.get('OPENAI_TEXT_MODEL') ?? 'gpt-5.4-mini';
}

function readOpenAIOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === 'string') {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) {
    return null;
  }

  const chunks: string[] = [];

  for (const item of payload.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (isRecord(content) && content.type === 'output_text' && typeof content.text === 'string') {
        chunks.push(content.text);
      }
    }
  }

  return chunks.length > 0 ? chunks.join('') : null;
}

function readOpenAIUsage(payload: Record<string, unknown>): OpenAIUsage {
  if (!isRecord(payload.usage)) {
    return { inputTokens: null, outputTokens: null };
  }

  return {
    inputTokens: typeof payload.usage.input_tokens === 'number' ? payload.usage.input_tokens : null,
    outputTokens: typeof payload.usage.output_tokens === 'number' ? payload.usage.output_tokens : null,
  };
}

function normalizeFunctionRequest(req: Request) {
  const url = new URL(req.url);
  url.pathname = url.pathname.replace(/^\/api(?=\/|$)/, '') || '/';
  return new Request(url, req);
}

function json(c: any, body: unknown, status = 200) {
  return c.json(body, status, corsHeaders);
}

function readIntegerEnv(name: string, fallback: number) {
  const value = Number(Deno.env.get(name));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}

function isZodError(value: unknown) {
  return isRecord(value) && value.name === 'ZodError';
}
