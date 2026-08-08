// ============================================================================
// VSFit Personal — delete-student · NÚCLEO PURO (sem Deno, sem supabase-js)
// ----------------------------------------------------------------------------
// Este módulo concentra TODA a lógica de decisão da exclusão de aluno,
// com dependências injetadas (I/O). Ele roda tanto dentro da Edge Function
// (Deno) quanto nos testes unitários (node:test via Node 26 type stripping).
//
// CONTRATO DE SEGURANÇA:
//   401 — usuário não autenticado (JWT ausente/ inválido)
//   403 — perfil sem permissão OU aluno de outro personal (NUNCA destrutivo)
//   404 — aluno inexistente/already removido (idempotente, consistente)
//   400 — studentId inválido
//   500 — falha na purga transacional (rollback no banco; nada foi removido)
//   200 — dados removidos; auth pode ter falhado (databaseDeleted=true,
//         authDeleted=false, authCleanupError preenchido) — estado
//         determinístico, NUNCA mentir para o cliente.
// ============================================================================

/** Resultado retornado ao cliente — sem dados sensíveis internos. */
export interface DeleteStudentResult {
  success: boolean;
  studentId: string;
  databaseDeleted: boolean;
  authDeleted: boolean;
  authCleanupError?: string;
}

/** Falha padronizada (corpo de erro). */
export interface DeleteFailure {
  success: false;
  error: string;
}

/** Corpo + status HTTP produzidos pelo fluxo. */
export type EdgeOutcome =
  | { status: 400 | 401 | 403 | 404 | 500; body: DeleteFailure }
  | { status: 200; body: DeleteStudentResult };

/** Chamador resolvido a partir do JWT verificado. */
export interface CallerInfo {
  /** auth.uid() — usuário autenticado (sub do JWT verificado). */
  authUserId: string | null;
  /** id do perfil trainer (trainer_profiles.id) — null se não for personal. */
  trainerId: string | null;
}

/** Snapshot mínimo do aluno buscado ANTES de qualquer DELETE. */
export interface StudentSnapshot {
  id: string;
  trainerId: string | null;
  /** students.auth_user_id (modelo legado). */
  authUserId: string | null;
  /** student_accounts.auth_user_id (modelo atual). */
  accountAuthUserId: string | null;
}

export interface AuthRemovalResult {
  ok: boolean;
  error?: string;
}

/** Dependências de I/O injetáveis — o que torna o fluxo testável. */
export interface DeleteStudentDeps {
  /** Resolve o chamador a partir do JWT (401/403 já decidem aqui). */
  resolveCaller(): Promise<CallerInfo>;
  /** Busca o aluno + account (NUNCA retorna dados sensíveis além do necessário). */
  fetchStudent(studentId: string): Promise<StudentSnapshot | null>;
  /** FASE A — chama a RPC transacional (rollback completo em erro). */
  purgeDatabase(studentId: string, trainerId: string): Promise<void>;
  /** FASE B — remove um usuário do Supabase Auth (idempotente). */
  removeAuthUser(authUserId: string): Promise<AuthRemovalResult>;
}

// ---------------------------------------------------------------------------
// Helpers puros
// ---------------------------------------------------------------------------

/** Normaliza o studentId recebido no corpo da requisição. */
export function normalizeStudentId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Constrói a lista ÚNICA de auth user ids associados ao aluno.
 *
 * students.auth_user_id e student_accounts.auth_user_id podem ser:
 * iguais, diferentes, nulos ou apenas um preenchido. Deduplica com Set —
 * nunca excluir o mesmo Auth user duas vezes.
 */
export function collectAuthUserIds(...ids: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const id of ids) {
    if (typeof id !== 'string') continue;
    const clean = id.trim();
    if (clean.length > 0) seen.add(clean);
  }
  return [...seen];
}

/**
 * Erro de remoção de Auth equivalente a "usuário já não existe" → considera
 * a remoção concluída (idempotência). GoTrue retorna mensagens do tipo
 * "User not found" ao tentar remover um usuário que já não existe.
 */
export function isAuthUserAlreadyGone(errorMessage: unknown): boolean {
  if (typeof errorMessage !== 'string' || errorMessage.trim().length === 0) return false;
  return /user.*not\s+found|not\s+found.*user|does\s+not\s+exist|already\s+removed|no\s+longer\s+exist/i.test(
    errorMessage.trim()
  );
}

// ---------------------------------------------------------------------------
// ORQUESTRAÇÃO PRINCIPAL
// ---------------------------------------------------------------------------

/**
 * Executa o fluxo completo de exclusão:
 *
 *   validação → snapshot → FASE A (purga transacional) → FASE B (Auth)
 *
 * Regras de ouro:
 * - Nenhum DELETE acontece antes de ownership confirmado.
 * - A purga é UMA transação (RPC) — erro no meio ⇒ rollback total.
 * - Auth é removido SOMENTE depois do commit do banco (Fase B), nunca
 *   dentro da transação SQL.
 * - Auth user NUNCA é removido se não estiver associado ao aluno (os IDs
 *   vêm exclusivamente do snapshot do próprio aluno).
 */
export async function runDeleteStudentFlow(
  rawStudentId: unknown,
  deps: DeleteStudentDeps
): Promise<EdgeOutcome> {
  const studentId = normalizeStudentId(rawStudentId);
  if (!studentId) {
    return {
      status: 400,
      body: { success: false, error: 'studentId não informado ou inválido.' },
    };
  }

  const caller = await deps.resolveCaller();
  if (!caller.authUserId) {
    return { status: 401, body: { success: false, error: 'Usuário não autenticado.' } };
  }
  if (!caller.trainerId) {
    return {
      status: 403,
      body: { success: false, error: 'Apenas personal trainers podem excluir alunos.' },
    };
  }

  // Snapshot ANTES de qualquer delete — fonte única dos auth IDs.
  const snapshot = await deps.fetchStudent(studentId);
  if (!snapshot) {
    // Idempotente e consistente: aluno já removido também cai aqui.
    return { status: 404, body: { success: false, error: 'Aluno não encontrado.' } };
  }

  if (snapshot.trainerId !== caller.trainerId) {
    return {
      status: 403,
      body: { success: false, error: 'Este aluno não pertence ao seu perfil.' },
    };
  }

  // ------------------------------------------------------------------
  // FASE A — purga transacional (executada via RPC SECURITY DEFINER).
  // Qualquer erro lançado força rollback no banco; nada foi removido.
  // ------------------------------------------------------------------
  try {
    await deps.purgeDatabase(snapshot.id, caller.trainerId);
  } catch (error) {
    console.error('[delete-student] falha na purga (rollback):', error);
    return {
      status: 500,
      body: {
        success: false,
        error: 'Erro ao remover os dados do aluno. Nenhum dado foi removido.',
      },
    };
  }

  // ------------------------------------------------------------------
  // FASE B — Auth (pós-commit). Não participa da transação SQL de propósito.
  // Se falhar: NÃO restauramos o aluno; reportamos o estado real.
  // ------------------------------------------------------------------
  const authIds = collectAuthUserIds(snapshot.authUserId, snapshot.accountAuthUserId);
  const failures: string[] = [];

  for (const authId of authIds) {
    const result = await deps.removeAuthUser(authId);
    if (!result.ok && !isAuthUserAlreadyGone(result.error)) {
      failures.push(result.error || 'erro desconhecido ao remover usuário de acesso');
    }
  }

  const authDeleted = failures.length === 0;
  const body: DeleteStudentResult = {
    success: true,
    studentId: snapshot.id,
    databaseDeleted: true,
    authDeleted,
  };
  if (!authDeleted) {
    body.authCleanupError = failures.join(' | ');
    console.error(`[delete-student] dados removidos mas Auth falhou (${snapshot.id}): ${body.authCleanupError}`);
  }

  return { status: 200, body };
}