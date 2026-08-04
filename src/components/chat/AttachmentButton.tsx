import { Paperclip, X } from 'lucide-react';

import { cn } from '../../lib/utils';
import { openChatFilePicker } from '../../utils/chatFilePicker';

interface AttachmentButtonProps {
  /** Mantida por compatibilidade (ChatPage/StudentChatPage ainda passam);
   *  o seletor agora é GLOBAL via openChatFilePicker() — não há input local. */
  onFileSelected?: (file: File | null) => void;
  /** true quando há arquivo selecionado — o botão vira "remover anexo". */
  hasFile?: boolean;
  onRemoveFile?: () => void;
  disabled?: boolean;
  /** Mantida por compatibilidade; o accept real vive no input global. */
  accept?: string;
}

/**
 * Sprint 13 — Chat Media (fix intermitente do seletor).
 *
 * Botão de anexo do compositor. NÃO possui <input type="file"> próprio: ele
 * apenas abre o seletor GLOBAL (openChatFilePicker), cujo input é montado na
 * raiz da app (main.tsx), FORA da árvore que desmonta (RouterProvider/ChatPage).
 *
 * Isso resolve o caso em que o Android abre o file picker, o WebView vai a
 * background, o ChatPage é desmontado (fluxo de auth) e o `change` do input
 * antigo se perdia — o File agora chega ao chatMediaStore via input persistente.
 *
 * Com `hasFile`, o botão vira um X para remover a seleção atual.
 */
export function AttachmentButton({
  onFileSelected: _onFileSelected,
  hasFile,
  onRemoveFile,
  disabled,
  accept: _accept,
}: AttachmentButtonProps) {
  function handleClick() {
    if (disabled) return;

    if (hasFile) {
      onRemoveFile?.();
      return;
    }

    // Abre o seletor GLOBAL (input persistente fora da árvore que desmonta).
    openChatFilePicker();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={hasFile ? 'Remover anexo' : 'Anexar arquivo'}
      title={hasFile ? 'Remover anexo' : 'Anexar arquivo'}
      disabled={disabled}
      className={cn(
        'pointer-events-auto inline-flex shrink-0 cursor-pointer select-none items-center justify-center rounded-full p-3 text-white/70 transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-40',
        hasFile
          ? 'bg-white/[0.08] text-white hover:bg-white/[0.12]'
          : 'hover:bg-white/[0.06] hover:text-white'
      )}
    >
      {hasFile ? (
        <X className="h-5 w-5" />
      ) : (
        <Paperclip className="h-5 w-5" />
      )}
    </button>
  );
}