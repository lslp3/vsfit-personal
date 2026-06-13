import { supabase } from '../lib/supabase';

export interface StudentMetricRecord {
  id: string;
  student_id: string;
  date: string;
  height: number | null;
  weight: number | null;
  body_fat: number | null;
  target_body_fat: number | null;
  muscle_mass: number | null;
  water_intake: number | null;
  notes: string | null;
  created_at: string;
}

export interface ProgressPhotoRecord {
  id: string;
  student_id: string;
  trainer_id?: string | null;
  photo_url: string | null;
  url?: string | null;
  type?: string | null;
  photo_type?: string | null;
  date?: string | null;
  created_at?: string | null;
}

export async function getStudentMetricsByTrainer(trainerId: string): Promise<StudentMetricRecord[]> {
  try {
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('trainer_id', trainerId);

    if (studentsError) {
      console.error('[ProgressService] students error:', studentsError);
      return [];
    }

    const studentIds = (students || []).map((student) => student.id);

    if (studentIds.length === 0) return [];

    const { data, error } = await supabase
      .from('student_metrics')
      .select('*')
      .in('student_id', studentIds)
      .order('date', { ascending: false });

    if (error) {
      console.error('[ProgressService] student_metrics error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[ProgressService] getStudentMetricsByTrainer exception:', error);
    return [];
  }
}

export async function getProgressPhotosByTrainer(trainerId: string): Promise<ProgressPhotoRecord[]> {
  try {
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('trainer_id', trainerId);

    if (studentsError) {
      console.warn('[ProgressService] students photos warning:', studentsError);
      return [];
    }

    const studentIds = (students || []).map((student) => student.id);

    if (studentIds.length === 0) return [];

    const { data, error } = await supabase
      .from('progress_photos')
      .select('*')
      .in('student_id', studentIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[ProgressService] progress_photos not available:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.warn('[ProgressService] getProgressPhotosByTrainer exception:', error);
    return [];
  }
}

export async function getMetricsByStudent(studentId: string): Promise<StudentMetricRecord[]> {
  try {
    const { data, error } = await supabase
      .from('student_metrics')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: false });

    if (error) {
      console.error('[ProgressService] getMetricsByStudent error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[ProgressService] getMetricsByStudent exception:', error);
    return [];
  }
}