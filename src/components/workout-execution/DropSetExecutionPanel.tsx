import { ChevronDown, Zap } from 'lucide-react';

import type { DropSetConfig } from '../../types/database';
import type { DropSetInfo } from '../../execution/techniqueEngine';

type DropSetExecutionPanelProps = {
  info: DropSetInfo;
  config: DropSetConfig;
};

/**
 * Painel premium do drop-set durante a execução.
 * Substitui o painel informativo quando a técnica é drop_set: mostra o
 * progresso das quedas, a carga sugerida da queda atual e a próxima etapa
 * (próxima queda reduzida ou o descanso final). Apenas exibição — a
 * progressão é controlada pelo hook via TechniqueEngine.
 */
export function DropSetExecutionPanel({
  info,
  config,
}: DropSetExecutionPanelProps) {
  const { current, total, currentWeight, nextWeight } =
    info;

  const reduction = Number(
    config.reduction_percent || 0
  );

  const microRest = Number(
    config.rest_between_drops_seconds || 0
  );

  const nextLabel = info.isLast
    ? `Descanso final de ${info.finalRest}s e próximo exercício`
    : `Próxima: queda ${current + 1} de ${total}` +
      (nextWeight
        ? ` — carga ${nextWeight} kg`
        : reduction > 0
          ? ` — reduzir ${reduction}%`
          : '');

  return (
    <div className="mt-3 rounded-[20px] border border-orange-400/25 bg-orange-400/[0.07] p-3 text-left">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase text-orange-300">
          <Zap className="h-3.5 w-3.5" />
          Drop-set
        </p>

        <span className="text-[10px] font-bold text-orange-200/70">
          Queda {current} de {total}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index + 1 <= current
                ? 'bg-orange-400'
                : 'bg-orange-400/20'
            }`}
          />
        ))}
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-[11px] font-black text-white">
          {currentWeight ? `${currentWeight} kg` : '—'}
        </span>

        <span className="text-[10px] text-orange-200/60">
          carga desta queda
        </span>
      </div>

      <div className="mt-2 flex items-start gap-1.5 rounded-xl border border-orange-400/15 bg-black/20 p-2 text-[11px] text-orange-100/80">
        <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-300" />

        <span>{nextLabel}</span>
      </div>

      {microRest > 0 && !info.isLast && (
        <p className="mt-1.5 text-[10px] text-orange-200/50">
          Microdescanso de {microRest}s entre as quedas
        </p>
      )}
    </div>
  );
}