/**
 * analyticsService — camada centralizada de analytics do Personal (Sprint 14).
 *
 * DERIVADA / PURO: não faz fetch no banco. Recebe os dados já carregados
 * (students, payments, logs) e devolve o AnalyticsSummary. Os fetches ficam
 * no hook `useTrainerAnalytics`.
 *
 * Consolida, sem duplicar, cálculos que hoje existem espalhados em
 * DashboardPage, ReportsPage e ProgressPage:
 *  - Financeiro ......... pagos no mês/ano, MRR, ticket médio, atrasados,
 *                         próximos do vencimento.
 *  - Alunos ............. total/ativos/inativos/novos no período.
 *  - Treinos ............ executados, conclusão, média por aluno, frequência
 *                         semanal, séries, duração.
 *  - Força/volume ....... reutiliza strengthService.buildStrengthTracker
 *                         (que por sua vez consome workoutLogService e
 *                         workoutMath) e evolution.maxValue (1RM).
 *  - Risco .............. regra inicial: sem treino >= riskInactiveDays OU
 *                         pagamento atrasado → StudentRisk.
 *
 * Nenhuma funcionalidade existente é alterada: é um módulo novo.
 */
import type { Payment, Student, WorkoutLog } from '../types/database';
import type {
  AnalyticsSummary,
  RevenuePoint,
  StudentRisk,
  TopActiveStudent,
  TrainerAnalyticsInput,
  TrainerAnalyticsOptions,
  WorkoutTrendPoint,
} from '../types/analytics';
import { getLogDurationSeconds, getLogTotalSets } from './workoutLogService';
import { buildStrengthTracker } from './strengthService';
import { maxValue } from '../utils/evolution';

const MONTH_LABELS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const DAY_MS = 24 * 60 * 60 * 1000;

interface ResolvedOptions {
  now: Date;
  periodDays: number;
  riskInactiveDays: number;
  upcomingDueDays: number;
}

function resolveOptions(options?: TrainerAnalyticsOptions): ResolvedOptions {
  return {
    now: options?.now ?? new Date(),
    periodDays: options?.periodDays ?? 30,
    riskInactiveDays: options?.riskInactiveDays ?? 7,
    upcomingDueDays: options?.upcomingDueDays ?? 7,
  };
}

function toValidDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function total(items: Array<{ amount: number }>): number {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

/** Data de "pagamento" usada nas séries (mesmo critério de ReportsPage). */
function getPaymentDate(payment: Payment): Date | null {
  return toValidDate(payment.paid_at || payment.updated_at || payment.created_at);
}

function isCompleted(log: WorkoutLog): boolean {
  return String(log.status) === 'completed' || Boolean(log.completed_at);
}

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------

interface RevenueMetrics {
  revenueCurrentMonth: number;
  revenuePreviousMonth: number;
  monthlyRevenueSeries: RevenuePoint[];
  mrr: number;
  averageTicket: number;
  overduePaymentsCount: number;
  overdueAmount: number;
  upcomingPaymentsCount: number;
  upcomingAmount: number;
}

function computeRevenue(payments: Payment[], opts: ResolvedOptions): RevenueMetrics {
  const { now, upcomingDueDays } = opts;
  const paid = (payments || []).filter((p) => p.status === 'paid');
  const totalPaid = total(paid);

  const revenueCurrentMonth = paid
    .filter((p) => {
      const d = getPaymentDate(p);
      return !!d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const revenuePreviousMonth = paid
    .filter((p) => {
      const d = getPaymentDate(p);
      return !!d && d >= monthAgo && d < new Date(now.getFullYear(), now.getMonth(), 1);
    })
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const monthlyRevenueSeries: RevenuePoint[] = MONTH_LABELS.map((month, index) => ({
    month,
    value: paid
      .filter((p) => {
        const d = getPaymentDate(p);
        return !!d && d.getFullYear() === now.getFullYear() && d.getMonth() === index;
      })
      .reduce((sum, p) => sum + Number(p.amount || 0), 0),
  }));

  const overdue = (payments || []).filter((p) => p.status === 'overdue');

  const upcoming = (payments || []).filter((p) => {
    if (p.status !== 'pending') return false;
    const due = toValidDate(p.due_date);
    if (!due) return false;
    const days = Math.floor((due.getTime() - now.getTime()) / DAY_MS);
    return days >= 0 && days <= upcomingDueDays;
  });

  return {
    revenueCurrentMonth,
    revenuePreviousMonth,
    monthlyRevenueSeries,
    mrr: revenueCurrentMonth,
    averageTicket: paid.length > 0 ? totalPaid / paid.length : 0,
    overduePaymentsCount: overdue.length,
    overdueAmount: total(overdue),
    upcomingPaymentsCount: upcoming.length,
    upcomingAmount: total(upcoming),
  };
}

// ---------------------------------------------------------------------------
// Alunos
// ---------------------------------------------------------------------------

interface StudentMetrics {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  newStudentsPeriod: number;
}

function computeStudents(students: Student[], opts: ResolvedOptions): StudentMetrics {
  const { now, periodDays } = opts;
  const periodStart = new Date(now.getTime() - periodDays * DAY_MS);
  const list = students || [];

  return {
    totalStudents: list.length,
    activeStudents: list.filter((s) => s.status === 'active').length,
    inactiveStudents: list.filter((s) => s.status !== 'active').length,
    newStudentsPeriod: list.filter((s) => {
      const d = toValidDate(s.created_at);
      return !!d && d >= periodStart;
    }).length,
  };
}

// ---------------------------------------------------------------------------
// Treinos
// ---------------------------------------------------------------------------

interface WorkoutMetrics {
  totalWorkouts: number;
  completedWorkouts: number;
  completionRate: number;
  averageWorkoutsPerStudent: number;
  weeklyFrequency: number;
  averageWorkoutDurationSeconds: number;
  totalSets: number;
  averageSetsPerWorkout: number;
  workoutSeries: WorkoutTrendPoint[];
}

function computeWorkouts(
  logs: WorkoutLog[],
  totalStudents: number,
  opts: ResolvedOptions
): WorkoutMetrics {
  const { now } = opts;
  const all = logs || [];
  const completed = all.filter(isCompleted);
  const totalWorkouts = all.length;
  const completedWorkouts = completed.length;

  const completionRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;
  const averageWorkoutsPerStudent = totalStudents > 0 ? completedWorkouts / totalStudents : 0;

  const dates = completed
    .map((l) => toValidDate(l.completed_at || l.created_at))
    .filter((d): d is Date => !!d);

  let weeklyFrequency = 0;
  if (dates.length > 0) {
    const first = Math.min(...dates.map((d) => d.getTime()));
    const last = Math.max(...dates.map((d) => d.getTime()));
    const spanDays = Math.max(1, (last - first) / DAY_MS);
    const weeks = spanDays / 7;
    weeklyFrequency = completedWorkouts / (weeks > 0 ? weeks : 1);
  }

  const totalSets = completed.reduce((sum, log) => sum + getLogTotalSets(log), 0);
  const durations = completed.map(getLogDurationSeconds);
  const averageWorkoutDurationSeconds =
    durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

  const workoutSeries: WorkoutTrendPoint[] = MONTH_LABELS.map((month, index) => ({
    month,
    workouts: completed.filter((l) => {
      const d = toValidDate(l.completed_at || l.created_at);
      return !!d && d.getFullYear() === now.getFullYear() && d.getMonth() === index;
    }).length,
  }));

  return {
    totalWorkouts,
    completedWorkouts,
    completionRate,
    averageWorkoutsPerStudent,
    weeklyFrequency: Math.round(weeklyFrequency * 10) / 10,
    averageWorkoutDurationSeconds,
    totalSets,
    averageSetsPerWorkout: completedWorkouts > 0 ? totalSets / completedWorkouts : 0,
    workoutSeries,
  };
}

// ---------------------------------------------------------------------------
// Ranking de atividade e risco
// ---------------------------------------------------------------------------

function buildNameById(students: Student[]): Map<string, string> {
  const names = new Map<string, string>();
  (students || []).forEach((s) => {
    if (s.id) names.set(s.id, s.name || 'Aluno');
  });
  return names;
}

function computeTopActiveStudents(
  students: Student[],
  logs: WorkoutLog[]
): TopActiveStudent[] {
  const nameById = buildNameById(students);
  const counter = new Map<string, number>();

  (logs || [])
    .filter(isCompleted)
    .forEach((log) => {
      if (!log.student_id) return;
      counter.set(log.student_id, (counter.get(log.student_id) || 0) + 1);
    });

  return Array.from(counter.entries())
    .map(([id, count]) => ({ id, name: nameById.get(id) || 'Aluno', count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function computeStudentsAtRisk(
  students: Student[],
  payments: Payment[],
  logs: WorkoutLog[],
  opts: ResolvedOptions
): StudentRisk[] {
  const { now, riskInactiveDays } = opts;
  const cutoff = new Date(now.getTime() - riskInactiveDays * DAY_MS).getTime();

  // Último treino concluído por aluno.
  const lastCompletedByStudent = new Map<string, Date>();
  (logs || [])
    .filter(isCompleted)
    .forEach((log) => {
      if (!log.student_id) return;
      const d = toValidDate(log.completed_at || log.created_at);
      if (!d) return;
      const current = lastCompletedByStudent.get(log.student_id);
      if (!current || d.getTime() > current.getTime()) {
        lastCompletedByStudent.set(log.student_id, d);
      }
    });

  // Último pagamento por aluno (mais recente por created_at).
  const latestPaymentByStudent = new Map<string, Payment>();
  (payments || []).forEach((p) => {
    if (!p.student_id) return;
    const current = latestPaymentByStudent.get(p.student_id);
    if (!current || String(p.created_at || '') > String(current.created_at || '')) {
      latestPaymentByStudent.set(p.student_id, p);
    }
  });

  const atRisk: StudentRisk[] = [];

  (students || []).forEach((student) => {
    // Foco em alunos ativos/pausados; 'inactive' não é treino em curso.
    if (student.status === 'inactive') return;

    const reasons: string[] = [];
    const lastWorkout = lastCompletedByStudent.get(student.id) ?? null;
    const hasRecentWorkout = lastWorkout !== null && lastWorkout.getTime() >= cutoff;
    if (!hasRecentWorkout) {
      reasons.push(`Sem treino concluído há ${riskInactiveDays} dias ou mais`);
    }

    const latestPayment = latestPaymentByStudent.get(student.id) ?? null;
    const overdue =
      latestPayment !== null && String(latestPayment.status).toLowerCase() === 'overdue';
    if (overdue) reasons.push('Pagamento atrasado');

    if (reasons.length === 0) return;

    atRisk.push({
      studentId: student.id,
      studentName: student.name || 'Aluno',
      reasons,
      lastWorkout: lastWorkout ? lastWorkout.toISOString() : null,
      paymentStatus: latestPayment ? String(latestPayment.status) : null,
      riskLevel: overdue ? 'high' : 'medium',
    });
  });

  return atRisk.sort((a, b) => {
    if (a.riskLevel === b.riskLevel) return b.reasons.length - a.reasons.length;
    return a.riskLevel === 'high' ? -1 : 1;
  });
}

// ---------------------------------------------------------------------------
// Builder principal (puro)
// ---------------------------------------------------------------------------

/**
 * Monta o AnalyticsSummary a partir dos dados crus já carregados.
 * Puro e determinístico em `options.now` — ideal para testes unitários.
 */
export function buildTrainerAnalytics(
  input: TrainerAnalyticsInput,
  options?: TrainerAnalyticsOptions
): AnalyticsSummary {
  const opts = resolveOptions(options);
  const students = input.students || [];
  const payments = input.payments || [];
  const logs = input.logs || [];

  const revenue = computeRevenue(payments, opts);
  const studentMetrics = computeStudents(students, opts);
  const workoutMetrics = computeWorkouts(logs, studentMetrics.totalStudents, opts);

  // Força: reutiliza strengthService.buildStrengthTracker (→ workoutLogService/workoutMath).
  const strength = buildStrengthTracker(logs);
  const best1RM = maxValue(
    strength.byExercise.map((e) => ({ date: '', value: e.best1RM }))
  );
  const topExercise =
    strength.byExercise.length > 0
      ? { name: strength.byExercise[0].exerciseName, volume: strength.byExercise[0].totalVolume }
      : null;

  return {
    ...studentMetrics,
    ...workoutMetrics,
    ...revenue,
    totalVolume: strength.totalVolume,
    averageVolumePerWorkout: strength.avgVolumePerWorkout,
    best1RM,
    topExerciseByVolume: topExercise,
    topActiveStudents: computeTopActiveStudents(students, logs),
    studentsAtRisk: computeStudentsAtRisk(students, payments, logs, opts),
  };
}

/**
 * Série de volume (kg) por treino, pronta para o LineChart (gráficos Fase 2).
 * Reutiliza a série `byEvolution` do strengthService.
 */
export function buildVolumeTrend(logs: WorkoutLog[]) {
  return buildStrengthTracker(logs).byEvolution;
}