import type { Student } from '../types/database';
import type { StudentCardAudit } from '../services/auditService';

/**
 * FILTROS INTELIGENTES — Sprint 16 · Fase 4.
 *
 * Painel da Central de Alunos. Toda a lógica é PURA (client-side), operando
 * somente sobre a carteira já carregada pela Fase 1 (students + auditMap) —
 * NENHUMA consulta adicional ao Supabase, sem N+1.
 */
export type SmartFilter =
  | 'all'
  | 'active'
  | 'paused'
  | 'inactive'
  | 'attention'
  | 'no_recent_workout'
  | 'overdue_payment'
  | 'new_student'
  | 'pending_assessment'
  | 'no_published_plan'
  | 'no_app_access';

/** Dias desde o último treino considerado "recente"; abaixo disso conta como atenção. */
export const RECENT_WORKOUT_DAYS = 7;

/** Janela (dias) para "Novos alunos" e para classificar uma avaliação como "pendente". */
export const SMART_WINDOW_DAYS = 30;

function parseDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(earlier: Date, later: Date): number {
  const MS_DAY = 86400000;
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / MS_DAY));
}

/**
 * Heurística de acesso ao app — espelha o card (StudentPremiumCard) para
 * garantir consistência entre o filtro "Sem acesso" e o badge do card.
 * Considera auth_user_id direto, student_accounts e flags explícitas.
 */
export function hasAppAccess(student: Student): boolean {
  const accounts =
    student.student_accounts ||
    (student as any).student_account ||
    null;

  return (
    Boolean(student.auth_user_id) ||
    (Array.isArray(accounts)
      ? accounts.some((account: any) => account.auth_user_id)
      : Boolean(accounts?.auth_user_id)) ||
    (student as any).has_app_access === true ||
    (student as any).app_access === true
  );
}

/**
 * Retorna 'true' se o estudante atende ao critério inteligente, usando
 * exclusivamente os dados já em memória.
 *
 * - all/active/paused/inactive  → refletem `student.status` (comportamento atual).
 * - attention                   → audit.needsAttention (sem plano ativo | 7+ dias | nunca treinou | inadimplente).
 * - no_recent_workout           → último treino há >= RECENT_WORKOUT_DAYS.
 * - overdue_payment             → pagamento 'overdue'.
 * - new_student                 → created_at nos últimos SMART_WINDOW_DAYS.
 * - pending_assessment          → nunca avaliado OU última avaliação há >= SMART_WINDOW_DAYS.
 * - no_published_plan           → sem nenhum treino publicado (inclui planos vencidos/arquivados).
 * - no_app_access               → aluno sem acesso ao app (mesma regra do card).
 */
export function matchesSmartFilter(
  student: Student,
  audit: StudentCardAudit | null | undefined,
  filter: SmartFilter,
  now: Date = new Date()
): boolean {
  const status = String(student.status || 'active').toLowerCase();
  const cutoff = new Date(now.getTime() - SMART_WINDOW_DAYS * 86400000);

  switch (filter) {
    case 'all':
      return true;

    case 'active':
      return status === 'active';

    case 'paused':
      return status === 'paused';

    case 'inactive':
      return status === 'inactive';

    case 'attention':
      return audit?.needsAttention === true;

    case 'no_recent_workout': {
      if (audit?.daysSinceLastWorkout === null || audit?.daysSinceLastWorkout === undefined) {
        return true; // nunca treinou — precisa de atenção
      }
      return audit.daysSinceLastWorkout >= RECENT_WORKOUT_DAYS;
    }

    case 'overdue_payment':
      return audit?.isOverdue === true;

    case 'new_student': {
      const created = parseDate(student.created_at);
      return created !== null && created.getTime() >= cutoff.getTime();
    }

    case 'pending_assessment': {
      const lastAssessment = parseDate(audit?.lastAssessmentAt);
      if (lastAssessment === null) return true; // nunca realizou avaliação
      return daysBetween(lastAssessment, now) >= SMART_WINDOW_DAYS;
    }

    case 'no_published_plan':
      return audit?.hasPublishedPlan === false;

    case 'no_app_access':
      return !hasAppAccess(student);

    default:
      return true;
  }
}