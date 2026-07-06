import { supabase } from '../lib/supabase';

export type ReportPlanSlug =
  | 'free'
  | 'pro'
  | 'premium';

export interface AdminReportMonth {
  key: string;
  label: string;

  trainers: number;
  students: number;

  completedWorkouts: number;

  revenue: number;
  approvedPayments: number;
}

export interface AdminReportDistribution {
  key: string;
  label: string;
  count: number;
}

export interface AdminTrainerRanking {
  id: string;
  name: string;
  email: string;

  crefStatus: string;

  plan: ReportPlanSlug;

  studentCount: number;
  activeStudents: number;

  publishedPlans: number;
  completedWorkouts: number;

  approvedPayments: number;
  confirmedRevenue: number;
}

export interface AdminReportsSummary {
  totalTrainers: number;
  approvedCref: number;
  pendingCref: number;

  totalStudents: number;
  activeStudents: number;

  publishedPlans: number;

  totalWorkoutLogs: number;
  completedWorkouts: number;

  activeSubscriptions: number;
  activePaidSubscriptions: number;

  approvedPayments: number;
  confirmedRevenue: number;
  currentMonthRevenue: number;

  averageStudentsPerTrainer: number;
  studentActivationRate: number;
  workoutCompletionRate: number;

  newTrainersCurrentMonth: number;
  newStudentsCurrentMonth: number;
}

export interface AdminReportsData {
  summary: AdminReportsSummary;

  months: AdminReportMonth[];

  planDistribution:
    AdminReportDistribution[];

  crefDistribution:
    AdminReportDistribution[];

  studentStatusDistribution:
    AdminReportDistribution[];

  trainerRanking:
    AdminTrainerRanking[];
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

  created_at: string | null;
}

interface SubscriptionRow {
  trainer_id: string | null;

  plan: string | null;
  plan_slug: string | null;

  status: string | null;
}

interface WorkoutPlanRow {
  id: string;
  trainer_id: string | null;

  status: string | null;

  created_at: string | null;
}

interface WorkoutLogRow {
  id: string;

  trainer_id: string | null;
  student_id: string | null;

  status: string | null;

  completed_at: string | null;
  created_at: string | null;
}

interface PlatformPaymentRow {
  trainer_id: string | null;

  plan_slug: string | null;

  status: string | null;

  amount: number | string | null;

  live_mode: boolean | null;

  date_approved: string | null;
  created_at: string | null;
}

const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

function normalizePlan(
  value: unknown
): ReportPlanSlug {
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

function isCompletedWorkout(
  workout: WorkoutLogRow
) {
  return (
    Boolean(workout.completed_at) ||
    String(workout.status || '')
      .trim()
      .toLowerCase() ===
      'completed'
  );
}

function isApprovedProductionPayment(
  payment: PlatformPaymentRow
) {
  return (
    payment.live_mode === true &&
    String(payment.status || '')
      .trim()
      .toLowerCase() ===
      'approved'
  );
}

function getMonthKey(
  date: Date
) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, '0')}`;
}

function getValidDate(
  value: string | null
) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  return date;
}

function isCurrentMonth(
  value: string | null
) {
  const date =
    getValidDate(value);

  if (!date) {
    return false;
  }

  const now = new Date();

  return (
    date.getFullYear() ===
      now.getFullYear() &&
    date.getMonth() ===
      now.getMonth()
  );
}

function buildMonths(
  totalMonths = 6
): AdminReportMonth[] {
  const now = new Date();

  return Array.from(
    {
      length: totalMonths,
    },
    (_, index) => {
      const date =
        new Date(
          now.getFullYear(),
          now.getMonth() -
            (
              totalMonths -
              1 -
              index
            ),
          1
        );

      return {
        key:
          getMonthKey(date),

        label:
          `${MONTH_LABELS[
            date.getMonth()
          ]}/${String(
            date.getFullYear()
          ).slice(-2)}`,

        trainers: 0,
        students: 0,

        completedWorkouts: 0,

        revenue: 0,
        approvedPayments: 0,
      };
    }
  );
}

async function fetchAllRows(
  table: string,
  columns: string,
  orderColumn = 'created_at'
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
        ascending: true,
      })
      .range(
        from,
        from + pageSize - 1
      );

    if (error) {
      console.error(
        `[AdminReportsService] ${table}:`,
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

export async function getAdminReportsData():
Promise<AdminReportsData> {
  const [
    trainerRows,
    studentRows,
    subscriptionRows,
    workoutPlanRows,
    workoutLogRows,
    paymentRows,
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
      `
    ),

    fetchAllRows(
      'students',
      `
        id,
        trainer_id,
        status,
        created_at
      `
    ),

    fetchAllRows(
      'subscriptions',
      `
        trainer_id,
        plan,
        plan_slug,
        status,
        created_at
      `
    ),

    fetchAllRows(
      'workout_plans',
      `
        id,
        trainer_id,
        status,
        created_at
      `
    ),

    fetchAllRows(
      'workout_logs',
      `
        id,
        trainer_id,
        student_id,
        status,
        completed_at,
        created_at
      `
    ),

    fetchAllRows(
      'platform_subscription_payments',
      `
        trainer_id,
        plan_slug,
        status,
        amount,
        live_mode,
        date_approved,
        created_at
      `
    ),
  ]);

  const trainers =
    trainerRows as TrainerRow[];

  const students =
    studentRows as StudentRow[];

  const subscriptions =
    subscriptionRows as
      SubscriptionRow[];

  const workoutPlans =
    workoutPlanRows as
      WorkoutPlanRow[];

  const workoutLogs =
    workoutLogRows as
      WorkoutLogRow[];

  const payments =
    paymentRows as
      PlatformPaymentRow[];

  const months =
    buildMonths(6);

  const monthByKey =
    new Map(
      months.map((month) => [
        month.key,
        month,
      ])
    );

  for (const trainer of trainers) {
    const date =
      getValidDate(
        trainer.created_at
      );

    if (!date) {
      continue;
    }

    const month =
      monthByKey.get(
        getMonthKey(date)
      );

    if (month) {
      month.trainers += 1;
    }
  }

  for (const student of students) {
    const date =
      getValidDate(
        student.created_at
      );

    if (!date) {
      continue;
    }

    const month =
      monthByKey.get(
        getMonthKey(date)
      );

    if (month) {
      month.students += 1;
    }
  }

  const completedWorkoutLogs =
    workoutLogs.filter(
      isCompletedWorkout
    );

  for (
    const workout of
      completedWorkoutLogs
  ) {
    const date =
      getValidDate(
        workout.completed_at ||
        workout.created_at
      );

    if (!date) {
      continue;
    }

    const month =
      monthByKey.get(
        getMonthKey(date)
      );

    if (month) {
      month.completedWorkouts += 1;
    }
  }

  const approvedProductionPayments =
    payments.filter(
      isApprovedProductionPayment
    );

  for (
    const payment of
      approvedProductionPayments
  ) {
    const date =
      getValidDate(
        payment.date_approved ||
        payment.created_at
      );

    if (!date) {
      continue;
    }

    const month =
      monthByKey.get(
        getMonthKey(date)
      );

    if (month) {
      month.revenue +=
        Number(
          payment.amount || 0
        );

      month.approvedPayments += 1;
    }
  }

  const activeSubscriptions =
    subscriptions.filter(
      (subscription) =>
        isActiveSubscription(
          subscription.status
        )
    );

  const planCounts = {
    free: 0,
    pro: 0,
    premium: 0,
  };

  const subscriptionByTrainer =
    new Map<
      string,
      SubscriptionRow
    >();

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

    if (
      subscription.trainer_id &&
      !subscriptionByTrainer.has(
        subscription.trainer_id
      )
    ) {
      subscriptionByTrainer.set(
        subscription.trainer_id,
        subscription
      );
    }
  }

  const crefCounts = {
    approved: 0,
    pending: 0,
    rejected: 0,
    not_submitted: 0,
  };

  for (const trainer of trainers) {
    const crefStatus =
      String(
        trainer.cref_status ||
        'not_submitted'
      )
        .trim()
        .toLowerCase();

    if (
      crefStatus === 'approved'
    ) {
      crefCounts.approved += 1;
    } else if (
      crefStatus === 'pending' &&
      Boolean(
        trainer.cref?.trim()
      )
    ) {
      crefCounts.pending += 1;
    } else if (
      crefStatus === 'rejected'
    ) {
      crefCounts.rejected += 1;
    } else {
      crefCounts.not_submitted += 1;
    }
  }

  const studentStatusCounts = {
    active: 0,
    paused: 0,
    inactive: 0,
  };

  for (const student of students) {
    const status =
      String(
        student.status ||
        'inactive'
      )
        .trim()
        .toLowerCase();

    if (status === 'active') {
      studentStatusCounts.active += 1;
    } else if (
      status === 'paused'
    ) {
      studentStatusCounts.paused += 1;
    } else {
      studentStatusCounts.inactive += 1;
    }
  }

  const rankingByTrainer =
    new Map<
      string,
      AdminTrainerRanking
    >();

  for (const trainer of trainers) {
    const subscription =
      subscriptionByTrainer.get(
        trainer.id
      );

    rankingByTrainer.set(
      trainer.id,
      {
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

        studentCount: 0,
        activeStudents: 0,

        publishedPlans: 0,
        completedWorkouts: 0,

        approvedPayments: 0,
        confirmedRevenue: 0,
      }
    );
  }

  for (const student of students) {
    if (!student.trainer_id) {
      continue;
    }

    const ranking =
      rankingByTrainer.get(
        student.trainer_id
      );

    if (!ranking) {
      continue;
    }

    ranking.studentCount += 1;

    if (
      student.status === 'active'
    ) {
      ranking.activeStudents += 1;
    }
  }

  const publishedPlans =
    workoutPlans.filter(
      (plan) =>
        plan.status === 'published'
    );

  for (const plan of publishedPlans) {
    if (!plan.trainer_id) {
      continue;
    }

    const ranking =
      rankingByTrainer.get(
        plan.trainer_id
      );

    if (ranking) {
      ranking.publishedPlans += 1;
    }
  }

  for (
    const workout of
      completedWorkoutLogs
  ) {
    if (!workout.trainer_id) {
      continue;
    }

    const ranking =
      rankingByTrainer.get(
        workout.trainer_id
      );

    if (ranking) {
      ranking.completedWorkouts += 1;
    }
  }

  for (
    const payment of
      approvedProductionPayments
  ) {
    if (!payment.trainer_id) {
      continue;
    }

    const ranking =
      rankingByTrainer.get(
        payment.trainer_id
      );

    if (!ranking) {
      continue;
    }

    ranking.approvedPayments += 1;

    ranking.confirmedRevenue +=
      Number(
        payment.amount || 0
      );
  }

  const trainerRanking =
    Array.from(
      rankingByTrainer.values()
    ).sort(
      (first, second) =>
        second.completedWorkouts -
          first.completedWorkouts ||
        second.activeStudents -
          first.activeStudents ||
        second.studentCount -
          first.studentCount ||
        second.confirmedRevenue -
          first.confirmedRevenue ||
        first.name.localeCompare(
          second.name,
          'pt-BR'
        )
    );

  const totalStudents =
    students.length;

  const activeStudents =
    studentStatusCounts.active;

  const totalWorkoutLogs =
    workoutLogs.length;

  const confirmedRevenue =
    approvedProductionPayments.reduce(
      (total, payment) =>
        total +
        Number(
          payment.amount || 0
        ),
      0
    );

  const currentMonthRevenue =
    approvedProductionPayments
      .filter((payment) =>
        isCurrentMonth(
          payment.date_approved ||
          payment.created_at
        )
      )
      .reduce(
        (total, payment) =>
          total +
          Number(
            payment.amount || 0
          ),
        0
      );

  const summary:
    AdminReportsSummary = {
    totalTrainers:
      trainers.length,

    approvedCref:
      crefCounts.approved,

    pendingCref:
      crefCounts.pending,

    totalStudents,

    activeStudents,

    publishedPlans:
      publishedPlans.length,

    totalWorkoutLogs,

    completedWorkouts:
      completedWorkoutLogs.length,

    activeSubscriptions:
      activeSubscriptions.length,

    activePaidSubscriptions:
      activeSubscriptions.filter(
        (subscription) =>
          normalizePlan(
            subscription.plan_slug ||
            subscription.plan
          ) !== 'free'
      ).length,

    approvedPayments:
      approvedProductionPayments.length,

    confirmedRevenue,

    currentMonthRevenue,

    averageStudentsPerTrainer:
      trainers.length > 0
        ? totalStudents /
          trainers.length
        : 0,

    studentActivationRate:
      totalStudents > 0
        ? (
            activeStudents /
            totalStudents
          ) * 100
        : 0,

    workoutCompletionRate:
      totalWorkoutLogs > 0
        ? (
            completedWorkoutLogs.length /
            totalWorkoutLogs
          ) * 100
        : 0,

    newTrainersCurrentMonth:
      trainers.filter(
        (trainer) =>
          isCurrentMonth(
            trainer.created_at
          )
      ).length,

    newStudentsCurrentMonth:
      students.filter(
        (student) =>
          isCurrentMonth(
            student.created_at
          )
      ).length,
  };

  return {
    summary,
    months,

    planDistribution: [
      {
        key: 'free',
        label: 'Free',
        count: planCounts.free,
      },
      {
        key: 'pro',
        label: 'Pro',
        count: planCounts.pro,
      },
      {
        key: 'premium',
        label: 'Premium',
        count: planCounts.premium,
      },
    ],

    crefDistribution: [
      {
        key: 'approved',
        label: 'Aprovados',
        count:
          crefCounts.approved,
      },
      {
        key: 'pending',
        label: 'Pendentes',
        count:
          crefCounts.pending,
      },
      {
        key: 'rejected',
        label: 'Rejeitados',
        count:
          crefCounts.rejected,
      },
      {
        key: 'not_submitted',
        label: 'Não enviados',
        count:
          crefCounts.not_submitted,
      },
    ],

    studentStatusDistribution: [
      {
        key: 'active',
        label: 'Ativos',
        count:
          studentStatusCounts.active,
      },
      {
        key: 'paused',
        label: 'Pausados',
        count:
          studentStatusCounts.paused,
      },
      {
        key: 'inactive',
        label: 'Inativos',
        count:
          studentStatusCounts.inactive,
      },
    ],

    trainerRanking,
  };
}