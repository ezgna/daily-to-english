import {
  generationBundleSchema,
  parseApiErrorEnvelope,
  transcriptionResponseSchema,
  type CreateGenerationRequest,
  type GenerationBundle,
  type ReviewRating,
  type TranscriptionResponse,
  type TranslationStyle,
} from '@just-speak-it/contract';
import { File } from 'expo-file-system';

import { ensureAnonymousSession, refreshAnonymousSession } from '@/shared/api/auth';
import { requireSupabaseClient, supabasePublishableKey, supabaseUrl } from '@/shared/supabase/client';

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public userMessage = message,
    public status = 0
  ) {
    super(message);
  }
}

export async function transcribeAudio(uri: string): Promise<TranscriptionResponse> {
  const body = new FormData();
  const recordingFile = new File(uri);

  if (!recordingFile.exists || recordingFile.size === 0) {
    throw new Error('録音ファイルを読み込めませんでした。もう一度録音してください。');
  }

  body.append('audio', recordingFile, recordingFile.name || 'daily-recording.m4a');

  const response = await callApi('/transcriptions', {
    method: 'POST',
    body,
  });

  return transcriptionResponseSchema.parse(response);
}

export async function createGeneration(request: CreateGenerationRequest): Promise<GenerationBundle> {
  const response = await callApi('/generations', {
    method: 'POST',
    json: request,
  });
  return generationBundleSchema.parse(response);
}

export async function translateGeneration(generationId: string, translationStyle: TranslationStyle) {
  const response = await callApi(`/generations/${generationId}/translate`, {
    method: 'POST',
    json: { translationStyle },
  });
  return generationBundleSchema.parse(response);
}

export async function discardGeneration(generationId: string) {
  const response = await callApi(`/generations/${generationId}/discard`, {
    method: 'POST',
    json: {},
  });
  return generationBundleSchema.parse(response);
}

export async function reviewCard(cardId: string, rating: ReviewRating, eventId: string) {
  return await callApi(`/cards/${cardId}/reviews`, {
    method: 'POST',
    json: { eventId, rating },
  });
}

export async function undoReview(cardId: string, reviewEventId: string) {
  return await callApi(`/cards/${cardId}/reviews/undo`, {
    method: 'POST',
    json: { reviewEventId },
  });
}

export async function deleteDeveloperData() {
  await callApi('/developer/data/reset', {
    method: 'POST',
    json: {},
  });
}

async function callApi(
  path: string,
  options: {
    method: 'POST';
    body?: BodyInit;
    json?: unknown;
  }
) {
  await ensureAnonymousSession();
  let response = await sendApiRequest(path, options);

  if (response.status === 401) {
    try {
      await refreshAnonymousSession();
      response = await sendApiRequest(path, options);
    } catch {
      // 最初の401レスポンスを使い、既存のAPIエラー形式で通知する。
    }
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const envelope = parseApiErrorEnvelope(payload);
    throw new ApiClientError(
      envelope?.error.code ?? 'request_failed',
      envelope?.error.message ?? `HTTP ${response.status}`,
      envelope?.error.userMessage ?? '通信に失敗しました。',
      response.status
    );
  }

  return payload;
}

async function sendApiRequest(
  path: string,
  options: {
    method: 'POST';
    body?: BodyInit;
    json?: unknown;
  }
) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (error) {
    throw error;
  }

  if (!supabaseUrl || !supabasePublishableKey || !token) {
    throw new ApiClientError('not_configured', 'Supabaseに接続できません。');
  }

  const headers: Record<string, string> = {
    apikey: supabasePublishableKey,
    Authorization: `Bearer ${token}`,
  };

  let body = options.body;

  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.json);
  }

  return await fetch(`${supabaseUrl}/functions/v1/api${path}`, {
    method: options.method,
    headers,
    body,
  });
}

export function formatApiError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '処理に失敗しました。';
}
