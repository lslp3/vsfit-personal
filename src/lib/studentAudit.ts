import type { Payment, StudentMetrics, WorkoutLog, WorkoutPlan } from '../types/database';

/**
 * AUDIT CORE — agregação PURA da Central de Alunos (Sprint 16 · Fase 1).
 *
 * Regra fundamental: a carteira é definida EXCLUSIVAMENTE pelo conjunto de
 * `studentIds` (students.trainer_id === personal). Os dados complementares
 * (planos, treinos, avaliações, pagamentos, progresso) são OPCIONAIS e apenas
 * enriquecem o card do aluno — a ausência deles NUNCA remove o aluno da
 * Central de Alunos.
 *
 * Este módulo NÃO faz I/O: recebe os batches já carregados por trainer e
 * devolve o mapa `student_id -> StudentCardAudit` cobrindo TODOS os alunos
 * do roster (mesmo os sem nenhum registro complementar).
 */
export interface StudentCardAudit {
  /** Id do aluno de referência. */
  studentId: string;

  /** Treino publicado em curso (activePlan). null se não houver plano ativo. */
  activePlanName: string | null;
  activePlanId: string | null;

  /** Data ISO do último treino CONCLUÍDO do aluno. null se nunca treinou. */
  lastWorkoutAt: string | null;

  /** Número inteiro de dias desde o último treino (0 = treinou hoje). null se nunca treinou. */
  daysSinceLastWorkout: number | null;

  /** Adesão (0..100) baseada em logs concluídos nos últimos 30 dias. null sem logs. */
  adherencePercent: number | null;

  /** Peso (kg) da última avaliação registrada. null se nunca avaliado. */
  lastWeight: number | null;

  /** Variação de peso (kg) entre a última e a penúltima avaliação. */
  weightDelta: number | null;

  /** Data ISO da última avaliação registrada (student_metrics). null se nunca avaliado. */
  lastAssessmentAt: string | null;

  /** 'true' se o aluno tem ao menos um treino publicado (em curso OU vencido). */
  hasPublishedPlan: boolean;

  /** Data de vencimento do próximo pagamento pendente/atrasado. null se sem cobrança. */
  nextDueDate: string | null;

  /** 'true' se o aluno tem ao menos um pagamento 'overdue'. */
  isOverdue: boolean;

  /** Indicador se o card deve destacar atenção (sem plano ativo | 7+ dias | nunca treinou | inadimplente). */
  needsAttention: boolean;

  /** Contagens complementares (sempre numéricas — 0 = ausência, não invenção). */
  workoutPlanCount: number;
  workoutLogCount: number;
  metricCount: number;
  progressCount: number;
}

/** Referência padrão de treinos por semana utilizada no cálculo de aderência. */
const DEFAULT_WEEKLY_FREQUENCY = 3;
/** Janela (dias) da aderência. */
const ADHERENCE_WINDOW_DAYS = 30;
/** Dias desde o último treino considerados "recentes" para o indicador de atenção. */
const RECENT_WORKOUT_AUDIT_DAYS = 7;

function parseDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(earlier: Date, later: Date): number {
  const MS_DAY = 86400000;
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / MS_DAY));
}

function isLogCompleted(log: WorkoutLog): boolean {
  return String(log.status) === 'completed' || Boolean(log.completed_at);
}

/**
 * Data de execução de um log: `completed_at` preferencialmente, com fallback
 * para `started_at` e, por último, `created_at`.
 */
function logWorkoutDate(log: WorkoutLog): Date | null {
  return parseDate(log.completed_at || log.started_at || log.created_at);
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
 * Sem NENHUM log registrado retorna null (dado inexistente — não inventar 0%).
 */
function computeAdherence(logs: WorkoutLog[], now: Date): number | null {
  if (logs.length === 0) return null;

  const cutoff = new Date(now.getTime() - ADHERENCE_WINDOW_DAYS * 86400000);

  const completed = logs.filter((log) => {
    if (!isLogCompleted(log)) return false;
    const d = logWorkoutDate(log);
    return d !== null && d.getTime() >= cutoff.getTime();
  }).length;

  const expected = DEFAULT_WEEKLY_FREQUENCY * (ADHERENCE_WINDOW_DAYS / 7);

  if (expected <= 0) return null;

  return Math.max(0, Math.min(100, Math.round((completed / expected) * 100)));
}

/** Agrupa registros por student_id (mapa segundo, SÓ de registros do roster). */
function bucketByStudent<T extends { student_id?: string | null }>(records: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();

  records.forEach((record) => {
    const studentId = record?.student_id;
    if (!studentId) return;
    const list = map.get(studentId);
    if (list) list.push(record);
    else map.set(studentId, [record]);
  });

  return map;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export interface BuildStudentAuditInput {
  /** Ids dos alunos do trainer — A FONTE DA CENTRAL (students.trainer_id). */
  studentIds: string[];
  plans: WorkoutPlan[];
  logs: WorkoutLog[];
  payments: Payment[];
  metrics: StudentMetrics[];
  /** Registros de progresso (student_progress) — vazio se a tabela não tiver dados. */
  progressRecords: Array<{ id: string; student_id?: string | null }>;
}

/**
 * Monta o mapa `student_id -> StudentCardAudit` para TODOS os alunos do
 * roster, anexando os dados complementares quando existirem. Função pura —
 * sem I/O, sem queries — usada pela camada de serviço (auditService).
 */
export function buildStudentAuditMap(
  input: BuildStudentAuditInput,
  now: Date = new Date()
): Record<string, StudentCardAudit> {
  const plansByStudent = bucketByStudent(input.plans);
  const logsByStudent = bucketByStudent(input.logs);
  const paymentsByStudent = bucketByStudent(input.payments);
  const metricsByStudent = bucketByStudent(input.metrics);
  const progressByStudent = bucketByStudent(input.progressRecords);

  const result: Record<string, StudentCardAudit> = {};

  input.studentIds.forEach((studentId) => {
    const studentPlans = plansByStudent.get(studentId) || [];

    const activePlan =
      studentPlans
        .filter(isPlanActive)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null;

    const studentLogs = logsByStudent.get(studentId) || [];

    const lastWorkout = studentLogs.reduce<Date | null>((acc, log) => {
      if (!isLogCompleted(log)) return acc;
      const d = logWorkoutDate(log);
      if (!d) return acc;
      return acc === null || d.getTime() > acc.getTime() ? d : acc;
    }, null);

    const daysSinceLastWorkout = lastWorkout ? daysBetween(lastWorkout, now) : null;

    const adherencePercent = computeAdherence(studentLogs, now);

    const studentMetrics = (metricsByStudent.get(studentId) || []).sort(
      (a, b) =>
        String(b.date).localeCompare(String(a.date)) ||
        String(b.created_at).localeCompare(String(a.created_at))
    );
    const latestMetric = studentMetrics[0] || null;
    const previousMetric = studentMetrics[1] || null;
    const lastWeight = isFiniteNumber(latestMetric?.weight) ? latestMetric.weight : null;

    let weightDelta: number | null = null;
    if (lastWeight !== null && isFiniteNumber(previousMetric?.weight)) {
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

    const hasPublishedPlan = studentPlans.some((plan) => plan.status === 'published');

    const hasRecentWorkout =
      lastWorkout !== null &&
      daysSinceLastWorkout !== null &&
      daysSinceLastWorkout < RECENT_WORKOUT_AUDIT_DAYS;

    const needsAttention =
      activePlan === null ||
      lastWorkout === null ||
      (daysSinceLastWorkout !== null && !hasRecentWorkout) ||
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
      hasPublishedPlan,
      nextDueDate: activePayment?.due_date || null,
      isOverdue,
      needsAttention,
      workoutPlanCount: studentPlans.length,
      workoutLogCount: studentLogs.length,
      metricCount: studentMetrics.length,
      progressCount: (progressByStudent.get(studentId) || []).length,
    };
  });

  return result;
}