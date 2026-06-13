import type { WorkoutPlan, WorkoutPlanExercise } from './database';

export interface WorkoutWithExercises extends WorkoutPlan {
  exercises: WorkoutPlanExercise[];
}

export interface CreateWorkoutData {
  student_id: string;
  name: string;
  objective?: string;
  level?: string;
  duration_minutes?: number;
  exercises: CreateExerciseInWorkout[];
}

export interface CreateExerciseInWorkout {
  exercise_id?: string;
  day_key: string;
  name: string;
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

export interface WorkoutExecutionState {
  currentExerciseIndex: number;
  currentSet: number;
  totalExercises: number;
  totalSets: number;
  isResting: boolean;
  restTimeLeft: number;
  startedAt: string;
  completedExercises: CompletedExercise[];
}

export interface CompletedExercise {
  exerciseName: string;
  setsCompleted: number;
  repsCompleted: string;
  weightUsed: string;
}
