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

import { getWorkoutPlanById } from '../../services/workoutService';
import { cn } from '../../lib/utils';
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
  const keys = [
    'dom',
    'seg',
    'ter',
    'qua',
    'qui',
    'sex',
    'sab',
  ];

  return keys[new Date().getDay()];
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
  return exercise.execution_order ?? exercise.order_index;
}

function getExerciseName(exercise: WorkoutPlanExercise) {
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

function getExerciseImage(
  exercise: WorkoutPlanExercise
) {
  return exercise.image_url || '';
}

function getExerciseVideo(
  exercise: WorkoutPlanExercise
) {
  return exercise.video_url || '';
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

function parseDateOnly(value?: string | null) {
  if (!value) return null;

  const date = new Date(`${value}T12:00:00`);

  return Number.isFinite(date.getTime()) ? date : null;
}

function formatDate(value?: string | null) {
  const date = parseDateOnly(value);

  if (!date) return 'Não definida';

  return date.toLocaleDateString('pt-BR');
}

function getExpirationInfo(endDate?: string | null) {
  const end = parseDateOnly(endDate);

  if (!end) {
    return {
      label: 'Sem vencimento',
      description: 'Este plano não possui data final.',
      className:
        'border-white/10 bg-white/[0.05] text-zinc-400',
    };
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const difference = Math.ceil(
    (end.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (difference < 0) {
    return {
      label: 'Vencido',
      description: `Venceu há ${Math.abs(
        difference
      )} dia${Math.abs(difference) === 1 ? '' : 's'}.`,
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
              difference === 1 ? '' : 's'
            }`,
      description: `Vencimento em ${formatDate(endDate)}.`,
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
  const days = plan.workout_days || [];
  const groups = plan.workout_exercise_groups || [];
  const exercises = plan.workout_plan_exercises || [];

  const dayById = new Map(
    days.map((day) => [day.id, day])
  );

  const sections = new Map<string, DaySection>();

  for (const day of days) {
    const key =
      normalizeDayKey(day.day_key) ||
      `day-${day.id}`;

    sections.set(key, {
      key,
      day,
      exercises: [],
      groups: groups.filter(
        (group) => group.workout_day_id === day.id
      ),
    });
  }

  for (const exercise of exercises) {
    const relatedDay = exercise.workout_day_id
      ? dayById.get(exercise.workout_day_id) || null
      : null;

    const key = relatedDay
      ? normalizeDayKey(relatedDay.day_key)
      : normalizeDayKey(exercise.day_key);

    const existing = sections.get(key);

    if (existing) {
      existing.exercises.push(exercise);
      continue;
    }

    sections.set(key, {
      key,
      day: relatedDay,
      exercises: [exercise],
      groups: relatedDay
        ? groups.filter(
            (group) =>
              group.workout_day_id === relatedDay.id
          )
        : [],
    });
  }

  return [...sections.values()]
    .filter(
      (section) =>
        section.exercises.length > 0 || section.day
    )
    .map((section) => ({
      ...section,
      exercises: [...section.exercises].sort(
        (a, b) =>
          getEffectiveExerciseOrder(a) -
          getEffectiveExerciseOrder(b)
      ),
      groups: [...section.groups].sort(
        (a, b) => a.order_index - b.order_index
      ),
    }))
    .sort((a, b) => {
      const dayOrderA =
        a.day?.order_index ??
        getDayPosition(a.key);

      const dayOrderB =
        b.day?.order_index ??
        getDayPosition(b.key);

      return dayOrderA - dayOrderB;
    });
}

export function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] =
    useState<CompleteWorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('Identificador do treino não encontrado.');
      setLoading(false);
      return;
    }

    void loadPlan(id);
  }, [id]);

  async function loadPlan(workoutId: string) {
    setLoading(true);
    setError('');

    try {
      const data =
        await getWorkoutPlanById(workoutId);

      if (!data) {
        setError('Treino não encontrado.');
        setPlan(null);
        return;
      }

      setPlan(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao carregar treino.';

      setError(message);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }

  const exercises = useMemo(() => {
    if (!plan) return [];

    return [...plan.workout_plan_exercises].sort(
      (a, b) =>
        getEffectiveExerciseOrder(a) -
        getEffectiveExerciseOrder(b)
    );
  }, [plan]);

  const daySections = useMemo(() => {
    if (!plan) return [];

    return buildDaySections(plan);
  }, [plan]);

  const totalSets = exercises.reduce(
    (sum, exercise) => {
      const parsed = Number.parseInt(
        String(exercise.sets || '0'),
        10
      );

      return (
        sum +
        (Number.isFinite(parsed) && parsed > 0
          ? parsed
          : 1)
      );
    },
    0
  );

  const todayDayKey = getTodayDayKey();

  const expirationInfo = getExpirationInfo(
    plan?.end_date
  );

  const totalBiSets =
    plan?.workout_exercise_groups.filter(
      (group) => group.group_type === 'bi_set'
    ).length || 0;

  const totalDropSets = exercises.filter(
    (exercise) =>
      exercise.technique_type === 'drop_set'
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15 shadow-[0_18px_45px_rgba(255,42,48,0.22)]">
            <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
          </div>

          <div>
            <p className="text-sm font-black text-white">
              Carregando treino...
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Preparando os exercícios.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-[#050505] px-4 pb-28 pt-8 text-white">
        <div className="mx-auto max-w-lg rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-300">
            <AlertCircle className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-xl font-black text-white">
            Treino não encontrado
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-red-200/80">
            {error ||
              'Este plano de treino não está disponível.'}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate('/student/workouts')
            }
            className="mt-6 h-12 w-full rounded-2xl bg-[#ff2a32] text-sm font-black text-white"
          >
            VOLTAR AOS TREINOS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-lg px-4 pb-48 pt-5">
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-300 transition-all active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <span
            className={cn(
              'rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-wide',
              expirationInfo.className
            )}
          >
            {expirationInfo.label}
          </span>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-[#ff2a32]/16 via-white/[0.045] to-white/[0.025] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
                Treino Premium
              </p>

              <h1 className="mt-2 text-[28px] font-black uppercase italic leading-none tracking-[-0.06em] text-white">
                {plan.name}
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                {plan.objective ||
                  'Treino personalizado para sua evolução.'}
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#ff2a32] text-white">
              <Dumbbell className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <InfoCard
              icon={Layers}
              value={plan.level || 'Livre'}
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
              value={String(exercises.length)}
              label="Exercícios"
            />
          </div>
        </motion.section>

        <section className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#ff2a32]" />

            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
              Período do plano
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                Início
              </p>

              <p className="mt-1 text-sm font-black text-white">
                {formatDate(plan.start_date)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                Vencimento
              </p>

              <p className="mt-1 text-sm font-black text-white">
                {formatDate(plan.end_date)}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-zinc-500">
            {expirationInfo.description}
          </p>
        </section>

        {daySections.length > 0 && (
          <section className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#ff2a32]" />

              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
                Dias do treino
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {daySections.map((section) => (
                <span
                  key={section.key}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[11px] font-black',
                    section.key === todayDayKey
                      ? 'border-[#ff2a32]/35 bg-[#ff2a32]/15 text-[#ff2a32]'
                      : 'border-white/10 bg-white/[0.05] text-zinc-400'
                  )}
                >
                  {DAY_LABELS[section.key] ||
                    section.key
                      .slice(0, 3)
                      .toUpperCase()}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-4 text-center">
            <Flame className="mx-auto mb-2 h-5 w-5 text-[#ff2a32]" />

            <p className="text-2xl font-black text-white">
              {totalSets}
            </p>

            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">
              Séries totais
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-4 text-center">
            <Trophy className="mx-auto mb-2 h-5 w-5 text-yellow-400" />

            <p className="text-2xl font-black text-white">
              {daySections.length}
            </p>

            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">
              Dias
            </p>
          </div>
        </section>

        {(totalDropSets > 0 || totalBiSets > 0) && (
          <section className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-orange-400/20 bg-orange-400/[0.07] p-4 text-center">
              <Zap className="mx-auto mb-2 h-5 w-5 text-orange-300" />

              <p className="text-xl font-black text-white">
                {totalDropSets}
              </p>

              <p className="text-[10px] font-black uppercase text-orange-200/70">
                Drop-sets
              </p>
            </div>

            <div className="rounded-[24px] border border-purple-400/20 bg-purple-400/[0.07] p-4 text-center">
              <Layers2 className="mx-auto mb-2 h-5 w-5 text-purple-300" />

              <p className="text-xl font-black text-white">
                {totalBiSets}
              </p>

              <p className="text-[10px] font-black uppercase text-purple-200/70">
                Bi-sets
              </p>
            </div>
          </section>
        )}

        <section className="mt-6 space-y-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
              Exercícios
            </p>

            <h2 className="mt-1 text-xl font-black text-white">
              Plano do treino
            </h2>
          </div>

          {exercises.length === 0 ? (
            <EmptyWorkout />
          ) : (
            daySections.map((section) => (
              <DaySectionCard
                key={section.key}
                section={section}
              />
            ))
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-[50px] z-40 border-t border-white/10 bg-[#050505]/98 px-4 pb-3 pt-3 backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={() =>
              navigate(
                `/student/workout-execution/${plan.id}`
              )
            }
            disabled={exercises.length === 0}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-[#ff2a32] text-[14px] font-black uppercase tracking-wide text-white transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Play className="h-5 w-5" />
            Iniciar treino
          </button>
        </div>
      </div>
    </div>
  );
}

function DaySectionCard({
  section,
}: {
  section: DaySection;
}) {
  const groupedExerciseIds = new Set(
    section.groups.flatMap((group) =>
      section.exercises
        .filter(
          (exercise) =>
            exercise.exercise_group_id === group.id
        )
        .map((exercise) => exercise.id)
    )
  );

  const independentExercises =
    section.exercises.filter(
      (exercise) =>
        !groupedExerciseIds.has(exercise.id)
    );

  const title =
    section.day?.name ||
    DAY_NAMES[section.key] ||
    'Treino';

  const subtitle =
    section.day?.notes || '';

  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border border-[#ff2a32]/20 bg-[#ff2a32]/[0.07] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff2a32]">
              {DAY_NAMES[section.key] ||
                section.key}
            </span>

            <h3 className="mt-1 text-lg font-black text-white">
              {title}
            </h3>
          </div>

          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-black text-zinc-400">
            {section.exercises.length}{' '}
            exercício
            {section.exercises.length === 1
              ? ''
              : 's'}
          </span>
        </div>

        {subtitle && (
          <p className="mt-3 text-xs leading-relaxed text-zinc-400">
            {subtitle}
          </p>
        )}
      </div>

      {section.groups.map((group) => {
        const groupedExercises =
          section.exercises
            .filter(
              (exercise) =>
                exercise.exercise_group_id === group.id
            )
            .sort(
              (a, b) =>
                (a.group_order ?? 0) -
                (b.group_order ?? 0)
            );

        if (groupedExercises.length === 0) {
          return null;
        }

        return (
          <BiSetCard
            key={group.id}
            group={group}
            exercises={groupedExercises}
          />
        );
      })}

      {independentExercises.map(
        (exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            index={index}
          />
        )
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
    <div className="rounded-[30px] border border-purple-400/25 bg-purple-400/[0.07] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-400/15 px-3 py-1 text-[10px] font-black text-purple-200">
            <Layers2 className="h-3.5 w-3.5" />
            BI-SET
          </span>

          <h3 className="mt-2 text-base font-black text-white">
            {group.name || 'Executar em sequência'}
          </h3>
        </div>

        {group.rounds && (
          <span className="rounded-full border border-purple-300/20 bg-black/20 px-3 py-1.5 text-[10px] font-bold text-purple-200">
            {group.rounds} rodadas
          </span>
        )}
      </div>

      <div className="space-y-3">
        {exercises.map((exercise, index) => (
          <div
            key={exercise.id}
            className="rounded-[22px] border border-white/10 bg-black/20 p-3"
          >
            <p className="text-[9px] font-black uppercase tracking-wide text-purple-300">
              Exercício {index + 1}
            </p>

            <p className="mt-1 text-sm font-black text-white">
              {getExerciseName(exercise)}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {exercise.sets && (
                <SmallTag>
                  {exercise.sets} séries
                </SmallTag>
              )}

              {exercise.reps && (
                <SmallTag>
                  {exercise.reps} reps
                </SmallTag>
              )}

              {exercise.suggested_weight && (
                <SmallTag>
                  {exercise.suggested_weight}
                </SmallTag>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-purple-300/15 bg-black/20 p-3">
        <p className="text-xs leading-relaxed text-purple-100/80">
          Execute os dois exercícios em sequência.
          {group.rest_after_seconds !== null &&
            ` Descanse ${group.rest_after_seconds}s após completar os dois.`}
        </p>

        {group.notes && (
          <p className="mt-2 text-xs text-zinc-400">
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
  const observation =
    getExerciseObservation(exercise);
  const imageUrl = getExerciseImage(exercise);
  const videoUrl = getExerciseVideo(exercise);
  const technique =
    exercise.technique_type || 'normal';
  const dropConfig =
    getDropSetConfig(exercise);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.25,
        delay: index * 0.04,
      }}
      className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_16px_45px_rgba(0,0,0,0.28)]"
    >
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[22px] border border-white/10 bg-black/30">
          {videoUrl ? (
            <video
              src={videoUrl}
              muted
              loop
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={getExerciseName(exercise)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#ff2a32]">
              <Dumbbell className="h-8 w-8" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {technique === 'drop_set' && (
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-orange-400/15 px-2.5 py-1 text-[9px] font-black text-orange-300">
              <Zap className="h-3 w-3" />
              DROP-SET
            </span>
          )}

          <h3 className="text-[16px] font-black leading-tight text-white">
            {getExerciseName(exercise)}
          </h3>

          <div className="mt-3 flex flex-wrap gap-2">
            {exercise.sets && (
              <SmallTag>
                {exercise.sets} séries
              </SmallTag>
            )}

            {exercise.reps && (
              <SmallTag>
                {exercise.reps} reps
              </SmallTag>
            )}

            {exercise.suggested_weight && (
              <SmallTag>
                {exercise.suggested_weight}
              </SmallTag>
            )}

            {exercise.rest_seconds !== null &&
              exercise.rest_seconds > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold text-zinc-300">
                  <Timer className="h-3.5 w-3.5 text-[#ff2a32]" />
                  {exercise.rest_seconds}s
                </span>
              )}
          </div>

          {technique === 'drop_set' && (
            <div className="mt-3 rounded-2xl border border-orange-400/20 bg-orange-400/[0.06] p-3">
              <p className="text-[10px] font-black uppercase text-orange-300">
                Configuração
              </p>

              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-orange-100/80">
                {dropConfig.drops !== undefined && (
                  <span>
                    {dropConfig.drops} queda
                    {dropConfig.drops === 1 ? '' : 's'}
                  </span>
                )}

                {dropConfig.reduction_percent !==
                  undefined && (
                  <span>
                    • Redução de{' '}
                    {dropConfig.reduction_percent}%
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
                <p className="mt-2 text-xs text-zinc-400">
                  {dropConfig.notes}
                </p>
              )}
            </div>
          )}

          {observation && (
            <p className="mt-3 rounded-2xl border border-white/5 bg-black/20 p-3 text-xs leading-relaxed text-zinc-500">
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
    <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
      <Icon className="mx-auto mb-2 h-4 w-4 text-[#ff2a32]" />

      <p className="truncate text-sm font-black text-white">
        {value}
      </p>

      <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
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
    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold text-zinc-300">
      {children}
    </span>
  );
}

function EmptyWorkout() {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/[0.035] p-8 text-center">
      <Dumbbell className="mx-auto h-10 w-10 text-zinc-700" />

      <h3 className="mt-4 text-lg font-black text-white">
        Nenhum exercício
      </h3>

      <p className="mt-2 text-sm text-zinc-500">
        Este plano ainda não possui exercícios
        cadastrados.
      </p>
    </div>
  );
}

export default WorkoutDetailPage;