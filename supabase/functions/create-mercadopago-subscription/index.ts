import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        {
          success: false,
          error: "Método não permitido.",
        },
        405
      );
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SERVICE_ROLE_KEY");

    const mercadoPagoToken =
      Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    const mercadoPagoPlanProId =
      Deno.env.get("MERCADOPAGO_PLAN_PRO_ID");

    const mercadoPagoPlanPremiumId =
      Deno.env.get("MERCADOPAGO_PLAN_PREMIUM_ID");

    if (!supabaseUrl) {
      throw new Error(
        "SUPABASE_URL não configurada."
      );
    }

    if (!serviceRoleKey) {
      throw new Error(
        "Chave service role não configurada."
      );
    }

    if (!mercadoPagoToken) {
      throw new Error(
        "MERCADOPAGO_ACCESS_TOKEN não configurado."
      );
    }

    if (
      !mercadoPagoPlanProId ||
      !mercadoPagoPlanPremiumId
    ) {
      throw new Error(
        "IDs dos planos do Mercado Pago não configurados."
      );
    }

    const authHeader =
      req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error(
        "Usuário não autenticado."
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const token =
      authHeader.replace("Bearer ", "");

    const {
      data: userData,
      error: userError,
    } = await supabaseAdmin.auth.getUser(
      token
    );

    if (
      userError ||
      !userData.user?.id
    ) {
      throw new Error("Sessão inválida.");
    }

    const user = userData.user;

    const body =
      await req.json();

    const planSlug =
      String(body.planSlug || "")
        .trim()
        .toLowerCase();

    if (
      planSlug !== "pro" &&
      planSlug !== "premium"
    ) {
      throw new Error("Plano inválido.");
    }

    const mercadoPagoPlanId =
      planSlug === "pro"
        ? mercadoPagoPlanProId
        : mercadoPagoPlanPremiumId;

    const {
      data: trainer,
      error: trainerError,
    } = await supabaseAdmin
      .from("trainer_profiles")
      .select("id, email, name")
      .eq("id", user.id)
      .maybeSingle();

    if (trainerError) {
      throw trainerError;
    }

    if (!trainer) {
      throw new Error(
        "Perfil do personal não encontrado."
      );
    }

    const planResponse = await fetch(
      `https://api.mercadopago.com/preapproval_plan/${mercadoPagoPlanId}`,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${mercadoPagoToken}`,
          "Content-Type":
            "application/json",
        },
      }
    );

    const planData =
      await planResponse
        .json()
        .catch(() => ({}));

    if (!planResponse.ok) {
      console.error(
        "[MERCADO PAGO PLAN ERROR]",
        planData
      );

      throw new Error(
        planData?.message ||
        "Erro ao buscar plano no Mercado Pago."
      );
    }

    const checkoutUrl =
      planData?.init_point;

    if (!checkoutUrl) {
      throw new Error(
        "Mercado Pago não retornou o link de checkout."
      );
    }

    const now =
      new Date().toISOString();

    const {
      data: attempt,
      error: attemptError,
    } = await supabaseAdmin
      .from("subscription_checkout_attempts")
      .insert({
        trainer_id: trainer.id,
        target_plan_slug: planSlug,
        provider: "mercadopago",
        provider_plan_id:
          mercadoPagoPlanId,
        checkout_url: checkoutUrl,
        status: "created",
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (attemptError) {
      throw attemptError;
    }

    return jsonResponse({
      success: true,
      url: checkoutUrl,
      provider: "mercadopago",
      plan_id: mercadoPagoPlanId,
      checkout_attempt_id: attempt.id,
    });
  } catch (error) {
    console.error(
      "[CREATE MERCADOPAGO SUBSCRIPTION]",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao abrir assinatura.",
      },
      400
    );
  }
});