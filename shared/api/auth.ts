import { isSupabaseConfigured, requireSupabaseClient } from '@/shared/supabase/client';
import { i18n } from '@/shared/i18n';

export type BackendSessionState =
  | { status: 'not-configured'; userId: null }
  | { status: 'ready'; userId: string };

let pendingSession: Promise<BackendSessionState> | null = null;

export async function ensureAnonymousSession(): Promise<BackendSessionState> {
  if (!isSupabaseConfigured) {
    return { status: 'not-configured', userId: null };
  }

  pendingSession ??= loadOrCreateAnonymousSession().finally(() => {
    pendingSession = null;
  });

  return await pendingSession;
}

export async function refreshAnonymousSession(): Promise<BackendSessionState> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    throw error;
  }

  if (!data.session?.user) {
    throw new Error(i18n.t('errors.authRefresh'));
  }

  return { status: 'ready', userId: data.session.user.id };
}

async function loadOrCreateAnonymousSession(): Promise<BackendSessionState> {
  const supabase = requireSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (sessionData.session?.user) {
    return { status: 'ready', userId: sessionData.session.user.id };
  }

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error(i18n.t('errors.authCreate'));
  }

  return { status: 'ready', userId: data.user.id };
}
