import type {
  CompleteWorkoutPlan,
  DropSetConfig,
  PyramidConfig,
  RestPauseConfig,
  WorkoutExerciseGroup,
  WorkoutPlanExercise,
} from '../types/database';

/**
 * Helpers puros do domínio de treino (extraídos da WorkoutExecutionPage na
 * Etapa 3 — cópia fiel, sem mudança de regra).
 */

export const DAY_ALIASES: Record<string, string> = {
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

export function normalizeDayKey(value?: string | null) {
  if (!value) return '';

  return DAY_ALIASES[value] || value;
}

export function getExerciseOrder(
  exercise: WorkoutPlanExercise
) {
  return (
    exercise.execution_order ??
    exercise.order_index ??
    0
  );
}

export function getExerciseName(
  exercise: WorkoutPlanExercise
) {
  return exercise.name || 'Exercício';
}

export function getExerciseSets(
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

export function getExerciseReps(
  exercise: WorkoutPlanExercise
) {
  return exercise.reps || '—';
}

export function getExerciseWeight(
  exercise: WorkoutPlanExercise
) {
  return exercise.suggested_weight || '—';
}

export function getExerciseRest(
  exercise: WorkoutPlanExercise
) {
  const parsed = Number(
    exercise.rest_seconds || 0
  );

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : 0;
}

export function getDropSetConfig(
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

export function getRestPauseConfig(
  exercise: WorkoutPlanExercise
): RestPauseConfig {
  const config = exercise.technique_config;

  if (
    config &&
    typeof config === 'object' &&
    !Array.isArray(config)
  ) {
    return config as RestPauseConfig;
  }

  return {};
}

export function getPyramidConfig(
  exercise: WorkoutPlanExercise
): PyramidConfig {
  const config = exercise.technique_config;

  if (
    config &&
    typeof config === 'object' &&
    !Array.isArray(config)
  ) {
    return config as PyramidConfig;
  }

  return {};
}

export function getExercisesForDay(
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

export function getExerciseGroup(
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

export function getTransitionRest({
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

export function getTransitionTitle(
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

export function getStudentName(student: any) {
  return (
    student?.name ||
    student?.full_name ||
    student?.email ||
    'Aluno'
  );
}
