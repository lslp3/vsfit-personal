interface BulkActionsBarProps {
  selectedCount: number;
  visibleCount: number;
  onSelectAllVisible: () => void;
  onClear: () => void;
}

/**
 * SPRINT 16 · FASE 5 · ETAPA 2 — Barra de seleção múltipla da Central.
 * Exibe o contador de selecionados e as ações de "selecionar todos (visíveis)"
 * e "limpar". A lógica vive na página (estado local) — este componente é UI pura.
 */
export function BulkActionsBar({
  selectedCount,
  visibleCount,
  onSelectAllVisible,
  onClear,
}: BulkActionsBarProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[16px] border border-white/10 bg-white/[0.045] px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-black text-white">
          {selectedCount} {selectedCount === 1 ? 'aluno selecionado' : 'alunos selecionados'}
        </p>
        <p className="truncate text-[11px] font-medium text-zinc-500">
          {visibleCount} visíveis com os filtros atuais
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onSelectAllVisible}
          className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-zinc-300 transition-all hover:border-white/20 hover:text-white active:scale-95"
        >
          Selecionar visíveis
        </button>

        {selectedCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-red-500/25 bg-red-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-red-300 transition-all hover:border-red-500/40 hover:text-red-200 active:scale-95"
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
