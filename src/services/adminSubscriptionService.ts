import { supabase } from '../lib/supabase';
import {
  getAllSubscriptionPlans,
  type SubscriptionPlanWithLimits,
} from './subscriptionService';

export type AdminPlanSlug =
  | 'free'
  | 'pro'
  | 'premium';

export type BillingEvidence =
  | 'free'
  | 'confirmed_payment'
  | 'period'
  | 'provider_reference'
  | 'legacy';

export interface AdminPlatformPayment {
  id: string;

  provider: string;
  provider_payment_id: string;

  trainer_id: string | null;
  trainer_name: string;
  trainer_email: string;

  subscription_id: string | null;
  provider_subscription_id: string | null;

  plan_slug: AdminPlanSlug;

  status: string;
  status_detail: string | null;

  amount: number;
  currency: string;

  payer_email: string | null;
  external_reference: string | null;

  payment_method_id: string | null;
  payment_type_id: string | null;

  date_created: string | null;
  date_approved: string | null;
  date_updated: string | null;

  live_mode: boolean | null;

  created_at: string | null;
  updated_at: string | null;
}

export interface AdminSubscriptionRecord {
  id: string;
  trainer_id: string;

  trainer_name: string;
  trainer_email: string;

  plan: AdminPlanSlug;
  status: string;

  student_limit: number;

  payment_provider: string | null;
  provider_status: string | null;

  current_period_start: string | null;
  current_period_end: string | null;

  cancel_at_period_end: boolean;

  stripe_subscription_id: string | null;
  mercadopago_preapproval_id: string | null;
  mercadopago_plan_id: string | null;

  last_payment_id: string | null;
  last_payment_status: string | null;
  last_payment_amount: number | null;
  last_payment_at: string | null;
  last_webhook_at: string | null;

  billing_evidence: BillingEvidence;

  confirmed_payment_count: number;
  confirmed_revenue: number;
  last_confirmed_payment_at: string | null;

  created_at: string | null;
  updated_at: string | null;
}

export interface AdminSubscriptionSummary {
  total: number;
  active: number;

  free: number;
  paid: number;

  withBillingPeriod: number;
  withConfirmedPayment: number;
  legacyPaid: number;
}

export interface AdminFinancialSummary {
  totalPayments: number;

  approvedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  refundedPayments: number;

  totalConfirmedRevenue: number;
  currentMonthConfirmedRevenue: number;

  latestApprovedAt: string | null;
}

export interface AdminWebhookSummary {
  total: number;

  processed: number;
  ignored: number;
  failed: number;

  latestReceivedAt: string | null;
  latestStatus: string | null;
  latestError: string | null;
}

export interface AdminSubscriptionsData {
  subscriptions: AdminSubscriptionRecord[];

  plans: SubscriptionPlanWithLimits[];

  payments: AdminPlatformPayment[];

  summary: AdminSubscriptionSummary;

  financialSummary: AdminFinancialSummary;

  webhookSummary: AdminWebhookSummary;
}

interface TrainerLookup {
  name: string;
  email: string;
}

interface WebhookRow {
  processing_status: string | null;
  error_message: string | null;
  received_at: string | null;
}

function normalizePlan(
  value: unknown
): AdminPlanSlug {
  const normalized = String(
    value || 'free'
  )
    .trim()
    .toLowerCase();

  if (normalized === 'premium') {
    return 'premium';
  }

  if (normalized === 'pro') {
    return 'pro';
  }

  return 'free';
}

export function isActiveSubscriptionStatus(
  status: string | null | undefined
) {
  const normalized = String(
    status || ''
  )
    .trim()
    .toLowerCase();

  return [
    'active',
    'trialing',
    'authorized',
  ].includes(normalized);
}

export function isApprovedPlatformPayment(
  status: string | null | undefined
) {
  return (
    String(status || '')
      .trim()
      .toLowerCase() === 'approved'
  );
}

export function isPendingPlatformPayment(
  status: string | null | undefined
) {
  return [
    'pending',
    'in_process',
    'in_mediation',
    'authorized',
  ].includes(
    String(status || '')
      .trim()
      .toLowerCase()
  );
}

export function isFailedPlatformPayment(
  status: string | null | undefined
) {
  return [
    'rejected',
    'cancelled',
    'canceled',
    'failed',
    'charged_back',
  ].includes(
    String(status || '')
      .trim()
      .toLowerCase()
  );
}

export function isRefundedPlatformPayment(
  status: string | null | undefined
) {
  return [
    'refunded',
    'partially_refunded',
  ].includes(
    String(status || '')
      .trim()
      .toLowerCase()
  );
}

function isCurrentMonth(
  date: string | null
) {
  if (!date) {
    return false;
  }

  const value = new Date(date);
  const now = new Date();

  return (
    value.getFullYear() ===
      now.getFullYear() &&
    value.getMonth() ===
      now.getMonth()
  );
}

function getBillingEvidence({
  plan,
  confirmedPaymentCount,
  currentPeriodStart,
  currentPeriodEnd,
  stripeSubscriptionId,
  mercadoPagoPreapprovalId,
  mercadoPagoPlanId,
}: {
  plan: AdminPlanSlug;

  confirmedPaymentCount: number;

  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;

  stripeSubscriptionId: string | null;

  mercadoPagoPreapprovalId: string | null;
  mercadoPagoPlanId: string | null;
}): BillingEvidence {
  if (plan === 'free') {
    return 'free';
  }

  if (confirmedPaymentCount > 0) {
    return 'confirmed_payment';
  }

  if (
    currentPeriodStart &&
    currentPeriodEnd
  ) {
    return 'period';
  }

  if (
    stripeSubscriptionId ||
    mercadoPagoPreapprovalId ||
    mercadoPagoPlanId
  ) {
    return 'provider_reference';
  }

  return 'legacy';
}

export async function getAdminSubscriptionsData():
Promise<AdminSubscriptionsData> {
  const [
    subscriptionsResult,
    trainersResult,
    paymentsResult,
    webhooksResult,
    plans,
  ] = await Promise.all([
    supabase
      .from('subscriptions')
      .select(`
        id,
        trainer_id,
        plan,
        plan_slug,
        status,
        student_limit,
        payment_provider,
        provider_status,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        stripe_subscription_id,
        mercadopago_preapproval_id,
        mercadopago_plan_id,
        last_payment_id,
        last_payment_status,
        last_payment_amount,
        last_payment_at,
        last_webhook_at,
        created_at,
        updated_at
      `)
      .order('updated_at', {
        ascending: false,
      }),

    supabase
      .from('trainer_profiles')
      .select(`
        id,
        name,
        email
      `),

    supabase
      .from(
        'platform_subscription_payments'
      )
      .select(`
        id,
        provider,
        provider_payment_id,
        trainer_id,
        subscription_id,
        provider_subscription_id,
        plan_slug,
        status,
        status_detail,
        amount,
        currency,
        payer_email,
        external_reference,
        payment_method_id,
        payment_type_id,
        date_created,
        date_approved,
        date_updated,
        live_mode,
        created_at,
        updated_at
      `)
      .order('created_at', {
        ascending: false,
      })
      .limit(200),

    supabase
      .from('platform_webhook_events')
      .select(`
        processing_status,
        error_message,
        received_at
      `)
      .order('received_at', {
        ascending: false,
      })
      .limit(100),

    getAllSubscriptionPlans(),
  ]);

  if (subscriptionsResult.error) {
    console.error(
      '[AdminSubscriptionService] subscriptions:',
      subscriptionsResult.error
    );

    throw subscriptionsResult.error;
  }

  if (trainersResult.error) {
    console.error(
      '[AdminSubscriptionService] trainers:',
      trainersResult.error
    );

    throw trainersResult.error;
  }

  if (paymentsResult.error) {
    console.error(
      '[AdminSubscriptionService] payments:',
      paymentsResult.error
    );

    throw paymentsResult.error;
  }

  if (webhooksResult.error) {
    console.error(
      '[AdminSubscriptionService] webhooks:',
      webhooksResult.error
    );

    throw webhooksResult.error;
  }

  const trainerById =
    new Map<string, TrainerLookup>();

  for (
    const trainer of
      trainersResult.data || []
  ) {
    trainerById.set(
      trainer.id,
      {
        name:
          trainer.name ||
          'Personal',

        email:
          trainer.email ||
          '',
      }
    );
  }

  const payments:
    AdminPlatformPayment[] =
    (
      paymentsResult.data || []
    ).map((payment: any) => {
      const trainer =
        payment.trainer_id
          ? trainerById.get(
              payment.trainer_id
            )
          : null;

      return {
        id: payment.id,

        provider:
          payment.provider ||
          'mercadopago',

        provider_payment_id:
          payment.provider_payment_id,

        trainer_id:
          payment.trainer_id ||
          null,

        trainer_name:
          trainer?.name ||
          'Personal não localizado',

        trainer_email:
          trainer?.email ||
          payment.payer_email ||
          '',

        subscription_id:
          payment.subscription_id ||
          null,

        provider_subscription_id:
          payment.provider_subscription_id ||
          null,

        plan_slug:
          normalizePlan(
            payment.plan_slug
          ),

        status:
          String(
            payment.status ||
            'pending'
          )
            .trim()
            .toLowerCase(),

        status_detail:
          payment.status_detail ||
          null,

        amount:
          Number(
            payment.amount ||
            0
          ),

        currency:
          payment.currency ||
          'BRL',

        payer_email:
          payment.payer_email ||
          null,

        external_reference:
          payment.external_reference ||
          null,

        payment_method_id:
          payment.payment_method_id ||
          null,

        payment_type_id:
          payment.payment_type_id ||
          null,

        date_created:
          payment.date_created ||
          null,

        date_approved:
          payment.date_approved ||
          null,

        date_updated:
          payment.date_updated ||
          null,

        live_mode:
          typeof payment.live_mode ===
          'boolean'
            ? payment.live_mode
            : null,

        created_at:
          payment.created_at ||
          null,

        updated_at:
          payment.updated_at ||
          null,
      };
    });

  const approvedPaymentsByTrainer =
    new Map<
      string,
      AdminPlatformPayment[]
    >();

  for (const payment of payments) {
    if (
      !payment.trainer_id ||
      !isApprovedPlatformPayment(
        payment.status
      )
    ) {
      continue;
    }

    const current =
      approvedPaymentsByTrainer.get(
        payment.trainer_id
      ) || [];

    current.push(payment);

    approvedPaymentsByTrainer.set(
      payment.trainer_id,
      current
    );
  }

  const subscriptions:
    AdminSubscriptionRecord[] =
    (
      subscriptionsResult.data || []
    ).map((subscription: any) => {
      const trainer =
        trainerById.get(
          subscription.trainer_id
        );

      const plan =
        normalizePlan(
          subscription.plan_slug ||
          subscription.plan
        );

      const approvedPayments =
        approvedPaymentsByTrainer.get(
          subscription.trainer_id
        ) || [];

      const confirmedRevenue =
        approvedPayments.reduce(
          (total, payment) =>
            total + payment.amount,
          0
        );

      const lastConfirmedPayment =
        approvedPayments
          .slice()
          .sort((first, second) => {
            const firstDate =
              first.date_approved ||
              first.created_at ||
              '';

            const secondDate =
              second.date_approved ||
              second.created_at ||
              '';

            return (
              new Date(
                secondDate
              ).getTime() -
              new Date(
                firstDate
              ).getTime()
            );
          })[0];

      const currentPeriodStart =
        subscription.current_period_start ||
        null;

      const currentPeriodEnd =
        subscription.current_period_end ||
        null;

      const stripeSubscriptionId =
        subscription.stripe_subscription_id ||
        null;

      const mercadoPagoPreapprovalId =
        subscription
          .mercadopago_preapproval_id ||
        null;

      const mercadoPagoPlanId =
        subscription.mercadopago_plan_id ||
        null;

      return {
        id: subscription.id,

        trainer_id:
          subscription.trainer_id,

        trainer_name:
          trainer?.name ||
          'Personal não encontrado',

        trainer_email:
          trainer?.email ||
          '',

        plan,

        status:
          String(
            subscription.status ||
            'inactive'
          )
            .trim()
            .toLowerCase(),

        student_limit:
          Number(
            subscription.student_limit ??
            1
          ),

        payment_provider:
          subscription.payment_provider ||
          null,

        provider_status:
          subscription.provider_status ||
          null,

        current_period_start:
          currentPeriodStart,

        current_period_end:
          currentPeriodEnd,

        cancel_at_period_end:
          Boolean(
            subscription.cancel_at_period_end
          ),

        stripe_subscription_id:
          stripeSubscriptionId,

        mercadopago_preapproval_id:
          mercadoPagoPreapprovalId,

        mercadopago_plan_id:
          mercadoPagoPlanId,

        last_payment_id:
          subscription.last_payment_id ||
          null,

        last_payment_status:
          subscription.last_payment_status ||
          null,

        last_payment_amount:
          subscription.last_payment_amount !==
          null
            ? Number(
                subscription
                  .last_payment_amount
              )
            : null,

        last_payment_at:
          subscription.last_payment_at ||
          null,

        last_webhook_at:
          subscription.last_webhook_at ||
          null,

        billing_evidence:
          getBillingEvidence({
            plan,

            confirmedPaymentCount:
              approvedPayments.length,

            currentPeriodStart,
            currentPeriodEnd,

            stripeSubscriptionId,

            mercadoPagoPreapprovalId,
            mercadoPagoPlanId,
          }),

        confirmed_payment_count:
          approvedPayments.length,

        confirmed_revenue:
          confirmedRevenue,

        last_confirmed_payment_at:
          lastConfirmedPayment
            ?.date_approved ||
          lastConfirmedPayment
            ?.created_at ||
          null,

        created_at:
          subscription.created_at ||
          null,

        updated_at:
          subscription.updated_at ||
          null,
      };
    });

  subscriptions.sort(
    (first, second) =>
      first.trainer_name.localeCompare(
        second.trainer_name,
        'pt-BR'
      )
  );

  const activeSubscriptions =
    subscriptions.filter(
      (subscription) =>
        isActiveSubscriptionStatus(
          subscription.status
        )
    );

  const paidSubscriptions =
    activeSubscriptions.filter(
      (subscription) =>
        subscription.plan !== 'free'
    );

  const summary:
    AdminSubscriptionSummary = {
    total:
      subscriptions.length,

    active:
      activeSubscriptions.length,

    free:
      activeSubscriptions.filter(
        (subscription) =>
          subscription.plan === 'free'
      ).length,

    paid:
      paidSubscriptions.length,

    withBillingPeriod:
      paidSubscriptions.filter(
        (subscription) =>
          Boolean(
            subscription
              .current_period_start &&
            subscription
              .current_period_end
          )
      ).length,

    withConfirmedPayment:
      paidSubscriptions.filter(
        (subscription) =>
          subscription
            .confirmed_payment_count >
          0
      ).length,

    legacyPaid:
      paidSubscriptions.filter(
        (subscription) =>
          subscription
            .billing_evidence ===
          'legacy'
      ).length,
  };

  const approvedPayments =
    payments.filter((payment) =>
      isApprovedPlatformPayment(
        payment.status
      )
    );

  const financialSummary:
    AdminFinancialSummary = {
    totalPayments:
      payments.length,

    approvedPayments:
      approvedPayments.length,

    pendingPayments:
      payments.filter((payment) =>
        isPendingPlatformPayment(
          payment.status
        )
      ).length,

    failedPayments:
      payments.filter((payment) =>
        isFailedPlatformPayment(
          payment.status
        )
      ).length,

    refundedPayments:
      payments.filter((payment) =>
        isRefundedPlatformPayment(
          payment.status
        )
      ).length,

    totalConfirmedRevenue:
      approvedPayments.reduce(
        (total, payment) =>
          total + payment.amount,
        0
      ),

    currentMonthConfirmedRevenue:
      approvedPayments
        .filter((payment) =>
          isCurrentMonth(
            payment.date_approved ||
            payment.created_at
          )
        )
        .reduce(
          (total, payment) =>
            total + payment.amount,
          0
        ),

    latestApprovedAt:
      approvedPayments[0]
        ?.date_approved ||
      approvedPayments[0]
        ?.created_at ||
      null,
  };

  const webhooks =
    (
      webhooksResult.data ||
      []
    ) as WebhookRow[];

  const latestWebhook =
    webhooks[0] || null;

  const webhookSummary:
    AdminWebhookSummary = {
    total:
      webhooks.length,

    processed:
      webhooks.filter(
        (event) =>
          event.processing_status ===
          'processed'
      ).length,

    ignored:
      webhooks.filter(
        (event) =>
          event.processing_status ===
          'ignored'
      ).length,

    failed:
      webhooks.filter(
        (event) =>
          event.processing_status ===
          'failed'
      ).length,

    latestReceivedAt:
      latestWebhook?.received_at ||
      null,

    latestStatus:
      latestWebhook
        ?.processing_status ||
      null,

    latestError:
      latestWebhook
        ?.error_message ||
      null,
  };

  return {
    subscriptions,
    plans,
    payments,
    summary,
    financialSummary,
    webhookSummary,
  };
}