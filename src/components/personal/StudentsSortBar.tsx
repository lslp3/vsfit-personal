import { SORT_OPTIONS, type SortKey } from '../../lib/studentFilters';

interface StudentsSortBarProps {
  value: SortKey;
  onChange: (sort: SortKey) => void;
}

/**
 * SPRINT 16 · FASE 5 — Barra de ordenação da Central de Alunos.
 * UI pura: apenas reflete `value` e emite `onChange`. A lógica de ordenação
 * vive em studentFilters.ts (sortStudents) e é aplicada pela página.
 */
export function StudentsSortBar({ value, onChange }: StudentsSortBarProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden shrink-0 text-[10px] font-black uppercase tracking-wide text-zinc-500 sm:block">
        Ordenar
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortKey)}
        className="w-full rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5 text-sm font-black text-white focus:outline-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option
            key={option.key}
            value={option.key}
            className="bg-[#0a0a0a]"
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
