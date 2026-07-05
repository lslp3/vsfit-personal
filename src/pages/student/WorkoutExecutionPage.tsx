import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Layers2,
  Loader2,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import * as studentService from '../../services/studentService';
import {
  getWorkoutPlanById,
  saveWorkoutLog,
} from '../../services/workoutService';
import type {
  CompleteWorkoutPlan,
  DropSetConfig,
  WorkoutExerciseGroup,
  WorkoutPlanExercise,
} from '../../types/database';

type CompletedExercise = {
  exerciseId: string;
  exerciseName: string;
  setsCompleted: number;
  repsCompleted: string;
  weightUsed: string;
};

type RestMode = 'set' | 'exercise';

const DAY_ALIASES: Record<string, string> = {
  Sunday: 'dom',
  Monday: 'seg',
  Tuesday: 'ter',
  Wednesday: 'qua',
  Thursday: 'qui',
  Friday: 'sex',
  Saturday: 'sab',
  sunday: 'dom',
  monday: 'seg',
  tuesday: 'ter',
  wednesday: 'qua',
  thursday: 'qui',
  friday: 'sex',
  saturday: 'sab',
  dom: 'dom',
  seg: 'seg',
  ter: 'ter',
  qua: 'qua',
  qui: 'qui',
  sex: 'sex',
  sab: 'sab',
};

const DAY_NAMES: Record<string, string> = {
  dom: 'Domingo',
  seg: 'Segunda-feira',
  ter: 'Terça-feira',
  qua: 'Quarta-feira',
  qui: 'Quinta-feira',
  sex: 'Sexta-feira',
  sab: 'Sábado',
};

function normalizeDayKey(value?: string | null) {
  if (!value) return '';

  return DAY_ALIASES[value] || value;
}

function getTodayDayKey() {
  return ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][
    new Date().getDay()
  ];
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds
  ).padStart(2, '0')}`;
}

function getExerciseOrder(
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

function getExerciseSets(
  exercise: WorkoutPlanExercise
) {
  const parsed = Number.parseInt(
    String(exercise.sets || '1'),
    10
  );

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : 1;
}

function getExerciseReps(
  exercise: WorkoutPlanExercise
) {
  return exercise.reps || '—';
}

function getExerciseWeight(
  exercise: WorkoutPlanExercise
) {
  return exercise.suggested_weight || '—';
}

function getExerciseRest(
  exercise: WorkoutPlanExercise
) {
  const parsed = Number(
    exercise.rest_seconds || 0
  );

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : 0;
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

function getExercisesForDay(
  plan: CompleteWorkoutPlan,
  selectedDay: string
) {
  const normalizedDay =
    normalizeDayKey(selectedDay);

  const matchingDayIds = new Set(
    plan.workout_days
      .filter(
        (day) =>
          normalizeDayKey(day.day_key) ===
          normalizedDay
      )
      .map((day) => day.id)
  );

  return [...plan.workout_plan_exercises]
    .filter((exercise) => {
      if (
        exercise.workout_day_id &&
        matchingDayIds.has(
          exercise.workout_day_id
        )
      ) {
        return true;
      }

      return (
        normalizeDayKey(exercise.day_key) ===
        normalizedDay
      );
    })
    .sort(
      (a, b) =>
        getExerciseOrder(a) -
        getExerciseOrder(b)
    );
}

function getExerciseGroup(
  exercise: WorkoutPlanExercise,
  groups: WorkoutExerciseGroup[]
) {
  if (!exercise.exercise_group_id) {
    return null;
  }

  return (
    groups.find(
      (group) =>
        group.id ===
        exercise.exercise_group_id
    ) || null
  );
}

function getTransitionRest({
  exercise,
  nextExercise,
  groups,
}: {
  exercise: WorkoutPlanExercise;
  nextExercise: WorkoutPlanExercise | null;
  groups: WorkoutExerciseGroup[];
}) {
  const group = getExerciseGroup(
    exercise,
    groups
  );

  if (
    group?.group_type === 'bi_set' &&
    exercise.group_order === 1 &&
    nextExercise?.exercise_group_id ===
      group.id
  ) {
    return 0;
  }

  if (
    group?.group_type === 'bi_set' &&
    exercise.group_order === 2
  ) {
    return (
      group.rest_after_seconds ??
      getExerciseRest(exercise)
    );
  }

  return getExerciseRest(exercise);
}

function getTransitionTitle(
  exercise: WorkoutPlanExercise,
  groups: WorkoutExerciseGroup[]
) {
  const group = getExerciseGroup(
    exercise,
    groups
  );

  if (
    group?.group_type === 'bi_set' &&
    exercise.group_order === 2
  ) {
    return 'Descanso após o bi-set';
  }

  return 'Próximo exercício';
}

async function resolveLoggedStudent() {
  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;

  if (!authData.user?.id) {
    throw new Error(
      'Sessão do aluno não encontrada.'
    );
  }

  const account =
    await studentService.getStudentAccountByAuthUser(
      authData.user.id
    );

  let student = account?.student || null;

  if (!student) {
    student =
      await studentService.getStudentByAuthUser(
        authData.user.id
      );
  }

  if (!student?.id) {
    throw new Error(
      'Perfil do aluno não encontrado.'
    );
  }

  return student;
}

function getStudentName(student: any) {
  return (
    student?.name ||
    student?.full_name ||
    student?.email ||
    'Aluno'
  );
}

function getTrainerId(
  student: any,
  plan: CompleteWorkoutPlan
) {
  return (
    student?.trainer_id ||
    student?.coach_id ||
    plan.trainer_id ||
    ''
  );
}

async function resolveTrainerNotificationUserId(
  trainerId: string
) {
  if (!trainerId) return '';

  const { data: trainer } = await supabase
    .from('trainer_profiles')
    .select('*')
    .eq('id', trainerId)
    .maybeSingle();

  const trainerUserId =
    trainer?.auth_user_id ||
    trainer?.user_id ||
    trainer?.profile_id ||
    '';

  if (trainerUserId) {
    return trainerUserId;
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', trainerId)
    .maybeSingle();

  return profile?.id || '';
}

async function notifyTrainer({
  student,
  plan,
  durationSeconds,
  completedExercises,
  completedAt,
}: {
  student: any;
  plan: CompleteWorkoutPlan;
  durationSeconds: number;
  completedExercises: CompletedExercise[];
  completedAt: string;
}) {
  try {
    const trainerId = getTrainerId(
      student,
      plan
    );

    const userId =
      await resolveTrainerNotificationUserId(
        trainerId
      );

    if (!userId) {
      console.warn(
        '[WorkoutExecutionPage] user_id do personal não encontrado.'
      );
      return;
    }

    const studentName =
      getStudentName(student);

    const minutes = Math.max(
      1,
      Math.round(durationSeconds / 60)
    );

    const total =
      completedExercises.length;

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: `${studentName} finalizou o treino`,
        message: `${studentName} finalizou "${plan.name}" com ${total} exercício${
          total === 1 ? '' : 's'
        } em ${minutes} min.`,
        type: 'trainer_student_workout_completed',
        read: false,
        created_at: completedAt,
      });

    if (error) {
      console.error(
        '[WorkoutExecutionPage] notification error:',
        error
      );
    }
  } catch (error) {
    console.warn(
      '[WorkoutExecutionPage] notification exception:',
      error
    );
  }
}

function getSavedLogId(log: unknown) {
  if (Array.isArray(log)) {
    const first = log[0] as
      | Record<string, unknown>
      | undefined;

    return String(first?.id || '');
  }

  if (
    log &&
    typeof log === 'object' &&
    'id' in log
  ) {
    return String(
      (log as Record<string, unknown>).id ||
        ''
    );
  }

  return '';
}

export function WorkoutExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedDayKey = normalizeDayKey(
    searchParams.get('day')
  );

  const [student, setStudent] =
    useState<any | null>(null);

  const [plan, setPlan] =
    useState<CompleteWorkoutPlan | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] = useState('');

  const [
    currentExerciseIndex,
    setCurrentExerciseIndex,
  ] = useState(0);

  const [currentSet, setCurrentSet] =
    useState(1);

  const [isResting, setIsResting] =
    useState(false);

  const [restTimeLeft, setRestTimeLeft] =
    useState(0);

  const [restDuration, setRestDuration] =
    useState(0);

  const [restMode, setRestMode] =
    useState<RestMode>('exercise');

  const [restTitle, setRestTitle] =
    useState('Descanso');

  const [isCompleted, setIsCompleted] =
    useState(false);

  const [completedExercises, setCompletedExercises] =
    useState<CompletedExercise[]>([]);

  const [elapsedSeconds, setElapsedSeconds] =
    useState(0);

  const startedAtRef = useRef(
    new Date().toISOString()
  );

  useEffect(() => {
    void loadExecutionData();
  }, [id, selectedDayKey]);

  useEffect(() => {
    if (isCompleted) return;

    const interval = window.setInterval(() => {
      const startedAt = new Date(
        startedAtRef.current
      ).getTime();

      setElapsedSeconds(
        Math.floor(
          (Date.now() - startedAt) / 1000
        )
      );
    }, 1000);

    return () =>
      window.clearInterval(interval);
  }, [isCompleted]);

  useEffect(() => {
    if (!isResting) return;

    const interval = window.setInterval(() => {
      setRestTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          finishRest();
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () =>
      window.clearInterval(interval);
  }, [
    isResting,
    restMode,
    currentExerciseIndex,
  ]);

  async function loadExecutionData() {
    setLoading(true);
    setError('');
    setPlan(null);

    try {
      if (!id) {
        throw new Error(
          'Plano de treino não encontrado.'
        );
      }

      if (!selectedDayKey) {
        throw new Error(
          'Selecione o dia do treino antes de iniciar.'
        );
      }

      const today = getTodayDayKey();

      if (selectedDayKey !== today) {
        throw new Error(
          `O treino de ${
            DAY_NAMES[selectedDayKey] ||
            selectedDayKey
          } não pode ser executado hoje.`
        );
      }

      const [studentData, planData] =
        await Promise.all([
          resolveLoggedStudent(),
          getWorkoutPlanById(id),
        ]);

      if (!planData) {
        throw new Error(
          'Plano de treino não encontrado.'
        );
      }

      const dayExercises =
        getExercisesForDay(
          planData,
          selectedDayKey
        );

      if (dayExercises.length === 0) {
        throw new Error(
          'Este dia não possui exercícios cadastrados.'
        );
      }

      setStudent(studentData);
      setPlan(planData);
      setCurrentExerciseIndex(0);
      setCurrentSet(1);
      setCompletedExercises([]);
      setIsCompleted(false);
      startedAtRef.current =
        new Date().toISOString();
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Erro ao carregar treino.';

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const exercises = useMemo(() => {
    if (!plan || !selectedDayKey) {
      return [];
    }

    return getExercisesForDay(
      plan,
      selectedDayKey
    );
  }, [plan, selectedDayKey]);

  const dayGroups = useMemo(() => {
    if (!plan) return [];

    const selectedDayIds = new Set(
      plan.workout_days
        .filter(
          (day) =>
            normalizeDayKey(day.day_key) ===
            selectedDayKey
        )
        .map((day) => day.id)
    );

    return plan.workout_exercise_groups.filter(
      (group) =>
        selectedDayIds.has(
          group.workout_day_id
        )
    );
  }, [plan, selectedDayKey]);

  const currentExercise =
    exercises[currentExerciseIndex] || null;

  const nextExercise =
    exercises[currentExerciseIndex + 1] ||
    null;

  const currentGroup = currentExercise
    ? getExerciseGroup(
        currentExercise,
        dayGroups
      )
    : null;

  const safeTotalSets = currentExercise
    ? getExerciseSets(currentExercise)
    : 1;

  const exerciseName = currentExercise
    ? getExerciseName(currentExercise)
    : 'Exercício';

  const exerciseReps = currentExercise
    ? getExerciseReps(currentExercise)
    : '—';

  const exerciseWeight = currentExercise
    ? getExerciseWeight(currentExercise)
    : '—';

  const dropConfig = currentExercise
    ? getDropSetConfig(currentExercise)
    : {};

  const progressPercent =
    exercises.length > 0
      ? ((currentExerciseIndex +
          (currentSet - 1) /
            safeTotalSets) /
          exercises.length) *
        100
      : 0;

  const completedPercent =
    exercises.length > 0
      ? Math.round(
          (completedExercises.length /
            exercises.length) *
            100
        )
      : 0;

  function startRest({
    seconds,
    mode,
    title,
  }: {
    seconds: number;
    mode: RestMode;
    title: string;
  }) {
    setRestMode(mode);
    setRestTitle(title);
    setRestDuration(seconds);
    setRestTimeLeft(seconds);
    setIsResting(true);
  }

  function goToNextExercise() {
    const nextIndex =
      currentExerciseIndex + 1;

    if (nextIndex < exercises.length) {
      setCurrentExerciseIndex(nextIndex);
      setCurrentSet(1);
      return;
    }

    setIsCompleted(true);
  }

  function finishRest() {
    setIsResting(false);
    setRestTimeLeft(0);

    if (restMode === 'set') {
      setCurrentSet(
        (previous) => previous + 1
      );
      return;
    }

    goToNextExercise();
  }

  function handleCompleteSet() {
    if (!currentExercise) return;

    if (currentSet < safeTotalSets) {
      const rest =
        getExerciseRest(currentExercise);

      if (rest > 0) {
        startRest({
          seconds: rest,
          mode: 'set',
          title: 'Descanso entre séries',
        });

        return;
      }

      setCurrentSet(
        (previous) => previous + 1
      );

      return;
    }

    const completed: CompletedExercise = {
      exerciseId: currentExercise.id,
      exerciseName,
      setsCompleted: safeTotalSets,
      repsCompleted: exerciseReps,
      weightUsed: exerciseWeight,
    };

    setCompletedExercises((previous) => {
      const alreadyCompleted =
        previous.some(
          (exercise) =>
            exercise.exerciseId ===
            currentExercise.id
        );

      if (alreadyCompleted) {
        return previous;
      }

      return [...previous, completed];
    });

    if (!nextExercise) {
      setIsCompleted(true);
      return;
    }

    const transitionRest =
      getTransitionRest({
        exercise: currentExercise,
        nextExercise,
        groups: dayGroups,
      });

    if (transitionRest > 0) {
      startRest({
        seconds: transitionRest,
        mode: 'exercise',
        title: getTransitionTitle(
          currentExercise,
          dayGroups
        ),
      });

      return;
    }

    goToNextExercise();
  }

  async function handleSave() {
    if (
      !student ||
      !plan ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const completedAt =
        new Date().toISOString();

      const durationSeconds =
        Math.floor(
          (Date.now() -
            new Date(
              startedAtRef.current
            ).getTime()) /
            1000
        );

      const trainerId =
        getTrainerId(student, plan);

      const log = await saveWorkoutLog({
        student_id: student.id,
        trainer_id: trainerId,
        workout_plan_id: plan.id,
        started_at:
          startedAtRef.current,
        completed_at: completedAt,
        duration_seconds:
          durationSeconds,
        status: 'completed',
        exercises_data:
          completedExercises.map(
            (exercise) => ({
              exercise_id:
                exercise.exerciseId,
              exercise_name:
                exercise.exerciseName,
              sets_completed:
                exercise.setsCompleted,
              reps_completed:
                exercise.repsCompleted,
              weight_used:
                exercise.weightUsed,
              day_key:
                selectedDayKey,
            })
          ),
      });

      await notifyTrainer({
        student,
        plan,
        durationSeconds,
        completedExercises,
        completedAt,
      });

      const logId = getSavedLogId(log);

      navigate(
        `/student/workout-completed/${
          logId || plan.id
        }`,
        {
          replace: true,
        }
      );
    } catch (saveError: unknown) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Erro ao salvar o treino.';

      setError(message);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#050505] text-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#ff2a32]" />

          <p className="mt-4 text-sm font-black">
            Abrindo treino...
          </p>
        </div>
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#050505] px-5 text-white">
        <div className="w-full max-w-sm rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-300" />

          <h1 className="mt-5 text-xl font-black">
            Não foi possível iniciar
          </h1>

          <p className="mt-2 text-sm text-red-200/80">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="mt-6 h-12 w-full rounded-2xl bg-[#ff2a32] text-sm font-black"
          >
            VOLTAR AO PLANO
          </button>
        </div>
      </div>
    );
  }

  if (
    !plan ||
    !student ||
    !currentExercise
  ) {
    return null;
  }

  const observation =
    currentExercise.observation ||
    currentExercise.instructions ||
    '';

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-[#050505] text-white">
      <AnimatePresence mode="wait">
        {isCompleted ? (
          <motion.main
            key="completed"
            initial={{
              opacity: 0,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            className="flex min-h-screen items-center px-4 py-6"
          >
            <div className="mx-auto w-full max-w-lg">
              <section className="rounded-[36px] border border-yellow-400/20 bg-yellow-400/10 p-6 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] bg-gradient-to-br from-yellow-400 to-orange-500">
                  <Trophy className="h-12 w-12" />
                </div>

                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.25em] text-yellow-300">
                  Finalizado
                </p>

                <h1 className="mt-2 text-3xl font-black uppercase italic">
                  Treino concluído
                </h1>

                <p className="mt-3 text-sm text-zinc-400">
                  Parabéns,{' '}
                  {getStudentName(student)}.
                </p>

                <div className="mt-6 grid grid-cols-3 gap-2">
                  <SummaryCard
                    icon={Clock3}
                    value={formatDuration(
                      elapsedSeconds
                    )}
                    label="Tempo"
                  />

                  <SummaryCard
                    icon={Dumbbell}
                    value={String(
                      completedExercises.length
                    )}
                    label="Exercícios"
                  />

                  <SummaryCard
                    icon={Flame}
                    value={`${completedPercent}%`}
                    label="Feito"
                  />
                </div>
              </section>

              <section className="mt-5 rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
                <p className="mb-4 text-[10px] font-black uppercase text-[#ff2a32]">
                  Exercícios concluídos
                </p>

                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {completedExercises.map(
                    (exercise) => (
                      <div
                        key={
                          exercise.exerciseId
                        }
                        className="flex items-center gap-3 rounded-2xl bg-black/20 p-3"
                      >
                        <CheckCircle2 className="h-5 w-5 text-emerald-300" />

                        <div>
                          <p className="text-sm font-black">
                            {
                              exercise.exerciseName
                            }
                          </p>

                          <p className="text-xs text-zinc-500">
                            {
                              exercise.setsCompleted
                            }{' '}
                            séries ×{' '}
                            {
                              exercise.repsCompleted
                            }
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>

              {error && (
                <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-center text-xs text-red-300">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={() =>
                  void handleSave()
                }
                disabled={saving}
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-[#ff2a32] text-sm font-black uppercase disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}

                Salvar treino
              </button>
            </div>
          </motion.main>
        ) : isResting ? (
          <motion.main
            key="rest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex min-h-screen items-center px-4"
          >
            <div className="mx-auto w-full max-w-lg rounded-[38px] border border-[#ff2a32]/20 bg-[#ff2a32]/10 p-6 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ff2a32]">
                Descanso
              </p>

              <h1 className="mt-2 text-2xl font-black uppercase">
                {restTitle}
              </h1>

              <div className="my-8">
                <Timer className="mx-auto h-10 w-10 text-[#ff2a32]" />

                <p className="mt-3 text-7xl font-black">
                  {restTimeLeft}
                </p>

                <p className="text-xs text-zinc-500">
                  segundos
                </p>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full bg-[#ff2a32]"
                  animate={{
                    width: `${
                      restDuration > 0
                        ? (restTimeLeft /
                            restDuration) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>

              <button
                type="button"
                onClick={finishRest}
                className="mt-6 h-14 w-full rounded-[22px] border border-white/10 bg-white/[0.06] text-sm font-black uppercase"
              >
                Pular descanso
              </button>
            </div>
          </motion.main>
        ) : (
          <motion.main
            key="execution"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 py-5"
          >
            <header>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate(-1)
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="min-w-0 flex-1 text-center">
                  <p className="truncate text-[10px] font-black uppercase text-[#ff2a32]">
                    {plan.name}
                  </p>

                  <p className="text-xs text-zinc-500">
                    {DAY_NAMES[
                      selectedDayKey
                    ] || selectedDayKey}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs font-black">
                  {formatDuration(
                    elapsedSeconds
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-between text-xs">
                <span className="text-zinc-500">
                  Exercício{' '}
                  {currentExerciseIndex + 1}{' '}
                  de {exercises.length}
                </span>

                <span className="font-black text-[#ff2a32]">
                  {Math.round(
                    progressPercent
                  )}
                  %
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full bg-[#ff2a32]"
                  animate={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
            </header>

            <section className="flex flex-1 flex-col justify-center py-6">
              <motion.div
                key={`${currentExercise.id}-${currentSet}`}
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="rounded-[38px] border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="h-56 overflow-hidden rounded-[30px] border border-white/10 bg-black/30">
                  {currentExercise.video_url ? (
                    <video
                      src={
                        currentExercise.video_url
                      }
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : currentExercise.image_url ? (
                    <img
                      src={
                        currentExercise.image_url
                      }
                      alt={exerciseName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Dumbbell className="h-16 w-16 text-[#ff2a32]" />
                    </div>
                  )}
                </div>

                <div className="mt-5 text-center">
                  <TechniqueBadge
                    technique={
                      currentExercise.technique_type ||
                      'normal'
                    }
                    group={currentGroup}
                    groupOrder={
                      currentExercise.group_order
                    }
                  />

                  <h1 className="mt-3 text-3xl font-black">
                    {exerciseName}
                  </h1>

                  <p className="mt-2 text-xs font-black uppercase text-[#ff2a32]">
                    Série {currentSet} de{' '}
                    {safeTotalSets}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <MetricCard
                      label="Repetições"
                      value={exerciseReps}
                    />

                    <MetricCard
                      label="Carga"
                      value={exerciseWeight}
                    />
                  </div>

                  {currentExercise.technique_type ===
                    'drop_set' && (
                    <DropSetPanel
                      config={dropConfig}
                    />
                  )}

                  {currentGroup?.group_type ===
                    'bi_set' && (
                    <div className="mt-4 rounded-[22px] border border-purple-400/20 bg-purple-400/[0.07] p-4 text-left">
                      <p className="text-[10px] font-black uppercase text-purple-300">
                        Bi-set
                      </p>

                      <p className="mt-1 text-sm text-zinc-300">
                        Exercício{' '}
                        {currentExercise.group_order ||
                          1}{' '}
                        de 2.
                        {currentExercise.group_order ===
                        1
                          ? ' O próximo exercício será iniciado sem descanso.'
                          : ` Depois dele, descanse ${
                              currentGroup.rest_after_seconds ||
                              0
                            } segundos.`}
                      </p>
                    </div>
                  )}

                  {observation && (
                    <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-4 text-left">
                      <p className="text-[10px] font-black uppercase text-[#ff2a32]">
                        Observação
                      </p>

                      <p className="mt-1 text-sm text-zinc-400">
                        {observation}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </section>

            <button
              type="button"
              onClick={handleCompleteSet}
              className="flex h-16 items-center justify-center gap-3 rounded-[24px] bg-[#ff2a32] text-base font-black uppercase"
            >
              <CheckCircle2 className="h-6 w-6" />

              {currentSet < safeTotalSets
                ? 'Concluir série'
                : nextExercise
                  ? 'Próximo exercício'
                  : 'Finalizar treino'}

              <ChevronRight className="h-5 w-5" />
            </button>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}

function TechniqueBadge({
  technique,
  group,
  groupOrder,
}: {
  technique: string;
  group: WorkoutExerciseGroup | null;
  groupOrder: number | null;
}) {
  if (
    technique === 'bi_set' ||
    group?.group_type === 'bi_set'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-[11px] font-black text-purple-300">
        <Layers2 className="h-3.5 w-3.5" />
        BI-SET • EXERCÍCIO{' '}
        {groupOrder || 1}
      </span>
    );
  }

  if (technique === 'drop_set') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-[11px] font-black text-orange-300">
        <Zap className="h-3.5 w-3.5" />
        DROP-SET
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff2a32]/20 bg-[#ff2a32]/10 px-3 py-1 text-[11px] font-black text-[#ff2a32]">
      <Zap className="h-3.5 w-3.5" />
      EXERCÍCIO NORMAL
    </span>
  );
}

function DropSetPanel({
  config,
}: {
  config: DropSetConfig;
}) {
  return (
    <div className="mt-4 rounded-[22px] border border-orange-400/20 bg-orange-400/[0.07] p-4 text-left">
      <p className="text-[10px] font-black uppercase text-orange-300">
        Drop-set
      </p>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-300">
        {config.drops !== undefined && (
          <span>
            {config.drops} queda
            {config.drops === 1 ? '' : 's'}
          </span>
        )}

        {config.reduction_percent !==
          undefined && (
          <span>
            • Redução de{' '}
            {config.reduction_percent}%
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
        <p className="mt-2 text-xs text-zinc-400">
          {config.notes}
        </p>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
      <p className="text-[10px] font-black uppercase text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-3xl font-black">
        {value}
      </p>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Clock3;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/25 p-3">
      <Icon className="mx-auto mb-2 h-4 w-4 text-[#ff2a32]" />

      <p className="text-lg font-black">
        {value}
      </p>

      <p className="text-[9px] font-black uppercase text-zinc-600">
        {label}
      </p>
    </div>
  );
}

export default WorkoutExecutionPage;