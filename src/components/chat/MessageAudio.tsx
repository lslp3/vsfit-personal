import { Music, RefreshCw } from 'lucide-react';

import { useChatMediaUrl } from '../../hooks/useChatMediaUrl';
import type { Message } from '../../types/database';

/**
 * Sprint 13 — Chat Media (ETAPA 3: Preview).
 *
 * Renderiza uma mensagem de ÁUDIO dentro do bubble do chat.
 * Player HTML5 nativo (<audio>) compacto com controles básicos (play/pause,
 * seek, volume). A src é uma signed URL temporária do bucket privado.
 *
 * Estados: carregando (geração da URL), erro (com retry), reprodução.
 */
export function MessageAudio({ msg }: { msg: Message }) {
  const { url, loading, error, retry } = useChatMediaUrl(msg.id, msg.media_url);

  const caption = msg.content && msg.content !== msg.media_url ? msg.content : null;

  if (loading) {
    return (
      <div className="relative flex h-14 w-64 max-w-full items-center justify-center">
        <div className="absolute inset-0 animate-pulse rounded-xl bg-white/[0.06]" />
        <Music className="h-4 w-4 text-zinc-400" />
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="flex h-14 w-64 max-w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3">
        <Music className="h-4 w-4 text-zinc-500" />
        <p className="flex-1 truncate text-[11px] text-zinc-400">
          Não foi possível carregar o áudio.
        </p>
        <button
          type="button"
          onClick={retry}
          aria-label="Tentar novamente"
          className="flex items-center justify-center rounded-full bg-white/[0.08] p-1.5 text-white transition-all active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex w-64 max-w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2">
        <Music className="h-5 w-5 shrink-0 text-white/60" />
        <audio src={url} controls preload="metadata" className="h-9 min-w-0 flex-1 [&::-webkit-media-controls-panel]:bg-transparent" />
      </div>

      {caption && (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
          {caption}
        </p>
      )}
    </>
  );
}