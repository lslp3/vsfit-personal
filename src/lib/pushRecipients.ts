import type { Student } from '../types/database';

/**
 * RESOLUÇÃO DE DESTINATÁRIOS DE PUSH — fonte única de verdade do fluxo
 * Central de Alunos → Enviar push.
 *
 * PROBLEMA CORRIGIDO (auditoria): o modal de push usava exclusivamente
 * `students.auth_user_id` (coluna LEGADA) para definir "tem acesso ao app",
 * enquanto o restante da Central (filtro "Sem acesso", badge do card,
 * perfil do aluno) considera também `student_accounts.auth_user_id`
 * (estrutura ATUAL) e flags de acesso. Alunos cujo vínculo de auth vive
 * apenas na student_accounts apareciam "com acesso" na Central, mas contavam
 * 0 no modal de push.
 *
 * REGRA ÚNICA de resolução (por aluno):
 *   1. `student.auth_user_id` (legado);
 *   2. senão `student.student_accounts[].auth_user_id` (atual);
 *   3. senão `student.student_account` singular (legado de joins antigos).
 *   4. Nenhum -> não elegível.
 *
 * BLOQUEADOS NUNCA são destinatários (mesma regra do AccessBadge do perfil e
 * do card da Central):
 *   - `app_access_status === 'blocked'`
 *   - `login_enabled === false`
 *
 * Garantias:
 *   - zero queries no banco (usa apenas o que StudentsPage já carrega);
 *   - no máximo UM destinatário por aluno (prioridade legada -> conta);
 *   - um mesmo auth uid só gera um destinatário (deduplica dados legados
 *     inconsistentes — nunca envia 2 notificações para o mesmo usuário).
 */

export interface PushRecipient {
  student: Student;
  /** auth uid do DESTINATÁRIO (auth.users) — o que a Edge Function espera em user_id. */
  authUserId: string;
}

/** Estado de acesso bloqueado — espelha a regra existente da Central
 * (StudentProfilePage AccessBadge / cards): bloqueio é "red" no UI. */
export function isPushBlocked(student: Student): boolean {
  return (
    student?.app_access_status === 'blocked' ||
    student?.login_enabled === false
  );
}

function accountAuthUserId(student: Student): string | null {
  // Mesma semântica do hasAppAccess (Central): `student_accounts` (array)
  // OU `student_account` singular (joins legados). Array vazio equivale a
  // "sem contas" e cai no singular quando existir.
  const legacy = student as unknown as {
    student_account?: { auth_user_id?: string | null } | null;
  };
  const accounts = student.student_accounts;

  if (accounts && accounts.length > 0) {
    for (const account of accounts) {
      if (account?.auth_user_id) return account.auth_user_id;
    }
    return null;
  }

  return legacy.student_account?.auth_user_id ?? null;
}

/** Resolve UM aluno -> destinatário (ou null quando não elegível). */
export function resolvePushRecipient(student: Student): PushRecipient | null {
  if (!student || isPushBlocked(student)) return null;

  const authUserId =
    student.auth_user_id ??
    accountAuthUserId(student) ??
    null;

  if (!authUserId) return null;

  return { student, authUserId };
}

/** Resolve um lote de alunos selecionados -> lista única de destinatários.
 * Importa os dados já carregados (students + student_accounts); NÃO consulta
 * o banco. Cada aluno gera no máximo um destinatário. */
export function resolvePushRecipients(students: Student[]): PushRecipient[] {
  const recipients: PushRecipient[] = [];
  const seenAuthUserIds = new Set<string>();

  for (const student of students) {
    const resolved = resolvePushRecipient(student);
    if (!resolved) continue;
    if (seenAuthUserIds.has(resolved.authUserId)) continue;
    seenAuthUserIds.add(resolved.authUserId);
    recipients.push(resolved);
  }

  return recipients;
}

/**
 * Contrato de retorno da Edge Function `send-push-notification` visto do
 * cliente (normalizado por `pushTrigger.sendPush`). Permite à UI distinguir
 * "envio aceito" de "nenhum dispositivo recebeu".
 */
export interface PushSendOutcome {
  /** true quando a Edge aceitou o pedido sem erro de chamada. */
  ok: boolean;
  /** nº de dispositivos que responderam sucesso ao FCM (HTTP 200). */
  sent: number;
  /** nº de dispositivos (tokens) localizados para o usuário. */
  devices: number;
  /** true quando o push foi bloqueado pelas preferências do destinatário. */
  blocked: boolean;
}

/**
 * Entrega REAL aconteceu? Só true quando ao menos UM dispositivo recebeu.
 * `devices: 0` / `blocked: true` / erro de chamada => false.
 */
export function isPushDelivered(outcome?: PushSendOutcome | null): boolean {
  return Boolean(outcome && outcome.ok && !outcome.blocked && outcome.sent > 0);
}