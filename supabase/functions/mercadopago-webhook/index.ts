import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function normalizeSubscriptionStatus(status: string | null | undefined) {
  const normalized = String(status || "").toLowerCase();

  if (
    normalized === "authorized" ||
    normalized === "active" ||
    normalized === "approved"
  ) {
    return "active";
  }

  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "paused" ||
    normalized === "inactive" ||
    normalized === "rejected"
  ) {
    return "canceled";
  }

  return normalized || "pending";
}

function getPlanSlugFromPlanId(
  planId: string | null,
  proPlanId: string | null,
  premiumPlanId: string | null
) {
  if (planId && premiumPlanId && planId === premiumPlanId) return "premium";
  if (planId && proPlanId && planId === proPlanId) return "pro";
  return null;
}

function getPlanSlugFromAmount(amount: number | null | undefined) {
  const value = Number(amount || 0);

  if (value >= 99 && value <= 101) return "premium";
  if (value >= 49 && value <= 51) return "pro";

  return null;
}

async function getJson(url: string, token: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Método não permitido." }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const mercadoPagoToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const proPlanId = Deno.env.get("MERCADOPAGO_PLAN_PRO_ID");
    const premiumPlanId = Deno.env.get("MERCADOPAGO_PLAN_PREMIUM_ID");

    if (!supabaseUrl) throw new Error("SUPABASE_URL não configurada.");
    if (!serviceRoleKey) throw new Error("SERVICE_ROLE_KEY não configurada.");
    if (!mercadoPagoToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));

    console.log("[MERCADOPAGO WEBHOOK BODY]", JSON.stringify(body));

    const topicFromQuery = url.searchParams.get("topic") || url.searchParams.get("type");
    const idFromQuery = url.searchParams.get("id") || url.searchParams.get("data.id");

    const eventType = String(body.type || body.topic || topicFromQuery || "").toLowerCase();
    const action = String(body.action || "").toLowerCase();

    const eventId =
      body?.data?.id ||
      body?.id ||
      idFromQuery ||
      null;

    if (!eventId) {
      return jsonResponse({
        success: true,
        ignored: true,
        reason: "Webhook sem ID.",
      });
    }

    if (String(eventId) === "123456") {
      return jsonResponse({
        success: true,
        ignored: true,
        reason: "Evento de teste do Mercado Pago recebido.",
      });
    }

    let payerEmail = "";
    let mercadoPagoStatus = "pending";
    let mercadoPagoPlanId: string | null = null;
    let mercadoPagoPreapprovalId: string | null = null;
    let planSlug: string | null = null;
    let transactionAmount: number | null = null;

    const isPaymentEvent =
      eventType.includes("payment") ||
      action.includes("payment");

    const isSubscriptionEvent =
      eventType.includes("preapproval") ||
      eventType.includes("subscription") ||
      action.includes("preapproval") ||
      action.includes("subscription");

    if (isPaymentEvent) {
      const paymentResult = await getJson(
        `https://api.mercadopago.com/v1/payments/${eventId}`,
        mercadoPagoToken
      );

      if (!paymentResult.ok) {
        console.error("[MERCADOPAGO GET PAYMENT ERROR]", paymentResult.data);

        return jsonResponse({
          success: true,
          ignored: true,
          reason: "Pagamento não encontrado ou evento de teste.",
          mercado_pago_status: paymentResult.status,
        });
      }

      const payment = paymentResult.data;

      console.log("[MERCADOPAGO PAYMENT]", JSON.stringify(payment));

      payerEmail = String(payment?.payer?.email || payment?.payer_email || "").toLowerCase();
      mercadoPagoStatus = normalizeSubscriptionStatus(payment?.status);
      transactionAmount = Number(payment?.transaction_amount || payment?.transaction_details?.total_paid_amount || 0);

      mercadoPagoPreapprovalId =
        payment?.metadata?.preapproval_id ||
        payment?.metadata?.mercadopago_preapproval_id ||
        payment?.point_of_interaction?.transaction_data?.subscription_id ||
        payment?.preapproval_id ||
        null;

      mercadoPagoPlanId =
        payment?.metadata?.preapproval_plan_id ||
        payment?.metadata?.mercadopago_plan_id ||
        null;

      planSlug =
        getPlanSlugFromPlanId(mercadoPagoPlanId, proPlanId, premiumPlanId) ||
        getPlanSlugFromAmount(transactionAmount);

      if (!planSlug) {
        console.warn("[MERCADOPAGO PAYMENT WITHOUT PLAN]", {
          transactionAmount,
          mercadoPagoPlanId,
        });

        return jsonResponse({
          success: true,
          ignored: true,
          reason: "Pagamento recebido, mas não foi possível identificar Pro ou Premium.",
          amount: transactionAmount,
        });
      }
    } else if (isSubscriptionEvent) {
      const preapprovalResult = await getJson(
        `https://api.mercadopago.com/preapproval/${eventId}`,
        mercadoPagoToken
      );

      if (!preapprovalResult.ok) {
        console.error("[MERCADOPAGO GET PREAPPROVAL ERROR]", preapprovalResult.data);

        return jsonResponse({
          success: true,
          ignored: true,
          reason: "Assinatura não encontrada ou evento de teste.",
          mercado_pago_status: preapprovalResult.status,
        });
      }

      const preapproval = preapprovalResult.data;

      console.log("[MERCADOPAGO PREAPPROVAL]", JSON.stringify(preapproval));

      payerEmail = String(preapproval?.payer_email || "").toLowerCase();
      mercadoPagoStatus = normalizeSubscriptionStatus(preapproval?.status);
      mercadoPagoPlanId = preapproval?.preapproval_plan_id || null;
      mercadoPagoPreapprovalId = String(preapproval?.id || eventId);

      planSlug = getPlanSlugFromPlanId(mercadoPagoPlanId, proPlanId, premiumPlanId);
    } else {
      return jsonResponse({
        success: true,
        ignored: true,
        reason: `Tipo de evento ignorado: ${eventType || action}`,
      });
    }

    if (!payerEmail) {
      throw new Error("Evento sem e-mail do pagador. Não foi possível localizar o personal.");
    }

    const { data: trainer, error: trainerError } = await supabaseAdmin
      .from("trainer_profiles")
      .select("*")
      .ilike("email", payerEmail)
      .maybeSingle();

    if (trainerError) throw trainerError;

    if (!trainer) {
      throw new Error(`Personal não encontrado com o e-mail do Mercado Pago: ${payerEmail}`);
    }

    const finalPlanSlug = mercadoPagoStatus === "active" ? planSlug || "free" : "free";

    const now = new Date();
    const currentPeriodEnd = new Date(now);
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    const { error: upsertError } = await supabaseAdmin.from("subscriptions").upsert(
      {
        trainer_id: trainer.id,
        plan_slug: finalPlanSlug,
        status: mercadoPagoStatus,
        payment_provider: "mercadopago",
        mercadopago_preapproval_id: mercadoPagoPreapprovalId,
        mercadopago_plan_id: mercadoPagoPlanId,
        current_period_start: now.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        onConflict: "trainer_id",
      }
    );

    if (upsertError) throw upsertError;

    return jsonResponse({
      success: true,
      trainer_id: trainer.id,
      payer_email: payerEmail,
      plan_slug: finalPlanSlug,
      status: mercadoPagoStatus,
      preapproval_id: mercadoPagoPreapprovalId,
      plan_id: mercadoPagoPlanId,
      amount: transactionAmount,
    });
  } catch (error) {
    console.error("[MERCADOPAGO WEBHOOK ERROR]", error);

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro no webhook Mercado Pago.",
      },
      400
    );
  }
});