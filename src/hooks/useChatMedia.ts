import { useCallback, useEffect, useRef, useState } from 'react';

import {
  generateChatMessageId,
  removeChatMedia,
  uploadChatMedia,
  validateChatMediaFile,
} from '../services/chatMediaService';
import { sendMessage } from '../services/messageService';
import type { Message, MessageInsert } from '../types/database';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const objectUrlRef = useRef<string | null>(null);

  /** Libera a objectURL local (evita vazamento de memória). */
  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  /** Seleciona e valida o arquivo escolhido; gera preview local. */
  const selectFile = useCallback(
    (file: File | null) => {
      releaseObjectUrl();
      setSelectedFile(null);
      setPreviewUrl(null);
      setValidationError(null);

      if (!file) return;

      const validation = validateChatMediaFile(file);

      if (!validation.valid) {
        setValidationError(validation.error || 'Arquivo de mídia inválido.');
        return;
      }

      setSelectedFile(file);
      // Preview local (objectURL) antes do envio — a exibição de mensagens
      // salvas usa signed URL (getSignedChatMediaUrl) na ETAPA 3.
      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
    },
    [releaseObjectUrl]
  );

  /** Limpa seleção, preview e erros. */
  const clear = useCallback(() => {
    releaseObjectUrl();
    setSelectedFile(null);
    setPreviewUrl(null);
    setValidationError(null);
  }, [releaseObjectUrl]);

  /** Cleanup ao desmontar (revoga objectURL pendente). */
  useEffect(() => releaseObjectUrl, [releaseObjectUrl]);

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
      if (!selectedFile) return null;

      setUploading(true);
      setValidationError(null);

      try {
        const messageId = generateChatMessageId();

        const upload = await uploadChatMedia({
          trainerId: params.trainerId,
          studentId: params.studentId,
          file: selectedFile,
          messageId,
        });

        const insert: MessageInsert = {
          id: upload.messageId,
          trainer_id: params.trainerId,
          student_id: params.studentId,
          sender_role: params.senderRole,
          sender_id: params.senderId,
          content: params.content?.trim() || selectedFile.name,
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
    [selectedFile, clear]
  );

  return {
    selectedFile,
    previewUrl,
    validationError,
    uploading,
    selectFile,
    clear,
    sendMedia,
  };
}
