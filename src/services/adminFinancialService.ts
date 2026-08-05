import { supabase } from '../lib/supabase';

import {
  fetchAllRows,
  getPaymentDate,
  getPaymentEnvironment,
  getTimestamp,
  isApprovedStatus,
  isFailedStatus,
  isPendingStatus,
  isRefundedStatus,
  isSameMonth,
  normalizePlan,
  normalizeStatus,
  MONTH_LABELS,
} from '../lib/adminFinance';

import type {
  AdminPlanSlug,
} from './adminSubscriptionService';

export type AdminFinancialEnvironment =
  | 'production'
  | 'test'
  | 'unknown';

export interface AdminFinancialPayment {
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
  environment: AdminFinancialEnvironment;

  created_at: string | null;
  updated_at: string | null;
}

export interface AdminMonthlyRevenuePoint {
  key: string;
  label: string;
  revenue: number;
  payments: number;
}

export interface AdminFinancialSummary {
  totalConfirmedRevenue: number;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  monthlyVariationPercent: number | null;

  averageTicket: number;

  totalTransactions: number;
  productionTransactions: number;
  approvedProductionPayments: number;
  pendingProductionPayments: number;
  failedProductionPayments: number;
  refundedProductionPayments: number;

  testTransactions: number;
  unknownEnvironmentTransactions: number;

  latestApprovedAt: string | null;
}

export interface AdminFinancialIntegrationSummary {
  activePaidSubscriptions: number;

  checkoutAttempts: number;
  checkoutCompleted: number;
  checkoutOpen: number;
  checkoutFailed: number;

  webhookProcessed: number;
  webhookIgnored: number;
  webhookFailed: number;

  latestWebhookAt: string | null;
  latestWebhookStatus: string | null;
  latestWebhookError: string | null;
}

export interface AdminFinancialData {
  payments: AdminFinancialPayment[];

  summary: AdminFinancialSummary;

  monthlyRevenue:
    AdminMonthlyRevenuePoint[];

  integration:
    AdminFinancialIntegrationSummary;
}

const PAYMENT_COLUMNS = `
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
`;

function buildMonthlyRevenue(
  payments: AdminFinancialPayment[],
  numberOfMonths = 6
): AdminMonthlyRevenuePoint[] {
  const now = new Date();

  const months =
    Array.from(
      {
        length: numberOfMonths,
      },
      (_, index) => {
        const date =
          new Date(
            now.getFullYear(),
            now.getMonth() -
              (numberOfMonths - 1 - index),
            1
          );

        return {
          date,
          key:
            `${date.getFullYear()}-${String(
              date.getMonth() + 1
            ).padStart(2, '0')}`,

          label:
            `${MONTH_LABELS[
              date.getMonth()
            ]}/${String(
              date.getFullYear()
            ).slice(-2)}`,

          revenue: 0,
          payments: 0,
        };
      }
    );

  for (const payment of payments) {
    if (
      payment.environment !==
        'production' ||
      !isApprovedStatus(payment.status)
    ) {
      continue;
    }

    const paymentDate =
      getPaymentDate(payment);

    if (!paymentDate) {
      continue;
    }

    const parsedDate =
      new Date(paymentDate);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      continue;
    }

    const key =
      `${parsedDate.getFullYear()}-${String(
        parsedDate.getMonth() + 1
      ).padStart(2, '0')}`;

    const month =
      months.find(
        (item) =>
          item.key === key
      );

    if (!month) {
      continue;
    }

    month.revenue +=
      payment.amount;

    month.payments += 1;
  }

  return months.map(
    ({
      key,
      label,
      revenue,
      payments: paymentCount,
    }) => ({
      key,
      label,
      revenue,
      payments: paymentCount,
    })
  );
}

export async function getAdminFinancialData():
Promise<AdminFinancialData> {
  const [
    paymentRows,
    trainersResult,

    latestWebhookResult,
    processedWebhookResult,
    ignoredWebhookResult,
    failedWebhookResult,

    checkoutTotalResult,
    checkoutCompletedResult,
    checkoutOpenResult,
    checkoutFailedResult,

    activePaidSubscriptionsResult,
  ] = await Promise.all([
    fetchAllRows(
      'platform_subscription_payments',
      PAYMENT_COLUMNS,
      'created_at',
      false,
      'AdminFinancialService'
    ),

    supabase
      .from('trainer_profiles')
      .select(`
        id,
        name,
        email
      `),

    supabase
      .from(
        'platform_webhook_events'
      )
      .select(`
        processing_status,
        error_message,
        received_at
      `)
      .order('received_at', {
        ascending: false,
      })
      .limit(1),

    supabase
      .from(
        'platform_webhook_events'
      )
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq(
        'processing_status',
        'processed'
      ),

    supabase
      .from(
        'platform_webhook_events'
      )
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq(
        'processing_status',
        'ignored'
      ),

    supabase
      .from(
        'platform_webhook_events'
      )
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq(
        'processing_status',
        'failed'
      ),

    supabase
      .from(
        'subscription_checkout_attempts'
      )
      .select('id', {
        count: 'exact',
        head: true,
      }),

    supabase
      .from(
        'subscription_checkout_attempts'
      )
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq(
        'status',
        'completed'
      ),

    supabase
      .from(
        'subscription_checkout_attempts'
      )
      .select('id', {
        count: 'exact',
        head: true,
      })
      .in(
        'status',
        [
          'created',
          'pending',
        ]
      ),

    supabase
      .from(
        'subscription_checkout_attempts'
      )
      .select('id', {
        count: 'exact',
        head: true,
      })
      .in(
        'status',
        [
          'failed',
          'cancelled',
          'canceled',
          'expired',
        ]
      ),

    supabase
      .from('subscriptions')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .in(
        'status',
        [
          'active',
          'trialing',
          'authorized',
        ]
      )
      .neq(
        'plan_slug',
        'free'
      ),
  ]);

  if (trainersResult.error) {
    console.error(
      '[AdminFinancialService] trainers:',
      trainersResult.error
    );

    throw trainersResult.error;
  }

  const resultErrors = [
    latestWebhookResult.error,
    processedWebhookResult.error,
    ignoredWebhookResult.error,
    failedWebhookResult.error,

    checkoutTotalResult.error,
    checkoutCompletedResult.error,
    checkoutOpenResult.error,
    checkoutFailedResult.error,

    activePaidSubscriptionsResult.error,
  ].filter(Boolean);

  if (resultErrors.length > 0) {
    console.error(
      '[AdminFinancialService] summaries:',
      resultErrors
    );

    throw resultErrors[0];
  }

  const trainerById =
    new Map<
      string,
      {
        name: string;
        email: string;
      }
    >();

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
    AdminFinancialPayment[] =
    paymentRows.map(
      (payment: any) => {
        const trainer =
          payment.trainer_id
            ? trainerById.get(
                payment.trainer_id
              )
            : null;

        const liveMode =
          typeof payment.live_mode ===
          'boolean'
            ? payment.live_mode
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
            normalizeStatus(
              payment.status
            ),

          status_detail:
            payment.status_detail ||
            null,

          amount:
            Number(
              payment.amount || 0
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

          live_mode: liveMode,

          environment:
            getPaymentEnvironment(
              liveMode
            ),

          created_at:
            payment.created_at ||
            null,

          updated_at:
            payment.updated_at ||
            null,
        };
      }
    );

  payments.sort(
    (first, second) =>
      getTimestamp(
        getPaymentDate(second)
      ) -
      getTimestamp(
        getPaymentDate(first)
      )
  );

  const productionPayments =
    payments.filter(
      (payment) =>
        payment.environment ===
        'production'
    );

  const approvedProduction =
    productionPayments.filter(
      (payment) =>
        isApprovedStatus(payment.status)
    );

  const now = new Date();

  const previousMonth =
    new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

  const totalConfirmedRevenue =
    approvedProduction.reduce(
      (total, payment) =>
        total + payment.amount,
      0
    );

  const currentMonthRevenue =
    approvedProduction
      .filter((payment) =>
        isSameMonth(
          getPaymentDate(payment),
          now
        )
      )
      .reduce(
        (total, payment) =>
          total + payment.amount,
        0
      );

  const previousMonthRevenue =
    approvedProduction
      .filter((payment) =>
        isSameMonth(
          getPaymentDate(payment),
          previousMonth
        )
      )
      .reduce(
        (total, payment) =>
          total + payment.amount,
        0
      );

  const monthlyVariationPercent =
    previousMonthRevenue > 0
      ? (
          (
            currentMonthRevenue -
            previousMonthRevenue
          ) /
          previousMonthRevenue
        ) * 100
      : null;

  const summary:
    AdminFinancialSummary = {
    totalConfirmedRevenue,

    currentMonthRevenue,
    previousMonthRevenue,
    monthlyVariationPercent,

    averageTicket:
      approvedProduction.length > 0
        ? totalConfirmedRevenue /
          approvedProduction.length
        : 0,

    totalTransactions:
      payments.length,

    productionTransactions:
      productionPayments.length,

    approvedProductionPayments:
      approvedProduction.length,

    pendingProductionPayments:
      productionPayments.filter(
        (payment) =>
          isPendingStatus(payment.status)
      ).length,

    failedProductionPayments:
      productionPayments.filter(
        (payment) =>
          isFailedStatus(payment.status)
      ).length,

    refundedProductionPayments:
      productionPayments.filter(
        (payment) =>
          isRefundedStatus(payment.status)
      ).length,

    testTransactions:
      payments.filter(
        (payment) =>
          payment.environment ===
          'test'
      ).length,

    unknownEnvironmentTransactions:
      payments.filter(
        (payment) =>
          payment.environment ===
          'unknown'
      ).length,

    latestApprovedAt:
      approvedProduction[0]
        ? getPaymentDate(
            approvedProduction[0]
          )
        : null,
  };

  const latestWebhook =
    latestWebhookResult.data?.[0];

  const integration:
    AdminFinancialIntegrationSummary = {
    activePaidSubscriptions:
      activePaidSubscriptionsResult.count ||
      0,

    checkoutAttempts:
      checkoutTotalResult.count ||
      0,

    checkoutCompleted:
      checkoutCompletedResult.count ||
      0,

    checkoutOpen:
      checkoutOpenResult.count ||
      0,

    checkoutFailed:
      checkoutFailedResult.count ||
      0,

    webhookProcessed:
      processedWebhookResult.count ||
      0,

    webhookIgnored:
      ignoredWebhookResult.count ||
      0,

    webhookFailed:
      failedWebhookResult.count ||
      0,

    latestWebhookAt:
      latestWebhook?.received_at ||
      null,

    latestWebhookStatus:
      latestWebhook
        ?.processing_status ||
      null,

    latestWebhookError:
      latestWebhook
        ?.error_message ||
      null,
  };

  return {
    payments,
    summary,

    monthlyRevenue:
      buildMonthlyRevenue(
        payments,
        6
      ),

    integration,
  };
}