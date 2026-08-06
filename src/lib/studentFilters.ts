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

/* ────────────────────────────────────────────────────────────
   SPRINT 16 · FASE 5 — ORDENAÇÃO INTELIGENTE
   Lógica pura (client-side) sobre students[] + auditMap[].
   SEM consultas, SEM N+1.
   ──────────────────────────────────────────────────────────── */

export type SortKey =
  | 'name_asc'
  | 'name_desc'
  | 'last_workout'
  | 'adherence_desc'
  | 'adherence_asc'
  | 'next_due'
  | 'created_desc'
  | 'created_asc'
  | 'risk_first';

/** Opções de ordenação exibidas na barra de ordenação (rótulos pt-BR). */
export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name_asc', label: 'Nome (A-Z)' },
  { key: 'name_desc', label: 'Nome (Z-A)' },
  { key: 'last_workout', label: 'Último treino' },
  { key: 'adherence_desc', label: 'Maior aderência' },
  { key: 'adherence_asc', label: 'Menor aderência' },
  { key: 'next_due', label: 'Próximo vencimento' },
  { key: 'created_desc', label: 'Mais recente cadastro' },
  { key: 'created_asc', label: 'Mais antigo cadastro' },
  { key: 'risk_first', label: 'Maior risco' },
];

/**
 * Ordena a lista de alunos conforme a chave, usando exclusivamente os dados
 * já em memória. Deve ser aplicada APÓS o filtro (ordenação + filtro são
 * etapas independentes; o caller filtra primeiro e ordena depois).
 *
 * Regra de nulos: campos ausentes (sem treino, sem aderência, sem vencimento)
 * vão SEMPRE para o final da lista em qualquer direção, para não "lixar" o topo.
 */
export function sortStudents(
  students: Student[],
  auditMap: Record<string, StudentCardAudit | undefined>,
  sort: SortKey
): Student[] {
  const auditOf = (s: Student) => auditMap[s.id];

  const nameOf = (s: Student) => String(s.name || '').toLowerCase();
  const workoutMs = (s: Student) => {
    const at = auditOf(s)?.lastWorkoutAt;
    return at ? new Date(at).getTime() : null;
  };
  const adherenceOf = (s: Student) => auditOf(s)?.adherencePercent ?? null;
  const dueOf = (s: Student) => {
    const d = auditOf(s)?.nextDueDate;
    return d ? new Date(d).getTime() : null;
  };
  const createdMs = (s: Student) => {
    const c = s.created_at;
    return c ? new Date(c).getTime() : null;
  };

  const sorted = [...students];

  switch (sort) {
    case 'name_asc':
      sorted.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
      break;

    case 'name_desc':
      sorted.sort((a, b) => nameOf(b).localeCompare(nameOf(a)));
      break;

    case 'last_workout': {
      // Mais recente primeiro (maior timestamp). Nulos no final.
      sorted.sort((a, b) => {
        const am = workoutMs(a);
        const bm = workoutMs(b);
        if (am === null && bm === null) return 0;
        if (am === null) return 1;
        if (bm === null) return -1;
        return bm - am;
      });
      break;
    }

    case 'adherence_desc': {
      sorted.sort((a, b) => {
        const aa = adherenceOf(a);
        const ba = adherenceOf(b);
        if (aa === null && ba === null) return 0;
        if (aa === null) return 1;
        if (ba === null) return -1;
        return ba - aa;
      });
      break;
    }

    case 'adherence_asc': {
      sorted.sort((a, b) => {
        const aa = adherenceOf(a);
        const ba = adherenceOf(b);
        if (aa === null && ba === null) return 0;
        if (aa === null) return 1;
        if (ba === null) return -1;
        return aa - ba;
      });
      break;
    }

    case 'next_due': {
      // Próximo vencimento = menor data de vencimento futura/pendente primeiro.
      sorted.sort((a, b) => {
        const am = dueOf(a);
        const bm = dueOf(b);
        if (am === null && bm === null) return 0;
        if (am === null) return 1;
        if (bm === null) return -1;
        return am - bm;
      });
      break;
    }

    case 'created_desc':
      sorted.sort((a, b) => {
        const am = createdMs(a);
        const bm = createdMs(b);
        if (am === null && bm === null) return 0;
        if (am === null) return 1;
        if (bm === null) return -1;
        return bm - am;
      });
      break;

    case 'created_asc':
      sorted.sort((a, b) => {
        const am = createdMs(a);
        const bm = createdMs(b);
        if (am === null && bm === null) return 0;
        if (am === null) return 1;
        if (bm === null) return -1;
        return am - bm;
      });
      break;

    case 'risk_first':
      // Alunos em risco (needsAttention) primeiro.
      sorted.sort((a, b) => {
        const ar = auditOf(a)?.needsAttention === true ? 0 : 1;
        const br = auditOf(b)?.needsAttention === true ? 0 : 1;
        if (ar !== br) return ar - br;
        // Desempate: menor aderência primeiro (mais crítico).
        const aa = adherenceOf(a);
        const ba = adherenceOf(b);
        if (aa === null && ba === null) return 0;
        if (aa === null) return 1;
        if (ba === null) return -1;
        return aa - ba;
      });
      break;
  }

  return sorted;
}

/* ────────────────────────────────────────────────────────────
   SPRINT 16 · FASE 5 · ETAPA 3 — EXPORT CSV (100% client-side)
   Usa exclusivamente students[] + auditMap[]. SEM queries.
   ──────────────────────────────────────────────────────────── */

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  // Escapa aspas e embrulha em aspas se houver separador, aspas ou quebra de linha.
  const escaped = text.replace(/"/g, '""');
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}

/**
 * Gera o CSV (string) com a carteira informada. A ordenação/dedup é com o
 * caller (studentFilters). Nenhuma query — apenas formatação de linha.
 */
export function buildStudentsCsv(
  rows: { student: Student; audit?: StudentCardAudit | null }[]
): string {
  const header = [
    'nome',
    'email',
    'status',
    'aderencia %',
    'ultimo_treino_dias',
    'proximo_vencimento',
    'peso_kg',
    'plano_ativo',
    'precisa_atencao',
    'ultima_avaliacao',
    'telefone',
  ];

  const lines = rows.map(({ student, audit }) => {
    const nextDue = audit?.nextDueDate
      ? new Date(audit.nextDueDate).toLocaleDateString('pt-BR')
      : '';
    const lastAssessment = audit?.lastAssessmentAt
      ? new Date(audit.lastAssessmentAt).toLocaleDateString('pt-BR')
      : '';

    return [
      student.name || '',
      student.email || '',
      student.status || '',
      audit?.adherencePercent ?? '',
      audit?.daysSinceLastWorkout ?? '',
      audit?.isOverdue ? 'atrasado' : nextDue,
      audit?.lastWeight ?? '',
      audit?.activePlanName || '',
      audit?.needsAttention ? 'sim' : 'nao',
      lastAssessment,
      (student as any).phone || '',
    ]
      .map(csvCell)
      .join(',');
  });

  return [header.join(','), ...lines].join('\n');
}

/** Dispara o download do CSV no navegador (client-side). */
export function downloadStudentsCsv(csv: string, filename = 'alunos.csv'): void {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}