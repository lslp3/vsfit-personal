import { AnimatePresence, motion } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PushBannerData {
  title: string;
  body: string;
  route: string;
  event_type?: string;
}

interface PushBannerProps {
  push: PushBannerData | null;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * Sprint 12 — ETAPA 6: banner interno de push (foreground).
 * Segue o Design System do VSFit (dark/glass, acento #ff2a32, framer-motion).
 * No foreground NÃO é exibida a notificação padrão do sistema.
 */
export function PushBanner({ push, onOpen, onClose }: PushBannerProps) {
  return (
    <AnimatePresence>
      {push && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -18, scale: 0.97 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={onOpen}
          className="fixed left-4 right-4 top-4 z-[9999] mx-auto max-w-md rounded-2xl border border-white/10 bg-[#0c0c0c]/95 p-3 text-left shadow-[0_18px_45px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                'bg-[#ff2a32]/15 text-[#ff2a32]'
              )}
            >
              <Bell className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-black leading-tight text-white">
                {push.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                {push.body}
              </p>
            </div>

            <button
              type="button"
              aria-label="Fechar"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
              className="shrink-0 rounded-full p-1 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}