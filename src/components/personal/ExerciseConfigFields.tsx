import { Input, Textarea } from '../ui/Input';
import { cn } from '../../lib/utils';
import type {
  JsonValue,
  TechniqueConfig,
  WorkoutTechniqueType,
} from '../../types/database';

export interface ExerciseConfigValues {
  sets: string;
  reps: string;
  rest_seconds: number;
  tempo: string;
  suggested_weight: string;
  observation: string;
  technique: WorkoutTechniqueType;
  technique_config: TechniqueConfig | JsonValue;
}

export const DEFAULT_EXERCISE_CONFIG: ExerciseConfigValues = {
  sets: '4',
  reps: '10',
  rest_seconds: 60,
  tempo: '2-0-2-0',
  suggested_weight: '',
  observation: '',
  technique: 'normal',
  technique_config: {},
};

export const TECHNIQUE_OPTIONS: {
  value: WorkoutTechniqueType;
  label: string;
  activeClass: string;
}[] = [
  {
    value: 'normal',
    label: 'Normal',
    activeClass:
      'border-[#ff2a32]/40 bg-[#ff2a32]/15 text-[#ff2a32]',
  },
  {
    value: 'drop_set',
    label: 'Drop-set',
    activeClass:
      'border-orange-400/40 bg-orange-400/15 text-orange-300',
  },
  {
    value: 'bi_set',
    label: 'Bi-set',
    activeClass:
      'border-purple-400/40 bg-purple-400/15 text-purple-300',
  },
  {
    value: 'rest_pause',
    label: 'Rest-pause',
    activeClass:
      'border-sky-400/40 bg-sky-400/15 text-sky-300',
  },
  {
    value: 'pyramid',
    label: 'Pirâmide',
    activeClass:
      'border-teal-400/40 bg-teal-400/15 text-teal-300',
  },
];

export function getTechniqueOption(
  technique?: WorkoutTechniqueType
) {
  return TECHNIQUE_OPTIONS.find(
    (option) => option.value === technique
  );
}

function getTechniqueConfigRecord(
  technique: WorkoutTechniqueType,
  config: TechniqueConfig | JsonValue
): Record<string, unknown> {
  if (
    technique !== 'normal' &&
    config &&
    typeof config === 'object' &&
    !Array.isArray(config)
  ) {
    return config as Record<string, unknown>;
  }

  return {};
}

type TechniqueConfigPanelsProps = {
  technique: WorkoutTechniqueType;
  config: TechniqueConfig | JsonValue;
  onConfigChange: (
    field: string,
    fieldValue: unknown
  ) => void;
};

/**
 * Painéis de configuração por técnica (drop-set, rest-pause, pirâmide e
 * bi-set). Compartilhado entre o modal premium (ExerciseConfigFields) e o
 * card do exercício no builder — um único fluxo de técnicas no sistema.
 */
export function TechniqueConfigPanels({
  technique,
  config,
  onConfigChange,
}: TechniqueConfigPanelsProps) {
  const dropConfig = getTechniqueConfigRecord(
    technique,
    config
  );

  const restConfig = getTechniqueConfigRecord(
    technique,
    config
  );

  const pyramidConfig = getTechniqueConfigRecord(
    technique,
    config
  );

  return (
    <>
      {technique === 'drop_set' && (
        <div className="space-y-2 rounded-2xl border border-orange-400/20 bg-orange-400/[0.06] p-3">
          <p className="text-[10px] font-black uppercase text-orange-300">
            Configuração do drop-set
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Quedas"
              type="number"
              value={String(dropConfig.drops ?? '')}
              onChange={(event) =>
                onConfigChange(
                  'drops',
                  Number(event.target.value) || 0
                )
              }
            />

            <Input
              label="Redução (%)"
              type="number"
              value={String(
                dropConfig.reduction_percent ?? ''
              )}
              onChange={(event) =>
                onConfigChange(
                  'reduction_percent',
                  Number(event.target.value) || 0
                )
              }
            />
          </div>

          <Input
            label="Descanso entre quedas (s)"
            type="number"
            value={String(
              dropConfig.rest_between_drops_seconds ??
                ''
            )}
            onChange={(event) =>
              onConfigChange(
                'rest_between_drops_seconds',
                Number(event.target.value) || 0
              )
            }
          />

          <Textarea
            label="Observações"
            value={String(dropConfig.notes ?? '')}
            onChange={(event) =>
              onConfigChange('notes', event.target.value)
            }
          />
        </div>
      )}

      {technique === 'rest_pause' && (
        <div className="space-y-2 rounded-2xl border border-sky-400/20 bg-sky-400/[0.06] p-3">
          <p className="text-[10px] font-black uppercase text-sky-300">
            Configuração do rest-pause
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Pausa (s)"
              type="number"
              value={String(
                restConfig.pause_seconds ?? ''
              )}
              onChange={(event) =>
                onConfigChange(
                  'pause_seconds',
                  Number(event.target.value) || 0
                )
              }
            />

            <Input
              label="Máx. pausas"
              type="number"
              value={String(
                restConfig.max_pauses ?? ''
              )}
              onChange={(event) =>
                onConfigChange(
                  'max_pauses',
                  Number(event.target.value) || 0
                )
              }
            />
          </div>

          <Textarea
            label="Observações"
            value={String(restConfig.notes ?? '')}
            onChange={(event) =>
              onConfigChange('notes', event.target.value)
            }
          />
        </div>
      )}

      {technique === 'pyramid' && (
        <div className="space-y-2 rounded-2xl border border-teal-400/20 bg-teal-400/[0.06] p-3">
          <p className="text-[10px] font-black uppercase text-teal-300">
            Configuração da pirâmide
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Séries até o topo"
              type="number"
              value={String(
                pyramidConfig.top_sets ?? ''
              )}
              onChange={(event) =>
                onConfigChange(
                  'top_sets',
                  Number(event.target.value) || 0
                )
              }
            />

            <Input
              label="Incremento (%)"
              type="number"
              value={String(
                pyramidConfig.increment_percent ?? ''
              )}
              onChange={(event) =>
                onConfigChange(
                  'increment_percent',
                  Number(event.target.value) || 0
                )
              }
            />
          </div>

          <Input
            label="Incrementos por série (ex.: 10, 5, 0, -10)"
            value={String(
              Array.isArray(
                pyramidConfig.increments
              )
                ? (
                    pyramidConfig.increments as unknown[]
                  ).join(', ')
                : ''
            )}
            onChange={(event) => {
              const increments = event.target.value
                .split(',')
                .map((part) =>
                  Number.parseFloat(
                    part.trim()
                  )
                )
                .filter((number) =>
                  Number.isFinite(number)
                );

              onConfigChange(
                'increments',
                increments
              );
            }}
          />

          <Textarea
            label="Observações"
            value={String(
              pyramidConfig.notes ?? ''
            )}
            onChange={(event) =>
              onConfigChange('notes', event.target.value)
            }
          />
        </div>
      )}

      {technique === 'bi_set' && (
        <div className="rounded-2xl border border-purple-400/20 bg-purple-400/[0.06] p-3">
          <p className="text-[10px] font-black uppercase text-purple-300">
            Bi-set
          </p>

          <p className="mt-1 text-xs text-zinc-300">
            Após adicionar, use o botão Bi-set no card
            do exercício para vincular o exercício
            parceiro e configurar o descanso.
          </p>
        </div>
      )}
    </>
  );
}

type ExerciseConfigFieldsProps = {
  value: ExerciseConfigValues;
  onChange: (
    next: ExerciseConfigValues
  ) => void;
};

/**
 * Formulário de configuração do exercício no modal premium do Personal.
 * Valores iniciais iguais ao fluxo atual do builder (4 séries, 10 reps,
 * 60s de descanso, tempo 2-0-2-0, técnica normal).
 */
export function ExerciseConfigFields({
  value,
  onChange,
}: ExerciseConfigFieldsProps) {
  function setField<
    K extends keyof ExerciseConfigValues
  >(
    key: K,
    next: ExerciseConfigValues[K]
  ) {
    onChange({ ...value, [key]: next });
  }

  function setConfigField(
    field: string,
    fieldValue: unknown
  ) {
    const current =
      value.technique_config &&
      typeof value.technique_config ===
        'object' &&
      !Array.isArray(
        value.technique_config
      )
        ? (value.technique_config as Record<
            string,
            unknown
          >)
        : {};

    onChange({
      ...value,
      technique_config: {
        ...current,
        [field]: fieldValue,
      },
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Séries"
          value={value.sets}
          onChange={(event) =>
            setField('sets', event.target.value)
          }
        />

        <Input
          label="Repetições"
          value={value.reps}
          onChange={(event) =>
            setField('reps', event.target.value)
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Descanso (s)"
          type="number"
          value={String(value.rest_seconds ?? '')}
          onChange={(event) =>
            setField(
              'rest_seconds',
              Number(event.target.value) || 0
            )
          }
        />

        <Input
          label="Tempo (ex.: 2-0-2-0)"
          value={value.tempo}
          onChange={(event) =>
            setField('tempo', event.target.value)
          }
        />
      </div>

      <Input
        label="Carga sugerida (kg)"
        value={value.suggested_weight}
        onChange={(event) =>
          setField(
            'suggested_weight',
            event.target.value
          )
        }
      />

      <Textarea
        label="Observação"
        value={value.observation}
        onChange={(event) =>
          setField('observation', event.target.value)
        }
      />

      <div>
        <p className="mb-2 text-[10px] font-black uppercase text-zinc-500">
          Técnica
        </p>

        <div className="grid grid-cols-3 gap-2">
          {TECHNIQUE_OPTIONS.map(
            (option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange({
                    ...value,
                    technique: option.value,
                    technique_config: {},
                  });
                }}
                className={cn(
                  'min-h-10 rounded-xl border px-2 text-[10px] font-black',
                  value.technique ===
                    option.value
                    ? option.activeClass
                    : 'border-white/10 bg-black/20 text-zinc-500'
                )}
              >
                {option.label}
              </button>
            )
          )}
        </div>
      </div>

      <TechniqueConfigPanels
        technique={value.technique}
        config={value.technique_config}
        onConfigChange={setConfigField}
      />
    </div>
  );
}
