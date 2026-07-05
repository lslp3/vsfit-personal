import { supabase } from '../lib/supabase';

import type {
  CompleteWorkoutPlan,
  WorkoutDay,
  WorkoutExerciseGroup,
  WorkoutLog,
  WorkoutPlan,
  WorkoutPlanExercise,
} from '../types/database';

import type {
  CreateExerciseInWorkout,
  CreateWorkoutData,
  CreateWorkoutDay,
  CreateWorkoutExerciseGroup,
} from '../types/workout';

type WorkoutPlanWithStudent = WorkoutPlan & {
  students?: {
    name?: string | null;
  } | null;
};

function normalizeNullableText(value?: string | null) {
  const normalized = String(value || '').trim();

  return normalized || null;
}

function normalizeNullableNumber(value?: number | null) {
  if (value === null || value === undefined) return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function buildPlanPayload(
  trainerId: string,
  data: CreateWorkoutData
) {
  return {
    trainer_id: trainerId,
    student_id: data.student_id,
    name: data.name.trim(),
    objective: normalizeNullableText(data.objective),
    level: normalizeNullableText(data.level),
    duration_minutes: normalizeNullableNumber(
      data.duration_minutes
    ),
    start_date: data.start_date || null,
    end_date: data.end_date || null,
  };
}

function buildExercisePayload({
  exercise,
  workoutPlanId,
  index,
  workoutDayId,
  exerciseGroupId,
}: {
  exercise: CreateExerciseInWorkout;
  workoutPlanId: string;
  index: number;
  workoutDayId: string | null;
  exerciseGroupId: string | null;
}) {
  return {
    workout_plan_id: workoutPlanId,
    exercise_id: exercise.exercise_id || null,

    workout_day_id: workoutDayId,
    exercise_group_id: exerciseGroupId,

    day_key: exercise.day_key || null,
    order_index: index,
    execution_order:
      exercise.execution_order ?? index,
    group_order: exercise.group_order ?? null,

    technique_type:
      exercise.technique_type || 'normal',
    technique_config:
      exercise.technique_config || {},

    name: exercise.name.trim(),
    sets: normalizeNullableText(exercise.sets),
    reps: normalizeNullableText(exercise.reps),
    rest_seconds:
      normalizeNullableNumber(exercise.rest_seconds),
    suggested_weight:
      normalizeNullableText(exercise.suggested_weight),
    observation:
      normalizeNullableText(exercise.observation),
    tempo: normalizeNullableText(exercise.tempo),

    image_url: exercise.image_url || null,
    video_url: exercise.video_url || null,
    muscle_group: exercise.muscle_group || null,
    category: exercise.category || null,
    equipment: exercise.equipment || null,
    difficulty: exercise.difficulty || null,
    instructions: exercise.instructions || null,
    tips: exercise.tips || null,
  };
}

async function insertWorkoutDays(
  workoutPlanId: string,
  days: CreateWorkoutDay[]
) {
  const idMap = new Map<string, string>();
  const createdDays: WorkoutDay[] = [];

  for (const day of days) {
    const { data, error } = await supabase
      .from('workout_days')
      .insert({
        workout_plan_id: workoutPlanId,
        weekday: day.weekday,
        day_key: day.day_key,
        order_index: day.order_index,
        name: normalizeNullableText(day.name),
        notes: normalizeNullableText(day.notes),
      })
      .select('*')
      .single();

    if (error) throw error;

    const createdDay = data as WorkoutDay;

    idMap.set(day.local_id, createdDay.id);
    createdDays.push(createdDay);
  }

  return {
    idMap,
    createdDays,
  };
}

async function insertExerciseGroups({
  workoutPlanId,
  groups,
  workoutDayIdMap,
}: {
  workoutPlanId: string;
  groups: CreateWorkoutExerciseGroup[];
  workoutDayIdMap: Map<string, string>;
}) {
  const idMap = new Map<string, string>();
  const createdGroups: WorkoutExerciseGroup[] = [];

  for (const group of groups) {
    const workoutDayId = workoutDayIdMap.get(
      group.workout_day_local_id
    );

    if (!workoutDayId) {
      throw new Error(
        'Não foi possível localizar o dia relacionado ao bi-set.'
      );
    }

    const { data, error } = await supabase
      .from('workout_exercise_groups')
      .insert({
        workout_plan_id: workoutPlanId,
        workout_day_id: workoutDayId,
        group_type: group.group_type,
        name: normalizeNullableText(group.name),
        order_index: group.order_index,
        rounds: normalizeNullableNumber(group.rounds),
        rest_after_seconds: normalizeNullableNumber(
          group.rest_after_seconds
        ),
        notes: normalizeNullableText(group.notes),
      })
      .select('*')
      .single();

    if (error) throw error;

    const createdGroup =
      data as WorkoutExerciseGroup;

    idMap.set(group.local_id, createdGroup.id);
    createdGroups.push(createdGroup);
  }

  return {
    idMap,
    createdGroups,
  };
}

async function insertWorkoutExercises({
  workoutPlanId,
  exercises,
  workoutDayIdMap,
  exerciseGroupIdMap,
}: {
  workoutPlanId: string;
  exercises: CreateExerciseInWorkout[];
  workoutDayIdMap: Map<string, string>;
  exerciseGroupIdMap: Map<string, string>;
}) {
  if (exercises.length === 0) return [];

  const payload = exercises.map((exercise, index) => {
    const workoutDayId =
      exercise.workout_day_id ||
      (
        exercise.workout_day_local_id
          ? workoutDayIdMap.get(
              exercise.workout_day_local_id
            )
          : null
      ) ||
      null;

    const exerciseGroupId =
      exercise.exercise_group_id ||
      (
        exercise.exercise_group_local_id
          ? exerciseGroupIdMap.get(
              exercise.exercise_group_local_id
            )
          : null
      ) ||
      null;

    return buildExercisePayload({
      exercise,
      workoutPlanId,
      index,
      workoutDayId,
      exerciseGroupId,
    });
  });

  const { data, error } = await supabase
    .from('workout_plan_exercises')
    .insert(payload)
    .select('*');

  if (error) throw error;

  return (data || []) as WorkoutPlanExercise[];
}

export async function getWorkoutPlansByStudent(
  studentId: string
): Promise<WorkoutPlan[]> {
  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.error(
        '[WorkoutService] getWorkoutPlansByStudent error:',
        error
      );

      return [];
    }

    return (data || []) as WorkoutPlan[];
  } catch (error) {
    console.error(
      '[WorkoutService] getWorkoutPlansByStudent exception:',
      error
    );

    return [];
  }
}

export async function getWorkoutPlansByTrainer(
  trainerId: string
): Promise<WorkoutPlanWithStudent[]> {
  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*, students(name)')
      .eq('trainer_id', trainerId)
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.error(
        '[WorkoutService] getWorkoutPlansByTrainer error:',
        error
      );

      return [];
    }

    return (data || []) as WorkoutPlanWithStudent[];
  } catch (error) {
    console.error(
      '[WorkoutService] getWorkoutPlansByTrainer exception:',
      error
    );

    return [];
  }
}

export async function getCompleteWorkoutPlan(
  id: string
): Promise<CompleteWorkoutPlan | null> {
  try {
    const { data: plan, error: planError } =
      await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (planError) throw planError;
    if (!plan) return null;

    const [
      daysResult,
      groupsResult,
      exercisesResult,
    ] = await Promise.all([
      supabase
        .from('workout_days')
        .select('*')
        .eq('workout_plan_id', id)
        .order('order_index', {
          ascending: true,
        }),

      supabase
        .from('workout_exercise_groups')
        .select('*')
        .eq('workout_plan_id', id)
        .order('order_index', {
          ascending: true,
        }),

      supabase
        .from('workout_plan_exercises')
        .select('*')
        .eq('workout_plan_id', id)
        .order('order_index', {
          ascending: true,
        }),
    ]);

    if (daysResult.error) {
      throw daysResult.error;
    }

    if (groupsResult.error) {
      throw groupsResult.error;
    }

    if (exercisesResult.error) {
      throw exercisesResult.error;
    }

    return {
      ...(plan as WorkoutPlan),

      workout_days:
        (daysResult.data || []) as WorkoutDay[],

      workout_exercise_groups:
        (groupsResult.data ||
          []) as WorkoutExerciseGroup[],

      workout_plan_exercises:
        (exercisesResult.data ||
          []) as WorkoutPlanExercise[],
    };
  } catch (error) {
    console.error(
      '[WorkoutService] getCompleteWorkoutPlan error:',
      error
    );

    return null;
  }
}

export async function getWorkoutPlanById(
  id: string
): Promise<CompleteWorkoutPlan | null> {
  return getCompleteWorkoutPlan(id);
}

export async function createWorkoutPlan(
  trainerId: string,
  data: CreateWorkoutData
): Promise<CompleteWorkoutPlan> {
  const { data: planData, error: planError } =
    await supabase
      .from('workout_plans')
      .insert(buildPlanPayload(trainerId, data))
      .select('*')
      .single();

  if (planError) throw planError;

  const plan = planData as WorkoutPlan;

  try {
    const days = data.days || [];
    const groups = data.groups || [];

    const {
      idMap: workoutDayIdMap,
      createdDays,
    } = await insertWorkoutDays(plan.id, days);

    const {
      idMap: exerciseGroupIdMap,
      createdGroups,
    } = await insertExerciseGroups({
      workoutPlanId: plan.id,
      groups,
      workoutDayIdMap,
    });

    const createdExercises =
      await insertWorkoutExercises({
        workoutPlanId: plan.id,
        exercises: data.exercises,
        workoutDayIdMap,
        exerciseGroupIdMap,
      });

    return {
      ...plan,
      workout_days: createdDays,
      workout_exercise_groups: createdGroups,
      workout_plan_exercises: createdExercises,
    };
  } catch (error) {
    const { error: cleanupError } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', plan.id);

    if (cleanupError) {
      console.error(
        '[WorkoutService] erro ao desfazer plano incompleto:',
        cleanupError
      );
    }

    throw error;
  }
}

export async function updateWorkoutPlanBasic({
  id,
  studentId,
  name,
  objective,
  level,
  durationMinutes,
  startDate,
  endDate,
}: {
  id: string;
  studentId?: string;
  name?: string;
  objective?: string | null;
  level?: string | null;
  durationMinutes?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}) {
  const payload: Record<string, unknown> = {};

  if (studentId !== undefined) {
    payload.student_id = studentId;
  }

  if (name !== undefined) {
    payload.name = name.trim();
  }

  if (objective !== undefined) {
    payload.objective =
      normalizeNullableText(objective);
  }

  if (level !== undefined) {
    payload.level = normalizeNullableText(level);
  }

  if (durationMinutes !== undefined) {
    payload.duration_minutes =
      normalizeNullableNumber(durationMinutes);
  }

  if (startDate !== undefined) {
    payload.start_date = startDate || null;
  }

  if (endDate !== undefined) {
    payload.end_date = endDate || null;
  }

  const { data, error } = await supabase
    .from('workout_plans')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return data as WorkoutPlan;
}

export async function createWorkoutDay(
  workoutPlanId: string,
  day: Omit<CreateWorkoutDay, 'local_id'>
) {
  const { data, error } = await supabase
    .from('workout_days')
    .insert({
      workout_plan_id: workoutPlanId,
      weekday: day.weekday,
      day_key: day.day_key,
      order_index: day.order_index,
      name: normalizeNullableText(day.name),
      notes: normalizeNullableText(day.notes),
    })
    .select('*')
    .single();

  if (error) throw error;

  return data as WorkoutDay;
}

export async function updateWorkoutDay(
  id: string,
  day: Partial<
    Omit<CreateWorkoutDay, 'local_id'>
  >
) {
  const payload: Record<string, unknown> = {};

  if (day.weekday !== undefined) {
    payload.weekday = day.weekday;
  }

  if (day.day_key !== undefined) {
    payload.day_key = day.day_key;
  }

  if (day.order_index !== undefined) {
    payload.order_index = day.order_index;
  }

  if (day.name !== undefined) {
    payload.name =
      normalizeNullableText(day.name);
  }

  if (day.notes !== undefined) {
    payload.notes =
      normalizeNullableText(day.notes);
  }

  const { data, error } = await supabase
    .from('workout_days')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return data as WorkoutDay;
}

export async function deleteWorkoutDay(
  id: string
) {
  const { error } = await supabase
    .from('workout_days')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function createExerciseGroup({
  workoutPlanId,
  workoutDayId,
  group,
}: {
  workoutPlanId: string;
  workoutDayId: string;
  group: Omit<
    CreateWorkoutExerciseGroup,
    'local_id' | 'workout_day_local_id'
  >;
}) {
  const { data, error } = await supabase
    .from('workout_exercise_groups')
    .insert({
      workout_plan_id: workoutPlanId,
      workout_day_id: workoutDayId,
      group_type: group.group_type,
      name: normalizeNullableText(group.name),
      order_index: group.order_index,
      rounds: normalizeNullableNumber(
        group.rounds
      ),
      rest_after_seconds:
        normalizeNullableNumber(
          group.rest_after_seconds
        ),
      notes: normalizeNullableText(
        group.notes
      ),
    })
    .select('*')
    .single();

  if (error) throw error;

  return data as WorkoutExerciseGroup;
}

export async function updateExerciseGroup({
  id,
  group,
}: {
  id: string;
  group: Partial<
    Omit<
      CreateWorkoutExerciseGroup,
      'local_id' | 'workout_day_local_id'
    >
  >;
}) {
  const payload: Record<string, unknown> = {};

  if (group.group_type !== undefined) {
    payload.group_type = group.group_type;
  }

  if (group.name !== undefined) {
    payload.name =
      normalizeNullableText(group.name);
  }

  if (group.order_index !== undefined) {
    payload.order_index = group.order_index;
  }

  if (group.rounds !== undefined) {
    payload.rounds =
      normalizeNullableNumber(group.rounds);
  }

  if (group.rest_after_seconds !== undefined) {
    payload.rest_after_seconds =
      normalizeNullableNumber(
        group.rest_after_seconds
      );
  }

  if (group.notes !== undefined) {
    payload.notes =
      normalizeNullableText(group.notes);
  }

  const { data, error } = await supabase
    .from('workout_exercise_groups')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return data as WorkoutExerciseGroup;
}

export async function deleteExerciseGroup(
  id: string
) {
  const { error: unlinkError } = await supabase
    .from('workout_plan_exercises')
    .update({
      exercise_group_id: null,
      group_order: null,
      technique_type: 'normal',
      technique_config: {},
    })
    .eq('exercise_group_id', id);

  if (unlinkError) throw unlinkError;

  const { error } = await supabase
    .from('workout_exercise_groups')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateWorkoutExercise({
  id,
  exercise,
}: {
  id: string;
  exercise: Partial<CreateExerciseInWorkout>;
}) {
  const payload: Record<string, unknown> = {};

  if (exercise.exercise_id !== undefined) {
    payload.exercise_id =
      exercise.exercise_id || null;
  }

  if (exercise.workout_day_id !== undefined) {
    payload.workout_day_id =
      exercise.workout_day_id || null;
  }

  if (
    exercise.exercise_group_id !== undefined
  ) {
    payload.exercise_group_id =
      exercise.exercise_group_id || null;
  }

  if (exercise.day_key !== undefined) {
    payload.day_key =
      exercise.day_key || null;
  }

  if (exercise.execution_order !== undefined) {
    payload.execution_order =
      exercise.execution_order;
  }

  if (exercise.group_order !== undefined) {
    payload.group_order =
      exercise.group_order;
  }

  if (exercise.technique_type !== undefined) {
    payload.technique_type =
      exercise.technique_type || 'normal';
  }

  if (
    exercise.technique_config !== undefined
  ) {
    payload.technique_config =
      exercise.technique_config || {};
  }

  if (exercise.name !== undefined) {
    payload.name = exercise.name.trim();
  }

  if (exercise.sets !== undefined) {
    payload.sets =
      normalizeNullableText(exercise.sets);
  }

  if (exercise.reps !== undefined) {
    payload.reps =
      normalizeNullableText(exercise.reps);
  }

  if (exercise.rest_seconds !== undefined) {
    payload.rest_seconds =
      normalizeNullableNumber(
        exercise.rest_seconds
      );
  }

  if (
    exercise.suggested_weight !== undefined
  ) {
    payload.suggested_weight =
      normalizeNullableText(
        exercise.suggested_weight
      );
  }

  if (exercise.observation !== undefined) {
    payload.observation =
      normalizeNullableText(
        exercise.observation
      );
  }

  if (exercise.tempo !== undefined) {
    payload.tempo =
      normalizeNullableText(exercise.tempo);
  }

  const { data, error } = await supabase
    .from('workout_plan_exercises')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return data as WorkoutPlanExercise;
}

export async function deleteWorkoutExercise(
  id: string
) {
  const { error } = await supabase
    .from('workout_plan_exercises')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function publishWorkoutPlan(
  id: string
) {
  const { data, error } = await supabase
    .from('workout_plans')
    .update({
      status: 'published',
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return data as WorkoutPlan;
}

export async function archiveWorkoutPlan(
  id: string
) {
  const { data, error } = await supabase
    .from('workout_plans')
    .update({
      status: 'archived',
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return data as WorkoutPlan;
}

export async function saveWorkoutLog(
  data: Record<string, unknown>
) {
  const { data: log, error } = await supabase
    .from('workout_logs')
    .insert(data)
    .select('*')
    .single();

  if (error) throw error;

  return log as WorkoutLog;
}

export async function getWorkoutLogsByStudent(
  studentId: string
): Promise<WorkoutLog[]> {
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.error(
        '[WorkoutService] getWorkoutLogsByStudent error:',
        error
      );

      return [];
    }

    return (data || []) as WorkoutLog[];
  } catch (error) {
    console.error(
      '[WorkoutService] getWorkoutLogsByStudent exception:',
      error
    );

    return [];
  }
}

export async function getWorkoutLogsByTrainer(
  trainerId: string
): Promise<WorkoutLog[]> {
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*, students(name)')
      .eq('trainer_id', trainerId)
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.error(
        '[WorkoutService] getWorkoutLogsByTrainer error:',
        error
      );

      return [];
    }

    return (data || []) as WorkoutLog[];
  } catch (error) {
    console.error(
      '[WorkoutService] getWorkoutLogsByTrainer exception:',
      error
    );

    return [];
  }
}