import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

type SupabaseAdmin = ReturnType<
  typeof createClient
>;

type PlanSlug =
  | "free"
  | "pro"
  | "premium";

function jsonResponse(
  body: unknown,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    }
  );
}

function normalizePlan(
  value: unknown
): PlanSlug {
  const normalized =
    String(value || "")
      .trim()
      .toLowerCase();

  if (normalized === "premium") {
    return "premium";
  }

  if (normalized === "pro") {
    return "pro";
  }

  return "free";
}

function normalizeSubscriptionStatus(
  status: unknown
) {
  const normalized =
    String(status || "")
      .trim()
      .toLowerCase();

  if (
    normalized === "authorized" ||
    normalized === "active" ||
    normalized === "approved"
  ) {
    return "active";
  }

  if (normalized === "paused") {
    return "paused";
  }

  if (
    normalized === "cancelled" ||
    normalized === "canceled"
  ) {
    return "canceled";
  }

  return normalized || "pending";
}

function isApprovedPayment(
  status: unknown
) {
  return (
    String(status || "")
      .trim()
      .toLowerCase() === "approved"
  );
}

function getPlanFromPlanId(
  planId: string | null,
  proPlanId: string | null,
  premiumPlanId: string | null
): PlanSlug | null {
  if (
    planId &&
    premiumPlanId &&
    planId === premiumPlanId
  ) {
    return "premium";
  }

  if (
    planId &&
    proPlanId &&
    planId === proPlanId
  ) {
    return "pro";
  }

  return null;
}

function getPlanFromAmount(
  amount: unknown
): PlanSlug | null {
  const value =
    Number(amount || 0);

  if (value >= 99 && value <= 101) {
    return "premium";
  }

  if (value >= 49 && value <= 51) {
    return "pro";
  }

  return null;
}

function extractUuid(
  value: unknown
): string | null {
  const text =
    String(value || "");

  const match = text.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
  );

  return match?.[0] || null;
}

function constantTimeEqual(
  first: string,
  second: string
) {
  if (
    first.length !== second.length
  ) {
    return false;
  }

  let difference = 0;

  for (
    let index = 0;
    index < first.length;
    index += 1
  ) {
    difference |=
      first.charCodeAt(index) ^
      second.charCodeAt(index);
  }

  return difference === 0;
}

async function hmacSha256Hex(
  secret: string,
  value: string
) {
  const encoder =
    new TextEncoder();

  const key =
    await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(value)
    );

  return Array.from(
    new Uint8Array(signature)
  )
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
}

async function verifyWebhookSignature({
  request,
  dataId,
  secret,
}: {
  request: Request;
  dataId: string;
  secret: string;
}) {
  const xSignature =
    request.headers.get("x-signature");

  const requestId =
    request.headers.get("x-request-id");

  if (
    !xSignature ||
    !requestId ||
    !dataId
  ) {
    return false;
  }

  const parts =
    Object.fromEntries(
      xSignature
        .split(",")
        .map((part) => {
          const [
            key,
            ...rest
          ] = part
            .trim()
            .split("=");

          return [
            key,
            rest.join("="),
          ];
        })
    );

  const timestamp =
    parts.ts;

  const receivedHash =
    parts.v1;

  if (
    !timestamp ||
    !receivedHash
  ) {
    return false;
  }

  const normalizedDataId =
    dataId.toLowerCase();

  const manifest =
    `id:${normalizedDataId};request-id:${requestId};ts:${timestamp};`;

  const expectedHash =
    await hmacSha256Hex(
      secret,
      manifest
    );

  return constantTimeEqual(
    expectedHash,
    receivedHash
  );
}

async function getJson(
  url: string,
  token: string
) {
  const response = await fetch(
    url,
    {
      method: "GET",
      headers: {
        Authorization:
          `Bearer ${token}`,
        "Content-Type":
          "application/json",
      },
    }
  );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.message ||
      `Erro HTTP ${response.status} no Mercado Pago.`
    );
  }

  return data;
}

async function getOrCreateWebhookEvent({
  supabaseAdmin,
  dedupeKey,
  notificationId,
  eventType,
  action,
  resourceId,
  requestId,
  payload,
}: {
  supabaseAdmin: SupabaseAdmin;
  dedupeKey: string;
  notificationId: string | null;
  eventType: string;
  action: string;
  resourceId: string;
  requestId: string | null;
  payload: Record<string, unknown>;
}) {
  const {
    data: existing,
  } = await supabaseAdmin
    .from("platform_webhook_events")
    .select("id")
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();

  if (existing?.id) {
    return existing.id as string;
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("platform_webhook_events")
    .insert({
      provider: "mercadopago",
      dedupe_key: dedupeKey,
      notification_id:
        notificationId,
      event_type: eventType,
      action,
      resource_id: resourceId,
      request_id: requestId,
      signature_valid: true,
      processing_status:
        "received",
      payload,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const {
        data: duplicated,
        error: duplicatedError,
      } = await supabaseAdmin
        .from("platform_webhook_events")
        .select("id")
        .eq("dedupe_key", dedupeKey)
        .single();

      if (duplicatedError) {
        throw duplicatedError;
      }

      return duplicated.id as string;
    }

    throw error;
  }

  return data.id as string;
}

async function markWebhookEvent({
  supabaseAdmin,
  eventId,
  status,
  errorMessage = null,
}: {
  supabaseAdmin: SupabaseAdmin;
  eventId: string;
  status:
    | "processed"
    | "ignored"
    | "failed";
  errorMessage?: string | null;
}) {
  const {
    error,
  } = await supabaseAdmin
    .from("platform_webhook_events")
    .update({
      processing_status: status,
      error_message: errorMessage,
      processed_at:
        new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) {
    console.error(
      "[WEBHOOK EVENT UPDATE]",
      error
    );
  }
}

async function findTrainer({
  supabaseAdmin,
  externalReference,
  payerEmail,
  preapprovalId,
}: {
  supabaseAdmin: SupabaseAdmin;
  externalReference: string | null;
  payerEmail: string;
  preapprovalId: string | null;
}) {
  const externalTrainerId =
    extractUuid(
      externalReference
    );

  if (externalTrainerId) {
    const {
      data,
    } = await supabaseAdmin
      .from("trainer_profiles")
      .select("id, email, name")
      .eq("id", externalTrainerId)
      .maybeSingle();

    if (data) {
      return data;
    }
  }

  if (preapprovalId) {
    const {
      data: subscription,
    } = await supabaseAdmin
      .from("subscriptions")
      .select("trainer_id")
      .eq(
        "mercadopago_preapproval_id",
        preapprovalId
      )
      .maybeSingle();

    if (subscription?.trainer_id) {
      const {
        data,
      } = await supabaseAdmin
        .from("trainer_profiles")
        .select("id, email, name")
        .eq(
          "id",
          subscription.trainer_id
        )
        .maybeSingle();

      if (data) {
        return data;
      }
    }
  }

  if (payerEmail) {
    const {
      data,
    } = await supabaseAdmin
      .from("trainer_profiles")
      .select("id, email, name")
      .ilike("email", payerEmail)
      .maybeSingle();

    if (data) {
      return data;
    }
  }

  return null;
}

async function getPlanLimit({
  supabaseAdmin,
  planSlug,
}: {
  supabaseAdmin: SupabaseAdmin;
  planSlug: PlanSlug;
}) {
  const {
    data,
  } = await supabaseAdmin
    .from("subscription_plans")
    .select("student_limit")
    .eq("slug", planSlug)
    .maybeSingle();

  if (data?.student_limit) {
    return Number(
      data.student_limit
    );
  }

  if (planSlug === "premium") {
    return 999999;
  }

  if (planSlug === "pro") {
    return 3;
  }

  return 1;
}

async function getSubscription({
  supabaseAdmin,
  trainerId,
}: {
  supabaseAdmin: SupabaseAdmin;
  trainerId: string;
}) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("trainer_id", trainerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function processPreapproval({
  supabaseAdmin,
  resourceId,
  mercadoPagoToken,
  proPlanId,
  premiumPlanId,
}: {
  supabaseAdmin: SupabaseAdmin;
  resourceId: string;
  mercadoPagoToken: string;
  proPlanId: string | null;
  premiumPlanId: string | null;
}) {
  const preapproval =
    await getJson(
      `https://api.mercadopago.com/preapproval/${resourceId}`,
      mercadoPagoToken
    );

  const payerEmail =
    String(
      preapproval?.payer_email ||
      ""
    )
      .trim()
      .toLowerCase();

  const externalReference =
    preapproval?.external_reference
      ? String(
          preapproval.external_reference
        )
      : null;

  const preapprovalId =
    String(
      preapproval?.id ||
      resourceId
    );

  const providerPlanId =
    preapproval?.preapproval_plan_id
      ? String(
          preapproval.preapproval_plan_id
        )
      : null;

  const trainer =
    await findTrainer({
      supabaseAdmin,
      externalReference,
      payerEmail,
      preapprovalId,
    });

  if (!trainer?.id) {
    throw new Error(
      `Personal não encontrado para a assinatura ${preapprovalId}.`
    );
  }

  const existingSubscription =
    await getSubscription({
      supabaseAdmin,
      trainerId: trainer.id,
    });

  const planSlug =
    getPlanFromPlanId(
      providerPlanId,
      proPlanId,
      premiumPlanId
    ) ||
    normalizePlan(
      existingSubscription?.plan_slug ||
      existingSubscription?.plan
    );

  const studentLimit =
    await getPlanLimit({
      supabaseAdmin,
      planSlug,
    });

  const providerStatus =
    String(
      preapproval?.status ||
      "pending"
    ).toLowerCase();

  const status =
    normalizeSubscriptionStatus(
      providerStatus
    );

  const periodStart =
    preapproval?.auto_recurring
      ?.start_date || null;

  const periodEnd =
    preapproval?.next_payment_date ||
    null;

  const now =
    new Date().toISOString();

  const {
    error,
  } = await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        trainer_id: trainer.id,
        plan: planSlug,
        plan_slug: planSlug,
        status,
        provider_status:
          providerStatus,
        student_limit:
          studentLimit,
        payment_provider:
          "mercadopago",
        mercadopago_preapproval_id:
          preapprovalId,
        mercadopago_plan_id:
          providerPlanId,
        current_period_start:
          periodStart,
        current_period_end:
          periodEnd,
        last_webhook_at: now,
        updated_at: now,
      },
      {
        onConflict: "trainer_id",
      }
    );

  if (error) {
    throw error;
  }

  if (status === "active") {
    await supabaseAdmin
      .from(
        "subscription_checkout_attempts"
      )
      .update({
        status: "completed",
        completed_at: now,
        updated_at: now,
      })
      .eq(
        "trainer_id",
        trainer.id
      )
      .eq(
        "target_plan_slug",
        planSlug
      )
      .in(
        "status",
        [
          "created",
          "pending",
        ]
      );
  }

  return {
    trainer_id: trainer.id,
    plan_slug: planSlug,
    status,
    preapproval_id: preapprovalId,
  };
}

async function processPayment({
  supabaseAdmin,
  payment,
  mercadoPagoToken,
  proPlanId,
  premiumPlanId,
}: {
  supabaseAdmin: SupabaseAdmin;
  payment: any;
  mercadoPagoToken: string;
  proPlanId: string | null;
  premiumPlanId: string | null;
}) {
  const providerPaymentId =
    String(payment?.id || "");

  if (!providerPaymentId) {
    throw new Error(
      "Pagamento sem ID."
    );
  }

  const status =
    String(
      payment?.status ||
      "pending"
    )
      .trim()
      .toLowerCase();

  const amount =
    Number(
      payment?.transaction_amount ||
      payment?.transaction_details
        ?.total_paid_amount ||
      0
    );

  const currency =
    String(
      payment?.currency_id ||
      "BRL"
    );

  let preapprovalId =
    payment?.metadata
      ?.preapproval_id ||
    payment?.metadata
      ?.mercadopago_preapproval_id ||
    payment?.point_of_interaction
      ?.transaction_data
      ?.subscription_id ||
    payment?.preapproval_id ||
    null;

  if (preapprovalId) {
    preapprovalId =
      String(preapprovalId);
  }

  let preapproval: any = null;

  if (preapprovalId) {
    try {
      preapproval =
        await getJson(
          `https://api.mercadopago.com/preapproval/${preapprovalId}`,
          mercadoPagoToken
        );
    } catch (error) {
      console.warn(
        "[PREAPPROVAL PAYMENT LOOKUP]",
        error
      );
    }
  }

  const providerPlanId =
    payment?.metadata
      ?.preapproval_plan_id ||
    payment?.metadata
      ?.mercadopago_plan_id ||
    preapproval
      ?.preapproval_plan_id ||
    null;

  const externalReference =
    payment?.external_reference ||
    preapproval
      ?.external_reference ||
    null;

  const payerEmail =
    String(
      payment?.payer?.email ||
      payment?.payer_email ||
      preapproval?.payer_email ||
      ""
    )
      .trim()
      .toLowerCase();

  const trainer =
    await findTrainer({
      supabaseAdmin,
      externalReference:
        externalReference
          ? String(
              externalReference
            )
          : null,
      payerEmail,
      preapprovalId,
    });

  if (!trainer?.id) {
    throw new Error(
      `Personal não encontrado para o pagamento ${providerPaymentId}.`
    );
  }

  let subscription =
    await getSubscription({
      supabaseAdmin,
      trainerId: trainer.id,
    });

  const planSlug =
    normalizePlan(
      payment?.metadata?.plan_slug ||
      getPlanFromPlanId(
        providerPlanId
          ? String(providerPlanId)
          : null,
        proPlanId,
        premiumPlanId
      ) ||
      getPlanFromAmount(amount) ||
      subscription?.plan_slug ||
      subscription?.plan
    );

  const studentLimit =
    await getPlanLimit({
      supabaseAdmin,
      planSlug,
    });

  const approved =
    isApprovedPayment(status);

  const approvedAt =
    payment?.date_approved ||
    null;

  const now =
    new Date().toISOString();

  if (approved) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          trainer_id: trainer.id,
          plan: planSlug,
          plan_slug: planSlug,
          status: "active",
          provider_status: status,
          student_limit:
            studentLimit,
          payment_provider:
            "mercadopago",
          mercadopago_preapproval_id:
            preapprovalId,
          mercadopago_plan_id:
            providerPlanId,
          current_period_start:
            approvedAt,
          current_period_end:
            preapproval
              ?.next_payment_date ||
            null,
          last_payment_id:
            providerPaymentId,
          last_payment_status:
            status,
          last_payment_amount:
            amount,
          last_payment_at:
            approvedAt ||
            now,
          last_webhook_at:
            now,
          updated_at: now,
        },
        {
          onConflict: "trainer_id",
        }
      )
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    subscription = data;

    await supabaseAdmin
      .from(
        "subscription_checkout_attempts"
      )
      .update({
        status: "completed",
        completed_at: now,
        updated_at: now,
      })
      .eq(
        "trainer_id",
        trainer.id
      )
      .eq(
        "target_plan_slug",
        planSlug
      )
      .in(
        "status",
        [
          "created",
          "pending",
        ]
      );
  } else if (subscription?.id) {
    const {
      error,
    } = await supabaseAdmin
      .from("subscriptions")
      .update({
        provider_status:
          status,
        last_payment_id:
          providerPaymentId,
        last_payment_status:
          status,
        last_payment_amount:
          amount,
        last_payment_at:
          payment?.date_last_updated ||
          payment?.date_created ||
          now,
        last_webhook_at:
          now,
        updated_at: now,
      })
      .eq(
        "id",
        subscription.id
      );

    if (error) {
      throw error;
    }
  }

  const {
    error: paymentError,
  } = await supabaseAdmin
    .from(
      "platform_subscription_payments"
    )
    .upsert(
      {
        provider: "mercadopago",
        provider_payment_id:
          providerPaymentId,
        trainer_id: trainer.id,
        subscription_id:
          subscription?.id ||
          null,
        provider_subscription_id:
          preapprovalId,
        plan_slug: planSlug,
        status,
        status_detail:
          payment?.status_detail ||
          null,
        amount,
        currency,
        payer_email:
          payerEmail || null,
        external_reference:
          externalReference
            ? String(
                externalReference
              )
            : null,
        payment_method_id:
          payment?.payment_method_id ||
          null,
        payment_type_id:
          payment?.payment_type_id ||
          null,
        date_created:
          payment?.date_created ||
          null,
        date_approved:
          approvedAt,
        date_updated:
          payment?.date_last_updated ||
          null,
        live_mode:
          typeof payment
            ?.live_mode ===
          "boolean"
            ? payment.live_mode
            : null,
        raw_payload: payment,
        updated_at: now,
      },
      {
        onConflict:
          "provider,provider_payment_id",
      }
    );

  if (paymentError) {
    throw paymentError;
  }

  return {
    trainer_id: trainer.id,
    payment_id:
      providerPaymentId,
    plan_slug: planSlug,
    payment_status: status,
    amount,
    approved,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Método não permitido.",
      },
      405
    );
  }

  let eventId:
    | string
    | null = null;

  try {
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      ) ||
      Deno.env.get(
        "SERVICE_ROLE_KEY"
      );

    const mercadoPagoToken =
      Deno.env.get(
        "MERCADOPAGO_ACCESS_TOKEN"
      );

    const webhookSecret =
      Deno.env.get(
        "MERCADOPAGO_WEBHOOK_SECRET"
      );

    const proPlanId =
      Deno.env.get(
        "MERCADOPAGO_PLAN_PRO_ID"
      ) || null;

    const premiumPlanId =
      Deno.env.get(
        "MERCADOPAGO_PLAN_PREMIUM_ID"
      ) || null;

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !mercadoPagoToken ||
      !webhookSecret
    ) {
      throw new Error(
        "Segredos obrigatórios do webhook não configurados."
      );
    }

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    const url =
      new URL(req.url);

    const body =
      await req
        .json()
        .catch(() => ({}));

    const eventType =
      String(
        body?.type ||
        body?.topic ||
        url.searchParams.get(
          "type"
        ) ||
        url.searchParams.get(
          "topic"
        ) ||
        ""
      )
        .trim()
        .toLowerCase();

    const action =
      String(
        body?.action ||
        ""
      )
        .trim()
        .toLowerCase();

    const resourceId =
      String(
        body?.data?.id ||
        url.searchParams.get(
          "data.id"
        ) ||
        url.searchParams.get(
          "id"
        ) ||
        ""
      );

    if (!resourceId) {
      return jsonResponse({
        success: true,
        ignored: true,
        reason:
          "Evento sem identificador de recurso.",
      });
    }

    const signatureValid =
      await verifyWebhookSignature({
        request: req,
        dataId: resourceId,
        secret: webhookSecret,
      });

    if (!signatureValid) {
      return jsonResponse(
        {
          success: false,
          error:
            "Assinatura do webhook inválida.",
        },
        401
      );
    }

    const requestId =
      req.headers.get(
        "x-request-id"
      );

    const notificationId =
      body?.id
        ? String(body.id)
        : null;

    const dedupeKey = [
      eventType,
      action,
      notificationId,
      resourceId,
      requestId,
    ]
      .filter(Boolean)
      .join(":");

    eventId =
      await getOrCreateWebhookEvent({
        supabaseAdmin,
        dedupeKey,
        notificationId,
        eventType,
        action,
        resourceId,
        requestId,
        payload: body,
      });

    if (resourceId === "123456") {
      await markWebhookEvent({
        supabaseAdmin,
        eventId,
        status: "ignored",
        errorMessage:
          "Evento de simulação.",
      });

      return jsonResponse({
        success: true,
        ignored: true,
        reason:
          "Evento de simulação recebido.",
      });
    }

    const isAuthorizedPayment =
      eventType.includes(
        "authorized_payment"
      );

    const isPreapproval =
      eventType.includes(
        "preapproval"
      ) &&
      !eventType.includes(
        "preapproval_plan"
      );

    const isPayment =
      eventType === "payment" ||
      action.startsWith(
        "payment."
      );

    let result:
      Record<string, unknown>;

    if (isAuthorizedPayment) {
      const authorizedPayment =
        await getJson(
          `https://api.mercadopago.com/authorized_payments/${resourceId}`,
          mercadoPagoToken
        );

      const paymentId =
        authorizedPayment
          ?.payment_id ||
        authorizedPayment
          ?.payment?.id ||
        null;

      if (!paymentId) {
        await markWebhookEvent({
          supabaseAdmin,
          eventId,
          status: "ignored",
          errorMessage:
            "Pagamento autorizado sem payment_id.",
        });

        return jsonResponse({
          success: true,
          ignored: true,
          reason:
            "Evento autorizado aguardando evento payment.",
        });
      }

      const payment =
        await getJson(
          `https://api.mercadopago.com/v1/payments/${paymentId}`,
          mercadoPagoToken
        );

      result =
        await processPayment({
          supabaseAdmin,
          payment,
          mercadoPagoToken,
          proPlanId,
          premiumPlanId,
        });
    } else if (isPreapproval) {
      result =
        await processPreapproval({
          supabaseAdmin,
          resourceId,
          mercadoPagoToken,
          proPlanId,
          premiumPlanId,
        });
    } else if (isPayment) {
      const payment =
        await getJson(
          `https://api.mercadopago.com/v1/payments/${resourceId}`,
          mercadoPagoToken
        );

      result =
        await processPayment({
          supabaseAdmin,
          payment,
          mercadoPagoToken,
          proPlanId,
          premiumPlanId,
        });
    } else {
      await markWebhookEvent({
        supabaseAdmin,
        eventId,
        status: "ignored",
        errorMessage:
          `Tipo ignorado: ${eventType || action}`,
      });

      return jsonResponse({
        success: true,
        ignored: true,
        reason:
          `Tipo ignorado: ${eventType || action}`,
      });
    }

    await markWebhookEvent({
      supabaseAdmin,
      eventId,
      status: "processed",
    });

    return jsonResponse({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "[MERCADOPAGO WEBHOOK]",
      error
    );

    if (eventId) {
      try {
        const supabaseUrl =
          Deno.env.get(
            "SUPABASE_URL"
          );

        const serviceRoleKey =
          Deno.env.get(
            "SUPABASE_SERVICE_ROLE_KEY"
          ) ||
          Deno.env.get(
            "SERVICE_ROLE_KEY"
          );

        if (
          supabaseUrl &&
          serviceRoleKey
        ) {
          const supabaseAdmin =
            createClient(
              supabaseUrl,
              serviceRoleKey
            );

          await markWebhookEvent({
            supabaseAdmin,
            eventId,
            status: "failed",
            errorMessage:
              error instanceof Error
                ? error.message
                : "Erro desconhecido.",
          });
        }
      } catch {
        // Não interrompe a resposta.
      }
    }

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro no webhook.",
      },
      500
    );
  }
});