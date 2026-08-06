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
 * Retorna o mapa `student_id -> StudentCardAudit` para TODOS os alunos do
 * trainer. Realiza apenas consultas em lote agrupadas por trainer_id
 * (N4 queries, independentemente do nº de alunos — sem N+1).
 */
export async function getStudentAuditByTrainer(
  trainerId: string
): Promise<Record<string, StudentCardAudit>> {
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
      nextDueDate: activePayment?.due_date || null,
      isOverdue,
      needsAttention,
    };
  });

  return result;
}