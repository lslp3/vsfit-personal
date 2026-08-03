import { supabase } from '../lib/supabase';

/**
 * Sprint 12 — ETAPA 3: persistência de tokens FCM e preferências no Supabase.
 * Todo o acesso do domínio push ao banco fica concentrado aqui.
 *
 * RLS: o usuário autenticado gerencia somente os próprios registros
 * (push_tokens_self_* e push_preferences_self_*).
 */

export interface PushPreferences {
  messages: boolean;
  workouts: boolean;
  payments: boolean;
  system: boolean;
}

export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {
  messages: true,
  workouts: true,
  payments: true,
  system: true,
};

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

/**
 * Insere ou atualiza o token do dispositivo atual. Idempotente graças ao
 * UNIQUE(user_id, device_token) — evita registros duplicados no refresh.
 */
export async function upsertToken(
  deviceToken: string,
  platform: string = 'android'
): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId || !deviceToken) return;

  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      { user_id: userId, device_token: deviceToken, platform },
      { onConflict: 'user_id,device_token' }
    );

  if (error) {
    console.warn('[PushService] upsertToken error:', error);
  }
}

/**
 * Renovação de token (refresh do FCM): atualiza a linha do dispositivo
 * antigo; se ela não existir, faz upsert do novo (evita duplicata).
 */
export async function updateToken(
  oldToken: string,
  newToken: string
): Promise<void> {
  if (!newToken || oldToken === newToken) return;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const { data: rows, error } = await supabase
    .from('push_tokens')
    .update({ device_token: newToken })
    .eq('user_id', userId)
    .eq('device_token', oldToken)
    .select('id');

  if (error) {
    console.warn('[PushService] updateToken error:', error);
    return;
  }

  if (!rows || rows.length === 0) {
    await upsertToken(newToken);
  }
}

/** Remove o token atual (dispositivo deste app) do usuário logado. */
export async function removeCurrentToken(deviceToken: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId || !deviceToken) return;

  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('device_token', deviceToken);

  if (error) {
    console.warn('[PushService] removeCurrentToken error:', error);
  }
}

/** Remove todos os tokens do usuário (usado no logout). Best-effort. */
export async function removeAllTokens(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.warn('[PushService] removeAllTokens error:', error);
  }
}

/** Lê as preferências de push do usuário; sem registro, retorna defaults. */
export async function getPreferences(): Promise<PushPreferences> {
  const userId = await getCurrentUserId();
  if (!userId) return DEFAULT_PUSH_PREFERENCES;

  const { data, error } = await supabase
    .from('push_preferences')
    .select('messages, workouts, payments, system')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[PushService] getPreferences error:', error);
    return DEFAULT_PUSH_PREFERENCES;
  }

  if (!data) return DEFAULT_PUSH_PREFERENCES;

  return {
    messages: data.messages ?? true,
    workouts: data.workouts ?? true,
    payments: data.payments ?? true,
    system: data.system ?? true,
  };
}

/** Cria/atualiza preferências de push do usuário (estrutura pronta). */
export async function updatePreferences(
  preferences: Partial<PushPreferences>
): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const { error } = await supabase
    .from('push_preferences')
    .upsert(
      { user_id: userId, ...preferences },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.warn('[PushService] updatePreferences error:', error);
  }
}