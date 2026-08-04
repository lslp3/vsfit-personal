import {
  Download,
  ExternalLink,
  File,
  FileText,
  FileSpreadsheet,
  FileType,
  RefreshCw,
} from 'lucide-react';

import {
  useChatMediaDownloadUrl,
  useChatMediaUrl,
  formatMediaSize,
} from '../../hooks/useChatMediaUrl';
import type { Message } from '../../types/database';

/**
 * Sprint 13 — Chat Media (ETAPA 3: Preview).
 *
 * Card de DOCUMENTO dentro do bubble do chat:
 * - ícone por extensão (pdf / doc / xls / genérico);
 * - nome do arquivo (sanitizado na ETAPA 2) + tamanho (media_size);
 * - ações: abrir (nova aba) e baixar (signed URL com ?download).
 *
 * O bucket é privado — abrir/baixar usa a MESMA signed URL do hook; o
 * navegador consegue abrir/baixar objetos privados a partir dela.
 */
export function MessageDocument({ msg }: { msg: Message }) {
  const { url, loading, error, retry } = useChatMediaUrl(msg.id, msg.media_url);

  const extension = (msg.extension || msg.media_url?.split('.').pop() || 'file').toLowerCase();
  const fileName = getDocumentName(msg, extension);
  const size = formatMediaSize(msg.media_size);

  // URL de DOWNLOAD gerada pelo SDK (createSignedUrl com { download }),
  // preservando o token JWT — NÃO concatenar "?download=" manualmente.
  const {
    url: downloadUrl,
    loading: downloadLoading,
    retry: retryDownload,
  } = useChatMediaDownloadUrl(msg.id, msg.media_url, fileName);

  if (loading) {
    return (
      <div className="relative flex h-16 w-64 max-w-full items-center justify-center">
        <div className="absolute inset-0 animate-pulse rounded-xl bg-white/[0.06]" />
        <span className="text-[11px] text-zinc-400">Preparando arquivo…</span>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="flex h-16 w-64 max-w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3">
        <File className="h-4 w-4 text-zinc-500" />
        <p className="flex-1 truncate text-[11px] text-zinc-400">
          Não foi possível carregar o arquivo.
        </p>
        <button
          type="button"
          onClick={retry}
          aria-label="Tentar novamente"
          className="flex items-center justify-center rounded-full bg-white/[0.08] p-1.5 text-white transition-all active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 max-w-full rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
          <DocumentIcon extension={extension} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white" title={fileName}>
            {fileName}
          </p>
          <p className="text-xs text-zinc-500">
            {extension.toUpperCase()}
            {size ? ` · ${size}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/[0.08] px-3 py-2 text-[11px] font-bold text-white transition-all active:scale-95"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir
        </a>
        <a
          href={downloadUrl ?? undefined}
          onClick={(e) => {
            if (!downloadUrl) {
              e.preventDefault();
              if (!downloadLoading) retryDownload();
            }
          }}
          aria-disabled={!downloadUrl}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#ff2a32]/15 px-3 py-2 text-[11px] font-bold text-[#ff2a32] transition-all active:scale-95"
        >
          <Download className="h-3.5 w-3.5" />
          {downloadLoading ? 'Preparando…' : 'Baixar'}
        </a>
      </div>
    </div>
  );
}

/** Nome de exibição: usa a legenda se for o nome do arquivo, senão o path. */
function getDocumentName(msg: Message, extension: string): string {
  const content = msg.content?.trim();
  if (content && content !== msg.media_url && !content.toLowerCase().startsWith('http')) {
    return content;
  }
  const path = msg.media_url || '';
  const base = path.split('/').pop() || `arquivo.${extension}`;
  return base;
}

function DocumentIcon({ extension }: { extension: string }) {
  const ext = extension.replace('.', '');

  if (ext === 'pdf') {
    return <FileText className="h-5 w-5 text-red-400" />;
  }

  if (['doc', 'docx'].includes(ext)) {
    return <FileText className="h-5 w-5 text-blue-400" />;
  }

  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
  }

  if (['txt', 'md', 'rtf'].includes(ext)) {
    return <FileType className="h-5 w-5 text-zinc-300" />;
  }

  return <File className="h-5 w-5 text-zinc-300" />;
}