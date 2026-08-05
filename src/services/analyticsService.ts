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
 *  - Período (Fase 4) ... janela ativa (Hoje/7d/30d/90d/Ano/Personalizado)
 *                         com comparação de tendência vs período anterior e
 *                         séries em buckets adaptativos (hora/dia/semana/mês).
 *  - Insights (Fase 4) .. gerados a partir de dados reais da camada — nunca
 *                         valores fictícios.
 *
 * Nenhuma funcionalidade existente é alterada: é um módulo novo.
 */
import type { Payment, Student, WorkoutLog } from '../types/database';
import type {
  AnalyticsInsight,
  AnalyticsPeriod,
  AnalyticsSummary,
  KpiTrend,
  PeriodRange,
  RevenuePoint,
  StudentAdherenceDatum,
  StudentRisk,
  TopActiveStudent,
  TrainerAnalyticsInput,
  TrainerAnalyticsOptions,
  VolumeTrendPoint,
  WorkoutTrendPoint,
} from '../types/analytics';
import { getLogDurationSeconds, getLogTotalSets, getLogTotalVolume } from './workoutLogService';
import { buildStrengthTracker } from './strengthService';
import { maxValue } from '../utils/evolution';

const MONTH_LABELS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const PERIOD_LABELS: Record<Exclude<AnalyticsPeriod, 'custom'>, string> = {
  today: 'Hoje',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  year: 'Este ano',
};

interface ResolvedOptions {
  now: Date;
  period: AnalyticsPeriod;
  /** Janela ativa do painel. */
  range: PeriodRange;
  /** Janela anterior equivalente (tendência). */
  previousRange: PeriodRange;
  periodDays: number;
  riskInactiveDays: number;
  upcomingDueDays: number;
}

function resolveOptions(options?: TrainerAnalyticsOptions): ResolvedOptions {
  const now = options?.now ?? new Date();
  const period = resolvePeriod(options);
  const { range, previousRange } = resolveRanges(now, period, options?.customRange, options?.periodDays);

  return {
    now,
    period,
    range,
    previousRange,
    periodDays: options?.periodDays ?? 30,
    riskInactiveDays: options?.riskInactiveDays ?? 7,
    upcomingDueDays: options?.upcomingDueDays ?? 7,
  };
}

/** Período efetivo: `options.period` ou, por compat, derivado de `periodDays`. */
function resolvePeriod(options?: TrainerAnalyticsOptions): AnalyticsPeriod {
  if (options?.period) return options.period;
  const days = options?.periodDays;
  if (days === 7) return '7d';
  if (days === 90) return '90d';
  if (days && days !== 30) return 'custom';
  return '30d';
}

function isoMs(ms: number): string {
  return new Date(ms).toISOString();
}

function startOfDayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Resolve a janela atual e a janela anterior equivalente.
 * `end` é exclusivo; comparações usam timestamps.
 */
function resolveRanges(
  now: Date,
  period: AnalyticsPeriod,
  customRange?: PeriodRange,
  periodDays?: number
): { range: PeriodRange; previousRange: PeriodRange } {
  const nowMs = now.getTime();
  const todayStart = startOfDayMs(now);
  const days = periodDays && periodDays > 0 ? periodDays : 30;

  switch (period) {
    case 'today': {
      const tomorrowStart = todayStart + DAY_MS;
      return {
        range: { start: isoMs(todayStart), end: isoMs(tomorrowStart) },
        previousRange: { start: isoMs(todayStart - DAY_MS), end: isoMs(todayStart) },
      };
    }
    case '7d':
      return {
        range: { start: isoMs(nowMs - 7 * DAY_MS), end: isoMs(nowMs) },
        previousRange: { start: isoMs(nowMs - 14 * DAY_MS), end: isoMs(nowMs - 7 * DAY_MS) },
      };
    case '90d':
      return {
        range: { start: isoMs(nowMs - 90 * DAY_MS), end: isoMs(nowMs) },
        previousRange: { start: isoMs(nowMs - 180 * DAY_MS), end: isoMs(nowMs - 90 * DAY_MS) },
      };
    case 'year': {
      const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
      const elapsed = nowMs - yearStart;
      const yearBefore = yearStart - 365 * DAY_MS;
      return {
        range: { start: isoMs(yearStart), end: isoMs(nowMs) },
        previousRange: { start: isoMs(yearBefore), end: isoMs(yearBefore + elapsed) },
      };
    }
    case 'custom': {
      const customStart = customRange?.start ? new Date(customRange.start).getTime() : NaN;
      const customEnd = customRange?.end ? new Date(customRange.end).getTime() : NaN;
      const valid = Number.isFinite(customStart) && Number.isFinite(customEnd) && customEnd > customStart;
      if (valid) {
        const duration = customEnd - customStart;
        return {
          range: { start: isoMs(customStart), end: isoMs(customEnd) },
          previousRange: { start: isoMs(customStart - duration), end: isoMs(customStart) },
        };
      }
      // Fallback: janela em dias (legado `periodDays`).
      return {
        range: { start: isoMs(nowMs - days * DAY_MS), end: isoMs(nowMs) },
        previousRange: { start: isoMs(nowMs - 2 * days * DAY_MS), end: isoMs(nowMs - days * DAY_MS) },
      };
    }
    default: // '30d'
      return {
        range: { start: isoMs(nowMs - 30 * DAY_MS), end: isoMs(nowMs) },
        previousRange: { start: isoMs(nowMs - 60 * DAY_MS), end: isoMs(nowMs - 30 * DAY_MS) },
      };
  }
}

function toValidDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inRange(date: Date | null, startMs: number, endMs: number): boolean {
  return !!date && date.getTime() >= startMs && date.getTime() < endMs;
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

/** Data de "conclusão" do treino usada nas janelas. */
function getLogDate(log: WorkoutLog): Date | null {
  return toValidDate(log.completed_at || log.created_at);
}

// ---------------------------------------------------------------------------
// Tendência (período atual x anterior)
// ---------------------------------------------------------------------------

const brPercent = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function computeTrend(current: number, previous: number): KpiTrend {
  if (previous <= 0) {
    if (current <= 0) return { direction: 'flat', percent: null, label: 'Sem dados anteriores' };
    return { direction: 'up', percent: null, label: 'Sem base anterior' };
  }

  const percent = ((current - previous) / previous) * 100;
  const abs = Math.abs(percent);
  const direction = abs < 0.5 ? 'flat' : percent > 0 ? 'up' : 'down';

  let label: string;
  if (direction === 'flat') label = 'Estável';
  else label = `${direction === 'up' ? '+' : '−'}${brPercent.format(abs)}%`;

  return { direction, percent: Math.round(percent * 10) / 10, label };
}

// ---------------------------------------------------------------------------
// Buckets adaptativos (séries por período)
// ---------------------------------------------------------------------------

interface Bucket {
  startMs: number;
  endMs: number;
  label: string;
}

/** Builds buckets conforme a duração do período (hora/dia/semana/mês). */
function buildBuckets(range: PeriodRange, now: Date): Bucket[] {
  const startMs = new Date(range.start).getTime();
  const endMs = new Date(range.end).getTime();
  const days = Math.max(1, Math.round((endMs - startMs) / DAY_MS));

  if (days <= 1) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const buckets: Bucket[] = [];
    for (let h = 0; h < 24; h += 1) {
      const t = dayStart + h * HOUR_MS;
      buckets.push({
        startMs: t,
        endMs: t + HOUR_MS,
        label: `${String(h).padStart(2, '0')}h`,
      });
    }
    return buckets;
  }

  if (days <= 45) {
    const buckets: Bucket[] = [];
    for (let t = startMs; t < endMs; t += DAY_MS) {
      const d = new Date(t);
      buckets.push({
        startMs: t,
        endMs: Math.min(t + DAY_MS, endMs),
        label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      });
    }
    return buckets;
  }

  if (days <= 180) {
    const buckets: Bucket[] = [];
    for (let t = startMs; t < endMs; t += 7 * DAY_MS) {
      const d = new Date(t);
      buckets.push({
        startMs: t,
        endMs: Math.min(t + 7 * DAY_MS, endMs),
        label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      });
    }
    return buckets;
  }

  // Mensal
  const buckets: Bucket[] = [];
  let cursor = new Date(startMs);
  const firstMonthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getTime();
  for (let t = firstMonthStart; t < endMs;) {
    const d = new Date(t);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    buckets.push({
      startMs: t,
      endMs: Math.min(next, endMs),
      label: MONTH_LABELS[d.getMonth()],
    });
    t = next;
  }
  return buckets;
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
  // Fase 4
  revenueInPeriod: number;
  previousRevenueInPeriod: number;
  revenueSeries: RevenuePoint[];
}

function computeRevenue(payments: Payment[], opts: ResolvedOptions): RevenueMetrics {
  const { now, upcomingDueDays, range, previousRange } = opts;
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

  // Fase 4 — janelas do período
  const rangeStart = new Date(range.start).getTime();
  const rangeEnd = new Date(range.end).getTime();
  const prevStart = new Date(previousRange.start).getTime();
  const prevEnd = new Date(previousRange.end).getTime();

  const revenueInPeriod = paid
    .filter((p) => inRange(getPaymentDate(p), rangeStart, rangeEnd))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const previousRevenueInPeriod = paid
    .filter((p) => inRange(getPaymentDate(p), prevStart, prevEnd))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const buckets = buildBuckets(range, now);
  const revenueSeries: RevenuePoint[] = buckets.map((bucket) => ({
    month: bucket.label,
    value: paid
      .filter((p) => inRange(getPaymentDate(p), bucket.startMs, bucket.endMs))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0),
  }));

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
    revenueInPeriod,
    previousRevenueInPeriod,
    revenueSeries,
  };
}

// ---------------------------------------------------------------------------
// Alunos
// ---------------------------------------------------------------------------

interface StudentMetrics {
  totalStudents: number;
  activeStudents: number;
  pausedStudents: number;
  inactiveStudents: number;
  newStudentsPeriod: number;
  // Fase 4
  newStudentsInPeriod: number;
  previousNewStudentsInPeriod: number;
}

function computeStudents(students: Student[], opts: ResolvedOptions): StudentMetrics {
  const { now, periodDays, range, previousRange } = opts;
  const periodStart = new Date(now.getTime() - periodDays * DAY_MS);
  const list = students || [];

  const rangeStart = new Date(range.start).getTime();
  const rangeEnd = new Date(range.end).getTime();
  const prevStart = new Date(previousRange.start).getTime();
  const prevEnd = new Date(previousRange.end).getTime();

  return {
    totalStudents: list.length,
    activeStudents: list.filter((s) => s.status === 'active').length,
    pausedStudents: list.filter((s) => s.status === 'paused').length,
    inactiveStudents: list.filter((s) => s.status !== 'active' && s.status !== 'paused').length,
    newStudentsPeriod: list.filter((s) => {
      const d = toValidDate(s.created_at);
      return !!d && d >= periodStart;
    }).length,
    newStudentsInPeriod: list.filter((s) => inRange(toValidDate(s.created_at), rangeStart, rangeEnd)).length,
    previousNewStudentsInPeriod: list.filter((s) => inRange(toValidDate(s.created_at), prevStart, prevEnd)).length,
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
  // Fase 4
  workoutsInPeriod: number;
  previousWorkoutsInPeriod: number;
  weeklyFrequencyInPeriod: number;
  previousWeeklyFrequencyInPeriod: number;
  workoutSeriesByPeriod: WorkoutTrendPoint[];
}

function computeWorkouts(
  logs: WorkoutLog[],
  totalStudents: number,
  opts: ResolvedOptions
): WorkoutMetrics {
  const { now, range, previousRange } = opts;
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

  // Fase 4 — janelas do período
  const rangeStart = new Date(range.start).getTime();
  const rangeEnd = new Date(range.end).getTime();
  const prevStart = new Date(previousRange.start).getTime();
  const prevEnd = new Date(previousRange.end).getTime();

  const inPeriod = completed.filter((l) => inRange(getLogDate(l), rangeStart, rangeEnd));
  const inPrevious = completed.filter((l) => inRange(getLogDate(l), prevStart, prevEnd));

  const workoutsInPeriod = inPeriod.length;
  const previousWorkoutsInPeriod = inPrevious.length;

  const rangeDays = Math.max(1, (rangeEnd - rangeStart) / DAY_MS);
  const prevDays = Math.max(1, (prevEnd - prevStart) / DAY_MS);

  const buckets = buildBuckets(range, now);
  const workoutSeriesByPeriod: WorkoutTrendPoint[] = buckets.map((bucket) => ({
    month: bucket.label,
    workouts: completed.filter((l) => inRange(getLogDate(l), bucket.startMs, bucket.endMs)).length,
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
    workoutsInPeriod,
    previousWorkoutsInPeriod,
    weeklyFrequencyInPeriod: Math.round((workoutsInPeriod / (rangeDays / 7)) * 10) / 10,
    previousWeeklyFrequencyInPeriod: Math.round((previousWorkoutsInPeriod / (prevDays / 7)) * 10) / 10,
    workoutSeriesByPeriod,
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

/**
 * Frequência semanal média por aluno (AdherenceChart). Reutiliza o mesmo
 * intervalo (semanas) da frequência média do grupo para manter coerência.
 * Inclui apenas alunos com ao menos um treino concluído.
 */
function computeStudentAdherence(
  students: Student[],
  logs: WorkoutLog[]
): StudentAdherenceDatum[] {
  const nameById = buildNameById(students);
  const counter = new Map<string, number>();
  const dates: number[] = [];

  (logs || [])
    .filter(isCompleted)
    .forEach((log) => {
      if (!log.student_id) return;
      counter.set(log.student_id, (counter.get(log.student_id) || 0) + 1);
      const d = toValidDate(log.completed_at || log.created_at);
      if (d) dates.push(d.getTime());
    });

  let weeks = 1;
  if (dates.length > 0) {
    const first = Math.min(...dates);
    const last = Math.max(...dates);
    const spanDays = Math.max(1, (last - first) / DAY_MS);
    weeks = spanDays / 7;
  }

  return Array.from(counter.entries())
    .map(([id, count]) => ({
      studentName: nameById.get(id) || 'Aluno',
      weeklyAverage: Math.round((count / weeks) * 10) / 10,
    }))
    .sort((a, b) => b.weeklyAverage - a.weeklyAverage)
    .slice(0, 12);
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
// Insights (Fase 4) — derivados exclusivamente de dados reais
// ---------------------------------------------------------------------------

const brCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

interface InsightContext {
  riskInactiveDays: number;
  studentsAtRisk: StudentRisk[];
  topActiveStudents: TopActiveStudent[];
  revenueTrend: KpiTrend;
  frequencyTrend: KpiTrend;
  workoutTrend: KpiTrend;
  newStudentsTrend: KpiTrend;
  revenueInPeriod: number;
  workoutsInPeriod: number;
  weeklyFrequencyInPeriod: number;
  overduePaymentsCount: number;
  overdueAmount: number;
  newStudentsInPeriod: number;
}

function buildInsights(ctx: InsightContext): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];

  // Alunos sem treinar há X dias.
  const inactiveCount = ctx.studentsAtRisk.filter((s) =>
    s.reasons.some((r) => r.toLowerCase().includes('sem treino'))
  ).length;
  if (inactiveCount > 0) {
    insights.push({
      id: 'inactive-students',
      tone: 'warning',
      title: `${inactiveCount} aluno(s) sem treinar`,
      description: `Sem treino concluído há ${ctx.riskInactiveDays} dias ou mais.`,
    });
  }

  // Queda na frequência semanal.
  if (ctx.frequencyTrend.direction === 'down') {
    insights.push({
      id: 'frequency-drop',
      tone: 'negative',
      title: 'Queda na frequência semanal',
      description: `Frequência ${ctx.frequencyTrend.label} em relação ao período anterior.`,
    });
  }

  // Receita subiu.
  if (ctx.revenueTrend.direction === 'up' && ctx.revenueTrend.percent !== null) {
    insights.push({
      id: 'revenue-up',
      tone: 'positive',
      title: 'Receita em alta',
      description: `Receita ${ctx.revenueTrend.label} no período (${brCurrency.format(ctx.revenueInPeriod)}).`,
    });
  }

  // Receita caiu.
  if (ctx.revenueTrend.direction === 'down' && ctx.revenueTrend.percent !== null) {
    insights.push({
      id: 'revenue-down',
      tone: 'negative',
      title: 'Receita em queda',
      description: `Receita ${ctx.revenueTrend.label} no período (${brCurrency.format(ctx.revenueInPeriod)}).`,
    });
  }

  // Pagamentos atrasados.
  if (ctx.overduePaymentsCount > 0) {
    insights.push({
      id: 'overdue-payments',
      tone: 'warning',
      title: 'Pagamentos atrasados',
      description: `${ctx.overduePaymentsCount} pagamento(s) em atraso, total de ${brCurrency.format(ctx.overdueAmount)}.`,
    });
  }

  // Aluno em maior evolução.
  const top = ctx.topActiveStudents[0];
  if (top && top.count > 0) {
    insights.push({
      id: 'top-student',
      tone: 'positive',
      title: 'Aluno em maior evolução',
      description: `${top.name} lidera com ${top.count} treino(s) concluído(s) no período.`,
    });
  }

  // Crescimento de novos alunos.
  if (ctx.newStudentsTrend.direction === 'up' && ctx.newStudentsTrend.percent !== null) {
    insights.push({
      id: 'new-students-up',
      tone: 'positive',
      title: 'Captação aquecida',
      description: `${ctx.newStudentsInPeriod} novo(s) aluno(s) no período (${ctx.newStudentsTrend.label}).`,
    });
  }

  return insights;
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

  // Janelas do período ativo e anterior (timestamps p/ filtros de volume).
  const rangeStart = new Date(opts.range.start).getTime();
  const rangeEnd = new Date(opts.range.end).getTime();
  const prevStart = new Date(opts.previousRange.start).getTime();
  const prevEnd = new Date(opts.previousRange.end).getTime();

  const completedInPeriod = logs.filter(
    (l) => isCompleted(l) && inRange(getLogDate(l), rangeStart, rangeEnd)
  );
  const completedInPrevious = logs.filter(
    (l) => isCompleted(l) && inRange(getLogDate(l), prevStart, prevEnd)
  );

  const totalVolume = completedInPeriod.reduce((sum, log) => sum + getLogTotalVolume(log), 0);
  const previousTotalVolume = completedInPrevious.reduce(
    (sum, log) => sum + getLogTotalVolume(log),
    0
  );

  // Força/volume do período ativo: best1RM, topExercise e série de volume
  // refletem a janela selecionada (o gráfico de volume acompanha o filtro).
  const strength = buildStrengthTracker(completedInPeriod);
  const best1RM = maxValue(
    strength.byExercise.map((e) => ({ date: '', value: e.best1RM }))
  );
  const topExercise =
    strength.byExercise.length > 0
      ? { name: strength.byExercise[0].exerciseName, volume: strength.byExercise[0].totalVolume }
      : null;

  // Derivadas para gráficos (Fase 3): volume por treino e aderência por aluno.
  const volumeTrend: VolumeTrendPoint[] = strength.byEvolution.map((point) => ({
    date: point.date,
    value: point.value ?? 0,
  }));

  const topActiveStudents = computeTopActiveStudents(students, completedInPeriod);
  const studentsAtRisk = computeStudentsAtRisk(students, payments, logs, opts);
  const studentAdherence = computeStudentAdherence(students, completedInPeriod);

  const revenueTrend = computeTrend(revenue.revenueInPeriod, revenue.previousRevenueInPeriod);
  const workoutTrend = computeTrend(workoutMetrics.workoutsInPeriod, workoutMetrics.previousWorkoutsInPeriod);
  const frequencyTrend = computeTrend(
    workoutMetrics.weeklyFrequencyInPeriod,
    workoutMetrics.previousWeeklyFrequencyInPeriod
  );
  const newStudentsTrend = computeTrend(
    studentMetrics.newStudentsInPeriod,
    studentMetrics.previousNewStudentsInPeriod
  );
  const volumeTrendKpi = computeTrend(totalVolume, previousTotalVolume);

  const periodLabel =
    opts.period === 'custom'
      ? 'Personalizado'
      : PERIOD_LABELS[opts.period as Exclude<AnalyticsPeriod, 'custom'>] ?? 'Personalizado';

  const insights = buildInsights({
    riskInactiveDays: opts.riskInactiveDays,
    studentsAtRisk,
    topActiveStudents,
    revenueTrend,
    frequencyTrend,
    workoutTrend,
    newStudentsTrend,
    revenueInPeriod: revenue.revenueInPeriod,
    workoutsInPeriod: workoutMetrics.workoutsInPeriod,
    weeklyFrequencyInPeriod: workoutMetrics.weeklyFrequencyInPeriod,
    overduePaymentsCount: revenue.overduePaymentsCount,
    overdueAmount: revenue.overdueAmount,
    newStudentsInPeriod: studentMetrics.newStudentsInPeriod,
  });

  return {
    ...studentMetrics,
    ...workoutMetrics,
    ...revenue,
    totalVolume,
    averageVolumePerWorkout: completedInPeriod.length > 0 ? totalVolume / completedInPeriod.length : 0,
    best1RM,
    topExerciseByVolume: topExercise,
    topActiveStudents,
    studentsAtRisk,
    studentAdherence,
    volumeTrend,
    // Fase 4
    period: opts.period,
    periodLabel,
    range: opts.range,
    previousRange: opts.previousRange,
    revenueSeries: revenue.revenueSeries,
    workoutSeriesByPeriod: workoutMetrics.workoutSeriesByPeriod,
    revenueInPeriod: revenue.revenueInPeriod,
    previousRevenueInPeriod: revenue.previousRevenueInPeriod,
    workoutsInPeriod: workoutMetrics.workoutsInPeriod,
    previousWorkoutsInPeriod: workoutMetrics.previousWorkoutsInPeriod,
    weeklyFrequencyInPeriod: workoutMetrics.weeklyFrequencyInPeriod,
    previousWeeklyFrequencyInPeriod: workoutMetrics.previousWeeklyFrequencyInPeriod,
    newStudentsInPeriod: studentMetrics.newStudentsInPeriod,
    previousNewStudentsInPeriod: studentMetrics.previousNewStudentsInPeriod,
    revenueTrend,
    workoutTrend,
    frequencyTrend,
    newStudentsTrend,
    volumeTrendKpi,
    insights,
  };
}

/**
 * Série de volume (kg) por treino, pronta para o LineChart (gráficos Fase 2).
 * Reutiliza a série `byEvolution` do strengthService.
 */
export function buildVolumeTrend(logs: WorkoutLog[]) {
  return buildStrengthTracker(logs).byEvolution;
}
