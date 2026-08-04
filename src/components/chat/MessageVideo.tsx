import { RefreshCw, VideoOff } from 'lucide-react';

import { useChatMediaUrl } from '../../hooks/useChatMediaUrl';
import type { Message } from '../../types/database';

/**
 * Sprint 13 — Chat Media (ETAPA 3: Preview).
 *
 * Renderiza uma mensagem de VÍDEO dentro do bubble do chat.
 * Player HTML5 nativo (<video>), com controles e preload de metadados (não
 * baixa o arquivo inteiro de cara — performance). A src é uma signed URL
 * temporária do bucket privado; o navegador faz stream.
 *
 * Estados: carregando (geração da URL), erro (com retry), reprodução.
 */
export function MessageVideo({ msg }: { msg: Message }) {
  const { url, loading, error, retry } = useChatMediaUrl(msg.id, msg.media_url);

  const caption = msg.content && msg.content !== msg.media_url ? msg.content : null;

  if (loading) {
    return (
      <div className="relative flex h-40 w-64 max-w-full items-center justify-center">
        <div className="absolute inset-0 animate-pulse rounded-xl bg-white/[0.06]" />
        <span className="text-[11px] text-zinc-400">Carregando vídeo…</span>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="flex h-32 w-64 max-w-full flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <VideoOff className="h-6 w-6 text-zinc-500" />
        <p className="text-center text-[11px] leading-tight text-zinc-400">
          Não foi possível carregar o vídeo.
        </p>
        <button
          type="button"
          onClick={retry}
          className="flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold text-white transition-all active:scale-95"
        >
          <RefreshCw className="h-3 w-3" />
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <>
      <video
        src={url}
        controls
        preload="metadata"
        playsInline
        className="block h-auto max-h-80 w-64 max-w-full rounded-xl border border-white/10 bg-black object-contain"
      >
        Seu dispositivo não suporta reprodução de vídeo.
      </video>

      {caption && (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
          {caption}
        </p>
      )}
    </>
  );
}