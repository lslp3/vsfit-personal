// ============================================================================
// VSFit Personal — delete-student · TIPOS E HELPERS DO CLIENTE
// ----------------------------------------------------------------------------
// Contratos JSON trafegados entre o app e a Edge Function `delete-student`,
// mais helpers PURAS de decisão de UI (mensagens, remoção da lista, cache).
// Nenhum destes helpers toca Supabase — são unit-testáveis via node:test.
// ============================================================================

/** Corpo enviado à Edge Function `delete-student`. */
export interface DeleteStudentRequest {
  studentId: string;
}

/**
 * Resultado retornado pela Edge Function (e repassado ao app).
 *
 * Semântica (determinística — nunca mentir para o usuário):
 * - success: false    → nada foi removido (banco rejeitou/falhou).
 * - success: true + databaseDeleted: true + authDeleted: true
 *                     → purga completa, inclusive acesso/Auth.
 * - success: true + databaseDeleted: true + authDeleted: false
 *     (+ authCleanupError) → dados foram removidos, MAS o usuário de
 *     acesso (Auth) não pôde ser removido. NÃO é erro de rollback.
 */
export interface DeleteStudentResult {
  success: boolean;
  studentId: string;
  databaseDeleted: boolean;
  authDeleted: boolean;
  authCleanupError?: string;
}

/** Corpo de falha HTTP (401/403/404/500) retornado pela Edge Function. */
export interface DeleteStudentFailure {
  success: false;
  error: string;
}

/** Decisões de UI derivadas de um resultado/erro de exclusão. */
export type StudentDeletionFeedback =
  | {
      kind: 'success';
      message: string;
      removeFromList: boolean;
      clearCache: boolean;
    }
  | {
      kind: 'partial-success';
      message: string;
      removeFromList: boolean;
      clearCache: boolean;
    }
  | {
      kind: 'error';
      message: string;
      removeFromList: boolean;
      clearCache: boolean;
    };

/**
 * Traduz o resultado da Edge Function em: mensagem exata, remoção da lista
 * e decisão de limpar cache. O app (perfil/Central) apenas OBEDECE estas
 * flags — não duplica lógica.
 */
export function buildStudentDeletionOutcome(result: DeleteStudentResult | null): StudentDeletionFeedback {
  // Falha (HTTP não-2xx, timeout, erro de rede, banco recusou):
  // nada foi removido — aluno permanece na lista, cache intocado,
  // mensagem honesta.
  if (!result || !result.success || !result.databaseDeleted) {
    return {
      kind: 'error',
      message: 'Não foi possível excluir o aluno. Nenhum dado foi removido.',
      removeFromList: false,
      clearCache: false,
    };
  }

  // Sucesso parcial: banco limpo, Auth falhou → não restaurar nada, só avisar.
  if (!result.authDeleted) {
    return {
      kind: 'partial-success',
      message:
        'Aluno excluído com sucesso. Nenhum dado foi removido do cadastro, mas o usuário de acesso não pôde ser removido.',
      removeFromList: true,
      clearCache: true,
    };
  }

  return {
    kind: 'success',
    message: 'Aluno excluído com sucesso.',
    removeFromList: true,
    clearCache: true,
  };
}

/**
 * Por segurança: somente um resultado bem-sucedido (banco removido) libera
 * a remoção do aluno da lista local.
 */
export function shouldRemoveStudentFromList(result: DeleteStudentResult | null): boolean {
  return Boolean(result && result.success && result.databaseDeleted);
}

/**
 * Proteção contra clique acidental: o modal só pode ser fechado (X, fundo,
 * Cancelar) quando NENHUMA operação de exclusão está em andamento.
 */
export function canCloseDeleteModal(loading: boolean): boolean {
  return !loading;
}

/**
 * Proteção contra duplo submit: o botão "Excluir aluno" fica desabilitado
 * (e em loading) durante toda a operação.
 */
export function isDeleteActionEnabled(loading: boolean): boolean {
  return !loading;
}