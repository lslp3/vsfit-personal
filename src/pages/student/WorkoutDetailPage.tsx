import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  Clock,
  Dumbbell,
  Flame,
  Layers,
  Layers2,
  Loader2,
  Play,
  Target,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';

import { cn } from '../../lib/utils';
import {
  formatWorkoutPlanDate,
  isWorkoutPlanExpired,
  notifyTrainerAboutExpiredPlan,
} from '../../services/workoutExpirationService';
import { getWorkoutPlanById } from '../../services/workoutService';
import type {
  CompleteWorkoutPlan,
  DropSetConfig,
  WorkoutDay,
  WorkoutExerciseGroup,
  WorkoutPlanExercise,
} from '../../types/database';

const DAY_ORDER = [
  'seg',
  'ter',
  'qua',
  'qui',
  'sex',
  'sab',
  'dom',
  '_default',
] as const;

const DAY_ALIASES: Record<string, string> = {
  Monday: 'seg',
  Tuesday: 'ter',
  Wednesday: 'qua',
  Thursday: 'qui',
  Friday: 'sex',
  Saturday: 'sab',
  Sunday: 'dom',
  monday: 'seg',
  tuesday: 'ter',
  wednesday: 'qua',
  thursday: 'qui',
  friday: 'sex',
  saturday: 'sab',
  sunday: 'dom',
  seg: 'seg',
  ter: 'ter',
  qua: 'qua',
  qui: 'qui',
  sex: 'sex',
  sab: 'sab',
  dom: 'dom',
};

const DAY_LABELS: Record<string, string> = {
  seg: 'SEG',
  ter: 'TER',
  qua: 'QUA',
  qui: 'QUI',
  sex: 'SEX',
  sab: 'SÁB',
  dom: 'DOM',
  _default: 'DIA',
};

const DAY_NAMES: Record<string, string> = {
  seg: 'Segunda-feira',
  ter: 'Terça-feira',
  qua: 'Quarta-feira',
  qui: 'Quinta-feira',
  sex: 'Sexta-feira',
  sab: 'Sábado',
  dom: 'Domingo',
  _default: 'Treino',
};

interface DaySection {
  key: string;
  day: WorkoutDay | null;
  exercises: WorkoutPlanExercise[];
  groups: WorkoutExerciseGroup[];
}

function normalizeDayKey(value?: string | null) {
  if (!value) return '_default';

  return DAY_ALIASES[value] || value;
}

function getTodayDayKey() {
  return ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][
    new Date().getDay()
  ];
}

function getDayPosition(dayKey: string) {
  const normalized = normalizeDayKey(dayKey);

  const index = DAY_ORDER.indexOf(
    normalized as (typeof DAY_ORDER)[number]
  );

  return index === -1 ? DAY_ORDER.length : index;
}

function getEffectiveExerciseOrder(
  exercise: WorkoutPlanExercise
) {
  return (
    exercise.execution_order ??
    exercise.order_index ??
    0
  );
}

function getExerciseName(
  exercise: WorkoutPlanExercise
) {
  return exercise.name || 'Exercício';
}

function getExerciseObservation(
  exercise: WorkoutPlanExercise
) {
  return (
    exercise.observation ||
    exercise.instructions ||
    ''
  );
}

function getDropSetConfig(
  exercise: WorkoutPlanExercise
): DropSetConfig {
  const config = exercise.technique_config;

  if (
    config &&
    typeof config === 'object' &&
    !Array.isArray(config)
  ) {
    return config as DropSetConfig;
  }

  return {};
}

function parseDateOnly(
  value?: string | null
) {
  if (!value) return null;

  const normalizedValue =
    String(value).slice(0, 10);

  const date = new Date(
    `${normalizedValue}T12:00:00`
  );

  return Number.isFinite(
    date.getTime()
  )
    ? date
    : null;
}

function formatDate(
  value?: string | null
) {
  const date = parseDateOnly(value);

  if (!date) return 'Não definida';

  return date.toLocaleDateString(
    'pt-BR'
  );
}

function getExpirationInfo(
  endDate?: string | null
) {
  const end = parseDateOnly(endDate);

  if (!end) {
    return {
      label: 'Sem vencimento',
      description:
        'Este plano não possui data final.',
      className:
        'border-white/10 bg-white/[0.05] text-zinc-400',
    };
  }

  const today = new Date();

  today.setHours(
    12,
    0,
    0,
    0
  );

  const difference = Math.ceil(
    (end.getTime() -
      today.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (difference < 0) {
    return {
      label: 'Vencido',
      description: `Venceu há ${Math.abs(
        difference
      )} dia${
        Math.abs(difference) === 1
          ? ''
          : 's'
      }.`,
      className:
        'border-red-400/25 bg-red-400/10 text-red-300',
    };
  }

  if (difference <= 7) {
    return {
      label:
        difference === 0
          ? 'Vence hoje'
          : `Vence em ${difference} dia${
              difference === 1
                ? ''
                : 's'
            }`,
      description: `Vencimento em ${formatDate(
        endDate
      )}.`,
      className:
        'border-amber-400/25 bg-amber-400/10 text-amber-300',
    };
  }

  return {
    label: 'Vigente',
    description: `${difference} dias restantes.`,
    className:
      'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  };
}

function buildDaySections(
  plan: CompleteWorkoutPlan
): DaySection[] {
  const days =
    plan.workout_days || [];

  const groups =
    plan.workout_exercise_groups ||
    [];

  const exercises =
    plan.workout_plan_exercises ||
    [];

  const dayById = new Map(
    days.map((day) => [
      day.id,
      day,
    ])
  );

  const sections = new Map<
    string,
    DaySection
  >();

  for (const day of days) {
    const key = normalizeDayKey(
      day.day_key
    );

    sections.set(key, {
      key,
      day,
      exercises: [],
      groups: groups.filter(
        (group) =>
          group.workout_day_id ===
          day.id
      ),
    });
  }

  for (const exercise of exercises) {
    const relatedDay =
      exercise.workout_day_id
        ? dayById.get(
            exercise.workout_day_id
          ) || null
        : null;

    const key = relatedDay
      ? normalizeDayKey(
          relatedDay.day_key
        )
      : normalizeDayKey(
          exercise.day_key
        );

    const existing =
      sections.get(key);

    if (existing) {
      existing.exercises.push(
        exercise
      );

      continue;
    }

    sections.set(key, {
      key,
      day: relatedDay,
      exercises: [exercise],
      groups: relatedDay
        ? groups.filter(
            (group) =>
              group.workout_day_id ===
              relatedDay.id
          )
        : [],
    });
  }

  return [...sections.values()]
    .filter(
      (section) =>
        section.day ||
        section.exercises.length > 0
    )
    .map((section) => ({
      ...section,

      exercises: [
        ...section.exercises,
      ].sort(
        (a, b) =>
          getEffectiveExerciseOrder(
            a
          ) -
          getEffectiveExerciseOrder(
            b
          )
      ),

      groups: [
        ...section.groups,
      ].sort(
        (a, b) =>
          a.order_index -
          b.order_index
      ),
    }))
    .sort((a, b) => {
      const orderA =
        a.day?.order_index ??
        getDayPosition(a.key);

      const orderB =
        b.day?.order_index ??
        getDayPosition(b.key);

      return orderA - orderB;
    });
}

export function WorkoutDetailPage() {
  const { id } =
    useParams<{ id: string }>();

  const navigate = useNavigate();

  const [plan, setPlan] =
    useState<CompleteWorkoutPlan | null>(
      null
    );

  const [
    selectedDayKey,
    setSelectedDayKey,
  ] = useState<string | null>(
    null
  );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (!id) {
      setError(
        'Identificador do treino não encontrado.'
      );

      setLoading(false);

      return;
    }

    void loadPlan(id);
  }, [id]);

  useEffect(() => {
    if (
      !plan ||
      !isWorkoutPlanExpired(
        plan.end_date
      )
    ) {
      return;
    }

    void notifyTrainerAboutExpiredPlan({
      plan,
    });
  }, [plan]);

  async function loadPlan(
    workoutId: string
  ) {
    setLoading(true);
    setError('');

    try {
      const data =
        await getWorkoutPlanById(
          workoutId
        );

      if (!data) {
        setError(
          'Treino não encontrado.'
        );

        setPlan(null);

        return;
      }

      setPlan(data);
    } catch (
      loadError: unknown
    ) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Erro ao carregar treino.';

      setError(message);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }

  const exercises = useMemo(() => {
    if (!plan) return [];

    return [
      ...plan.workout_plan_exercises,
    ].sort(
      (a, b) =>
        getEffectiveExerciseOrder(
          a
        ) -
        getEffectiveExerciseOrder(
          b
        )
    );
  }, [plan]);

  const daySections =
    useMemo(() => {
      if (!plan) return [];

      return buildDaySections(plan);
    }, [plan]);

  const selectedSection =
    useMemo(() => {
      return (
        daySections.find(
          (section) =>
            section.key ===
            selectedDayKey
        ) || null
      );
    }, [
      daySections,
      selectedDayKey,
    ]);

  const totalSets =
    exercises.reduce(
      (sum, exercise) => {
        const parsed =
          Number.parseInt(
            String(
              exercise.sets || '0'
            ),
            10
          );

        return (
          sum +
          (Number.isFinite(parsed) &&
          parsed > 0
            ? parsed
            : 1)
        );
      },
      0
    );

  const todayDayKey =
    getTodayDayKey();

  const expirationInfo =
    getExpirationInfo(
      plan?.end_date
    );

  const planExpired =
    isWorkoutPlanExpired(
      plan?.end_date
    );

  const totalBiSets =
    plan?.workout_exercise_groups.filter(
      (group) =>
        group.group_type ===
        'bi_set'
    ).length || 0;

  const totalDropSets =
    exercises.filter(
      (exercise) =>
        exercise.technique_type ===
        'drop_set'
    ).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-[#ff2a32]/25 bg-[#ff2a32]/15">
            <Loader2 className="h-8 w-8 animate-spin text-[#ff2a32]" />
          </div>

          <div>
            <p className="text-[13px] font-black text-white">
              Carregando treino...
            </p>

            <p className="mt-1 text-[11px] text-zinc-500">
              Preparando os exercícios.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-[#050505] px-4 pb-24 pt-8 text-white">
        <div className="mx-auto max-w-lg rounded-[24px] border border-red-500/20 bg-red-500/10 p-5 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-300" />

          <h1 className="mt-3 text-lg font-black text-white">
            Treino não encontrado
          </h1>

          <p className="mt-1.5 text-[13px] text-red-200/80">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/student/workouts'
              )
            }
            className="mt-4 h-11 w-full rounded-2xl bg-[#ff2a32] text-[13px] font-black text-white"
          >
            VOLTAR AOS TREINOS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-lg px-4 pb-40 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <span
            className={cn(
              'rounded-full border px-4 py-2 text-[11px] font-black uppercase',
              expirationInfo.className
            )}
          >
            {expirationInfo.label}
          </span>
        </div>

        <motion.section
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="rounded-[28px] border border-white/10 bg-gradient-to-br from-[#ff2a32]/16 via-white/[0.045] to-white/[0.025] p-3.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
                Treino Premium
              </p>

              <h1 className="mt-1.5 text-[20px] font-black uppercase italic leading-none text-white">
                {plan.name}
              </h1>

              <p className="mt-2 text-[13px] text-zinc-400">
                {plan.objective ||
                  'Treino personalizado para sua evolução.'}
              </p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[#ff2a32]">
              <Dumbbell className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <InfoCard
              icon={Layers}
              value={
                plan.level ||
                'Livre'
              }
              label="Nível"
            />

            <InfoCard
              icon={Clock}
              value={
                plan.duration_minutes
                  ? `${plan.duration_minutes} min`
                  : '--'
              }
              label="Duração"
            />

            <InfoCard
              icon={Target}
              value={String(
                exercises.length
              )}
              label="Exercícios"
            />
          </div>
        </motion.section>

        <section className="mt-3 rounded-[24px] border border-white/10 bg-white/[0.035] p-3.5">
          <div className="mb-2.5 flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-[#ff2a32]" />

            <p className="text-[10px] font-black uppercase text-zinc-500">
              Período do plano
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <DateCard
              label="Início"
              value={formatDate(
                plan.start_date
              )}
            />

            <DateCard
              label="Vencimento"
              value={formatDate(
                plan.end_date
              )}
            />
          </div>

          <p className="mt-2 text-[11px] text-zinc-500">
            {expirationInfo.description}
          </p>
        </section>

        <section className="mt-3 rounded-[24px] border border-white/10 bg-white/[0.035] p-3.5">
          <div className="mb-2.5 flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-[#ff2a32]" />

            <p className="text-[10px] font-black uppercase text-zinc-500">
              Selecione o treino
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {daySections.map(
              (section) => {
                const selected =
                  section.key ===
                  selectedDayKey;

                const today =
                  section.key ===
                  todayDayKey;

                return (
                  <button
                    key={
                      section.key
                    }
                    type="button"
                    onClick={() =>
                      setSelectedDayKey(
                        section.key
                      )
                    }
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-[10px] font-black transition-all',
                      selected
                        ? 'border-[#ff2a32] bg-[#ff2a32] text-white'
                        : today
                          ? 'border-[#ff2a32]/40 bg-[#ff2a32]/15 text-[#ff2a32]'
                          : 'border-white/10 bg-white/[0.05] text-zinc-400'
                    )}
                  >
                    {DAY_LABELS[
                      section.key
                    ] ||
                      section.key
                        .slice(0, 3)
                        .toUpperCase()}
                  </button>
                );
              }
            )}
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
            Você pode executar qualquer treino do plano em qualquer dia.
          </p>
        </section>

        <section className="mt-3 grid grid-cols-2 gap-2.5">
          <StatisticCard
            icon={Flame}
            value={String(
              totalSets
            )}
            label="Séries totais"
          />

          <StatisticCard
            icon={Trophy}
            value={String(
              daySections.length
            )}
            label="Dias"
          />
        </section>

        {(totalDropSets > 0 ||
          totalBiSets > 0) && (
          <section className="mt-2.5 grid grid-cols-2 gap-2.5">
            <StatisticCard
              icon={Zap}
              value={String(
                totalDropSets
              )}
              label="Drop-sets"
            />

            <StatisticCard
              icon={Layers2}
              value={String(
                totalBiSets
              )}
              label="Bi-sets"
            />
          </section>
        )}

        <section className="mt-3 space-y-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
              Treinos do plano
            </p>

            <h2 className="mt-1 text-lg font-black">
              {selectedSection
                ? DAY_NAMES[
                    selectedSection.key
                  ] ||
                  selectedSection.key
                : 'Selecione um dia'}
            </h2>
          </div>

          {!selectedSection ? (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-zinc-700" />

              <h3 className="mt-3 text-base font-black">
                Escolha um treino
              </h3>

              <p className="mt-1.5 text-[13px] text-zinc-500">
                Selecione SEG, TER, QUA,
                QUI, SEX, SÁB ou DOM
                para visualizar os
                exercícios.
              </p>
            </div>
          ) : (
            <DaySectionCard
              section={
                selectedSection
              }
            />
          )}
        </section>
      </div>

       {selectedSection && (
         <div className="fixed inset-x-0 z-40 border-t border-white/10 bg-[#050505]/98 px-4 pt-2.5 backdrop-blur-xl" style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))', paddingBottom: 'max(10px, env(safe-area-inset-bottom, 0px))' }}>
           <div className="mx-auto max-w-lg">
            {planExpired ? (
              <div className="rounded-[20px] border border-red-400/25 bg-red-400/10 px-3.5 py-3 text-center">
                <p className="text-[11px] font-black uppercase text-red-300">
                  Plano vencido
                </p>

                <p className="mt-1 text-[10px] leading-relaxed text-red-100/75">
                  Este plano venceu em{' '}
                  {formatWorkoutPlanDate(
                    plan.end_date
                  )}
                  . Nenhum treino pode
                  ser executado até o
                  personal editar o
                  plano ou criar um
                  novo.
                </p>
              </div>
            ) : (
              <button
                type="button"
                disabled={
                  selectedSection
                    .exercises
                    .length === 0
                }
                onClick={() =>
                  navigate(
                    `/student/workout-execution/${plan.id}?day=${selectedSection.key}`
                  )
                }
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[20px] bg-[#ff2a32] text-[13px] font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-4 w-4" />

                Executar treino selecionado
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DaySectionCard({
  section,
}: {
  section: DaySection;
}) {
  const groupedExerciseIds =
    new Set(
      section.groups.flatMap(
        (group) =>
          section.exercises
            .filter(
              (exercise) =>
                exercise.exercise_group_id ===
                group.id
            )
            .map(
              (exercise) =>
                exercise.id
            )
      )
    );

  const independentExercises =
    section.exercises.filter(
      (exercise) =>
        !groupedExerciseIds.has(
          exercise.id
        )
    );

  const title =
    section.day?.name ||
    DAY_NAMES[section.key] ||
    'Treino';

  return (
    <div className="space-y-2.5">
      <div className="rounded-[22px] border border-[#ff2a32]/20 bg-[#ff2a32]/[0.07] p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase text-[#ff2a32]">
              {DAY_NAMES[
                section.key
              ] || section.key}
            </p>

            <h3 className="mt-1 text-[15px] font-black">
              {title}
            </h3>
          </div>

          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[9px] font-black text-zinc-400">
            {section.exercises.length}{' '}
            exercício
            {section.exercises
              .length === 1
              ? ''
              : 's'}
          </span>
        </div>

        {section.day?.notes && (
          <p className="mt-2 text-[11px] text-zinc-400">
            {
              section.day
                .notes
            }
          </p>
        )}
      </div>

      {section.groups.map(
        (group) => {
          const groupedExercises =
            section.exercises
              .filter(
                (exercise) =>
                  exercise.exercise_group_id ===
                  group.id
              )
              .sort(
                (a, b) =>
                  (a.group_order ??
                    0) -
                  (b.group_order ??
                    0)
              );

          if (
            groupedExercises.length ===
            0
          ) {
            return null;
          }

          return (
            <BiSetCard
              key={group.id}
              group={group}
              exercises={
                groupedExercises
              }
            />
          );
        }
      )}

      {independentExercises.map(
        (exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            index={index}
          />
        )
      )}

      {section.exercises.length ===
        0 && (
        <div className="rounded-[22px] border border-white/10 bg-white/[0.035] p-5 text-center">
          <Dumbbell className="mx-auto h-7 w-7 text-zinc-700" />

          <p className="mt-2 text-[13px] text-zinc-500">
            Nenhum exercício
            cadastrado neste dia.
          </p>
        </div>
      )}
    </div>
  );
}

function BiSetCard({
  group,
  exercises,
}: {
  group: WorkoutExerciseGroup;
  exercises: WorkoutPlanExercise[];
}) {
  return (
    <div className="rounded-[24px] border border-purple-400/25 bg-purple-400/[0.07] p-3.5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-400/15 px-2.5 py-0.5 text-[9px] font-black text-purple-200">
            <Layers2 className="h-3 w-3" />
            BI-SET
          </span>

          <h3 className="mt-1.5 text-[15px] font-black">
            {group.name ||
              'Executar em sequência'}
          </h3>
        </div>

        {group.rounds && (
          <span className="rounded-full border border-purple-300/20 bg-black/20 px-2.5 py-0.5 text-[9px] font-bold text-purple-200">
            {group.rounds}{' '}
            rodadas
          </span>
        )}
      </div>

      <div className="space-y-2">
        {exercises.map(
          (exercise, index) => (
            <div
              key={exercise.id}
              className="rounded-[18px] border border-white/10 bg-black/20 p-2.5"
            >
              <p className="text-[8px] font-black uppercase text-purple-300">
                Exercício{' '}
                {index + 1}
              </p>

              <p className="mt-1 text-[13px] font-black">
                {getExerciseName(
                  exercise
                )}
              </p>

              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {exercise.sets && (
                  <SmallTag>
                    {exercise.sets}{' '}
                    séries
                  </SmallTag>
                )}

                {exercise.reps && (
                  <SmallTag>
                    {exercise.reps}{' '}
                    reps
                  </SmallTag>
                )}

                {exercise.suggested_weight && (
                  <SmallTag>
                    {
                      exercise.suggested_weight
                    }
                  </SmallTag>
                )}
              </div>
            </div>
          )
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-purple-300/15 bg-black/20 p-2.5">
        <p className="text-[11px] text-purple-100/80">
          Execute os exercícios em
          sequência.
          {group.rest_after_seconds !==
            null &&
            ` Descanse ${group.rest_after_seconds}s depois de concluir o bi-set.`}
        </p>

        {group.notes && (
          <p className="mt-1.5 text-[11px] text-zinc-400">
            {group.notes}
          </p>
        )}
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  index,
}: {
  exercise: WorkoutPlanExercise;
  index: number;
}) {
  const technique =
    exercise.technique_type ||
    'normal';

  const dropConfig =
    getDropSetConfig(exercise);

  const observation =
    getExerciseObservation(
      exercise
    );

  return (
    <motion.div
      initial={{
        opacity: 0,
        x: -8,
      }}
      animate={{
        opacity: 1,
        x: 0,
      }}
      transition={{
        duration: 0.25,
        delay: index * 0.04,
      }}
      className="rounded-[24px] border border-white/10 bg-white/[0.04] p-3"
    >
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[18px] border border-white/10 bg-black/30">
          {exercise.video_url ? (
            <video
              src={
                exercise.video_url
              }
              muted
              loop
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          ) : exercise.image_url ? (
            <img
              src={
                exercise.image_url
              }
              alt={getExerciseName(
                exercise
              )}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Dumbbell className="h-7 w-7 text-[#ff2a32]" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {technique ===
            'drop_set' && (
            <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-orange-400/15 px-2 py-0.5 text-[8px] font-black text-orange-300">
              <Zap className="h-2.5 w-2.5" />

              DROP-SET
            </span>
          )}

          <h3 className="text-[14px] font-black">
            {getExerciseName(
              exercise
            )}
          </h3>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {exercise.sets && (
              <SmallTag>
                {exercise.sets}{' '}
                séries
              </SmallTag>
            )}

            {exercise.reps && (
              <SmallTag>
                {exercise.reps}{' '}
                reps
              </SmallTag>
            )}

            {exercise.suggested_weight && (
              <SmallTag>
                {
                  exercise.suggested_weight
                }
              </SmallTag>
            )}

            {exercise.rest_seconds !==
              null &&
              exercise.rest_seconds >
                0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold text-zinc-300">
                  <Timer className="h-3 w-3 text-[#ff2a32]" />

                  {
                    exercise.rest_seconds
                  }
                  s
                </span>
              )}
          </div>

          {technique ===
            'drop_set' && (
            <div className="mt-2 rounded-2xl border border-orange-400/20 bg-orange-400/[0.06] p-2.5">
              <p className="text-[9px] font-black uppercase text-orange-300">
                Configuração
              </p>

              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-orange-100/80">
                {dropConfig.drops !==
                  undefined && (
                  <span>
                    {
                      dropConfig.drops
                    }{' '}
                    queda
                    {dropConfig.drops ===
                    1
                      ? ''
                      : 's'}
                  </span>
                )}

                {dropConfig.reduction_percent !==
                  undefined && (
                  <span>
                    • Redução de{' '}
                    {
                      dropConfig.reduction_percent
                    }
                    %
                  </span>
                )}

                {dropConfig.rest_between_drops_seconds !==
                  undefined && (
                  <span>
                    •{' '}
                    {
                      dropConfig.rest_between_drops_seconds
                    }
                    s entre quedas
                  </span>
                )}
              </div>

              {dropConfig.notes && (
                <p className="mt-1.5 text-[11px] text-zinc-400">
                  {
                    dropConfig.notes
                  }
                </p>
              )}
            </div>
          )}

          {observation && (
            <p className="mt-2 rounded-2xl border border-white/5 bg-black/20 p-2.5 text-[11px] text-zinc-500">
              {observation}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function InfoCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Layers;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[16px] border border-white/10 bg-black/20 p-2.5 text-center">
      <Icon className="mx-auto mb-1.5 h-3.5 w-3.5 text-[#ff2a32]" />

      <p className="truncate text-[13px] font-black">
        {value}
      </p>

      <p className="text-[9px] font-black uppercase text-zinc-600">
        {label}
      </p>
    </div>
  );
}

function DateCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-2.5">
      <p className="text-[8px] font-black uppercase text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-[13px] font-black">
        {value}
      </p>
    </div>
  );
}

function StatisticCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Flame;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.035] p-3 text-center">
      <Icon className="mx-auto mb-1.5 h-4 w-4 text-[#ff2a32]" />

      <p className="text-lg font-black">
        {value}
      </p>

      <p className="text-[9px] font-black uppercase text-zinc-600">
        {label}
      </p>
    </div>
  );
}

function SmallTag({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold text-zinc-300">
      {children}
    </span>
  );
}

export default WorkoutDetailPage;