import { useRef } from 'react';
import { Paperclip, X } from 'lucide-react';

import { cn } from '../../lib/utils';

interface AttachmentButtonProps {
  onFileSelected: (file: File | null) => void;
  /** true quando há arquivo selecionado — o botão vira "remover anexo". */
  hasFile?: boolean;
  onRemoveFile?: () => void;
  disabled?: boolean;
  /** MIME types aceitos no seletor nativo (ex.: 'image/*,video/*,...'). */
  accept?: string;
}

/**
 * Sprint 13 — Chat Media (ETAPA 2).
 *
 * Botão de anexo do compositor de chat. Usa um <input type="file" hidden>
 * controlado — o value é resetado a cada clique, permitindo re-selecionar o
 * mesmo arquivo. Com `hasFile`, vira um X para remover a seleção atual.
 */
export function AttachmentButton({
  onFileSelected,
  hasFile,
  onRemoveFile,
  disabled,
  accept,
}: AttachmentButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    if (hasFile) {
      onRemoveFile?.();
      return;
    }

    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          onFileSelected(file);
        }}
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={hasFile ? 'Remover anexo' : 'Anexar arquivo'}
        title={hasFile ? 'Remover anexo' : 'Anexar arquivo'}
        className={cn(
          'shrink-0 rounded-full p-3 text-white/70 transition-all active:scale-90',
          hasFile
            ? 'bg-white/[0.08] text-white hover:bg-white/[0.12]'
            : 'hover:bg-white/[0.06] hover:text-white',
          'disabled:cursor-not-allowed disabled:opacity-40'
        )}
      >
        {hasFile ? (
          <X className="h-5 w-5" />
        ) : (
          <Paperclip className="h-5 w-5" />
        )}
      </button>
    </>
  );
}
