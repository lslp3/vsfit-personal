import { useId, useRef, type MouseEvent } from 'react';
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
 * Sprint 13 — Chat Media (ETAPA 2) + fix WebView/Capacitor (ETAPA 3).
 *
 * Botão de anexo do compositor de chat. Usa um <input type="file" hidden>
 * acionado por INTERAÇÃO NATIVA via <label htmlFor="..."> — em vez do
 * antigo `inputRef.current.click()` programático.
 *
 * Motivo do fix: no Capacitor/Android, chamar `.click()` programático num
 * input de arquivo pode fazer o WebView recriar a Activity ao abrir o seletor
 * nativo, causando um reload da página e o chat voltar para a lista de alunos.
 * O <label htmlFor> dispara o seletor por gesto real do usuário, evitando o
 * problema e mantendo o mesmo comportamento funcional.
 *
 * Com `hasFile`, o label vira um X para remover a seleção atual (preventDefault
 * impede que o clique abra o seletor no modo "remover").
 */
export function AttachmentButton({
  onFileSelected,
  hasFile,
  onRemoveFile,
  disabled,
  accept,
}: AttachmentButtonProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleLabelClick(event: MouseEvent<HTMLLabelElement>) {
    // Modo desabilitado ou "remover": não deve abrir o seletor.
    if (disabled || hasFile) {
      event.preventDefault();

      if (hasFile) {
        onRemoveFile?.();
      }

      return;
    }

    // Permite re-selecionar o mesmo arquivo após uma seleção anterior.
    if (inputRef.current) {
      inputRef.current.value = '';
    }

    // SEM preventDefault: o <label htmlFor="..."> aciona o <input type="file">
    // por interação nativa (gesto real do usuário), como um <button> faria.
  }

  return (
    <>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          onFileSelected(file);
        }}
      />

      <label
        htmlFor={inputId}
        onClick={handleLabelClick}
        aria-label={hasFile ? 'Remover anexo' : 'Anexar arquivo'}
        title={hasFile ? 'Remover anexo' : 'Anexar arquivo'}
        className={cn(
          'pointer-events-auto inline-flex shrink-0 cursor-pointer select-none items-center justify-center rounded-full p-3 text-white/70 transition-all active:scale-90',
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
      </label>
    </>
  );
}