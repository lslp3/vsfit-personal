import { getWorkoutPlansByTrainer } from './workoutService';
import { getWorkoutLogsByTrainer } from './workoutService';
import { getPaymentsByTrainer } from './paymentService';
import { getStudentMetricsByTrainer } from './progressService';

import type { WorkoutPlan, WorkoutLog, Payment, StudentMetrics } from '../types/database';

/**
 * AUDIT SERVICE — Sprint 16 · Fase 1 (Central de Controle de Alunos).
 *
 * Camada de AGREGAÇÃO em lote para a carteira do Personal.
 * Garantia: NENHUMA query por aluno (sem N+1). Todas as consultas são
 * feitas agrupadas por trainer_id (batch) e os dados são montados em um
 * mapa por student_id no frontend.
 *
 * Estrutura de dados derivada para o CARD PREMIUM de cada aluno.
 */
export interface StudentCardAudit {
  /** Id do aluno de referência. */
  studentId: string;

  /** Treino publicado em curso (activePlan). null se não houver plano publicado. */
  activePlanName: string | null;
  activePlanId: string | null;

  /** Data ISO do último treino CONCLUÍDO do aluno. null se nunca treinou. */
  lastWorkoutAt: string | null;

  /** Número inteiro de dias desde o último treino (0 = treinou hoje). */
  daysSinceLastWorkout: number | null;

  /** Adesão (0..100) baseada em logs concluídos nos últimos 30 dias. */
  adherencePercent: number | null;

  /** Peso (kg) da última avaliação registrada. */
  lastWeight: number | null;

  /** Variação de peso (kg) entre a última e a penúltima avaliação. */
  weightDelta: number | null;

  /** Data ISO da última avaliação registrada (student_metrics). null se nunca avaliado. */
  lastAssessmentAt: string | null;

  /** 'true' se o aluno tem ao menos um treino publicado (em curso OU vencido). */
  hasPublishedPlan: boolean;

  /** Data de vencimento do próximo pagamento pendente/atrasado. */
  nextDueDate: string | null;

  /** 'true' se o aluno tem ao menos um pagamento 'overdue'. */
  isOverdue: boolean;

  /** indicador se o card deve destacar atenção. */
  needsAttention: boolean;
}

/** Referência padrão de treinos por semana utilizada no cálculo de aderência. */
const DEFAULT_WEEKLY_FREQUENCY = 3;
/** Janela (dias) da aderência. */
const ADHERENCE_WINDOW_DAYS = 30;

function parseDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isLogCompleted(log: WorkoutLog): boolean {
  return String(log.status) === 'completed' || Boolean(log.completed_at);
}

function daysBetween(earlier: Date, later: Date): number {
  const MS_DAY = 86400000;
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / MS_DAY));
}

function isPlanActive(plan: WorkoutPlan): boolean {
  if (plan.status !== 'published') return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (plan.start_date) {
    const start = parseDate(plan.start_date);
    if (start && start.getTime() > today.getTime()) return false;
  }

  if (plan.end_date) {
    const end = parseDate(plan.end_date);
    if (end && end.getTime() < today.getTime()) return false;
  }

  return true;
}

/**
 * Calcula a aderência (0..100) a partir dos logs do aluno na janela (30 dias):
 * treinos concluídos ÷ (frequência semanal de referência × semanas no período).
 * Sem dormir em 100%. Sem freu, retorna null.
 */
function computeAdherence(logs: WorkoutLog[], now: Date): number | null {
  const days = DEFAULT_WEEKLY_FREQUENCY;
  const cutoff = new Date(now.getTime() - ADHERENCE_WINDOW_DAYS * 86400000);

  const completed = logs.filter((log) => {
    if (!isLogCompleted(log)) return false;
    const d = parseDate(log.completed_at || log.created_at);
    return d !== null && d.getTime() >= cutoff.getTime();
  }).length;

  const expected = days * (ADHERENCE_WINDOW_DAYS / 7);

  if (expected <= 0) return null;

  return Math.max(0, Math.min(100, Math.round((completed / expected) * 100)));
}

/**
 * Resumo executivo da carteira do Personal (Sprint 16 · Fase 2).
 * Derivado EXCLUSIVAMENTE de dados já carregados pela Fase 1 (students,
 * auditMap por aluno e payments do batch) — nenhuma query adicional.
 */
export interface PortfolioSummary {
  total: number;
  active: number;
  paused: number;
  inactive: number;
  /** Novos alunos cujo created_at cai nos últimos 30 dias corridos. */
  newStudents: number;
  /** Média da aderência (0..100) da carteira; null se nenhum aluno com dados. */
  avgAdherence: number | null;
  /** Receita recebida (status 'paid') paga nos últimos 30 dias corridos. */
  revenueReceived: number;
  /** Saldo pendente (status 'pending'), sem filtro de período. */
  pendingAmount: number;
  /** Saldo inadimplente (status 'overdue'), sem filtro de período. */
  overdueAmount: number;
}

/** Janela fixa de 30 dias corridos para novos alunos e receita recebida. */
const SUMMARY_WINDOW_DAYS = 30;

/**
 * Deriva o resumo da carteira a partir de dados já em memória.
 * Função pura (sem I/O) — não faz nenhuma consulta.
 */
export function buildPortfolioSummary(
  students: Array<{ id: string; status?: string | null; created_at?: string | null }>,
  auditMap: Record<string, StudentCardAudit>,
  payments: Payment[],
  now: Date = new Date()
): PortfolioSummary {
  const cutoff = new Date(now.getTime() - SUMMARY_WINDOW_DAYS * 86400000);

  let active = 0;
  let paused = 0;
  let inactive = 0;
  let newStudents = 0;

  students.forEach((student) => {
    const status = String(student.status || 'active').toLowerCase();

    if (status === 'paused') paused += 1;
    else if (status === 'inactive') inactive += 1;
    else active += 1;

    const created = parseDate(student.created_at);
    if (created && created.getTime() >= cutoff.getTime()) {
      newStudents += 1;
    }
  });

  // Aderência média (média dos alunos com aderência conhecida).
  let adherenceSum = 0;
  let adherenceCount = 0;
  students.forEach((student) => {
    const audit = auditMap[student.id];
    if (audit && typeof audit.adherencePercent === 'number') {
      adherenceSum += audit.adherencePercent;
      adherenceCount += 1;
    }
  });
  const avgAdherence = adherenceCount > 0 ? Math.round(adherenceSum / adherenceCount) : null;

  // Receita e pendências — derivadas do batch de payments já carregado.
  let revenueReceived = 0;
  let pendingAmount = 0;
  let overdueAmount = 0;

  payments.forEach((payment) => {
    const status = String(payment.status || '').toLowerCase();

    if (status === 'paid') {
      const paid = parseDate(payment.paid_at);
      if (paid && paid.getTime() >= cutoff.getTime()) {
        revenueReceived += Number(payment.amount) || 0;
      }
    } else if (status === 'pending') {
      pendingAmount += Number(payment.amount) || 0;
    } else if (status === 'overdue') {
      overdueAmount += Number(payment.amount) || 0;
    }
  });

  return {
    total: students.length,
    active,
    paused,
    inactive,
    newStudents,
    avgAdherence,
    revenueReceived,
    pendingAmount,
    overdueAmount,
  };
}

/**
 * Retorna o mapa `student_id -> StudentCardAudit` para TODOS os alunos do
 * trainer. Realiza apenas consultas em lote agrupadas por trainer_id
 * (4 queries, independentemente do nº de alunos — sem N+1).
 */
export async function getStudentAuditByTrainer(
  trainerId: string
): Promise<{ cards: Record<string, StudentCardAudit>; payments: Payment[] }> {
  const now = new Date();

  const [plans, logs, payments, metrics] = await Promise.all([
    getWorkoutPlansByTrainer(trainerId),
    getWorkoutLogsByTrainer(trainerId),
    getPaymentsByTrainer(trainerId),
    getStudentMetricsByTrainer(trainerId),
  ]);

  // --- Plano ativo por aluno -------------------------------------------------
  const plansByStudent = new Map<string, WorkoutPlan[]>();
  (plans as WorkoutPlan[]).forEach((plan) => {
    if (!plan.student_id) return;
    if (!plansByStudent.has(plan.student_id)) {
      plansByStudent.set(plan.student_id, []);
    }
    plansByStudent.get(plan.student_id)!.push(plan);
  });

  // --- Logs do aluno + últimos treinos ----------------------------------------
  const logsByStudent = new Map<string, WorkoutLog[]>();
  const lastCompletedByStudent = new Map<string, Date>();

  logs.forEach((log) => {
    if (!log.student_id) return;

    if (!logsByStudent.has(log.student_id)) {
      logsByStudent.set(log.student_id, []);
    }
    logsByStudent.get(log.student_id)!.push(log);

    if (isLogCompleted(log)) {
      const d = parseDate(log.completed_at || log.created_at);
      if (!d) return;
      const current = lastCompletedByStudent.get(log.student_id);
      if (!current || d.getTime() > current.getTime()) {
        lastCompletedByStudent.set(log.student_id, d);
      }
    }
  });

  // --- Pagamentos -------------------------------------------------------------
  const paymentsByStudent = new Map<string, Payment[]>();
  payments.forEach((payment) => {
    if (!payment.student_id) return;
    if (!paymentsByStudent.has(payment.student_id)) {
      paymentsByStudent.set(payment.student_id, []);
    }
    paymentsByStudent.get(payment.student_id)!.push(payment);
  });

  // --- Métricas (avaliações) ----------------------------------------------------
  const metricsByStudent = new Map<string, StudentMetrics[]>();
  metrics.forEach((metric) => {
    if (!metric.student_id) return;
    if (!metricsByStudent.has(metric.student_id)) {
      metricsByStudent.set(metric.student_id, []);
    }
    metricsByStudent.get(metric.student_id)!.push(metric);
  });

  // --- Montagem do mapa final ---------------------------------------------------
  const result: Record<string, StudentCardAudit> = {};

  const allStudentIds = new Set([
    ...plansByStudent.keys(),
    ...logsByStudent.keys(),
    ...paymentsByStudent.keys(),
    ...metricsByStudent.keys(),
  ]);

  allStudentIds.forEach((studentId) => {
    const studentPlans = (plansByStudent.get(studentId) || []).filter(isPlanActive);
    const activePlan = studentPlans.sort((a, b) =>
      String(b.created_at).localeCompare(String(a.created_at))
    )[0] || null;

    const studentLogs = logsByStudent.get(studentId) || [];
    const lastWorkout = lastCompletedByStudent.get(studentId) || null;

    let daysSinceLastWorkout: number | null = null;
    if (lastWorkout) {
      daysSinceLastWorkout = daysBetween(lastWorkout, now);
    }

    const adherencePercent = computeAdherence(studentLogs, now);

    const studentMetrics = (metricsByStudent.get(studentId) || []).sort(
      (a, b) =>
        String(b.date).localeCompare(String(a.date)) ||
        String(b.created_at).localeCompare(String(a.created_at))
    );
    const latestMetric = studentMetrics[0] || null;
    const previousMetric = studentMetrics[1] || null;
    const lastWeight =
      typeof latestMetric?.weight === 'number' && Number.isFinite(latestMetric.weight)
        ? latestMetric.weight
        : null;
    let weightDelta: number | null = null;
    if (
      lastWeight !== null &&
      typeof previousMetric?.weight === 'number' &&
      Number.isFinite(previousMetric.weight)
    ) {
      weightDelta = Math.round((lastWeight - previousMetric.weight) * 10) / 10;
    }

    const studentPayments = paymentsByStudent.get(studentId) || [];

    const activePayment =
      studentPayments
        .filter((p) => p.status === 'pending' || p.status === 'overdue')
        .sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || '')))[0] ||
      null;

    const isOverdue = studentPayments.some(
      (p) => String(p.status).toLowerCase() === 'overdue'
    );

    // Indicadores de atenção: sem plano publicado OU 7+ dias sem treinar OU inadimplente.
    const hasRecentWorkout = lastWorkout !== null && daysSinceLastWorkout !== null &&
      daysSinceLastWorkout < 7;
    const needsAttention = Boolean(activePlan) === false ||
      (lastWorkout !== null && !hasRecentWorkout && daysSinceLastWorkout !== null) ||
      lastWorkout === null ||
      isOverdue;

    result[studentId] = {
      studentId,
      activePlanName: activePlan?.name || null,
      activePlanId: activePlan?.id || null,
      lastWorkoutAt: lastWorkout ? lastWorkout.toISOString() : null,
      daysSinceLastWorkout,
      adherencePercent,
      lastWeight,
      weightDelta,
      lastAssessmentAt: latestMetric?.date || null,
      hasPublishedPlan: (plansByStudent.get(studentId) || []).some(
        (plan) => plan.status === 'published'
      ),
      nextDueDate: activePayment?.due_date || null,
      isOverdue,
      needsAttention,
    };
  });

  return { cards: result, payments };
}