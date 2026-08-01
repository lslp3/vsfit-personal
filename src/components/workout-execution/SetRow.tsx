import { Check } from 'lucide-react';

import { cn } from '../../lib/utils';
import type { ExerciseSetDraft } from '../../types/workout';

type SetRowProps = {
  set: ExerciseSetDraft;
  isCurrent: boolean;
  onUpdate: (
    setNumber: number,
    patch: Partial<
      Pick<
        ExerciseSetDraft,
        'weightKg' | 'reps'
      >
    >
  ) => void;
  onToggleComplete: (
    setNumber: number
  ) => void;
};

/**
 * Linha de série da execução (Etapa 7).
 *
 * Exibe o número, permite editar carga (kg) e repetições realizadas e
 * marca a conclusão VISUAL da série (checkbox não avança o treino — a
 * progressão continua sendo responsabilidade do botão principal).
 */
export function SetRow({
  set,
  isCurrent,
  onUpdate,
  onToggleComplete,
}: SetRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-2xl border px-2.5 py-2 transition-colors',
        set.completed
          ? 'border-emerald-400/20 bg-emerald-400/[0.06]'
          : isCurrent
            ? 'border-[#ff2a32]/30 bg-[#ff2a32]/[0.05]'
            : 'border-white/10 bg-black/20'
      )}
    >
      <span className="w-5 shrink-0 text-center text-xs font-black text-zinc-500">
        {set.setNumber}
      </span>

      <div className="relative flex-1">
        <input
          type="number"
          inputMode="decimal"
          value={set.weightKg ?? ''}
          onChange={(event) => {
            const raw = event.target.value;

            onUpdate(set.setNumber, {
              weightKg:
                raw === ''
                  ? null
                  : Number.parseFloat(raw) ||
                    null,
            });
          }}
          placeholder="0"
          className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-3 pr-8 text-center text-sm font-black text-white outline-none placeholder:text-zinc-700 focus:border-[#ff2a32]/40"
        />

        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-zinc-600">
          kg
        </span>
      </div>

      <div className="relative flex-1">
        <input
          type="number"
          inputMode="numeric"
          value={set.reps ?? ''}
          onChange={(event) => {
            const raw = event.target.value;

            onUpdate(set.setNumber, {
              reps:
                raw === ''
                  ? null
                  : Number.parseInt(raw, 10) ||
                    null,
            });
          }}
          placeholder="0"
          className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-3 pr-8 text-center text-sm font-black text-white outline-none placeholder:text-zinc-700 focus:border-[#ff2a32]/40"
        />

        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-zinc-600">
          rep
        </span>
      </div>

      <button
        type="button"
        onClick={() =>
          onToggleComplete(set.setNumber)
        }
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors',
          set.completed
            ? 'border-emerald-400/40 bg-emerald-400/20 text-emerald-300'
            : 'border-white/15 bg-white/[0.03] text-zinc-700'
        )}
      >
        {set.completed ? (
          <Check className="h-4 w-4" />
        ) : null}
      </button>
    </div>
  );
}
