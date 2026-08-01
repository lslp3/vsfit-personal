import type { PyramidConfig } from '../../types/database';

export function PyramidPanel({
  config,
}: {
  config: PyramidConfig;
}) {
  return (
    <div className="mt-3 rounded-[20px] border border-teal-400/20 bg-teal-400/[0.07] p-3 text-left">
      <p className="text-[9px] font-black uppercase text-teal-300">
        Pirâmide
      </p>

      <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-zinc-300">
        {config.top_sets !==
          undefined && (
          <span>
            {config.top_sets}{' '}
            série
            {config.top_sets === 1
              ? ''
              : 's'}{' '}
            até o topo
          </span>
        )}

        {config.increment_percent !==
          undefined && (
          <span>
            • +{' '}
            {
              config.increment_percent
            }
            % por série
          </span>
        )}

        {Array.isArray(
          config.increments
        ) &&
          config.increments.length >
            0 && (
            <span>
              • incrementos:{' '}
              {config.increments.join(
                ', '
              )}
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
