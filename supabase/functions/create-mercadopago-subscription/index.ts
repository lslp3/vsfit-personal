import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
      return jsonResponse({ success: false, error: "Método não permitido." }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const mercadoPagoToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const mercadoPagoPlanProId = Deno.env.get("MERCADOPAGO_PLAN_PRO_ID");
    const mercadoPagoPlanPremiumId = Deno.env.get("MERCADOPAGO_PLAN_PREMIUM_ID");

    if (!supabaseUrl) throw new Error("SUPABASE_URL não configurada.");
    if (!serviceRoleKey) throw new Error("SERVICE_ROLE_KEY não configurada.");
    if (!mercadoPagoToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
    if (!mercadoPagoPlanProId) throw new Error("MERCADOPAGO_PLAN_PRO_ID não configurado.");
    if (!mercadoPagoPlanPremiumId) throw new Error("MERCADOPAGO_PLAN_PREMIUM_ID não configurado.");

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      throw new Error("Usuário não autenticado.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      throw new Error("Sessão inválida.");
    }

    const user = userData.user;

    const body = await req.json();
    const planSlug = String(body.planSlug || "").toLowerCase();

    if (planSlug !== "pro" && planSlug !== "premium") {
      throw new Error("Plano inválido.");
    }

    const mercadoPagoPlanId =
      planSlug === "pro" ? mercadoPagoPlanProId : mercadoPagoPlanPremiumId;

    const { data: trainer, error: trainerError } = await supabaseAdmin
      .from("trainer_profiles")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    if (trainerError) throw trainerError;

    if (!trainer) {
      throw new Error("Perfil do personal não encontrado.");
    }

    const planResponse = await fetch(
      `https://api.mercadopago.com/preapproval_plan/${mercadoPagoPlanId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${mercadoPagoToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const planData = await planResponse.json();

    if (!planResponse.ok) {
      console.error("[MERCADO PAGO PLAN ERROR]", planData);
      throw new Error(planData?.message || "Erro ao buscar plano no Mercado Pago.");
    }

    const checkoutUrl = planData?.init_point;

    if (!checkoutUrl) {
      console.error("[MERCADO PAGO PLAN NO INIT POINT]", planData);
      throw new Error("Mercado Pago não retornou o link init_point do plano.");
    }

    await supabaseAdmin.from("subscriptions").upsert(
      {
        trainer_id: trainer.id,
        plan_slug: planSlug,
        status: "pending",
        payment_provider: "mercadopago",
        mercadopago_plan_id: mercadoPagoPlanId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "trainer_id",
      }
    );

    return jsonResponse({
      success: true,
      url: checkoutUrl,
      provider: "mercadopago",
      plan_id: mercadoPagoPlanId,
    });
  } catch (error) {
    console.error("[CREATE MERCADOPAGO SUBSCRIPTION]", error);

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao abrir assinatura.",
      },
      400
    );
  }
});