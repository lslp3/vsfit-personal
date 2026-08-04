import { useCallback, useEffect, useMemo, useState } from 'react';

import { getSignedChatMediaUrl } from '../services/chatMediaService';

/**
 * Sprint 13 — Chat Media (ETAPA 3: Preview).
 *
 * Hook de resolução de signed URL para mídia PRIVADA do chat.
 *
 * Objetivo: o bucket `chat-files` é privado — NUNCA usar publicUrl nem acesso
 * direto ao Storage. O acesso à mensagem é via signed URL curta (1h) gerada
 * por `getSignedChatMediaUrl`.
 *
 * Cache: um Map module-level (`signedUrlCache`) chave por `messageId` evita
 * regenerar a assinatura a cada render (o default do Supabase gera ~10k
 * assinaturas/hora — estouraria renderizando todas as mensagens repetidamente,
 * risco R2). A mesma mensagem reutiliza a URL até expirar.
 *
 * Uso:
 *   const { url, loading, error, retry } = useChatMediaUrl(messageId, media_url);
 */
const signedUrlCache = new Map<string, string>();

/** Cache em memória por messageId — compartilhado entre os bubbles. */
export function clearChatMediaUrlCache(): void {
  signedUrlCache.clear();
}

interface useChatMediaUrlResult {
  url: string | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useChatMediaUrl(
  messageId: string,
  mediaUrl: string | null
): useChatMediaUrlResult {
  // Se não há path (media_url null) ou já está cacheado, resolve sem efeito.
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    url: string | null;
    loading: boolean;
    error: string | null;
  }>(() => {
    if (!mediaUrl) return { url: null, loading: false, error: null };
    const cached = signedUrlCache.get(messageId);
    return { url: cached ?? null, loading: !cached, error: null };
  });

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  const key = `${messageId}`;

  useEffect(() => {
    // Sem path → nada a fazer.
    if (!mediaUrl) return;

    const cached = signedUrlCache.get(key);
    if (cached) {
      setState({ url: cached, loading: false, error: null });
      return;
    }

    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    getSignedChatMediaUrl(mediaUrl)
      .then((signedUrl) => {
        if (!active) return;
        signedUrlCache.set(key, signedUrl);
        setState({ url: signedUrl, loading: false, error: null });
      })
      .catch((err) => {
        if (!active) return;
        console.error('[useChatMediaUrl] signed url error:', err);
        setState({
          url: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Falha ao carregar mídia.',
        });
      });

    return () => {
      active = false;
    };
  }, [key, mediaUrl, attempt]);

  // Memo dos campos retornados (estável enquanto state não muda).
  return useMemo(
    () => ({ ...state, retry }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.url, state.loading, state.error, retry]
  );
}

/** Formata bytes → "1,2 MB" (usado no card de documento). */
export function formatMediaSize(bytes?: number | null): string {
  if (typeof bytes !== 'number' || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}