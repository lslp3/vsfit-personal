import { useEffect, useState } from 'react';
import { Bug, Copy, Trash2, X } from 'lucide-react';

import type { DiagEntry } from '../../utils/diagChat';

/**
 * TEMPORÁRIO — painel de leitura do buffer [CHAT-DIAG] dentro do app.
 * Permite ver/copiar/limpar os eventos de diagnóstico no próprio dispositivo,
 * sem depender de adb/logcat. NÃO COMMITAR na entrega final.
 */
export function DiagPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<DiagEntry[]>([]);

  const refresh = () => {
    const w = window as unknown as { __diagChatDump?: () => DiagEntry[] };
    if (typeof w.__diagChatDump === 'function') {
      setLogs(w.__diagChatDump());
    }
  };

  // Atualiza sozinho a cada segundo enquanto aberto (pega novos eventos).
  useEffect(() => {
    if (!open) return;
    refresh();
    const timer = window.setInterval(refresh, 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  const handleCopy = async () => {
    const text = logs
      .map((l) =>
        [
          l.iso,
          l.ev,
          l.tag ? `tag=${l.tag}` : '',
          `li=${l.localInstance ?? '-'}`,
          `doc=${l.docId ?? '-'}`,
          `t0=${l.timeOrigin ?? '-'}`,
          `ms=${l.msSinceDocLoad ?? '-'}`,
          l.detail ? `| ${l.detail}` : '',
        ]
          .filter(Boolean)
          .join(' ')
      )
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback: textarea oculto + execCommand.
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const handleClear = () => {
    const w = window as unknown as { __diagChatClear?: () => void };
    if (typeof w.__diagChatClear === 'function') w.__diagChatClear();
    refresh();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Diagnóstico"
        title="Diagnóstico [CHAT-DIAG]"
        className="fixed bottom-4 left-4 z-[999999] flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/30 opacity-40 hover:opacity-100"
      >
        <Bug className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[999999] flex flex-col bg-[#0a0a0a]/95 backdrop-blur-sm text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Diagnóstico [CHAT-DIAG]</h2>
          <p className="text-[11px] text-white/40">{logs.length} eventos (últimos 300)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1.5 text-xs hover:bg-white/15"
          >
            <Copy className="h-3.5 w-3.5" /> Copiar
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1.5 text-xs hover:bg-white/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Limpar
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1.5 text-xs hover:bg-white/15"
          >
            <X className="h-3.5 w-3.5" /> Fechar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/40">
            Nenhum evento capturado ainda.
          </p>
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-green-300/90">
            {logs
              .map((l) =>
                [
                  l.iso,
                  l.ev,
                  l.tag ? `tag=${l.tag}` : '',
                  `li=${l.localInstance ?? '-'}`,
                  `doc=${l.docId ?? '-'}`,
                  `t0=${l.timeOrigin ?? '-'}`,
                  `ms=${l.msSinceDocLoad ?? '-'}`,
                  l.detail ? `| ${l.detail}` : '',
                ]
                  .filter(Boolean)
                  .join(' ')
              )
              .join('\n')}
          </pre>
        )}
      </div>
    </div>
  );
}