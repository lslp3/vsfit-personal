import type { RestPauseConfig } from '../../types/database';

export function RestPausePanel({
  config,
}: {
  config: RestPauseConfig;
}) {
  return (
    <div className="mt-3 rounded-[20px] border border-sky-400/20 bg-sky-400/[0.07] p-3 text-left">
      <p className="text-[9px] font-black uppercase text-sky-300">
        Rest-pause
      </p>

      <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-zinc-300">
        {config.pause_seconds !==
          undefined && (
          <span>
            {config.pause_seconds}{' '}
            s de pausa
          </span>
        )}

        {config.max_pauses !==
          undefined && (
          <span>
            • máx.{' '}
            {config.max_pauses}{' '}
            pausa
            {config.max_pauses ===
            1
              ? ''
              : 's'}
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
