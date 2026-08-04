import { useCallback, useEffect, useRef, useState } from 'react';

import {
  generateChatMessageId,
  removeChatMedia,
  uploadChatMedia,
  validateChatMediaFile,
} from '../services/chatMediaService';
import { sendMessage } from '../services/messageService';
import type { Message, MessageInsert } from '../types/database';
import { useChatMediaStore } from '../store/chatMediaStore';

function getFileExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
}

/**
 * Sprint 13 — Chat Media (ETAPA 2: Upload).
 *
 * Hook de orquestração do envio de mídia:
 * 1. seleciona/valida o arquivo (whitelist MIME + tamanho);
 * 2. gera o message_id ANTES do upload (faz parte do path da storage);
 * 3. envia ao bucket privado `chat-files` (uploadChatMedia);
 * 4. persiste a mensagem com os metadados (messageService.sendMessage);
 * 5. se o INSERT falhar, remove o objeto enviado (rollback — anti-órfão);
 * 6. retorna a Message persistida p/ o chamador atualizar a lista.
 *
 * Uso nas páginas (Personal e Aluno) — a lógica NÃO fica duplicada:
 *   const { selectedFile, previewUrl, validationError, uploading, selectFile, clear, sendMedia } = useChatMedia();
 */
export function useChatMedia() {
  // Estado de mídia vive no store module-singleton (Correção A) para
  // sobreviver ao remount do ChatPage pelo fluxo de auth (isLoading).
  const selectedFile = useChatMediaStore((s) => s.selectedFile);
  const previewUrl = useChatMediaStore((s) => s.previewUrl);
  const validationError = useChatMediaStore((s) => s.validationError);
  const caption = useChatMediaStore((s) => s.caption);
  const setCaption = useChatMediaStore((s) => s.setCaption);
  const setSelectedFile = useChatMediaStore((s) => s.setSelectedFile);
  const setPreviewUrl = useChatMediaStore((s) => s.setPreviewUrl);
  const setMime = useChatMediaStore((s) => s.setMime);
  const setMediaSize = useChatMediaStore((s) => s.setMediaSize);
  const setExtension = useChatMediaStore((s) => s.setExtension);
  const setValidationError = useChatMediaStore((s) => s.setValidationError);
  const resetMedia = useChatMediaStore((s) => s.resetMedia);

  // Transiente (não precisa sobreviver a remount): estado de envio.
  const [uploading, setUploading] = useState(false);

  // objectURL criada/gerenciada por ESTE hook (adotada do store no mount).
  const objectUrlRef = useRef<string | null>(null);

  /**
   * Ao montar (inclusive após um remount no MESMO documento): adota a
   * objectURL do store (ainda válida) para revogação futura, ou recria o
   * preview se o File existir e a URL tiver sumido.
   */
  useEffect(() => {
    const state = useChatMediaStore.getState();
    if (state.selectedFile && !state.previewUrl) {
      const url = URL.createObjectURL(state.selectedFile);
      objectUrlRef.current = url;
      state.setPreviewUrl(url);
    } else if (state.previewUrl) {
      objectUrlRef.current = state.previewUrl;
    }
  }, []);

  /** Revoga a objectURL pendente (a deste hook e/ou a do store). */
  const revokeObjectUrl = useCallback(() => {
    const stored = useChatMediaStore.getState().previewUrl;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (stored) {
      URL.revokeObjectURL(stored);
    }
  }, []);

  /** Seleciona e valida o arquivo escolhido; gera preview local. */
  const selectFile = useCallback(
    (file: File | null) => {
      revokeObjectUrl();
      resetMedia();

      if (!file) {
        return;
      }

      const validation = validateChatMediaFile(file);

      if (!validation.valid) {
        setValidationError(validation.error || 'Arquivo de mídia inválido.');
        return;
      }

      // Preview local (objectURL) antes do envio — a exibição de mensagens
      // salvas usa signed URL (getSignedChatMediaUrl) na ETAPA 3.
      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      setSelectedFile(file);
      setPreviewUrl(objectUrl);
      setMime(file.type);
      setMediaSize(file.size);
      setExtension(getFileExtension(file.name));
    },
    [
      revokeObjectUrl,
      resetMedia,
      setSelectedFile,
      setPreviewUrl,
      setMime,
      setMediaSize,
      setExtension,
      setValidationError,
    ]
  );

  /** Limpa seleção, preview e erros. */
  const clear = useCallback(() => {
    revokeObjectUrl();
    resetMedia();
  }, [revokeObjectUrl, resetMedia]);

  // Sem revoke no unmount (INTENCIONAL): o hook pode ser desmontado/remontado
  // pelo fluxo de auth no mesmo documento; revogar aqui mataria o preview.
  // A objectURL é revogada apenas em novo selectFile e em clear (envio).

  /**
   * Upload + persistência da mídia selecionada.
   * Retorna a Message persistida (ou null se não havia arquivo/erro).
   */
  const sendMedia = useCallback(
    async (params: {
      trainerId: string;
      studentId: string;
      senderRole: 'personal' | 'student';
      senderId: string;
      /** Legenda opcional junto da mídia; se vazia, usa o nome do arquivo. */
      content?: string;
    }): Promise<Message | null> => {
      const file = useChatMediaStore.getState().selectedFile;
      if (!file) return null;

      setUploading(true);
      setValidationError(null);

      try {
        const messageId = generateChatMessageId();

        const upload = await uploadChatMedia({
          trainerId: params.trainerId,
          studentId: params.studentId,
          file,
          messageId,
        });

        const insert: MessageInsert = {
          id: upload.messageId,
          trainer_id: params.trainerId,
          student_id: params.studentId,
          sender_role: params.senderRole,
          sender_id: params.senderId,
          content: params.content?.trim() || file.name,
          type: upload.type,
          media_url: upload.media_url,
          media_size: upload.media_size,
          mime: upload.mime,
          extension: upload.extension,
        };

        try {
          const msg = await sendMessage(insert);
          clear();
          return msg;
        } catch (insertError) {
          // R3: se o INSERT falhar, remove o arquivo já enviado (anti-órfão).
          console.error('[useChatMedia] sendMessage error (rollback):', insertError);
          await removeChatMedia(upload.path);
          throw insertError;
        }
      } catch (error) {
        setValidationError(
          error instanceof Error ? error.message : 'Erro ao enviar mídia.'
        );
        return null;
      } finally {
        setUploading(false);
      }
    },
    [clear, setValidationError]
  );

  return {
    selectedFile,
    previewUrl,
    validationError,
    caption,
    setCaption,
    uploading,
    selectFile,
    clear,
    sendMedia,
  };
}
