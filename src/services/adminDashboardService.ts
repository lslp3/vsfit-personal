import { supabase } from '../lib/supabase';

import {
  getAdminFinancialData,
  type AdminFinancialPayment,
  type AdminMonthlyRevenuePoint,
} from './adminFinancialService';

import type {
  AdminPlanSlug,
} from './adminSubscriptionService';

export interface AdminDashboardTrainer {
  id: string;

  name: string;
  email: string;

  crefStatus: string;

  plan: AdminPlanSlug;
  subscriptionStatus: string | null;

  studentCount: number;
  activeStudentCount: number;

  createdAt: string | null;
}

export interface AdminDashboardPlanDistribution {
  plan: AdminPlanSlug;
  label: string;
  count: number;
}

export interface AdminDashboardSummary {
  totalTrainers: number;
  approvedTrainers: number;
  pendingCref: number;

  totalStudents: number;
  activeStudents: number;

  activeSubscriptions: number;
  activePaidSubscriptions: number;

  confirmedRevenue: number;
  currentMonthRevenue: number;

  approvedPayments: number;
}

export interface AdminDashboardAlerts {
  pendingCref: number;

  failedWebhooks: number;
  openCheckouts: number;

  legacyPaidSubscriptions: number;

  unknownEnvironmentPayments: number;

  firstPendingTrainerId: string | null;
}

export interface AdminDashboardData {
  summary: AdminDashboardSummary;

  alerts: AdminDashboardAlerts;

  planDistribution:
    AdminDashboardPlanDistribution[];

  monthlyRevenue:
    AdminMonthlyRevenuePoint[];

  recentTrainers:
    AdminDashboardTrainer[];

  recentPayments:
    AdminFinancialPayment[];
}

interface TrainerRow {
  id: string;

  name: string | null;
  email: string | null;

  cref: string | null;
  cref_status: string | null;

  created_at: string | null;
}

interface StudentRow {
  id: string;

  trainer_id: string | null;

  status: string | null;
}

interface SubscriptionRow {
  id: string;

  trainer_id: string | null;

  plan: string | null;
  plan_slug: string | null;

  status: string | null;

  created_at: string | null;
  updated_at: string | null;
}

function normalizePlan(
  value: unknown
): AdminPlanSlug {
  const normalized =
    String(value || 'free')
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

function isActiveSubscription(
  status: unknown
) {
  return [
    'active',
    'trialing',
    'authorized',
  ].includes(
    String(status || '')
      .trim()
      .toLowerCase()
  );
}

function getTimestamp(
  value: string | null
) {
  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

async function fetchAllRows(
  table: string,
  columns: string,
  orderColumn: string
) {
  const pageSize = 1000;

  const rows: any[] = [];

  let from = 0;

  while (true) {
    const {
      data,
      error,
    } = await supabase
      .from(table)
      .select(columns)
      .order(orderColumn, {
        ascending: false,
      })
      .range(
        from,
        from + pageSize - 1
      );

    if (error) {
      console.error(
        `[AdminDashboardService] ${table}:`,
        error
      );

      throw error;
    }

    const page =
      data || [];

    rows.push(...page);

    if (
      page.length < pageSize
    ) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

export async function getAdminDashboardData():
Promise<AdminDashboardData> {
  const [
    trainerRows,
    studentRows,
    subscriptionRows,
    financialData,
  ] = await Promise.all([
    fetchAllRows(
      'trainer_profiles',
      `
        id,
        name,
        email,
        cref,
        cref_status,
        created_at
      `,
      'created_at'
    ),

    fetchAllRows(
      'students',
      `
        id,
        trainer_id,
        status,
        created_at
      `,
      'created_at'
    ),

    fetchAllRows(
      'subscriptions',
      `
        id,
        trainer_id,
        plan,
        plan_slug,
        status,
        created_at,
        updated_at
      `,
      'updated_at'
    ),

    getAdminFinancialData(),
  ]);

  const trainers =
    trainerRows as TrainerRow[];

  const students =
    studentRows as StudentRow[];

  const subscriptions =
    subscriptionRows as
      SubscriptionRow[];

  const studentCounts =
    new Map<
      string,
      {
        total: number;
        active: number;
      }
    >();

  for (const student of students) {
    if (!student.trainer_id) {
      continue;
    }

    const current =
      studentCounts.get(
        student.trainer_id
      ) || {
        total: 0,
        active: 0,
      };

    current.total += 1;

    if (
      String(
        student.status || ''
      )
        .trim()
        .toLowerCase() ===
      'active'
    ) {
      current.active += 1;
    }

    studentCounts.set(
      student.trainer_id,
      current
    );
  }

  const activeSubscriptions =
    subscriptions.filter(
      (subscription) =>
        isActiveSubscription(
          subscription.status
        )
    );

  const subscriptionByTrainer =
    new Map<
      string,
      SubscriptionRow
    >();

  for (
    const subscription of
      activeSubscriptions
  ) {
    if (!subscription.trainer_id) {
      continue;
    }

    const existing =
      subscriptionByTrainer.get(
        subscription.trainer_id
      );

    if (!existing) {
      subscriptionByTrainer.set(
        subscription.trainer_id,
        subscription
      );

      continue;
    }

    const existingPlan =
      normalizePlan(
        existing.plan_slug ||
        existing.plan
      );

    const currentPlan =
      normalizePlan(
        subscription.plan_slug ||
        subscription.plan
      );

    const priority:
      Record<AdminPlanSlug, number> = {
      free: 1,
      pro: 2,
      premium: 3,
    };

    if (
      priority[currentPlan] >
      priority[existingPlan]
    ) {
      subscriptionByTrainer.set(
        subscription.trainer_id,
        subscription
      );
    }
  }

  const planCounts = {
    free: 0,
    pro: 0,
    premium: 0,
  };

  for (
    const subscription of
      activeSubscriptions
  ) {
    const plan =
      normalizePlan(
        subscription.plan_slug ||
        subscription.plan
      );

    planCounts[plan] += 1;
  }

  const pendingTrainers =
    trainers
      .filter((trainer) => {
        const status =
          String(
            trainer.cref_status ||
            'not_submitted'
          )
            .trim()
            .toLowerCase();

        return (
          status === 'pending' &&
          Boolean(
            trainer.cref?.trim()
          )
        );
      })
      .sort(
        (first, second) =>
          getTimestamp(
            second.created_at
          ) -
          getTimestamp(
            first.created_at
          )
      );

  const approvedTrainers =
    trainers.filter(
      (trainer) =>
        String(
          trainer.cref_status || ''
        )
          .trim()
          .toLowerCase() ===
        'approved'
    );

  const approvedProductionTrainerIds =
    new Set(
      financialData.payments
        .filter(
          (payment) =>
            payment.environment ===
              'production' &&
            payment.status ===
              'approved' &&
            Boolean(
              payment.trainer_id
            )
        )
        .map(
          (payment) =>
            payment.trainer_id as string
        )
    );

  const activePaidSubscriptions =
    activeSubscriptions.filter(
      (subscription) =>
        normalizePlan(
          subscription.plan_slug ||
          subscription.plan
        ) !== 'free'
    );

  const legacyPaidSubscriptions =
    activePaidSubscriptions.filter(
      (subscription) =>
        !subscription.trainer_id ||
        !approvedProductionTrainerIds.has(
          subscription.trainer_id
        )
    ).length;

  const recentTrainers =
    trainers
      .slice()
      .sort(
        (first, second) =>
          getTimestamp(
            second.created_at
          ) -
          getTimestamp(
            first.created_at
          )
      )
      .slice(0, 5)
      .map(
        (
          trainer
        ): AdminDashboardTrainer => {
          const subscription =
            subscriptionByTrainer.get(
              trainer.id
            );

          const counts =
            studentCounts.get(
              trainer.id
            ) || {
              total: 0,
              active: 0,
            };

          return {
            id: trainer.id,

            name:
              trainer.name ||
              'Personal',

            email:
              trainer.email ||
              '',

            crefStatus:
              trainer.cref_status ||
              'not_submitted',

            plan:
              normalizePlan(
                subscription
                  ?.plan_slug ||
                subscription
                  ?.plan
              ),

            subscriptionStatus:
              subscription?.status ||
              null,

            studentCount:
              counts.total,

            activeStudentCount:
              counts.active,

            createdAt:
              trainer.created_at ||
              null,
          };
        }
      );

  const recentPayments =
    financialData.payments
      .filter(
        (payment) =>
          payment.environment ===
          'production'
      )
      .slice(0, 5);

  const summary:
    AdminDashboardSummary = {
    totalTrainers:
      trainers.length,

    approvedTrainers:
      approvedTrainers.length,

    pendingCref:
      pendingTrainers.length,

    totalStudents:
      students.length,

    activeStudents:
      students.filter(
        (student) =>
          String(
            student.status || ''
          )
            .trim()
            .toLowerCase() ===
          'active'
      ).length,

    activeSubscriptions:
      activeSubscriptions.length,

    activePaidSubscriptions:
      activePaidSubscriptions.length,

    confirmedRevenue:
      financialData.summary
        .totalConfirmedRevenue,

    currentMonthRevenue:
      financialData.summary
        .currentMonthRevenue,

    approvedPayments:
      financialData.summary
        .approvedProductionPayments,
  };

  const alerts:
    AdminDashboardAlerts = {
    pendingCref:
      pendingTrainers.length,

    failedWebhooks:
      financialData.integration
        .webhookFailed,

    openCheckouts:
      financialData.integration
        .checkoutOpen,

    legacyPaidSubscriptions,

    unknownEnvironmentPayments:
      financialData.summary
        .unknownEnvironmentTransactions,

    firstPendingTrainerId:
      pendingTrainers[0]?.id ||
      null,
  };

  return {
    summary,
    alerts,

    planDistribution: [
      {
        plan: 'free',
        label: 'Free',
        count: planCounts.free,
      },
      {
        plan: 'pro',
        label: 'Pro',
        count: planCounts.pro,
      },
      {
        plan: 'premium',
        label: 'Premium',
        count: planCounts.premium,
      },
    ],

    monthlyRevenue:
      financialData.monthlyRevenue,

    recentTrainers,
    recentPayments,
  };
}