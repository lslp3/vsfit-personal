import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

import { formatDuration } from '../../utils/workoutMath';

type WorkoutExecutionHeaderProps = {
  workoutName: string;
  dayName: string;
  muscleGroup: string;
  elapsedSeconds: number;
  currentExerciseLabel: string;
  completedSets: number;
  totalSets: number;
  onBack: () => void;
};

/**
 * Cabeçalho premium da execução (Etapa 5).
 *
 * O progresso é baseado em SÉRIES CONCLUÍDAS / séries totais
 * (estrutura preparada para a Etapa 7 — execução individual por séries).
 * Componente puramente visual: recebe tudo por props e não conhece o
 * fluxo de execução.
 */
export function WorkoutExecutionHeader({
  workoutName,
  dayName,
  muscleGroup,
  elapsedSeconds,
  currentExerciseLabel,
  completedSets,
  totalSets,
  onBack,
}: WorkoutExecutionHeaderProps) {
  const subtitle = muscleGroup || dayName;

  const progressPercent =
    totalSets > 0
      ? Math.min(
          100,
          (completedSets / totalSets) * 100
        )
      : 0;

  return (
    <header>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[10px] font-black uppercase text-[#ff2a32]">
            {workoutName}
          </p>

          <p className="text-[11px] text-zinc-500">
            {subtitle}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[11px] font-black">
          {formatDuration(elapsedSeconds)}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate text-zinc-500">
          {currentExerciseLabel}
        </span>

        <span className="shrink-0 font-black text-zinc-400">
          Séries {completedSets}/
          {totalSets}
        </span>

        <span className="shrink-0 font-black text-[#ff2a32]">
          {Math.round(progressPercent)}
          %
        </span>
      </div>

      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full bg-[#ff2a32]"
          animate={{
            width: `${progressPercent}%`,
          }}
        />
      </div>
    </header>
  );
}
