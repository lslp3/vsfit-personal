import { Dumbbell, TrendingUp } from 'lucide-react';

import type { PyramidInfo } from '../../execution/techniqueEngine';

type PyramidExecutionPanelProps = {
  info: PyramidInfo;
};

/**
 * Painel premium da pirâmide durante a execução.
 * Só exibição: mostra o progresso Série X de Y, a carga/reps da série atual e
 * da próxima etapa. A progressão (sem descanso entre séries até a última) é
 * controlada pelo hook via TechniqueEngine (pyramidStrategy).
 */
export function PyramidExecutionPanel({
  info,
}: PyramidExecutionPanelProps) {
  const {
    current,
    total,
    currentWeight,
    nextWeight,
    currentReps,
    nextReps,
    isLast,
  } = info;

  const fmtWeight = (value: number | null) =>
    value == null ? '—' : `${value} kg`;

  return (
    <div className="mt-3 rounded-[20px] border border-teal-400/25 bg-teal-400/[0.07] p-3 text-left">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase text-teal-300">
          <TrendingUp className="h-3.5 w-3.5" />
          Pirâmide
        </p>

        <span className="text-[10px] font-bold text-teal-200/70">
          Série {current} de {total}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index + 1 <= current
                ? 'bg-teal-400'
                : 'bg-teal-400/20'
            }`}
          />
        ))}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <Dumbbell className="h-3.5 w-3.5 text-teal-300" />

        <span className="text-[11px] text-teal-100/80">
          Esta série:{' '}
          <strong className="text-teal-100">
            {fmtWeight(currentWeight)} × {currentReps ?? '—'}
          </strong>{' '}
          reps
        </span>
      </div>

      <div className="mt-2 flex items-start gap-1.5 rounded-xl border border-teal-400/15 bg-black/20 p-2 text-[11px] text-teal-100/80">
        {isLast ? (
          <span>
            <strong className="text-teal-100">
              Última série da pirâmide.
            </strong>{' '}
            Após o descanso você seguirá para o
            próximo exercício.
          </span>
        ) : (
          <span>
            <strong className="text-teal-100">
              Concluiu esta série.
            </strong>{' '}
            Descanse e inicie a próxima série
            depois do descanso. Próxima:{' '}
            {fmtWeight(nextWeight)} ×{' '}
            {nextReps ?? '—'} reps.
          </span>
        )}
      </div>
    </div>
  );
}