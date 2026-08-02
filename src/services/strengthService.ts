import type {
  ExerciseRecord,
  ExerciseSetRecord,
  WorkoutLog,
} from '../types/database';
import {
  getExerciseVolume,
  getLogExercises,
  getLogTotalSets,
  getLogTotalVolume,
} from './workoutLogService';
import type { EvolutionPoint } from '../utils/evolution';
import { estimateOneRepMax } from '../utils/evolution';

export interface StrengthPoint {
  date: string;
  label: string;
  volumeKg: number;
  totalSets: number;
}

export interface ExerciseStrengthSummary {
  exerciseId: string | null;
  exerciseName: string;
  /** Melhor peso (kg) registrado em uma única série concluída. */
  bestWeightKg: number;
  /** Maior número de repetições em uma única série concluída. */
  bestReps: number;
  /** Melhor estimativa 1RM (Epley) entre todas as séries. */
  best1RM: number;
  /** Volume total acumulado (kg) para este exercício. */
  totalVolume: number;
  /** Número de treinos em que o exercício aparece. */
  sessions: number;
}

export interface StrengthTracker {
  /** Pontos por treino (para o gráfico de volume, barras ou linha). */
  byWorkout: StrengthPoint[];
  /** Mesmos pontos, mas como EvolutionPoint<number> (volume) p/ o LineChart. */
  byEvolution: EvolutionPoint<number>[];
  /** Resumo agregado por exercício (para a lista de recordes de força). */
  byExercise: ExerciseStrengthSummary[];
  /** Volume total (kg) em todos os treinos do período. */
  totalVolume: number;
  /** Média de volume por treino (kg). */
  avgVolumePerWorkout: number;
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Coleta as séries individuais de um registro (v2) — [] para legado v1. */
function collectSets(record: ExerciseRecord): ExerciseSetRecord[] {
  return Array.isArray(record.sets) && record.sets.length > 0
    ? record.sets
    : [];
}

/** Filtra séries apenas concluídas. Se não houver sets[], considera todas. */
function firstCompletedWeight(
  sets: ExerciseSetRecord[],
  record: ExerciseRecord
): { bestWeight: number; bestReps: number; best1RM: number } {
  let bestWeight = 0;
  let bestReps = 0;
  let best1RM = 0;

  if (sets.length > 0) {
    for (const set of sets) {
      if (!set.completed) continue;
      const w = toNumber(set.weight_kg);
      const r = toNumber(set.reps);
      if (w > bestWeight) bestWeight = w;
      if (r > bestReps) bestReps = r;
      const oneRM = estimateOneRepMax(w, r) ?? 0;
      if (oneRM > best1RM) best1RM = oneRM;
    }
    return { bestWeight, bestReps, best1RM };
  }

  // v1: agregados crus (peso e repetições sem detalhe por série).
  bestWeight = toNumber(record.weight_used);
  bestReps = toNumber(record.reps_completed);
  best1RM = estimateOneRepMax(bestWeight, bestReps) ?? 0;
  return { bestWeight, bestReps, best1RM };
}

/**
 * Constrói o rastreador de força a partir de um conjunto de workout_logs.
 *
 * - `byWorkout`: um ponto por log (volume total + séries) em ordem cronológica.
 * - `byExercise`: agrega por exercício (melhor peso, melhor reps, melhor 1RM,
 *   volume total, nº de sessões).
 *
 * Reusa helpers do workoutLogService (antes órfãos de UI).
 */
export function buildStrengthTracker(
  logs: WorkoutLog[] | null | undefined,
  opts?: { limit?: number }
): StrengthTracker {
  const list = (Array.isArray(logs) ? logs : []).slice();
  const limit = opts?.limit && opts.limit > 0 ? opts.limit : undefined;
  const sorted = list
    .slice()
    .sort((a, b) =>
      (a.created_at ?? '').localeCompare(b.created_at ?? '')
    );
  const window = limit ? sorted.slice(-limit) : sorted;

  const byWorkout: StrengthPoint[] = window.map((log) => {
    const volume = getLogTotalVolume(log);
    const totalSets = getLogTotalSets(log);
    const date = (log.created_at ?? log.completed_at ?? '').slice(0, 10);
    return { date, label: date, volumeKg: volume, totalSets };
  });

  const byExerciseMap = new Map<string, ExerciseStrengthSummary>();

  for (const log of window) {
    const exercises = getLogExercises(log);
    for (const record of exercises) {
      if (!record.exercise_name) continue;
      const sets = collectSets(record);
      const completedCount = Number(record.sets_completed) || 0;
      if (completedCount <= 0 && sets.length === 0) continue;

      const key = record.exercise_id || record.exercise_name || '—';
      const volume = getExerciseVolume(record);
      const { bestWeight, bestReps, best1RM } =
        firstCompletedWeight(sets, record);

      const existing = byExerciseMap.get(key);
      if (existing) {
        existing.totalVolume += volume;
        existing.sessions += 1;
        existing.bestWeightKg = Math.max(existing.bestWeightKg, bestWeight);
        existing.bestReps = Math.max(existing.bestReps, bestReps);
        existing.best1RM = Math.max(existing.best1RM, best1RM);
      } else {
        byExerciseMap.set(key, {
          exerciseId: record.exercise_id || null,
          exerciseName: record.exercise_name,
          bestWeightKg: bestWeight,
          bestReps,
          best1RM,
          totalVolume: volume,
          sessions: 1,
        });
      }
    }
  }

  const byExercise = Array.from(byExerciseMap.values()).sort(
    (a, b) => b.totalVolume - a.totalVolume
  );

  const totalVolume = byWorkout.reduce(
    (acc, p) => acc + p.volumeKg,
    0
  );
  const avgVolumePerWorkout =
    byWorkout.length > 0 ? totalVolume / byWorkout.length : 0;

  const byEvolution: EvolutionPoint<number>[] = byWorkout.map((p) => ({
    date: p.date,
    label: p.label,
    value: p.volumeKg,
  }));

  return {
    byWorkout,
    byEvolution,
    byExercise,
    totalVolume,
    avgVolumePerWorkout,
  };
}

/** Melhor exercício por volume (para destacar "recorde de força"). */
export function bestExerciseByVolume(
  tracker: StrengthTracker | null | undefined
): ExerciseStrengthSummary | null {
  if (!tracker || tracker.byExercise.length === 0) return null;
  return tracker.byExercise[0];
}