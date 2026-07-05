import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  exerciseName: string;
  setsCompleted: number;
  repsCompleted: string;
  weightUsed: string;
};

type RestMode = 'set' | 'exercise';

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const restSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(
    restSeconds
  ).padStart(2, '0')}`;
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim()
  );
}

function pickUuid(...values: unknown[]) {
  for (const value of values) {
    const uuid = String(value || '').trim();

    if (isUuid(uuid)) {
      return uuid;
    }
  }

  return '';
}

function pickEmail(...values: unknown[]) {
  for (const value of values) {
    const email = String(value || '')
      .trim()
      .toLowerCase();

    if (email && email.includes('@')) {
      return email;
    }
  }

  return '';
}

function createUuid() {
  if (
    typeof crypto !== 'undefined' &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    (char) => {
      const random = (Math.random() * 16) | 0;
      const value =
        char === 'x'
          ? random
          : (random & 0x3) | 0x8;

      return value.toString(16);
    }
  );
}

function getStudentName(student: any) {
  return (
    student?.name ||
    student?.full_name ||
    student?.student_name ||
    student?.email ||
    'Aluno'
  );
}

function getWorkoutName(plan: any) {
  return (
    plan?.name ||
    plan?.title ||
    plan?.plan_name ||
    plan?.workout_name ||
    'Treino personalizado'
  );
}

function getWorkoutObjective(plan: any) {
  return (
    plan?.objective ||
    plan?.goal ||
    plan?.focus ||
    'Execução guiada'
  );
}

function getTrainerId(student: any, plan: any) {
  return (
    student?.trainer_id ||
    student?.trainerId ||
    student?.coach_id ||
    student?.coachId ||
    plan?.trainer_id ||
    plan?.trainerId ||
    plan?.coach_id ||
    plan?.coachId ||
    ''
  );
}

function getTrainerUserIdFromObjects(
  student: any,
  plan: any
) {
  return pickUuid(
    student?.trainer_user_id,
    student?.trainerUserId,
    student?.coach_user_id,
    student?.coachUserId,
    student?.personal_user_id,
    student?.personalUserId,
    student?.trainer_auth_user_id,
    student?.coach_auth_user_id,
    student?.trainer?.user_id,
    student?.trainer?.auth_user_id,
    student?.coach?.user_id,
    student?.coach?.auth_user_id,
    plan?.trainer_user_id,
    plan?.trainerUserId,
    plan?.coach_user_id,
    plan?.coachUserId,
    plan?.personal_user_id,
    plan?.personalUserId,
    plan?.trainer_auth_user_id,
    plan?.coach_auth_user_id,
    plan?.trainer?.user_id,
    plan?.trainer?.auth_user_id,
    plan?.coach?.user_id,
    plan?.coach?.auth_user_id
  );
}

function getTrainerEmailFromObjects(
  student: any,
  plan: any
) {
  return pickEmail(
    student?.coach_email,
    student?.coachEmail,
    student?.trainer_email,
    student?.trainerEmail,
    student?.personal_email,
    student?.personalEmail,
    student?.trainer?.email,
    student?.trainer?.coach_email,
    student?.coach?.email,
    plan?.coach_email,
    plan?.coachEmail,
    plan?.trainer_email,
    plan?.trainerEmail,
    plan?.personal_email,
    plan?.personalEmail,
    plan?.trainer?.email,
    plan?.coach?.email
  );
}

function getExerciseName(
  exercise: WorkoutPlanExercise
) {
  return exercise.name || 'Exercício';
}

function getExerciseReps(
  exercise: WorkoutPlanExercise
) {
  return exercise.reps || '—';
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

function getExerciseWeight(
  exercise: WorkoutPlanExercise
) {
  return exercise.suggested_weight || '—';
}

function getExerciseRestSeconds(
  exercise: WorkoutPlanExercise
) {
  const value = Number(exercise.rest_seconds || 0);

  return Number.isFinite(value) && value > 0
    ? value
    : 0;
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

function getExerciseVideoUrl(
  exercise: WorkoutPlanExercise
) {
  return exercise.video_url || '';
}

function getExerciseImageUrl(
  exercise: WorkoutPlanExercise
) {
  return exercise.image_url || '';
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

function getEffectiveOrder(
  exercise: WorkoutPlanExercise
) {
  return (
    exercise.execution_order ??
    exercise.order_index
  );
}

function sortPlanExercises(
  plan: CompleteWorkoutPlan
) {
  const days = plan.workout_days || [];
  const exercises =
    plan.workout_plan_exercises || [];

  const dayOrderById = new Map(
    days.map((day) => [
      day.id,
      day.order_index,
    ])
  );

  const legacyDayOrder: Record<string, number> = {
    seg: 0,
    ter: 1,
    qua: 2,
    qui: 3,
    sex: 4,
    sab: 5,
    dom: 6,
    Monday: 0,
    Tuesday: 1,
    Wednesday: 2,
    Thursday: 3,
    Friday: 4,
    Saturday: 5,
    Sunday: 6,
  };

  return [...exercises].sort((a, b) => {
    const dayOrderA = a.workout_day_id
      ? dayOrderById.get(a.workout_day_id) ?? 99
      : legacyDayOrder[a.day_key || ''] ?? 99;

    const dayOrderB = b.workout_day_id
      ? dayOrderById.get(b.workout_day_id) ?? 99
      : legacyDayOrder[b.day_key || ''] ?? 99;

    if (dayOrderA !== dayOrderB) {
      return dayOrderA - dayOrderB;
    }

    return getEffectiveOrder(a) - getEffectiveOrder(b);
  });
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
        group.id === exercise.exercise_group_id
    ) || null
  );
}

function getTransitionRestSeconds({
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
    nextExercise?.exercise_group_id === group.id
  ) {
    return 0;
  }

  if (
    group?.group_type === 'bi_set' &&
    exercise.group_order === 2
  ) {
    return (
      group.rest_after_seconds ??
      getExerciseRestSeconds(exercise)
    );
  }

  return getExerciseRestSeconds(exercise);
}

function getRestTitle({
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
    nextExercise?.exercise_group_id === group.id
  ) {
    return 'Segundo exercício do bi-set';
  }

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

  const authUser = authData.user;

  if (!authUser?.id) {
    throw new Error(
      'Sessão do aluno não encontrada. Faça login novamente.'
    );
  }

  const accountResult =
    await studentService.getStudentAccountByAuthUser(
      authUser.id
    );

  let studentData =
    accountResult?.student || null;

  if (!studentData) {
    studentData =
      await studentService.getStudentByAuthUser(
        authUser.id
      );
  }

  if (!studentData?.id) {
    throw new Error(
      'Perfil do aluno não encontrado.'
    );
  }

  return studentData;
}

async function resolveTrainerEmail(
  student: any,
  plan: any
) {
  const directEmail =
    getTrainerEmailFromObjects(student, plan);

  if (directEmail) return directEmail;

  const studentId = String(
    student?.id || ''
  ).trim();

  if (studentId) {
    try {
      const {
        data: account,
        error,
      } = await supabase
        .from('student_accounts')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      if (!error && account) {
        const accountEmail = pickEmail(
          account?.coach_email,
          account?.coachEmail,
          account?.trainer_email,
          account?.trainerEmail,
          account?.personal_email,
          account?.personalEmail,
          account?.owner_email,
          account?.ownerEmail
        );

        if (accountEmail) {
          return accountEmail;
        }
      }
    } catch (error) {
      console.warn(
        '[WorkoutExecutionPage] student account trainer email exception:',
        error
      );
    }
  }

  const trainerId = getTrainerId(
    student,
    plan
  );

  if (!trainerId) return '';

  try {
    const { data, error } = await supabase
      .from('trainer_profiles')
      .select('*')
      .eq('id', trainerId)
      .maybeSingle();

    if (!error && data) {
      const trainerEmail = pickEmail(
        data?.email,
        data?.coach_email,
        data?.user_email,
        data?.auth_email,
        data?.login_email,
        data?.personal_email
      );

      if (trainerEmail) {
        return trainerEmail;
      }
    }
  } catch (error) {
    console.warn(
      '[WorkoutExecutionPage] trainer_profiles email exception:',
      error
    );
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', trainerId)
      .maybeSingle();

    if (!error && data) {
      const profileEmail = pickEmail(
        data?.email,
        data?.coach_email,
        data?.user_email,
        data?.auth_email,
        data?.login_email,
        data?.personal_email
      );

      if (profileEmail) {
        return profileEmail;
      }
    }
  } catch (error) {
    console.warn(
      '[WorkoutExecutionPage] user_profiles email exception:',
      error
    );
  }

  return '';
}

async function resolveTrainerUserId(
  student: any,
  plan: any
) {
  const directUserId =
    getTrainerUserIdFromObjects(student, plan);

  if (directUserId) return directUserId;

  const trainerId = getTrainerId(
    student,
    plan
  );

  const trainerEmail =
    await resolveTrainerEmail(student, plan);

  if (trainerEmail) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', trainerEmail)
        .maybeSingle();

      if (!error && data) {
        const userId = pickUuid(
          data?.id,
          data?.user_id,
          data?.auth_user_id
        );

        if (userId) return userId;
      }
    } catch (error) {
      console.warn(
        '[WorkoutExecutionPage] user_profiles by email exception:',
        error
      );
    }

    try {
      const { data, error } = await supabase
        .from('trainer_profiles')
        .select('*')
        .eq('email', trainerEmail)
        .maybeSingle();

      if (!error && data) {
        const userId = pickUuid(
          data?.auth_user_id,
          data?.user_id,
          data?.profile_id,
          data?.owner_id,
          data?.id
        );

        if (userId) return userId;
      }
    } catch (error) {
      console.warn(
        '[WorkoutExecutionPage] trainer_profiles by email exception:',
        error
      );
    }
  }

  if (isUuid(trainerId)) {
    try {
      const { data, error } = await supabase
        .from('trainer_profiles')
        .select('*')
        .eq('id', trainerId)
        .maybeSingle();

      if (!error && data) {
        const email = pickEmail(
          data?.email,
          data?.user_email,
          data?.auth_email
        );

        if (email) {
          const {
            data: profileByEmail,
          } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('email', email)
            .maybeSingle();

          const userIdByEmail = pickUuid(
            profileByEmail?.id,
            profileByEmail?.user_id,
            profileByEmail?.auth_user_id
          );

          if (userIdByEmail) {
            return userIdByEmail;
          }
        }

        const userId = pickUuid(
          data?.auth_user_id,
          data?.user_id,
          data?.profile_id,
          data?.owner_id,
          data?.id
        );

        if (userId) return userId;
      }
    } catch (error) {
      console.warn(
        '[WorkoutExecutionPage] trainer_profiles by id exception:',
        error
      );
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', trainerId)
        .maybeSingle();

      if (!error && data) {
        return trainerId;
      }
    } catch (error) {
      console.warn(
        '[WorkoutExecutionPage] user_profiles by id exception:',
        error
      );
    }
  }

  return '';
}

function getSavedLogId(log: any) {
  if (Array.isArray(log)) {
    return log[0]?.id || '';
  }

  return log?.id || '';
}

async function createTrainerWorkoutCompletedNotification({
  student,
  plan,
  completedAt,
  durationSeconds,
  completedExercises,
}: {
  student: any;
  plan: CompleteWorkoutPlan;
  completedAt: string;
  durationSeconds: number;
  completedExercises: CompletedExercise[];
}) {
  try {
    const trainerUserId =
      await resolveTrainerUserId(
        student,
        plan
      );

    if (!trainerUserId) {
      console.warn(
        '[WorkoutExecutionPage] Notificação não criada: user_id do personal não encontrado.'
      );

      return;
    }

    const studentName =
      getStudentName(student);

    const workoutName =
      getWorkoutName(plan);

    const durationMinutes = Math.max(
      1,
      Math.round(durationSeconds / 60)
    );

    const completedCount =
      completedExercises.length;

    const exerciseWord =
      completedCount === 1
        ? 'exercício'
        : 'exercícios';

    const title = `${studentName} finalizou o treino`;

    const message = `${studentName} finalizou o treino "${workoutName}" — ${completedCount} ${exerciseWord} em ${durationMinutes} min.`;

    const payload = {
      id: createUuid(),
      user_id: trainerUserId,
      title,
      message,
      type: 'trainer_student_workout_completed',
      read: false,
      created_at: completedAt,
    };

    const { error } = await supabase
      .from('notifications')
      .insert(payload);

    if (error) {
      console.error(
        '[WorkoutExecutionPage] erro ao criar notificação do personal:',
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

export function WorkoutExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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

  const [
    restTimeLeft,
    setRestTimeLeft,
  ] = useState(0);

  const [
    restDuration,
    setRestDuration,
  ] = useState(0);

  const [restMode, setRestMode] =
    useState<RestMode>('exercise');

  const [
    restTitle,
    setRestTitle,
  ] = useState('Próximo exercício');

  const [isCompleted, setIsCompleted] =
    useState(false);

  const [startedAt] = useState(
    new Date().toISOString()
  );

  const [
    completedExercises,
    setCompletedExercises,
  ] = useState<CompletedExercise[]>([]);

  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] = useState(0);

  const exercisesRef =
    useRef<WorkoutPlanExercise[]>([]);

  useEffect(() => {
    void loadExecutionData();
  }, [id]);

  useEffect(() => {
    if (isCompleted) return;

    const interval = window.setInterval(() => {
      setElapsedSeconds(
        Math.floor(
          (Date.now() -
            new Date(startedAt).getTime()) /
            1000
        )
      );
    }, 1000);

    return () =>
      window.clearInterval(interval);
  }, [isCompleted, startedAt]);

  useEffect(() => {
    if (!isResting) return;

    const interval = window.setInterval(() => {
      setRestTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          completeRestTransition();
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

    try {
      if (!id) {
        throw new Error(
          'Treino não encontrado.'
        );
      }

      const [
        studentData,
        planData,
      ] = await Promise.all([
        resolveLoggedStudent(),
        getWorkoutPlanById(id),
      ]);

      if (!planData) {
        throw new Error(
          'Plano de treino não encontrado.'
        );
      }

      const sortedExercises =
        sortPlanExercises(planData);

      exercisesRef.current =
        sortedExercises;

      setStudent(studentData);
      setPlan(planData);
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Erro ao carregar execução do treino.';

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const exercises = useMemo(() => {
    if (!plan) return [];

    return sortPlanExercises(plan);
  }, [plan]);

  const groups =
    plan?.workout_exercise_groups || [];

  const currentExercise =
    exercises[currentExerciseIndex] || null;

  const nextExercise =
    exercises[currentExerciseIndex + 1] ||
    null;

  const currentGroup = currentExercise
    ? getExerciseGroup(
        currentExercise,
        groups
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

  const exerciseObservation =
    currentExercise
      ? getExerciseObservation(
          currentExercise
        )
      : '';

  const videoUrl = currentExercise
    ? getExerciseVideoUrl(currentExercise)
    : '';

  const imageUrl = currentExercise
    ? getExerciseImageUrl(currentExercise)
    : '';

  const technique =
    currentExercise?.technique_type ||
    'normal';

  const dropSetConfig = currentExercise
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
    setRestDuration(seconds);
    setRestTimeLeft(seconds);
    setRestTitle(title);
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

  function completeRestTransition() {
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
      const setRest =
        getExerciseRestSeconds(
          currentExercise
        );

      if (setRest > 0) {
        startRest({
          seconds: setRest,
          mode: 'set',
          title: 'Próxima série',
        });

        return;
      }

      setCurrentSet(
        (previous) => previous + 1
      );

      return;
    }

    const completedEntry: CompletedExercise =
      {
        exerciseName,
        setsCompleted: safeTotalSets,
        repsCompleted: String(
          exerciseReps || ''
        ),
        weightUsed: String(
          exerciseWeight || ''
        ),
      };

    setCompletedExercises((previous) => [
      ...previous,
      completedEntry,
    ]);

    if (!nextExercise) {
      setIsCompleted(true);
      return;
    }

    const transitionRest =
      getTransitionRestSeconds({
        exercise: currentExercise,
        nextExercise,
        groups,
      });

    if (transitionRest > 0) {
      startRest({
        seconds: transitionRest,
        mode: 'exercise',
        title: getRestTitle({
          exercise: currentExercise,
          nextExercise,
          groups,
        }),
      });

      return;
    }

    goToNextExercise();
  }

  function handleRestComplete() {
    completeRestTransition();
  }

  async function handleSave() {
    if (!student || !plan || saving) {
      return;
    }

    setSaving(true);

    try {
      const completedAt =
        new Date().toISOString();

      const totalSeconds = Math.floor(
        (Date.now() -
          new Date(startedAt).getTime()) /
          1000
      );

      const logData = {
        student_id: student.id,
        trainer_id: getTrainerId(
          student,
          plan
        ),
        workout_plan_id: plan.id,
        started_at: startedAt,
        completed_at: completedAt,
        duration_seconds: totalSeconds,
        status: 'completed',
        exercises_data:
          completedExercises.map(
            (exercise) => ({
              exercise_name:
                exercise.exerciseName,
              sets_completed:
                exercise.setsCompleted,
              reps_completed:
                exercise.repsCompleted,
              weight_used:
                exercise.weightUsed,
            })
          ),
      };

      const log =
        await saveWorkoutLog(logData);

      await createTrainerWorkoutCompletedNotification(
        {
          student,
          plan,
          completedAt,
          durationSeconds: totalSeconds,
          completedExercises,
        }
      );

      const logId = getSavedLogId(log);

      navigate(
        `/student/workout-completed/${
          logId || plan.id
        }`,
        {
          replace: true,
        }
      );
    } catch (saveError) {
      console.error(
        '[WorkoutExecutionPage] save error:',
        saveError
      );

      setError(
        'Erro ao salvar o treino. Tente novamente.'
      );
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15 shadow-[0_18px_45px_rgba(255,42,48,0.22)]">
            <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
          </div>

          <div>
            <p className="text-sm font-black text-white">
              Abrindo treino...
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Preparando sua execução.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#050505] px-5 text-white">
        <div className="w-full max-w-sm rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-300">
            <AlertCircle className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-xl font-black text-white">
            Erro ao abrir treino
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-red-200/80">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadExecutionData()
            }
            className="mt-6 h-12 w-full rounded-2xl bg-[#ff2a32] text-sm font-black text-white"
          >
            TENTAR NOVAMENTE
          </button>

          <button
            type="button"
            onClick={() =>
              navigate('/student/workouts')
            }
            className="mt-3 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-black text-white"
          >
            VOLTAR
          </button>
        </div>
      </div>
    );
  }

  if (
    !plan ||
    !student ||
    exercises.length === 0 ||
    !currentExercise
  ) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#050505] px-5 text-white">
        <div className="w-full max-w-sm rounded-[30px] border border-white/10 bg-white/[0.04] p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] text-zinc-400">
            <Dumbbell className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-xl font-black text-white">
            Treino vazio
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Este treino não possui exercícios
            cadastrados.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate('/student/workouts')
            }
            className="mt-6 h-12 w-full rounded-2xl bg-[#ff2a32] text-sm font-black text-white"
          >
            VOLTAR PARA TREINOS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-[#050505] text-white">
      <AnimatePresence mode="wait">
        {isCompleted ? (
          <motion.main
            key="completed"
            initial={{
              opacity: 0,
              y: 18,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 18,
              scale: 0.98,
            }}
            className="flex min-h-screen flex-col px-4 py-6"
          >
            <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center">
              <section className="relative overflow-hidden rounded-[36px] border border-yellow-400/20 bg-gradient-to-br from-yellow-500/15 via-white/[0.05] to-white/[0.025] p-6 text-center shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] bg-gradient-to-br from-yellow-400 to-orange-500 text-white"
                >
                  <Trophy className="h-12 w-12" />
                </motion.div>

                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.26em] text-yellow-300">
                  Finalizado
                </p>

                <h1 className="mt-2 text-[32px] font-black uppercase italic leading-none text-white">
                  Treino concluído
                </h1>

                <p className="mx-auto mt-3 max-w-[300px] text-sm text-zinc-400">
                  Parabéns,{' '}
                  {getStudentName(student)}. Seu
                  progresso foi registrado.
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
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                  Exercícios concluídos
                </p>

                <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
                  {completedExercises.map(
                    (exercise, index) => (
                      <div
                        key={`${exercise.exerciseName}-${index}`}
                        className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/20 p-3"
                      >
                        <CheckCircle2 className="h-5 w-5 text-emerald-300" />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-white">
                            {
                              exercise.exerciseName
                            }
                          </p>

                          <p className="text-xs text-zinc-500">
                            {
                              exercise.setsCompleted
                            }{' '}
                            séries x{' '}
                            {
                              exercise.repsCompleted
                            }{' '}
                            reps
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
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-[#ff2a32] text-sm font-black uppercase text-white disabled:opacity-70"
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
            key="resting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex min-h-screen flex-col px-4 py-6"
          >
            <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center">
              <section className="rounded-[38px] border border-[#ff2a32]/20 bg-[#ff2a32]/10 p-6 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#ff2a32]">
                  Descanso
                </p>

                <h1 className="mt-2 text-[28px] font-black uppercase italic text-white">
                  {restTitle}
                </h1>

                <div className="relative mx-auto my-8 h-52 w-52">
                  <svg
                    className="h-full w-full -rotate-90"
                    viewBox="0 0 220 220"
                  >
                    <circle
                      cx="110"
                      cy="110"
                      r="94"
                      fill="none"
                      stroke="rgba(255,255,255,0.07)"
                      strokeWidth="12"
                    />

                    <motion.circle
                      cx="110"
                      cy="110"
                      r="94"
                      fill="none"
                      stroke="#ff2a32"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={
                        2 * Math.PI * 94
                      }
                      animate={{
                        strokeDashoffset:
                          2 *
                          Math.PI *
                          94 *
                          (1 -
                            restTimeLeft /
                              Math.max(
                                1,
                                restDuration
                              )),
                      }}
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Timer className="mb-2 h-8 w-8 text-[#ff2a32]" />

                    <span className="text-6xl font-black text-white">
                      {restTimeLeft}
                    </span>

                    <span className="text-xs text-zinc-500">
                      segundos
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    handleRestComplete
                  }
                  className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.06] text-sm font-black uppercase text-white"
                >
                  Pular descanso
                </button>
              </section>
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
              <div className="mb-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      '/student/workouts'
                    )
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="min-w-0 flex-1 text-center">
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                    {getWorkoutName(plan)}
                  </p>

                  <p className="truncate text-xs text-zinc-500">
                    {getWorkoutObjective(plan)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs font-black">
                  {formatDuration(
                    elapsedSeconds
                  )}
                </div>
              </div>

              <div className="mb-2 flex justify-between text-xs">
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

              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full rounded-full bg-[#ff2a32]"
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
                  y: 18,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="overflow-hidden rounded-[38px] border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="overflow-hidden rounded-[30px] border border-white/10 bg-black/35">
                  {videoUrl ? (
                    <video
                      src={videoUrl}
                      className="h-56 w-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={exerciseName}
                      className="h-56 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-56 items-center justify-center">
                      <Dumbbell className="h-16 w-16 text-[#ff2a32]" />
                    </div>
                  )}
                </div>

                <div className="mt-5 text-center">
                  <TechniqueBadge
                    technique={technique}
                    group={currentGroup}
                    groupOrder={
                      currentExercise.group_order
                    }
                  />

                  <h1 className="mt-3 text-[28px] font-black leading-tight text-white">
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

                  {technique ===
                    'drop_set' && (
                    <DropSetPanel
                      config={dropSetConfig}
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
                          ? ' Faça o próximo exercício sem descanso.'
                          : ` Descanse ${
                              currentGroup.rest_after_seconds ||
                              0
                            }s ao finalizar.`}
                      </p>
                    </div>
                  )}

                  {exerciseObservation && (
                    <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.035] p-4 text-left">
                      <p className="text-[10px] font-black uppercase text-[#ff2a32]">
                        Observação
                      </p>

                      <p className="mt-1 text-sm text-zinc-400">
                        {exerciseObservation}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </section>

            <footer className="pb-[max(12px,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={handleCompleteSet}
                className="flex h-16 w-full items-center justify-center gap-3 rounded-[24px] bg-[#ff2a32] text-base font-black uppercase text-white"
              >
                <CheckCircle2 className="h-6 w-6" />

                {currentSet <
                safeTotalSets
                  ? 'Concluir série'
                  : nextExercise
                    ? 'Próximo exercício'
                    : 'Finalizar treino'}

                <ChevronRight className="h-5 w-5" />
              </button>
            </footer>
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
        Instruções do drop-set
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
            • Reduzir{' '}
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

      <p className="mt-1 text-3xl font-black text-white">
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

      <p className="text-lg font-black text-white">
        {value}
      </p>

      <p className="text-[9px] font-black uppercase text-zinc-600">
        {label}
      </p>
    </div>
  );
}

export default WorkoutExecutionPage;