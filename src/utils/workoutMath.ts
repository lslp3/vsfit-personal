import type { WorkoutPlanExercise } from '../types/database';
import type {
  CompletedExercise,
  ExerciseSetDraft,
} from '../types/workout';

/**
 * Formata segundos como timer MM:SS (ex.: 65 -> "01:05").
 * Uso: cronômetro do treino e resumos. Não confundir com
 * formatTime (lib/formatters), que usa "5min 3s".
 */
export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds
  ).padStart(2, '0')}`;
}

export function safeParseInt(
  value: unknown,
  fallback: number
): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Converte string/numero para float tolerante a "20 kg", "20,5" e "—".
 */
export function safeParseFloat(
  value: unknown,
  fallback = 0
): number {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return fallback;
  }

  const normalized = String(value)
    .replace(',', '.')
    .replace(/[^\d.\-]/g, '');

  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getExerciseSetsCount(
  exercise: Pick<WorkoutPlanExercise, 'sets'>
): number {
  const parsed = safeParseInt(exercise.sets, 1);

  return parsed > 0 ? parsed : 1;
}

export function getExerciseRepsText(
  exercise: Pick<WorkoutPlanExercise, 'reps'>
): string {
  return exercise.reps || '—';
}

export function getExerciseWeightText(
  exercise: Pick<WorkoutPlanExercise, 'suggested_weight'>
): string {
  return exercise.suggested_weight || '—';
}

/** Converte carga em kg (número ou string) para number; null se ausente/ilegível. */
export function parseWeightKg(
  value: string | number | null | undefined
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const parsed = safeParseFloat(value, NaN);

  return Number.isFinite(parsed) ? parsed : null;
}

/** Formata peso para exibição: 20 -> "20", 20.5 -> "20,5", vazio -> "". */
export function formatWeight(
  value: number | null | undefined
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return '';
  }

  return Number.isInteger(value)
    ? String(value)
    : String(value).replace('.', ',');
}

export function calculateSetVolume(
  weightKg: number | null | undefined,
  reps: number | null | undefined
): number {
  if (
    !weightKg ||
    !reps ||
    weightKg <= 0 ||
    reps <= 0
  ) {
    return 0;
  }

  return weightKg * reps;
}

export function calculateSetsVolume(
  sets: ExerciseSetDraft[]
): number {
  return (sets || []).reduce(
    (total, set) =>
      total + calculateSetVolume(set.weightKg, set.reps),
    0
  );
}

/**
 * Volume (kg) de um exercício concluído.
 * v2: usa sets[] reais; v1: usa agregados (weightUsed * repsCompleted * sets).
 */
export function calculateCompletedExerciseVolume(
  exercise: CompletedExercise
): number {
  if (exercise.sets && exercise.sets.length > 0) {
    return calculateSetsVolume(exercise.sets);
  }

  const weight = parseWeightKg(exercise.weightUsed) ?? 0;
  const reps = safeParseFloat(exercise.repsCompleted, 0);

  return (
    weight * reps * Math.max(0, exercise.setsCompleted || 0)
  );
}

export function calculateTotalVolume(
  exercises: CompletedExercise[]
): number {
  return (exercises || []).reduce(
    (total, exercise) =>
      total + calculateCompletedExerciseVolume(exercise),
    0
  );
}

/**
 * Mesma fórmula usada hoje na WorkoutExecutionPage:
 * (exercício atual + fração da série atual) / total de exercícios.
 */
export function calculateProgressPercent({
  currentExerciseIndex,
  currentSet,
  totalSets,
  totalExercises,
}: {
  currentExerciseIndex: number;
  currentSet: number;
  totalSets: number;
  totalExercises: number;
}): number {
  if (!totalExercises) return 0;

  return (
    ((currentExerciseIndex +
      (currentSet - 1) / Math.max(1, totalSets)) /
      totalExercises) *
    100
  );
}

export function calculateCompletedPercent({
  completedCount,
  totalExercises,
}: {
  completedCount: number;
  totalExercises: number;
}): number {
  if (!totalExercises) return 0;

  return Math.round((completedCount / totalExercises) * 100);
}

/**
 * Inicializa as séries de um exercício durante a execução (Etapa 7).
 * Cria `setsCount` séries com a carga/repetições sugeridas do plano,
 * todas não concluídas — estado em memória, sem tocar no banco.
 */
export function createSetDrafts(
  setsCount: number,
  weightText?: string | null,
  repsText?: string | null
): ExerciseSetDraft[] {
  const weightKg = parseWeightKg(weightText);
  const reps = safeParseInt(repsText, 0) || null;

  return Array.from(
    { length: Math.max(0, setsCount) },
    (_, index) => ({
      setNumber: index + 1,
      weightKg,
      reps,
      completed: false,
      restAfterSeconds: null,
    })
  );
}
