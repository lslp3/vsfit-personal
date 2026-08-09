// ============================================================================
// VSFit Personal — Testes unitários da RESOLUÇÃO DE DESTINATÁRIOS DE PUSH
// ----------------------------------------------------------------------------
// Cobre o bug da Central de Alunos → Enviar push: o modal contava e enviava
// apenas para alunos com `students.auth_user_id` (coluna legada), ignorando
// `student_accounts.auth_user_id` (estrutura atual) — por isso 1 aluno virava
// 0 e 4 viravam 1-2 no modal.
//
// Cenários (pedido do usuário):
//   1. auth legado presente (students.auth_user_id)          → usa legado
//   2. auth só na student_accounts (CENÁRIO QUEBRADO)        → usa da conta
//   3. nenhum auth                                            → não elegível
//   4. app_access_status = 'blocked'                         → bloqueado
//   5. login_enabled = false                                 → bloqueado
//   6. lote de 4 (A legado, B conta, C legado, D sem auth)   → 3 destinatários
//   7. seleção individual só com conta                       → 1 destinatário
//   8. dois ids diferentes (legado + conta)                  → prioridade legado
//   9. nenhum elegível em 4                                  → 0 destinatários
//  10. handleSendPush: envio usa o authUserId resolvido pela conta
//      (espelha o loop real do BulkActionsPanel com um sender fake)
//  11. isPushDelivered: devices:0 / blocked / erro ≠ entrega
//
// Execução: `npm test` (node --test, Node type stripping, zero dependências).
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  resolvePushRecipient,
  resolvePushRecipients,
  isPushBlocked,
  isPushDelivered,
} from '../../src/lib/pushRecipients.ts';
import type { Student, StudentAccount } from '../../src/types/database.ts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Aluno mínimo — Student real (getStudentsByTrainer traz `*, student_accounts(*)`). */
function student(overrides: Record<string, unknown> = {}): Student {
  return {
    id: 's-1',
    trainer_id: 't-1',
    auth_user_id: null,
    student_accounts: [],
    app_access_status: 'no_access',
    login_enabled: true,
    name: 'Aluno Teste',
    email: 'aluno@teste.dev',
    phone: null,
    birth_date: null,
    avatar_url: null,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Student;
}

function account(overrides: Record<string, unknown> = {}): StudentAccount {
  return {
    id: 'acc-1',
    student_id: 's-1',
    auth_user_id: null,
    email: 'aluno@teste.dev',
    temporary_password: null,
    must_change_password: false,
    last_login_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as StudentAccount;
}

// ---------------------------------------------------------------------------
// 1. Auth legado
// ---------------------------------------------------------------------------
test('T1 auth legado: usa students.auth_user_id', () => {
  const s = student({ auth_user_id: 'auth-1', student_accounts: [] });
  const recipient = resolvePushRecipient(s);

  assert.ok(recipient, 'deveria ser elegível');
  assert.equal(recipient!.authUserId, 'auth-1');
  assert.equal(recipient!.student, s);
});

// ---------------------------------------------------------------------------
// 2. Auth pela student_accounts — o caso que estava quebrado
// ---------------------------------------------------------------------------

test('T2 auth pela student_accounts: usa student_accounts.auth_user_id', () => {
  const s = student({ student_accounts: [account({ auth_user_id: 'auth-2' })] });
  const recipient = resolvePushRecipient(s);

  assert.ok(recipient, 'deveria ser elegível via conta');
  assert.equal(recipient!.authUserId, 'auth-2');
});

test('T2b student_account singular (legado de joins): usa auth_user_id', () => {
  const s = student({ student_account: account({ auth_user_id: 'auth-2b' }) });
  const recipient = resolvePushRecipient(s);

  assert.ok(recipient, 'deveria ser elegível via conta singular');
  assert.equal(recipient!.authUserId, 'auth-2b');
});

// ---------------------------------------------------------------------------
// 3. Sem acesso
// ---------------------------------------------------------------------------

test('T3 sem auth: não elegível', () => {
  const s = student({ auth_user_id: null, student_accounts: [] });
  assert.equal(resolvePushRecipient(s), null);
});

// ---------------------------------------------------------------------------
// 4. Bloqueado
// ---------------------------------------------------------------------------

test('T4 app_access_status blocked: nunca destinatário, mesmo com auth valido', () => {
  const s = student({
    auth_user_id: 'auth-4',
    student_accounts: [account({ auth_user_id: 'auth-4' })],
    app_access_status: 'blocked',
  });

  assert.equal(isPushBlocked(s), true);
  assert.equal(resolvePushRecipient(s), null);
});

// ---------------------------------------------------------------------------
// 5. Login desabilitado
// ---------------------------------------------------------------------------

test('T5 login_enabled false: nunca destinatário, mesmo com auth valido', () => {
  const s = student({ auth_user_id: 'auth-5', login_enabled: false });
  assert.equal(isPushBlocked(s), true);
  assert.equal(resolvePushRecipient(s), null);
});

// ---------------------------------------------------------------------------
// 6. Seleção de 4
// ---------------------------------------------------------------------------

test('T6 lote de 4 (A legado, B conta, C legado, D sem auth): 3 destinatários', () => {
  const students = [
    student({ id: 'a', auth_user_id: 'auth-A' }),
    student({
      id: 'b',
      auth_user_id: null,
      student_accounts: [account({ student_id: 'b', auth_user_id: 'auth-B' })],
    }),
    student({ id: 'c', auth_user_id: 'auth-C' }),
    student({ id: 'd', auth_user_id: null, student_accounts: [] }),
  ];

  const recipients = resolvePushRecipients(students);

  assert.equal(recipients.length, 3);
  assert.deepEqual(
    recipients.map((r) => r.authUserId),
    ['auth-A', 'auth-B', 'auth-C']
  );
});

// ---------------------------------------------------------------------------
// 7. Seleção individual
// ---------------------------------------------------------------------------

test('T7 1 aluno com auth só na conta: 1 destinatário (bug relatado)', () => {
  const s = student({
    auth_user_id: null,
    student_accounts: [account({ auth_user_id: 'auth-x' })],
  });

  const recipients = resolvePushRecipients([s]);

  assert.equal(recipients.length, 1);
  assert.equal(recipients[0]!.authUserId, 'auth-x');
});

// ---------------------------------------------------------------------------
// 8. Prioridade (dois ids diferentes)
// ---------------------------------------------------------------------------

test('T8 dua ids: prevalece students.auth_user_id e gera um só destinatário', () => {
  const s = student({
    auth_user_id: 'legacy-auth',
    student_accounts: [account({ auth_user_id: 'account-auth' })],
  });

  const recipients = resolvePushRecipients([s]);

  assert.equal(recipients.length, 1);
  assert.equal(recipients[0]!.authUserId, 'legacy-auth');
});

// ---------------------------------------------------------------------------
// 9. Nenhum elegível
// ---------------------------------------------------------------------------

test('T9 lote de 4 sem nenhum auth: 0 destinatários', () => {
  const students = [
    student({ id: 'a' }),
    student({ id: 'b' }),
    student({ id: 'c' }),
    student({ id: 'd' }),
  ];

  assert.equal(resolvePushRecipients(students).length, 0);
});

// ---------------------------------------------------------------------------
// 10. Envio: o loop usa o authUserId RESOLVIDO (não a coluna legada crua)
// ---------------------------------------------------------------------------

test('T10 handleSendPush: sender recebe o uid da conta quando legado é nulo', async () => {
  const s = student({
    id: 'student-b',
    auth_user_id: null,
    student_accounts: [account({ student_id: 'student-b', auth_user_id: 'auth-account' })],
  });

  const recipients = resolvePushRecipients([s]);

  // Espelha o loop do BulkActionsPanel.handleSendPush: para cada destinatário
  // resolvido, chama pushSystemNotification({ user: recipient.authUserId }).
  const sentUserIds: string[] = [];
  for (const { authUserId } of recipients) {
    sentUserIds.push(authUserId); // <-- exatamente o user do push real
  }

  assert.equal(sentUserIds.length, 1, 'um só envio');
  assert.equal(sentUserIds[0], 'auth-account', 'usa o uid da student_accounts');
});

test('T10b mesmo uid duplicado em dados legados: um só destinatário/envio', () => {
  const students = [
    student({ id: 'a', auth_user_id: 'dup-auth' }),
    student({
      id: 'b',
      auth_user_id: null,
      student_accounts: [account({ student_id: 'b', auth_user_id: 'dup-auth' })],
    }),
  ];

  const recipients = resolvePushRecipients(students);

  assert.equal(recipients.length, 1);
  assert.equal(recipients[0]!.authUserId, 'dup-auth');
});

// ---------------------------------------------------------------------------
// 11. Entrega real (contrato da Edge Function normalizado)
// ---------------------------------------------------------------------------

test('T11 isPushDelivered: só true quando ao menos um dispositivo recebeu', () => {
  assert.equal(isPushDelivered({ ok: true, sent: 2, devices: 2, blocked: false }), true);
  assert.equal(isPushDelivered({ ok: true, sent: 0, devices: 0, blocked: false }), false);
  assert.equal(isPushDelivered({ ok: true, sent: 0, devices: 2, blocked: false }), false);
  assert.equal(isPushDelivered({ ok: true, sent: 0, devices: 0, blocked: true }), false);
  assert.equal(isPushDelivered({ ok: false, sent: 0, devices: 0, blocked: false }), false);
  assert.equal(isPushDelivered(null), false);
  assert.equal(isPushDelivered(undefined), false);
});