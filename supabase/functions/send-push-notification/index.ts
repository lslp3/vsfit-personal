/**
 * Sprint 12 — ETAPA 4/5 — Edge Function de envio de Push Notifications (FCM).
 *
 * Infraestrutura REUTILIZÁVEL: recebe um destinatário e uma mensagem e entrega
 * a todos os dispositivos do usuário. Best-effort — nunca interrompe o fluxo
 * do sistema se o push falhar.
 *
 * AUTORIZAÇÃO (endurecida na ETAPA 5):
 *   - Contexto de USUÁRIO (Bearer = JWT de sessão): valida a relação
 *     remetente → destinatário. Permitido quando:
 *       • remetente == destinatário (auto-notificação);
 *       • remetente é admin (user_profiles.role = 'admin');
 *       • remetente e destinatário são um par treinador ↔ aluno vinculado
 *         (students.trainer_id / students.auth_user_id).
 *     Qualquer outro envio é rejeitado com 403 (sem envio arbitrário).
 *   - Contexto de SERVIÇO (Bearer = SERVICE_ROLE_KEY): chamada interna
 *     confiável (outra Edge Function/webhook) — autorizado para qualquer
 *     user_id (usado por eventos sem ator de usuário, ex.: webhook de
 *     pagamento).
 *
 * Request (POST):
 * {
 *   user_id: string,              // auth uid do DESTINATÁRIO
 *   title: string,
 *   body: string,
 *   data?: {                      // opcional; valores convertidos para string
 *     event_type?: string,
 *     route?: string,
 *     trainer_id?: string,
 *     student_id?: string,
 *     conversation_id?: string,
 *     notification_id?: string,
 *     ...qualquer outro identificador
 *   }
 * }
 *
 * Secrets obrigatórios:
 *   SUPABASE_URL               (automático no runtime Supabase)
 *   SERVICE_ROLE_KEY           (automático no runtime Supabase)
 *   FIREBASE_SERVICE_ACCOUNT   (JSON do service account do Firebase — para FCM)
 *
 * Deploy:
 *   supabase secrets set FIREBASE_SERVICE_ACCOUNT "<json>"
 *   supabase functions deploy send-push-notification
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

import { sendToTokens } from "./push.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Autorização por relação (contexto de usuário autenticado):
 * - mesmo usuário (auto-notificação);
 * - admin (user_profiles.role = 'admin');
 * - par treinador ↔ aluno vinculado (qualquer direção).
 */
async function canSendTo(
  supabaseAdmin: SupabaseClient,
  callerId: string,
  recipientId: string,
): Promise<boolean> {
  if (!callerId || !recipientId) return false;

  if (callerId === recipientId) return true;

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("role")
    .eq("id", callerId)
    .maybeSingle();

  if (profile?.role === "admin") return true;

  const { count } = await supabaseAdmin
    .from("students")
    .select("id", { count: "exact", head: true })
    .or(
      `and(trainer_id.eq.${callerId},auth_user_id.eq.${recipientId}),` +
        `and(trainer_id.eq.${recipientId},auth_user_id.eq.${callerId})`,
    );

  return (count ?? 0) > 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ ok: false, error: "Método não permitido." }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl) throw new Error("SUPABASE_URL não configurada.");
    if (!serviceRoleKey) throw new Error("SERVICE_ROLE_KEY não configurada.");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await req.json();
    const user_id = body?.user_id;
    const title = body?.title;
    const messageBody = body?.body;
    const data = body?.data;

    if (!user_id || typeof user_id !== "string") {
      return jsonResponse({ ok: false, error: "user_id é obrigatório." }, 400);
    }
    if (!title || typeof title !== "string") {
      return jsonResponse({ ok: false, error: "title é obrigatório." }, 400);
    }
    if (!messageBody || typeof messageBody !== "string") {
      return jsonResponse({ ok: false, error: "body é obrigatório." }, 400);
    }

    // ── AUTORIZAÇÃO ────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ ok: false, error: "Usuário não autenticado." }, 401);
    }

    const accessToken = authHeader.replace("Bearer ", "");

    if (accessToken !== serviceRoleKey) {
      // Contexto de usuário: valida JWT + relação remetente → destinatário.
      const { data: userData, error: userError } =
        await supabaseAdmin.auth.getUser(accessToken);

      if (userError || !userData.user) {
        return jsonResponse({ ok: false, error: "Sessão inválida." }, 401);
      }

      const allowed = await canSendTo(
        supabaseAdmin,
        userData.user.id,
        user_id,
      );

      if (!allowed) {
        return jsonResponse(
          { ok: false, error: "Não autorizado a enviar para este usuário." },
          403,
        );
      }
    }
    // Bearer === SERVICE_ROLE_KEY: contexto de serviço confiável (webhook,
    // outra edge function) — prossegue sem vínculo de usuário.

    // ── ENVIO ─────────────────────────────────────────────────────────────
    // Payload FCM exige valores string — converte tudo.
    const dataPayload: Record<string, string> = {};
    if (data && typeof data === "object") {
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (value !== undefined && value !== null) {
          dataPayload[key] = String(value);
        }
      }
    }

    // ── PREFERÊNCIAS (ETAPA 7) ────────────────────────────────────────────
    // Gate centralizado de preferências do DESTINATÁRIO (com service_role —
    // o cliente não lê preferências de outro usuário por RLS self). Se a
    // categoria estiver desabilitada, o push é bloqueado aqui. A notificação
    // salva no banco já foi criada pelo evento e permanece normalmente —
    // somente o Push é bloqueado.
    const EVENT_CATEGORY: Record<string, string> = {
      NEW_MESSAGE: "messages",
      WORKOUT_COMPLETED: "workouts",
      PAYMENT_APPROVED: "payments",
      PLAN_EXPIRING: "system",
      SYSTEM_NOTIFICATION: "system",
      STUDENT_CREATED: "system",
    };

    const eventType = dataPayload.event_type ?? "";
    const category = EVENT_CATEGORY[eventType];

    if (category) {
      const { data: prefs } = await supabaseAdmin
        .from("push_preferences")
        .select("messages, workouts, payments, system")
        .eq("user_id", user_id)
        .maybeSingle();

      // Sem registro de preferência = defaults (tudo habilitado).
      const categoryValue =
        (prefs as Record<string, boolean | null | undefined> | null)?.[category];

      if (categoryValue === false) {
        return jsonResponse({
          ok: true,
          sent: 0,
          failed: 0,
          removed: 0,
          devices: 0,
          blocked: true,
        });
      }
    }

    // Localiza todos os dispositivos do destinatário.
    const { data: tokensData, error: tokensError } = await supabaseAdmin
      .from("push_tokens")
      .select("device_token")
      .eq("user_id", user_id);

    if (tokensError) throw tokensError;

    const tokens = (tokensData ?? [])
      .map((row) => row.device_token)
      .filter((value): value is string => Boolean(value));

    if (tokens.length === 0) {
      return jsonResponse({ ok: true, sent: 0, failed: 0, removed: 0, devices: 0 });
    }

    // Remove token inválido do banco automaticamente (best-effort).
    const removeInvalidToken = async (deviceToken: string) => {
      await supabaseAdmin
        .from("push_tokens")
        .delete()
        .eq("user_id", user_id)
        .eq("device_token", deviceToken);
    };

    const result = await sendToTokens(
      tokens,
      { title, body: messageBody, data: dataPayload },
      removeInvalidToken,
    );

    return jsonResponse({
      ok: true,
      sent: result.sent,
      failed: result.failed,
      removed: result.removed,
      devices: tokens.length,
    });
  } catch (error) {
    console.error("[send-push-notification] error:", error);
    const message = error instanceof Error ? error.message : String(error);
    // Best-effort: erro estruturado; quem dispara não deve interromper o
    // fluxo por causa do push.
    return jsonResponse({ ok: false, error: message }, 500);
  }
});