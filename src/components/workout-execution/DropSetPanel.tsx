import type { DropSetConfig } from '../../types/database';

export function DropSetPanel({
  config,
}: {
  config: DropSetConfig;
}) {
  return (
    <div className="mt-3 rounded-[20px] border border-orange-400/20 bg-orange-400/[0.07] p-3 text-left">
      <p className="text-[9px] font-black uppercase text-orange-300">
        Drop-set
      </p>

      <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-zinc-300">
        {config.drops !==
          undefined && (
          <span>
            {config.drops}{' '}
            queda
            {config.drops ===
            1
              ? ''
              : 's'}
          </span>
        )}

        {config.reduction_percent !==
          undefined && (
          <span>
            • Redução de{' '}
            {
              config.reduction_percent
            }
            %
          </span>
        )}

        {config.rest_between_drops_seconds !==
          undefined && (
          <span>
            •{' '}
            {
              config.rest_between_drops_seconds
            }
            s entre quedas
          </span>
        )}
      </div>

      {config.notes && (
        <p className="mt-1.5 text-[10px] text-zinc-400">
          {config.notes}
        </p>
      )}
    </div>
  );
}
