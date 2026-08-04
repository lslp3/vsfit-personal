import { supabase } from '../lib/supabase';

/**
 * Sprint 13 — Chat Media (ETAPA 2: Upload).
 *
 * Camada de upload de mídia do chat para o bucket privado `chat-files`.
 * NÃO usa bucket público nem publicUrl — leituras futuras (ETAPA 3 Preview)
 * devem passar por `getSignedChatMediaUrl` (signed URL curta).
 *
 * Path armazenado (arquitetura definida):
 *   chat-files/{trainer_id}/{student_id}/{message_id}/{arquivo.ext}
 *
 * Regras deste módulo:
 * - whitelist de MIME alinhada EXATAMENTE ao bucket (configurada no Supabase);
 * - limites de tamanho por categoria (const, configurável);
 * - o `message_id` é gerado ANTES do upload (crypto.randomUUID()) porque ele
 *   faz parte do path; o INSERT da mensagem usa esse mesmo id (MessageInsert.id),
 *   garantindo que path da storage e linha de messages apontem um para o outro.
 */

export type ChatMediaType = 'image' | 'video' | 'audio' | 'document';

export const CHAT_FILES_BUCKET = 'chat-files';

export interface ChatMediaValidation {
  valid: boolean;
  type?: ChatMediaType;
  mime?: string;
  extension?: string;
  error?: string;
}

export interface ChatMediaUploadInput {
  trainerId: string;
  studentId: string;
  file: File;
  /** Se omitido, gera crypto.randomUUID() (recomendado: passe o id da futura mensagem). */
  messageId?: string;
}

export interface ChatMediaUploadResult {
  /** id da mensagem que deve ser persistida (MessageInsert.id). */
  messageId: string;
  /** Path completo no bucket (ex.: {trainer}/{student}/{msgId}/foto.jpg). */
  path: string;
  type: ChatMediaType;
  mime: string;
  extension: string;
  media_size: number;
  media_url: string;
}

/**
 * Regras por categoria: MIME permitido (whitelist do bucket) + limite de
 * tamanho + extensão canônica para armazenar em `messages.extension`.
 */
const MEDIA_RULES: Record<
  ChatMediaType,
  { mimes: string[]; maxBytes: number; extension: string }
> = {
  image: {
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 10 * 1024 * 1024, // 10 MB
    extension: 'jpg',
  },
  video: {
    mimes: ['video/mp4', 'video/webm'],
    maxBytes: 25 * 1024 * 1024, // 25 MB
    extension: 'mp4',
  },
  audio: {
    mimes: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'],
    maxBytes: 15 * 1024 * 1024, // 15 MB
    extension: 'm4a',
  },
  document: {
    mimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxBytes: 20 * 1024 * 1024, // 20 MB
    extension: 'pdf',
  },
};

/** Extensão real derivada do MIME (mais confiável que o nome do arquivo). */
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
};

export const CHAT_MEDIA_MAX_SIZE = {
  image: MEDIA_RULES.image.maxBytes,
  video: MEDIA_RULES.video.maxBytes,
  audio: MEDIA_RULES.audio.maxBytes,
  document: MEDIA_RULES.document.maxBytes,
};

/**
 * Valor para o atributo `accept` do <input type="file"> — mesmos MIMEs da
 * whitelist (evita o usuário tentar selecionar arquivos que serão rejeitados).
 */
export const CHAT_MEDIA_ACCEPT = Object.values(MEDIA_RULES)
  .flatMap((rule) => rule.mimes)
  .join(',');

/**
 * Valida um arquivo contra a whitelist de MIME e o limite de tamanho da
 * categoria. Não faz upload — chamada pelo seletor (UX) e antes do upload.
 */
export function validateChatMediaFile(file: File): ChatMediaValidation {
  const type = Object.keys(MEDIA_RULES).find((key) =>
    MEDIA_RULES[key as ChatMediaType].mimes.includes(file.type)
  ) as ChatMediaType | undefined;

  if (!type) {
    return {
      valid: false,
      error: 'Tipo de arquivo não permitido no chat.',
    };
  }

  const rule = MEDIA_RULES[type];

  if (file.size > rule.maxBytes) {
    const mb = Math.round(rule.maxBytes / (1024 * 1024));
    return {
      valid: false,
      error: `Arquivo excede o limite de ${mb} MB para ${type}.`,
    };
  }

  return {
    valid: true,
    type,
    mime: file.type,
    extension: MIME_TO_EXTENSION[file.type] || rule.extension,
  };
}

/** Gera um id uuid v4 para a mensagem (usado no path da storage). */
export function generateChatMessageId(): string {
  return crypto.randomUUID();
}

/** Sanitiza o nome do arquivo (mantém extensão; remove caracteres inválidos). */
export function sanitizeChatFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '');
  const safe = base.replace(/[^\w.\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return safe || 'arquivo';
}

/** Monta o path no bucket conforme a arquitetura definida. */
export function buildChatMediaPath(
  trainerId: string,
  studentId: string,
  messageId: string,
  fileName: string
): string {
  const safeName = sanitizeChatFileName(fileName);
  const extension = (fileName.match(/\.[^.]+$/) || [''])[0].toLowerCase();
  return `${trainerId}/${studentId}/${messageId}/${safeName}${extension}`;
}

/**
 * Upload do arquivo para `chat-files`.
 * - valida (revalida mesmo se já passou pelo seletor);
 * - gera/usa messageId e monta o path;
 * - envia ao Storage (privado, sem publicUrl);
 * - retorna os metadados completos para persistir a mensagem.
 *
 * Se o upload falhar, lança erro — o chamador NÃO deve persistir a mensagem.
 */
export async function uploadChatMedia(
  input: ChatMediaUploadInput
): Promise<ChatMediaUploadResult> {
  const validation = validateChatMediaFile(input.file);

  if (!validation.valid || !validation.type || !validation.mime || !validation.extension) {
    throw new Error(validation.error || 'Arquivo de mídia inválido.');
  }

  const messageId = input.messageId || generateChatMessageId();
  const path = buildChatMediaPath(
    input.trainerId,
    input.studentId,
    messageId,
    input.file.name
  );

  const { error } = await supabase.storage
    .from(CHAT_FILES_BUCKET)
    .upload(path, input.file, {
      contentType: input.file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('[ChatMediaService] upload error:', error);
    throw new Error(error.message || 'Falha ao enviar arquivo.');
  }

  return {
    messageId,
    path,
    type: validation.type,
    mime: validation.mime,
    extension: validation.extension,
    media_size: input.file.size,
    media_url: path,
  };
}

/**
 * Rollback: apaga o objeto da storage quando a persistência da mensagem falha.
 * Best-effort — falha aqui não sobrescreve o erro original do INSERT.
 */
export async function removeChatMedia(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from(CHAT_FILES_BUCKET).remove([path]);
    if (error) {
      console.error('[ChatMediaService] rollback remove error:', error);
    }
  } catch (error) {
    console.error('[ChatMediaService] rollback remove exception:', error);
  }
}

/**
 * Gera uma signed URL temporária para exibição/download de arquivo privado
 * (ETAPA 3 — Preview). Bucket é privado; NUNCA usar publicUrl para o chat.
 */
export async function getSignedChatMediaUrl(
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(CHAT_FILES_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.error('[ChatMediaService] signedUrl error:', error);
    throw new Error(error?.message || 'Falha ao gerar link do arquivo.');
  }

  return data.signedUrl;
}
