import { supabase } from '../lib/supabase';
import type { WorkoutPlan, WorkoutLog } from '../types/database';
import type { CreateWorkoutData } from '../types/workout';

export async function getWorkoutPlansByStudent(studentId: string): Promise<WorkoutPlan[]> {
  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[WorkoutService] getWorkoutPlansByStudent error:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('[WorkoutService] getWorkoutPlansByStudent exception:', error);
    return [];
  }
}

export async function getWorkoutPlanById(id: string) {
  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*, workout_plan_exercises(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('[WorkoutService] getWorkoutPlanById error:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('[WorkoutService] getWorkoutPlanById exception:', error);
    return null;
  }
}

export async function getWorkoutPlansByTrainer(trainerId: string) {
  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*, students(name)')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[WorkoutService] getWorkoutPlansByTrainer error:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('[WorkoutService] getWorkoutPlansByTrainer exception:', error);
    return [];
  }
}

export async function createWorkoutPlan(trainerId: string, data: CreateWorkoutData) {
  const { data: plan, error } = await supabase
    .from('workout_plans')
    .insert({
      trainer_id: trainerId,
      student_id: data.student_id,
      name: data.name,
      objective: data.objective || null,
      level: data.level || null,
      duration_minutes: data.duration_minutes || null,
    })
    .select()
    .single();
  if (error) throw error;

  if (data.exercises.length > 0) {
    const exercises = data.exercises.map((ex, idx) => ({
      workout_plan_id: plan.id,
      exercise_id: ex.exercise_id || null,
      day_key: ex.day_key,
      order_index: idx,
      name: ex.name,
      sets: ex.sets || null,
      reps: ex.reps || null,
      rest_seconds: ex.rest_seconds || null,
      suggested_weight: ex.suggested_weight || null,
      observation: ex.observation || null,
      tempo: ex.tempo || null,
      image_url: ex.image_url || null,
      video_url: ex.video_url || null,
      muscle_group: ex.muscle_group || null,
      category: ex.category || null,
      equipment: ex.equipment || null,
      difficulty: ex.difficulty || null,
      instructions: ex.instructions || null,
      tips: ex.tips || null,
    }));
    const { error: exErr } = await supabase
      .from('workout_plan_exercises')
      .insert(exercises);
    if (exErr) throw exErr;
  }

  return plan;
}

export async function publishWorkoutPlan(id: string) {
  const { error } = await supabase
    .from('workout_plans')
    .update({ status: 'published' })
    .eq('id', id);
  if (error) throw error;
}

export async function saveWorkoutLog(data: any) {
  const { data: log, error } = await supabase
    .from('workout_logs')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return log;
}

export async function getWorkoutLogsByStudent(studentId: string): Promise<WorkoutLog[]> {
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[WorkoutService] getWorkoutLogsByStudent error:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('[WorkoutService] getWorkoutLogsByStudent exception:', error);
    return [];
  }
}

export async function getWorkoutLogsByTrainer(trainerId: string): Promise<WorkoutLog[]> {
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*, students(name)')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[WorkoutService] getWorkoutLogsByTrainer error:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('[WorkoutService] getWorkoutLogsByTrainer exception:', error);
    return [];
  }
}
