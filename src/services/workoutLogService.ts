import type {
  ExerciseRecord,
  ExerciseSetRecord,
  WorkoutLog,
} from '../types/database';
import type {
  CompletedExercise,
  ExerciseSetDraft,
} from '../types/workout';
import {
  calculateSetVolume,
  formatWeight,
  parseWeightKg,
  safeParseFloat,
} from '../utils/workoutMath';

/**
 * Serializer do JSONB `workout_logs.exercises_data` (formato v2) com
 * backward compatibility total:
 *
 * v2 (novo): [{ exercise_id, exercise_name, sets_completed, reps_completed,
 *               weight_used, day_key, sets: [{ set_number, weight_kg, reps,
 *               completed, rest_after_seconds? }] }]
 * v1 (legado): [{ exercise_name, sets_completed, reps_completed,
 *                 weight_used, day_key }]  — sem `sets`.
 *
 * Os agregados do topo (sets_completed/reps_completed/weight_used) são
 * SEMPRE gravados/derivados, então todos os consumidores atuais
 * (WorkoutCompletedPage, StudentProgressPage) continuam funcionando.
 */

export interface BuildWorkoutLogInput {
  exercises: CompletedExercise[];
  dayKey?: string;
}

export function toExerciseSetRecord(
  set: ExerciseSetDraft
): ExerciseSetRecord {
  const record: ExerciseSetRecord = {
    set_number: set.setNumber,
    weight_kg: set.weightKg,
    reps: set.reps,
    completed: set.completed,
  };

  if (
    set.restAfterSeconds !== undefined &&
    set.restAfterSeconds !== null
  ) {
    record.rest_after_seconds = set.restAfterSeconds;
  }

  return record;
}

function formatRepsList(reps: number[]): string {
  if (reps.length === 0) return '—';

  const allEqual = reps.every((value) => value === reps[0]);

  return allEqual ? String(reps[0]) : reps.join(', ');
}

function formatWeightsList(weights: number[]): string {
  if (weights.length === 0) return '';

  const allEqual = weights.every(
    (value) => value === weights[0]
  );

  return allEqual
    ? formatWeight(weights[0])
    : weights.map(formatWeight).join(', ');
}

function deriveAggregatesFromSets(
  sets: ExerciseSetRecord[]
): {
  sets_completed: number;
  reps_completed: string;
  weight_used: string;
} {
  const completedSets = sets.filter((set) => set.completed);

  const reps = completedSets
    .map((set) => set.reps)
    .filter(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value)
    );

  const weights = completedSets
    .map((set) => set.weight_kg)
    .filter(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value)
    );

  return {
    sets_completed: completedSets.length,
    reps_completed: formatRepsList(reps),
    weight_used: formatWeightsList(weights),
  };
}

/**
 * Converte um exercício concluído em ExerciseRecord.
 * - Sem `sets`: comportamento idêntico ao formato v1 atual (agregados crus).
 * - Com `sets`: grava as séries reais e deriva os agregados das séries.
 */
export function buildExerciseRecord(
  exercise: CompletedExercise,
  dayKey?: string
): ExerciseRecord {
  const record: ExerciseRecord = {
    exercise_id: exercise.exerciseId || null,
    exercise_name: exercise.exerciseName || 'Exercício',
    sets_completed: exercise.setsCompleted || 0,
    reps_completed: exercise.repsCompleted || '—',
    weight_used: exercise.weightUsed || '',
    day_key: dayKey || undefined,
  };

  if (exercise.sets && exercise.sets.length > 0) {
    const sets = exercise.sets.map(toExerciseSetRecord);
    const aggregates = deriveAggregatesFromSets(sets);

    record.sets = sets;
    record.sets_completed = aggregates.sets_completed;
    record.reps_completed = aggregates.reps_completed;
    record.weight_used = aggregates.weight_used;
  }

  return record;
}

/** Monta o payload `exercises_data` (v2 com fallback v1) para o insert do log. */
export function buildWorkoutLogData(input: BuildWorkoutLogInput) {
  return {
    exercises_data: (input.exercises || []).map((exercise) =>
      buildExerciseRecord(exercise, input.dayKey)
    ),
  };
}

// ---------------------------------------------------------------------------
// Leitores defensivos (funcionam com logs v1 e v2)
// ---------------------------------------------------------------------------

export function normalizeExercisesData(
  value: unknown
): ExerciseRecord[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is ExerciseRecord =>
      !!item &&
      typeof item === 'object' &&
      'exercise_name' in item
  );
}

export function getLogExercises(
  log: WorkoutLog | null | undefined
): ExerciseRecord[] {
  return normalizeExercisesData(log?.exercises_data);
}

/** Total de registros no log (mesmo critério da WorkoutCompletedPage hoje). */
export function getLogExercisesCount(
  log: WorkoutLog | null | undefined
): number {
  return getLogExercises(log).length;
}

/** Apenas exercícios com ao menos uma série concluída. */
export function getLogCompletedExercisesCount(
  log: WorkoutLog | null | undefined
): number {
  return getLogExercises(log).filter(
    (exercise) =>
      (Number(exercise.sets_completed) || 0) > 0 ||
      (exercise.sets || []).some((set) => set.completed)
  ).length;
}

export function getLogTotalSets(
  log: WorkoutLog | null | undefined
): number {
  return getLogExercises(log).reduce(
    (total, exercise) =>
      total + (Number(exercise.sets_completed) || 0),
    0
  );
}

/** Volume (kg) de um único registro — sets[] se houver, agregados senão. */
export function getExerciseVolume(record: ExerciseRecord): number {
  if (record.sets && record.sets.length > 0) {
    return record.sets.reduce(
      (total, set) =>
        total +
        (set.completed ? calculateSetVolume(set.weight_kg, set.reps) : 0),
      0
    );
  }

  const weight = parseWeightKg(record.weight_used) ?? 0;
  const reps = safeParseFloat(record.reps_completed, 0);

  return (
    weight * reps * Math.max(0, Number(record.sets_completed) || 0)
  );
}

export function getLogTotalVolume(
  log: WorkoutLog | null | undefined
): number {
  return getLogExercises(log).reduce(
    (total, exercise) => total + getExerciseVolume(exercise),
    0
  );
}

export function getLogDurationSeconds(
  log: WorkoutLog | null | undefined
): number {
  const parsed = Number(log?.duration_seconds);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** True se o log já usa o formato v2 (séries individuais). */
export function hasStructuredSets(
  log: WorkoutLog | null | undefined
): boolean {
  return getLogExercises(log).some(
    (exercise) =>
      Array.isArray(exercise.sets) && exercise.sets.length > 0
  );
}
