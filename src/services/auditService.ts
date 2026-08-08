import { getWorkoutPlansByTrainer } from './workoutService';
import { getWorkoutLogsByTrainer } from './workoutService';
import { getPaymentsByTrainer } from './paymentService';
import { getStudentMetricsByTrainer, getStudentProgressByTrainer } from './progressService';
import { buildStudentAuditMap } from '../lib/studentAudit';

import type { Payment } from '../types/database';
import type { StudentCardAudit } from '../lib/studentAudit';

export type { StudentCardAudit } from '../lib/studentAudit';

/**
 * AUDIT SERVICE — Sprint 16 · Fase 1 (Central de Controle de Alunos).
 *
 * Camada de AGREGAÇÃO em lote para a carteira do Personal.
 * Garantia: NENHUMA query por aluno (sem N+1). Todas as consultas são
 * feitas agrupadas por trainer_id (batch) e os dados são montados em um
 * mapa por student_id no frontend.
 *
 * FONTE DA CENTRAL: a lista de `students` do trainer (students.trainer_id).
 * Os dados complementares (planos, treinos, avaliações, pagamentos e
 * progresso) são OPCIONAIS — a ausência não remove o aluno do mapa.
 * A agregação em si é uma função PURA em `../lib/studentAudit`.
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

function parseDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

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
 * trainer (base: `studentIds` vindos de students.trainer_id). Realiza apenas
 * consultas em lote agrupadas por trainer_id (5 queries, independentemente
 * do nº de alunos — sem N+1).
 */
export async function getStudentAuditByTrainer(
  trainerId: string,
  studentIds: string[]
): Promise<{ cards: Record<string, StudentCardAudit>; payments: Payment[] }> {
  const [plans, logs, payments, metrics, progressRecords] = await Promise.all([
    getWorkoutPlansByTrainer(trainerId),
    getWorkoutLogsByTrainer(trainerId),
    getPaymentsByTrainer(trainerId),
    getStudentMetricsByTrainer(trainerId),
    getStudentProgressByTrainer(trainerId),
  ]);

  const cards = buildStudentAuditMap(
    { studentIds, plans, logs, payments, metrics, progressRecords },
    new Date()
  );

  return { cards, payments };
}