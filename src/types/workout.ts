import type {
  JsonValue,
  TechniqueConfig,
  WorkoutExerciseGroup,
  WorkoutPlan,
  WorkoutPlanExercise,
  WorkoutTechniqueType,
  WorkoutDay,
} from './database';

export const WORKOUT_DAY_ORDER = [
  'dom',
  'seg',
  'ter',
  'qua',
  'qui',
  'sex',
  'sab',
] as const;

export type WorkoutDayKey =
  (typeof WORKOUT_DAY_ORDER)[number];

export interface WorkoutWithExercises extends WorkoutPlan {
  exercises: WorkoutPlanExercise[];
}

export interface CompleteWorkoutWithExercises extends WorkoutPlan {
  workout_days: WorkoutDay[];
  workout_exercise_groups: WorkoutExerciseGroup[];
  workout_plan_exercises: WorkoutPlanExercise[];
}

export interface CreateWorkoutData {
  student_id: string;
  name: string;
  objective?: string;
  level?: string;
  duration_minutes?: number;

  start_date?: string | null;
  end_date?: string | null;

  days?: CreateWorkoutDay[];
  groups?: CreateWorkoutExerciseGroup[];
  exercises: CreateExerciseInWorkout[];
}

export interface CreateWorkoutDay {
  local_id: string;
  weekday: number;
  day_key: WorkoutDayKey;
  order_index: number;
  name?: string;
  notes?: string;
}

export interface CreateWorkoutExerciseGroup {
  local_id: string;
  workout_day_local_id: string;
  group_type: 'bi_set';
  name?: string;
  order_index: number;
  rounds?: number | null;
  rest_after_seconds?: number | null;
  notes?: string;
}

export interface CreateExerciseInWorkout {
  id?: string;
  local_id?: string;

  exercise_id?: string;
  day_key: WorkoutDayKey | string;

  workout_day_id?: string | null;
  workout_day_local_id?: string | null;

  exercise_group_id?: string | null;
  exercise_group_local_id?: string | null;

  technique_type?: WorkoutTechniqueType;
  technique_config?: TechniqueConfig | JsonValue;

  group_order?: number | null;
  execution_order?: number | null;

  name: string;
  name_pt?: string | null;
  sets: string;
  reps: string;
  rest_seconds?: number;
  suggested_weight?: string;
  observation?: string;
  tempo?: string;

  image_url?: string | null;
  video_url?: string | null;
  muscle_group?: string | null;
  category?: string | null;
  equipment?: string | null;
  difficulty?: string | null;
  instructions?: string | null;
  tips?: string | null;
}

/**
 * Série individual durante a execução (estado em memória do hook/UI).
 * `weightKg` e `reps` são o que o aluno REALMENTE executou — preenchidos a
 * partir de suggested_weight/reps do plano na inicialização.
 */
export interface ExerciseSetDraft {
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
  /** Preenchido ao salvar: segundos de descanso usados após esta série */
  restAfterSeconds?: number | null;
}

/**
 * Exercício durante a execução: os dados do plano + o estado real de cada série.
 */
export interface ExecutionExercise {
  exercise: WorkoutPlanExercise;
  sets: ExerciseSetDraft[];
}

export interface WorkoutExecutionState {
  loading: boolean;
  saving: boolean;
  error: string;
  student: unknown | null;
  plan: WorkoutPlan | null;
  currentExerciseIndex: number;
  currentSet: number;
  totalExercises: number;
  totalSets: number;
  isResting: boolean;
  restTimeLeft: number;
  restDuration?: number;
  restMode?: 'set' | 'exercise';
  restTitle?: string;
  isCompleted?: boolean;
  elapsedSeconds?: number;
  startedAt: string;
  completedExercises: CompletedExercise[];
}

export interface CompletedExercise {
  exerciseId: string;
  exerciseName: string;
  setsCompleted: number;
  repsCompleted: string;
  weightUsed: string;
  /** v2: séries reais executadas (opcional — populado a partir da Etapa 7) */
  sets?: ExerciseSetDraft[];
  /** Info do exercício para exibição no resumo (musculatura/equipamento/dificuldade) */
  muscleGroup?: string | null;
  equipment?: string | null;
  difficulty?: string | null;
}

export function getEffectiveExerciseOrder(
  exercise: Pick<
    WorkoutPlanExercise,
    'execution_order' | 'order_index'
  >
) {
  return exercise.execution_order ?? exercise.order_index;
}

export function getEffectiveTechnique(
  exercise: Pick<WorkoutPlanExercise, 'technique_type'>
): WorkoutTechniqueType {
  return exercise.technique_type ?? 'normal';
}

export function isWorkoutDayKey(
  value: string | null | undefined
): value is WorkoutDayKey {
  return WORKOUT_DAY_ORDER.includes(
    value as WorkoutDayKey
  );
}

export function getWorkoutDayPosition(value?: string | null) {
  const index = WORKOUT_DAY_ORDER.indexOf(
    value as WorkoutDayKey
  );

  return index === -1
    ? WORKOUT_DAY_ORDER.length
    : index;
}