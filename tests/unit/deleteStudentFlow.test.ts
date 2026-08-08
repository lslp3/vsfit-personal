// ============================================================================
// VSFit Personal — Testes unitários do fluxo de EXCLUSÃO SEGURA DE ALUNO
// ----------------------------------------------------------------------------
// Cobre:
//   • lógica pura da Edge Function (supabase/functions/delete-student/logic.ts)
//     — validação de ownership, 401/403/404, purga transacional (Fase A),
//     remoção de Auth pós-commit (Fase B), deduplicação de auth ids,
//     idempotência e estado determinístico quando Auth falha;
//   • helpers de UI (src/lib/studentDeletion.ts) — mensagens honestas,
//     remoção da lista somente após sucesso, bloqueio do modal/botão.
//
// Execução: `node --test` (Node 26 type stripping, zero dependências).
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  runDeleteStudentFlow,
  collectAuthUserIds,
  normalizeStudentId,
  isAuthUserAlreadyGone,
  type DeleteStudentDeps,
} from '../../supabase/functions/delete-student/logic.ts';

import {
  buildStudentDeletionOutcome,
  shouldRemoveStudentFromList,
  canCloseDeleteModal,
  isDeleteActionEnabled,
  type DeleteStudentResult,
} from '../../src/lib/studentDeletion.ts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TRAINER = 'trainer-1';
const OTHER_TRAINER = 'trainer-2';
const STUDENT = '11111111-1111-1111-1111-111111111111';
const AUTH_STUDENT = 'auth-student';
const AUTH_ACCOUNT = 'auth-account';

interface FakeCalls {
  purge: Array<{ studentId: string; trainerId: string }>;
  removals: string[];
}

function makeDeps(overrides?: Partial<DeleteStudentDeps>): {
  deps: DeleteStudentDeps;
  calls: FakeCalls;
} {
  const calls: FakeCalls = { purge: [], removals: [] };

  const deps: DeleteStudentDeps = {
    resolveCaller: async () => ({ authUserId: TRAINER, trainerId: TRAINER }),
    fetchStudent: async () => ({
      id: STUDENT,
      trainerId: TRAINER,
      authUserId: AUTH_STUDENT,
      accountAuthUserId: null,
    }),
    purgeDatabase: async (studentId, trainerId) => {
      calls.purge.push({ studentId, trainerId });
    },
    removeAuthUser: async (authUserId) => {
      calls.removals.push(authUserId);
      return { ok: true };
    },
    ...overrides,
  };

  return { deps, calls };
}

function okStudentResult(overrides: Partial<DeleteStudentResult> = {}): DeleteStudentResult {
  return {
    success: true,
    studentId: STUDENT,
    databaseDeleted: true,
    authDeleted: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Personal autenticado consegue excluir PRÓPRIO aluno (sucesso completo)
// ---------------------------------------------------------------------------
test('personal consegue excluir próprio aluno (purga + auth no fluxo correto)', async () => {
  const { deps, calls } = makeDeps();

  const outcome = await runDeleteStudentFlow(STUDENT, deps);

  assert.equal(outcome.status, 200);
  assert.equal(outcome.status === 200 && outcome.body.success, true);
  if (outcome.status !== 200) return;
  assert.equal(outcome.body.databaseDeleted, true);
  assert.equal(outcome.body.authDeleted, true);
  assert.equal(outcome.body.authCleanupError, undefined);

  // Fase A: purga transacional chamada com o par correto (aluno, trainer).
  assert.deepEqual(calls.purge, [{ studentId: STUDENT, trainerId: TRAINER }]);

  // Fase B: auth removido UMA vez, após o commit do banco.
  assert.deepEqual(calls.removals, [AUTH_STUDENT]);
});

// ---------------------------------------------------------------------------
// 2. Personal A tentando excluir aluno do Personal B → 403, ZERO alterações
// ---------------------------------------------------------------------------
test('personal de outro trainer recebe 403 e nada é apagado', async () => {
  const { deps, calls } = makeDeps({
    fetchStudent: async () => ({
      id: STUDENT,
      trainerId: OTHER_TRAINER,
      authUserId: AUTH_STUDENT,
      accountAuthUserId: null,
    }),
  });

  const outcome = await runDeleteStudentFlow(STUDENT, deps);

  assert.equal(outcome.status, 403);
  assert.equal(outcome.status !== 200 && outcome.body.success, false);
  assert.deepEqual(calls.purge, [], 'purga não pode ser executada');
  assert.deepEqual(calls.removals, [], 'auth não pode ser removido');
});

// ---------------------------------------------------------------------------
// 3. Usuário não autenticado → 401, ZERO alterações
// ---------------------------------------------------------------------------
test('usuário não autenticado recebe 401 e nada é apagado', async () => {
  const { deps, calls } = makeDeps({
    resolveCaller: async () => ({ authUserId: null, trainerId: null }),
  });

  const outcome = await runDeleteStudentFlow(STUDENT, deps);

  assert.equal(outcome.status, 401);
  assert.deepEqual(calls.purge, []);
  assert.deepEqual(calls.removals, []);
});

// ---------------------------------------------------------------------------
// 4. alunoId inexistente → 404 consistente (idempotente), ZERO alterações
// ---------------------------------------------------------------------------
test('studentId inexistente recebe 404 e nada é apagado (idempotente)', async () => {
  const { deps, calls } = makeDeps({
    fetchStudent: async () => null,
  });

  const outcome = await runDeleteStudentFlow(STUDENT, deps);

  assert.equal(outcome.status, 404);
  assert.deepEqual(calls.purge, []);
  assert.deepEqual(calls.removals, []);
});

// ---------------------------------------------------------------------------
// 5. Aluno SEM auth_user_id → dados removidos, deleteUser NUNCA chamado
// ---------------------------------------------------------------------------
test('aluno sem auth_user_id: purga normal, removeAuthUser nunca é chamado', async () => {
  const { deps, calls } = makeDeps({
    fetchStudent: async () => ({
      id: STUDENT,
      trainerId: TRAINER,
      authUserId: null,
      accountAuthUserId: null,
    }),
  });

  const outcome = await runDeleteStudentFlow(STUDENT, deps);

  assert.equal(outcome.status, 200);
  if (outcome.status !== 200) return;
  assert.equal(outcome.body.databaseDeleted, true);
  assert.equal(outcome.body.authDeleted, true, 'sem auth ids → auth considerado ok');
  assert.deepEqual(calls.removals, []);
});

// ---------------------------------------------------------------------------
// 6. auth_user_id SOMENTE em students → deleteUser chamado 1×
// ---------------------------------------------------------------------------
test('auth apenas em students.auth_user_id → um único removeAuthUser', async () => {
  const { deps, calls } = makeDeps({
    fetchStudent: async () => ({
      id: STUDENT,
      trainerId: TRAINER,
      authUserId: AUTH_STUDENT,
      accountAuthUserId: null,
    }),
  });

  const outcome = await runDeleteStudentFlow(STUDENT, deps);

  assert.equal(outcome.status, 200);
  assert.deepEqual(calls.removals, [AUTH_STUDENT]);
});

// ---------------------------------------------------------------------------
// 7. auth_user_id SOMENTE em student_accounts → deleteUser chamado 1×
// ---------------------------------------------------------------------------
test('auth apenas em student_accounts.auth_user_id: um único removeAuthUser', async () => {
  const { deps, calls } = makeDeps({
    fetchStudent: async () => ({
      id: STUDENT,
      trainerId: TRAINER,
      authUserId: null,
      accountAuthUserId: AUTH_ACCOUNT,
    }),
  });

  const outcome = await runDeleteStudentFlow(STUDENT, deps);

  assert.equal(outcome.status, 200);
  assert.deepEqual(calls.removals, [AUTH_ACCOUNT]);
});

// ---------------------------------------------------------------------------
// 8. MESMO auth_user_id nos dois lugares → deleteUser chamado UMA vez
// ---------------------------------------------------------------------------
test('mesmo auth id em students e student_accounts: deduplicado (1 remoção)', async () => {
  const { deps, calls } = makeDeps({
    fetchStudent: async () => ({
      id: STUDENT,
      trainerId: TRAINER,
      authUserId: AUTH_ACCOUNT,
      accountAuthUserId: AUTH_ACCOUNT,
    }),
  });

  const outcome = await runDeleteStudentFlow(STUDENT, deps);

  assert.equal(outcome.status, 200);
  assert.deepEqual(calls.removals, [AUTH_ACCOUNT], 'id duplicado precisa ser único');
});

// ---------------------------------------------------------------------------
// 9. auth ids DIFERENTES nos dois lugares → ambos processados uma vez
// ---------------------------------------------------------------------------
test('auth ids diferentes: os dois são removidos (students + student_accounts)', async () => {
  const { deps, calls } = makeDeps({
    fetchStudent: async () => ({
      id: STUDENT,
      trainerId: TRAINER,
      authUserId: AUTH_STUDENT,
      accountAuthUserId: AUTH_ACCOUNT,
    }),
  });

  const outcome = await runDeleteStudentFlow(STUDENT, deps);

  assert.equal(outcome.status, 200);
  assert.deepEqual(new Set(calls.removals), new Set([AUTH_STUDENT, AUTH_ACCOUNT]));
});

// ---------------------------------------------------------------------------
// 10. Erro no meio da purga SQL → 500, ZERO remoção de Auth (Fase B nem roda)
// ---------------------------------------------------------------------------
test('erro na purga (RPC) → 500 e nenhum removeAuthUser é chamado', async () => {
  const { deps, calls } = makeDeps({
    purgeDatabase: async () => {
      calls.purge.push({ studentId: STUDENT, trainerId: TRAINER });
      throw new Error('relation "students" não existe (simulado)');
    },
  });

  const outcome = await runDeleteStudentFlow(STUDENT, deps);

  assert.equal(outcome.status, 500);
  assert.equal(outcome.status !== 200 && outcome.body.success, false);
  assert.deepEqual(calls.removals, [], 'Fase B só acontece após commit da Fase A');
});

// ---------------------------------------------------------------------------
// 11. Aluno já removido → comportamento idempotente (404, nada destrutivo)
// ---------------------------------------------------------------------------
test('aluno já removido: 404 consistente e idempotente, zero alterações', async () => {
  // Mesma interface de "studentId inexistente": o snapshot é NULL.
  const { deps, calls } = makeDeps({
    fetchStudent: async () => null,
  });

  const first = await runDeleteStudentFlow(STUDENT, deps);
  const second = await runDeleteStudentFlow(STUDENT, deps);

  assert.equal(first.status, 404);
  assert.equal(second.status, 404, 'mesma resposta em chamadas repetidas');
  assert.deepEqual(calls.purge, []);
  assert.deepEqual(calls.removals, []);
});

// ---------------------------------------------------------------------------
// 12. Cache é limpo após sucesso (decisão do helper de UI)
// ---------------------------------------------------------------------------
test('sucesso → clearCache=true, aluno sai da lista, mensagem de sucesso', () => {
  const outcome = buildStudentDeletionOutcome(okStudentResult());

  assert.equal(outcome.kind, 'success');
  assert.equal(outcome.clearCache, true);
  assert.equal(outcome.removeFromList, true);
  assert.equal(outcome.message, 'Aluno excluído com sucesso.');
  assert.equal(shouldRemoveStudentFromList(okStudentResult()), true);
});

// ---------------------------------------------------------------------------
// 13/14. UI só remove aluno da lista APÓS sucesso; mantém a lista em falha
// ---------------------------------------------------------------------------
test('falha → aluno permanece na lista, cache intocado, mensagem honesta', () => {
  const onError = buildStudentDeletionOutcome(null);

  assert.equal(onError.kind, 'error');
  assert.equal(onError.removeFromList, false, 'não pode sumir da lista');
  assert.equal(onError.clearCache, false, 'cache não pode ser limpo em falha');
  assert.equal(onError.message, 'Não foi possível excluir o aluno. Nenhum dado foi removido.');
  assert.equal(shouldRemoveStudentFromList(null), false);
});

test('banco recusou (success:false do servidor) → aluno permanece na lista', () => {
  const failed = buildStudentDeletionOutcome({
    success: false,
    studentId: STUDENT,
    databaseDeleted: false,
    authDeleted: false,
  });

  assert.equal(failed.kind, 'error');
  assert.equal(failed.removeFromList, false);
  assert.equal(failed.clearCache, false);
});

// ---------------------------------------------------------------------------
// 15. Botão/modal bloqueados durante a exclusão (proteção anti duplo clique)
// ---------------------------------------------------------------------------
test('modal e botão ficam bloqueados durante a exclusão', () => {
  assert.equal(canCloseDeleteModal(false), true);
  assert.equal(canCloseDeleteModal(true), false, 'não pode fechar durante operação');
  assert.equal(isDeleteActionEnabled(false), true);
  assert.equal(isDeleteActionEnabled(true), false, 'não pode disparar duplo submit');
});

// ---------------------------------------------------------------------------
// Edge Function — cenários de segurança restantes (spec §16)
// ---------------------------------------------------------------------------
test('401: sessão inválida (usuário de Auth sem perfil trainer) é bloqueado', async () => {
  // authUserId presente, mas NÃO é trainer → 403 (perfil sem permissão).
  const { deps, calls } = makeDeps({
    resolveCaller: async () => ({ authUserId: 'anon-user', trainerId: null }),
  });

  const outcome = await runDeleteStudentFlow(STUDENT, deps);

  assert.equal(outcome.status, 403);
  assert.deepEqual(calls.purge, []);
  assert.deepEqual(calls.removals, []);
});

test('studentId vazio/inválido → 400 antes de qualquer I/O', async () => {
  const { deps, calls } = makeDeps();

  const outcome = await runDeleteStudentFlow('   ', deps);

  assert.equal(outcome.status, 400);
  assert.equal(normalizeStudentId('   '), null);
  assert.deepEqual(calls.purge, []);
  assert.deepEqual(calls.removals, []);
});

test('Auth falha APÓS sucesso do banco → databaseDeleted=true, authDeleted=false', async () => {
  const { deps, calls } = makeDeps({
    removeAuthUser: async () => ({ ok: false, error: 'rede indisponível (simulado)' }),
  });

  const outcome = await runDeleteStudentFlow(STUDENT, deps);

  assert.equal(outcome.status, 200, 'banco já foi removido — não é erro HTTP');
  if (outcome.status !== 200) return;
  assert.equal(outcome.body.databaseDeleted, true);
  assert.equal(outcome.body.authDeleted, false);
  assert.equal(typeof outcome.body.authCleanupError, 'string', 'motivo documentado');

  // UI fiel: mensagem específica, NUNCA "nada foi removido".
  const feedback = buildStudentDeletionOutcome(outcome.body);
  assert.equal(feedback.kind, 'partial-success');
  assert.equal(feedback.removeFromList, true);
  assert.match(feedback.message, /Aluno excluído com sucesso/);
  assert.match(feedback.message, /usuário de acesso não pôde ser removido/);
});

test('Auth user já não existe → remoção de Auth considerada concluída (idempotente)', async () => {
  assert.equal(isAuthUserAlreadyGone('User not found'), true);
  assert.equal(isAuthUserAlreadyGone('user with this id does not exist'), true);
  assert.equal(isAuthUserAlreadyGone('network timeout'), false);

  const { deps } = makeDeps({
    removeAuthUser: async () => ({ ok: false, error: 'User not found' }),
  });

  const outcome = await runDeleteStudentFlow(STUDENT, deps);

  assert.equal(outcome.status, 200);
  if (outcome.status !== 200) return;
  assert.equal(outcome.body.databaseDeleted, true);
  assert.equal(outcome.body.authDeleted, true, 'usuário ausente não é falha');
  assert.equal(outcome.body.authCleanupError, undefined);
});

// ---------------------------------------------------------------------------
// 9b. Deduplicação pur (collect) — casos 8 e 9 reforçados no nível helper
// ---------------------------------------------------------------------------
test('collectAuthUserIds deduplica e ignora nulos/vazios', () => {
  assert.deepEqual(
    collectAuthUserIds('x', 'x', null, undefined, '', '  y  ', 'y'),
    ['x', 'y']
  );
  assert.deepEqual(collectAuthUserIds(null, undefined, ''), []);
});