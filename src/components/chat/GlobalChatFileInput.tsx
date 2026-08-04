import { useEffect, useRef } from 'react';

import { CHAT_MEDIA_ACCEPT } from '../../services/chatMediaService';
import {
  CHAT_FILE_INPUT_ID,
  handleChatFileSelected,
  registerChatFileInput,
} from '../../utils/chatFilePicker';

/**
 * Sprint 13 — Chat Media (fix intermitente do seletor).
 *
 * Input type=file GLOBAL e persistente, montado na raiz da app (main.tsx),
 * FORA do RouterProvider/ChatPage. Sobrevive a:
 * - remount do RouterProvider (fluxo de auth isLoading);
 * - desmontagem do ChatPage/AttachmentButton;
 * - retorno do Android file picker (WebView pausado/retomado).
 *
 * O onChange entrega o File ao módulo chatFilePicker, que grava no
 * chatMediaStore — assim o evento `change` não se perde quando a árvore do
 * chat é desmontada enquanto o seletor nativo está aberto.
 */
export function GlobalChatFileInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    registerChatFileInput(inputRef.current);
    return () => registerChatFileInput(null);
  }, []);

  return (
    <input
      id={CHAT_FILE_INPUT_ID}
      ref={inputRef}
      type="file"
      accept={CHAT_MEDIA_ACCEPT}
      // Fora da tela, mas REAL no DOM (não display:none) para o .click()
      // programático funcionar no WebView do Android.
      className="pointer-events-none fixed -left-[9999px] -top-[9999px] h-px w-px opacity-0"
      onChange={(event) => {
        const file = event.target.files?.[0] || null;
        handleChatFileSelected(file);
        // Permite re-selecionar o mesmo arquivo.
        event.target.value = '';
      }}
    />
  );
}