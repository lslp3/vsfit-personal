import { RotateCcw, Timer } from 'lucide-react';

import type { RestPauseInfo } from '../../execution/techniqueEngine';

type RestPauseExecutionPanelProps = {
  info: RestPauseInfo;
};

/**
 * Painel premium do rest-pause durante a execução.
 * Substitui o painel informativo estático quando a técnica é rest_pause:
 * mostra o progresso das levas, a informação de pausa curta e confirma que a
 * carga permanece a MESMA em todas as levas. Apenas exibição — a progressão é
 * controlada pelo hook via TechniqueEngine (restPauseStrategy).
 */
export function RestPauseExecutionPanel({
  info,
}: RestPauseExecutionPanelProps) {
  const { current, total, pauseSeconds, isLast } =
    info;

  const nextLabel = isLast
    ? 'Descanso final do exercício e próximo exercício'
    : `Próxima: leva ${current + 1} de ${total} — mantenha a MESMA carga`;

  return (
    <div className="mt-3 rounded-[20px] border border-sky-400/25 bg-sky-400/[0.07] p-3 text-left">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase text-sky-300">
          <Timer className="h-3.5 w-3.5" />
          Rest-pause
        </p>

        <span className="text-[10px] font-bold text-sky-200/70">
          Leva {current} de {total}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index + 1 <= current
                ? 'bg-sky-400'
                : 'bg-sky-400/20'
            }`}
          />
        ))}
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <RotateCcw className="h-3.5 w-3.5 text-sky-300" />

        <span className="text-[11px] text-sky-100/80">
          Retorne à MESMA carga em todas as levas
        </span>
      </div>

      <div className="mt-2 flex items-start gap-1.5 rounded-xl border border-sky-400/15 bg-black/20 p-2 text-[11px] text-sky-100/80">
        <span>{nextLabel}</span>
      </div>

      {!isLast && pauseSeconds > 0 && (
        <p className="mt-1.5 text-[10px] text-sky-200/50">
          Pausa curta de {pauseSeconds}s entre as levas
        </p>
      )}
    </div>
  );
}