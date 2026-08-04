import { useState } from 'react';
import { ImageOff, RefreshCw, X, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useChatMediaUrl } from '../../hooks/useChatMediaUrl';
import type { Message } from '../../types/database';

/**
 * Sprint 13 — Chat Media (ETAPA 3: Preview).
 *
 * Renderiza uma mensagem de IMAGEM dentro do bubble do chat:
 * - thumbnail `object-contain` (respeita proporção; nunca corta);
 * - skeleton de loading enquanto a signed URL é gerada;
 * - estado de erro com botão "tentar novamente" (retry);
 * - clique → abre visualização ampliada via modal.
 *
 * A assinatura usa signed URL (bucket privado) — nunca publicUrl.
 */
export function MessageImage({ msg }: { msg: Message }) {
  const { url, loading, error, retry } = useChatMediaUrl(msg.id, msg.media_url);
  const [zoom, setZoom] = useState(false);

  const caption = msg.content && msg.content !== msg.media_url ? msg.content : null;

  if (loading) {
    return (
      <div className="relative flex h-48 w-64 max-w-full items-center justify-center">
        <div className="absolute inset-0 animate-pulse rounded-xl bg-white/[0.06]" />
        <span className="text-[11px] text-zinc-400">Carregando imagem…</span>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="flex h-32 w-64 max-w-full flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <ImageOff className="h-6 w-6 text-zinc-500" />
        <p className="text-center text-[11px] leading-tight text-zinc-400">
          Não foi possível carregar a imagem.
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
      <button
        type="button"
        onClick={() => setZoom(true)}
        aria-label="Ampliar imagem"
        className="group relative block w-64 max-w-full overflow-hidden rounded-xl border border-white/10"
      >
        <img
          src={url}
          alt={caption || 'Imagem'}
          className="block h-auto max-h-72 w-full object-contain"
          loading="lazy"
        />
        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
          <ZoomIn className="h-4 w-4" />
        </span>
      </button>

      {caption && (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
          {caption}
        </p>
      )}

      <AnimatePresence>
        {zoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setZoom(false)}
          >
            <button
              type="button"
              onClick={() => setZoom(false)}
              aria-label="Fechar"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.img
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={url}
              alt={caption || 'Imagem ampliada'}
              className="max-h-[85dvh] max-w-full rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}