import { FileText, Film, Music, X } from 'lucide-react';

import { cn } from '../../lib/utils';

interface MediaAttachmentPreviewProps {
  fileName: string;
  fileSize: number;
  mime: string;
  /** ObjectURL local gerada pelo useChatMedia (imagem/vídeo/áudio). */
  previewUrl?: string | null;
  onRemove: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTypeIcon(mime: string) {
  if (mime.startsWith('image/')) return null; // preview visual abaixo
  if (mime.startsWith('video/')) return Film;
  if (mime.startsWith('audio/')) return Music;
  return FileText;
}

/**
 * Sprint 13 — Chat Media (ETAPA 2).
 *
 * Card de preview do arquivo SELECIONADO no compositor (antes do envio).
 * Imagens/vídeos/áudios ganham preview local via objectURL; documentos
 * mostram ícone + nome + tamanho. A exibição de mensagens já SALVAS
 * (signed URL) é responsabilidade da ETAPA 3 — Preview.
 */
export function MediaAttachmentPreview({
  fileName,
  fileSize,
  mime,
  previewUrl,
  onRemove,
}: MediaAttachmentPreviewProps) {
  const TypeIcon = getTypeIcon(mime);
  const showMedia = mime.startsWith('image/') && previewUrl;

  return (
    <div className="relative mb-2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
      {showMedia ? (
        <img
          src={previewUrl}
          alt={fileName}
          className="max-h-40 w-full object-contain"
        />
      ) : (
        <div className="flex items-center gap-3 px-3 py-3">
          {TypeIcon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
              <TypeIcon className="h-5 w-5 text-white/80" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{fileName}</p>
            <p className="text-xs text-zinc-500">{formatFileSize(fileSize)}</p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover anexo"
        className={cn(
          'absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full',
          'bg-black/50 text-white/80 backdrop-blur transition-colors hover:text-white'
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
