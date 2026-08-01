import type { ExerciseSetDraft } from '../../types/workout';
import { SetRow } from './SetRow';

type SetListProps = {
  sets: ExerciseSetDraft[];
  currentSet: number;
  onToggleComplete: (
    setNumber: number
  ) => void;
  onUpdate: (
    setNumber: number,
    patch: Partial<
      Pick<
        ExerciseSetDraft,
        'weightKg' | 'reps'
      >
    >
  ) => void;
};

/**
 * Lista de séries do exercício atual (Etapa 7).
 *
 * Cada série é editável (carga/repetições) e marcável como concluída.
 * Componente visual — não altera a progressão (descanso/avanço) nem o
 * salvamento.
 */
export function SetList({
  sets,
  currentSet,
  onToggleComplete,
  onUpdate,
}: SetListProps) {
  const completedCount = sets.filter(
    (set) => set.completed
  ).length;

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-black uppercase text-[#ff2a32]">
          Séries
        </p>

        <p className="text-[10px] font-bold text-zinc-500">
          {completedCount}/
          {sets.length} concluída
          {completedCount === 1 ? '' : 's'}
        </p>
      </div>

      {sets.map((set) => (
        <SetRow
          key={set.setNumber}
          set={set}
          isCurrent={
            set.setNumber === currentSet
          }
          onToggleComplete={
            onToggleComplete
          }
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}
