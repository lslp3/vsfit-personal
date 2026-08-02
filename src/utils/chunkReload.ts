/**
 * Utilitários para tratar erros de carregamento de chunk em produção (PWA).
 *
 * Causa: o Service Worker precacheia o index.html e os chunk/js de um build
 * antigo. Quando ocorre um novo deploy, os assets ganham novos hashes; se a
 * sessão atual ainda roda o build antigo e navega para uma rota lazy que
 * ainda não foi carregada, o navegador tenta buscar um chunk antigo que já
 * não existe no novo deploy → "Failed to fetch dynamically imported module".
 *
 * A estratégia é: em vez de mostrar a tela de erro, recarregar a página UMA
 * vez por sessão (o cluster do SW autoUpdate já estará atualizado e o index
 * novo referencia os hashes corretos). Isso preserva a versão mais recente
 * e evita loops infinitos de reload com um flag em sessionStorage.
 */

const MAX_RELOADS = 3;
const RELOAD_FLAG = 'vsf_chunk_error_reload_done';

const CHUNK_ERROR_PATTERNS = [
  /ChunkLoadError/i,
  /loading chunk \d+/i,
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload css/i,
  /attempted to import/i,
  /the module might dynamically unavailable/i,
];

export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : String(error || '');

  return CHUNK_ERROR_PATTERNS.some((pattern) =>
    pattern.test(message)
  );
}

/**
 * Recarrega a página até MAX (rel) vezes por sessão quando o erro é de chunk
 * desatualizado. Antes de recarregar, pede ao Service Worker para verificar
 * atualização (`registration.update()`) — isso acelera o autoUpdate e faz o
 * index/chunks novos serem servidos. Retorna true se disparou o reload.
 */
export function reloadForStaleChunk(
  error: unknown
): boolean {
  if (!isChunkLoadError(error)) {
    return false;
  }

  let attempts = 0;

  try {
    attempts = Number(
      sessionStorage.getItem(RELOAD_FLAG) || '0'
    );
  } catch {
    // sessionStorage pode falhar em contextos restritos.
  }

  if (attempts >= MAX_RELOADS) {
    // Esgotou as tentativas nesta sessão: deixar o ErrorBoundary agir.
    return false;
  }

  try {
    sessionStorage.setItem(
      RELOAD_FLAG,
      String(attempts + 1)
    );
  } catch {
    // Sem sessão disponível: tenta mesmo assim (1 vez).
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistration()
      .then((registration) => {
        // Força a checagem de um Service Worker novo (autoUpdate).
        if (registration) {
          void registration.update();
        }
      })
      .catch(() => {
        // Ignora falha no update; o reload em si já resolve em muitos casos.
      });
  }

  window.setTimeout(() => {
    window.location.reload();
  }, 0);

  return true;
}