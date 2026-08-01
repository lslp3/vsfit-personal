import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '../lib/supabase';
import * as studentService from '../services/studentService';
import {
  formatWorkoutPlanDate,
  isWorkoutPlanExpired,
  notifyTrainerAboutExpiredPlan,
} from '../services/workoutExpirationService';
import {
  getWorkoutPlanById,
  saveWorkoutLog,
} from '../services/workoutService';
import type {
  CompleteWorkoutPlan,
  WorkoutExerciseGroup,
  WorkoutPlanExercise,
} from '../types/database';
import type {
  CompletedExercise,
  ExerciseSetDraft,
  WorkoutExecutionState,
} from '../types/workout';
import { createSetDrafts } from '../utils/workoutMath';
import {
  getExerciseGroup,
  getExerciseName,
  getExerciseReps,
  getExerciseRest,
  getExerciseSets,
  getExerciseWeight,
  getExercisesForDay,
  getStudentName,
  getTransitionRest,
  getTransitionTitle,
  normalizeDayKey,
} from '../utils/workoutPlan';

type RestMode = 'set' | 'exercise';

export interface UseWorkoutExecutionResult
  extends WorkoutExecutionState {
  student: any | null;
  plan: CompleteWorkoutPlan | null;
  restDuration: number;
  restMode: RestMode;
  restTitle: string;
  isCompleted: boolean;
  elapsedSeconds: number;
  exercises: WorkoutPlanExercise[];
  dayGroups: WorkoutExerciseGroup[];
  currentExercise: WorkoutPlanExercise | null;
  nextExercise: WorkoutPlanExercise | null;
  currentGroup: WorkoutExerciseGroup | null;
  safeTotalSets: number;
  setDrafts: ExerciseSetDraft[];
  updateSet: (
    setNumber: number,
    patch: Partial<
      Pick<
        ExerciseSetDraft,
        'weightKg' | 'reps' | 'completed'
      >
    >
  ) => void;
  exerciseName: string;
  exerciseReps: string;
  exerciseWeight: string;
  handleCompleteSet: () => void;
  finishRest: () => void;
  handleSave: () => Promise<void>;
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
        '[useWorkoutExecution] user_id do personal não encontrado.'
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

    // CAUSA RAIZ DOCUMENTADA (pendência Sprint 7B — revisão de policies ao
    // final da sprint): a tabela notifications tem RLS habilitado, mas NÃO
    // existe policy de INSERT em nenhuma migration (só self_select,
    // self_update, trainer_select e admin_all). Por isso este insert do
    // aluno autenticado é rejeitado pelo Supabase com
    // "new row violates row-level security policy" e o erro é engolido
    // pelo best-effort abaixo — o Personal nunca recebe a notificação.
    // Correção prevista: policy INSERT (aluno → user_id do seu personal)
    // a ser criada manualmente na revisão de policies pós-Sprint.
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
        '[useWorkoutExecution] notification error:',
        error
      );
    }
  } catch (error) {
    console.warn(
      '[useWorkoutExecution] notification exception:',
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

/**
 * Estado e ações da execução de treino do aluno (extraído da
 * WorkoutExecutionPage na Etapa 3 — refatoração mecânica, sem mudança de
 * comportamento. Payload de log continua v1 até a Etapa 11).
 */
export function useWorkoutExecution({
  id,
  dayKey,
}: {
  id?: string;
  dayKey: string;
}): UseWorkoutExecutionResult {
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

  const [error, setError] =
    useState('');

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

  const [
    completedExercises,
    setCompletedExercises,
  ] = useState<CompletedExercise[]>([]);

  // Etapa 7: séries do exercício atual em memória (carga/repetições
  // reais + conclusão visual). Recriado ao trocar de exercício.
  const [setDrafts, setSetDrafts] =
    useState<ExerciseSetDraft[]>([]);

  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] = useState(0);

  const startedAtRef = useRef(
    new Date().toISOString()
  );

  useEffect(() => {
    void loadExecutionData();
  }, [id, dayKey]);

  useEffect(() => {
    if (isCompleted) return;

    const interval =
      window.setInterval(() => {
        const startedAt = new Date(
          startedAtRef.current
        ).getTime();

        setElapsedSeconds(
          Math.floor(
            (Date.now() - startedAt) /
              1000
          )
        );
      }, 1000);

    return () =>
      window.clearInterval(interval);
  }, [isCompleted]);

  useEffect(() => {
    if (!isResting) return;

    const interval =
      window.setInterval(() => {
        setRestTimeLeft(
          (previous) => {
            if (previous <= 1) {
              window.clearInterval(
                interval
              );

              finishRest();

              return 0;
            }
            return previous - 1;
          }
        );
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
    setStudent(null);
    setSaving(false);

    try {
      if (!id) {
        throw new Error(
          'Plano de treino não encontrado.'
        );
      }

      if (!dayKey) {
        throw new Error(
          'Selecione o treino que deseja executar.'
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

      if (
        isWorkoutPlanExpired(
          planData.end_date
        )
      ) {
        await notifyTrainerAboutExpiredPlan({
          student: studentData,
          plan: planData,
        });

        throw new Error(
          `Este plano venceu em ${formatWorkoutPlanDate(
            planData.end_date
          )}. Solicite ao seu personal a atualização ou criação de um novo plano.`
        );
      }

      const dayExercises =
        getExercisesForDay(
          planData,
          dayKey
        );

      if (
        dayExercises.length === 0
      ) {
        throw new Error(
          'Este treino não possui exercícios cadastrados.'
        );
      }

      setStudent(studentData);
      setPlan(planData);
      setCurrentExerciseIndex(0);
      setCurrentSet(1);
      setCompletedExercises([]);
      setIsResting(false);
      setRestTimeLeft(0);
      setRestDuration(0);
      setRestMode('exercise');
      setRestTitle('Descanso');
      setIsCompleted(false);
      setElapsedSeconds(0);

      startedAtRef.current =
        new Date().toISOString();
    } catch (
      loadError: unknown
    ) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Erro ao carregar treino.';

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const exercises = (() => {
    if (!plan || !dayKey) {
      return [];
    }

    return getExercisesForDay(
      plan,
      dayKey
    );
  })();

  const dayGroups = (() => {
    if (!plan) return [];

    const selectedDayIds =
      new Set(
        plan.workout_days
          .filter(
            (day) =>
              normalizeDayKey(
                day.day_key
              ) ===
              dayKey
          )
          .map(
            (day) => day.id
          )
      );

    return plan.workout_exercise_groups.filter(
      (group) =>
        selectedDayIds.has(
          group.workout_day_id
        )
    );
  })();

  const currentExercise =
    exercises[
      currentExerciseIndex
    ] || null;

  const nextExercise =
    exercises[
      currentExerciseIndex + 1
    ] || null;

  const currentGroup =
    currentExercise
      ? getExerciseGroup(
          currentExercise,
          dayGroups
        )
      : null;

  const safeTotalSets =
    currentExercise
      ? getExerciseSets(
          currentExercise
        )
      : 1;

  const exerciseName =
    currentExercise
      ? getExerciseName(
          currentExercise
        )
      : 'Exercício';

  const exerciseReps =
    currentExercise
      ? getExerciseReps(
          currentExercise
        )
      : '—';

  const exerciseWeight =
    currentExercise
      ? getExerciseWeight(
          currentExercise
        )
      : '—';

  // Etapa 7: inicializa as séries do exercício atual a partir do plano
  // (carga e repetições sugeridas) quando o exercício muda.
  useEffect(() => {
    if (!currentExercise) return;

    setSetDrafts(
      createSetDrafts(
        safeTotalSets,
        exerciseWeight,
        exerciseReps
      )
    );
  }, [currentExercise?.id]);

  function updateSet(
    setNumber: number,
    patch: Partial<
      Pick<
        ExerciseSetDraft,
        'weightKg' | 'reps' | 'completed'
      >
    >
  ) {
    setSetDrafts((previous) =>
      previous.map((set) =>
        set.setNumber === setNumber
          ? { ...set, ...patch }
          : set
      )
    );
  }

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

    if (
      nextIndex <
      exercises.length
    ) {
      setCurrentExerciseIndex(
        nextIndex
      );

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
        (previous) =>
          previous + 1
      );

      return;
    }

    goToNextExercise();
  }

  function handleCompleteSet() {
    if (!currentExercise) {
      return;
    }

    // Etapa 7: marca a série atual como concluída no estado visual.
    // A progressão (descanso/avanço) continua sendo feita pelo fluxo
    // abaixo — sem mudança de comportamento.
    setSetDrafts((previous) =>
      previous.map((set) =>
        set.setNumber === currentSet
          ? { ...set, completed: true }
          : set
      )
    );

    if (
      currentSet <
      safeTotalSets
    ) {
      const rest =
        getExerciseRest(
          currentExercise
        );

      if (rest > 0) {
        startRest({
          seconds: rest,
          mode: 'set',
          title:
            'Descanso entre séries',
        });

        return;
      }

      setCurrentSet(
        (previous) =>
          previous + 1
      );

      return;
    }

    const completed: CompletedExercise =
      {
        exerciseId:
          currentExercise.id,

        exerciseName,

        setsCompleted:
          safeTotalSets,

        repsCompleted:
          exerciseReps,

        weightUsed:
          exerciseWeight,

        // Etapa 7: séries reais em memória (snapshot com a série atual
        // marcada). O payload v1 do log continua idêntico — a gravação
        // de sets[] acontece somente na Etapa 11 (buildWorkoutLogData).
        sets: setDrafts.map((set) =>
          set.setNumber === currentSet
            ? { ...set, completed: true }
            : { ...set }
        ),
      };

    setCompletedExercises(
      (previous) => {
        const alreadyCompleted =
          previous.some(
            (exercise) =>
              exercise.exerciseId ===
              currentExercise.id
          );

        if (alreadyCompleted) {
          return previous;
        }

        return [
          ...previous,
          completed,
        ];
      }
    );

    if (!nextExercise) {
      setIsCompleted(true);

      return;
    }

    const transitionRest =
      getTransitionRest({
        exercise:
          currentExercise,

        nextExercise,

        groups: dayGroups,
      });

    if (transitionRest > 0) {
      startRest({
        seconds:
          transitionRest,

        mode: 'exercise',

        title:
          getTransitionTitle(
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
        getTrainerId(
          student,
          plan
        );

      const log =
        await saveWorkoutLog({
          student_id:
            student.id,

          trainer_id:
            trainerId,

          workout_plan_id:
            plan.id,

          started_at:
            startedAtRef.current,

          completed_at:
            completedAt,

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
                  dayKey,
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

      const logId =
        getSavedLogId(log);

      navigate(
        `/student/workout-completed/${
          logId || plan.id
        }`,
        {
          replace: true,
        }
      );
    } catch (
      saveError: unknown
    ) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Erro ao salvar o treino.';

      setError(message);
      setSaving(false);
    }
  }

  return {
    student,
    plan,
    loading,
    saving,
    error,
    currentExerciseIndex,
    currentSet,
    totalExercises:
      exercises.length,
    totalSets: exercises.reduce(
      (total, exercise) =>
        total + getExerciseSets(exercise),
      0
    ),
    isResting,
    restTimeLeft,
    restDuration,
    restMode,
    restTitle,
    isCompleted,
    elapsedSeconds,
    startedAt:
      startedAtRef.current,
    completedExercises,
    exercises,
    dayGroups,
    currentExercise,
    nextExercise,
    currentGroup,
    safeTotalSets,
    setDrafts,
    updateSet,
    exerciseName,
    exerciseReps,
    exerciseWeight,
    handleCompleteSet,
    finishRest,
    handleSave,
  };
}
