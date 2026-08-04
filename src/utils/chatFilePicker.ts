import { validateChatMediaFile } from '../services/chatMediaService';
import { useChatMediaStore } from '../store/chatMediaStore';

// TEMPORÁRIO — diagnóstico do file picker (não commitar na entrega).
import { diagChatLog } from './diagChat';

/**
 * Sprint 13 — Chat Media (fix intermitente do seletor).
 *
 * Controle de UM input type=file GLOBAL e persistente, montado na raiz da app
 * (main.tsx), FORA do RouterProvider/ChatPage. O problema era: o Android abre o
 * file picker nativo → WebView vai a background → o ChatPage é desmontado pelo
 * fluxo de auth (isLoading) → o <input> antigo (que vivia no AttachmentButton,
 * dentro do ChatPage) deixava de existir → o evento `change` do picker se perdia.
 *
 * Mantendo o input fora da árvore que desmonta, o evento change chega sempre e
 * o File é entregue a este módulo, que grava no chatMediaStore (Zustand) — a
 * preview volta a aparecer mesmo após um remount do ChatPage.
 */

/** id estável do input global (não é useId — precisa ser previsível). */
export const CHAT_FILE_INPUT_ID = 'vsfit-chat-file-input';

let fileInput: HTMLInputElement | null = null;

/** Registra (ou libera) o elemento do input global. Chamado pelo componente. */
export function registerChatFileInput(el: HTMLInputElement | null): void {
  fileInput = el;
}

/**
 * Abre o seletor de arquivos global. Deve ser chamado dentro de um gesto do
 * usuário (ex.: onClick). Dispara o click no input persistente.
 */
export function openChatFilePicker(): void {
  diagChatLog('FILE_PICKER_OPEN');
  if (!fileInput) {
    diagChatLog('FILE_PICKER_OPEN no-input');
    return;
  }
  // Permite re-selecionar o mesmo arquivo após uma seleção anterior.
  fileInput.value = '';
  fileInput.click();
}

/**
 * Recebe o File escolhido (chamado pelo onChange do input global), valida e
 * grava no chatMediaStore — preservando a arquitetura atual (upload/send
 * inalterados). Emite os logs de validação novos e os mesmos do hook.
 */
export function handleChatFileSelected(file: File | null): void {
  diagChatLog('FILE_PICKER_CHANGE', '| file=', file?.name ?? 'null');

  if (!file) return;

  diagChatLog('FILE_SELECTED', '| nome=', file.name, '| tamanho=', file.size);

  const validation = validateChatMediaFile(file);
  const store = useChatMediaStore.getState();

  if (!validation.valid) {
    store.resetMedia();
    store.setValidationError(
      validation.error || 'Arquivo de mídia inválido.'
    );
    diagChatLog(
      'selectFile INVALID',
      '| name=', file.name,
      '| type=', file.type,
      '| err=', validation.error
    );
    return;
  }

  // Revoga a preview anterior (se houver) e cria a nova objectURL.
  const previousUrl = store.previewUrl;
  if (previousUrl) URL.revokeObjectURL(previousUrl);

  const objectUrl = URL.createObjectURL(file);

  store.resetMedia();
  store.setSelectedFile(file);
  store.setPreviewUrl(objectUrl);
  store.setMime(file.type);
  store.setMediaSize(file.size);
  store.setExtension(validation.extension ?? '');

  diagChatLog(
    'selectFile VALID',
    '| name=', file.name,
    '| size=', file.size,
    '| type=', file.type
  );
  diagChatLog('preview set | previewUrl=', objectUrl);
}