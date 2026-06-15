import { supabase } from '../lib/supabase';
import type { Student, StudentAccount } from '../types/database';
import type { CreateStudentData } from '../types/student';
import { generatePassword } from '../lib/utils';

type CreateStudentInput = CreateStudentData & {
  bodyFat?: number | string | null;
  bodyfat?: number | string | null;
  targetBodyFat?: number | string | null;
  targetbodyfat?: number | string | null;
  muscleMass?: number | string | null;
  musclemass?: number | string | null;
  waterIntake?: number | string | null;
  waterintake?: number | string | null;
};

function mapStudentFromDb(db: any): Student {
  return db;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;

  const parsed = Number(String(value).replace(',', '.'));

  return Number.isFinite(parsed) ? parsed : null;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function getStudentsByTrainer(trainerId: string): Promise<Student[]> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        student_accounts(*)
      `)
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[StudentService] getStudentsByTrainer error:', error);
      return [];
    }

    return (data || []).map(mapStudentFromDb);
  } catch (error) {
    console.error('[StudentService] getStudentsByTrainer exception:', error);
    return [];
  }
}

export async function getStudentById(id: string): Promise<Student | null> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        student_accounts(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[StudentService] getStudentById error:', error);
      return null;
    }

    return data ? mapStudentFromDb(data) : null;
  } catch (error) {
    console.error('[StudentService] getStudentById exception:', error);
    return null;
  }
}

export async function createStudent(trainerId: string, data: CreateStudentData) {
  const input = data as CreateStudentInput;

  const weight = toNullableNumber(input.weight);
  const height = toNullableNumber(input.height);
  const bodyFat = toNullableNumber(input.bodyFat ?? input.bodyfat);
  const targetBodyFat = toNullableNumber(input.targetBodyFat ?? input.targetbodyfat);
  const muscleMass = toNullableNumber(input.muscleMass ?? input.musclemass);
  const waterIntake = toNullableNumber(input.waterIntake ?? input.waterintake);
  const targetWeight = toNullableNumber(input.targetWeight);

  const { data: student, error } = await supabase
    .from('students')
    .insert({
      trainer_id: trainerId,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      birth_date: input.birthDate || null,
    })
    .select()
    .single();

  if (error) throw error;

  const { error: goalError } = await supabase.from('student_goals').insert({
    student_id: student.id,
    objective: input.objective || null,
    level: input.level || 'Iniciante',
    weekly_frequency: input.weeklyFrequency || null,
    target_weight: targetWeight,
  });

  if (goalError) {
    console.error('[StudentService] createStudent goal error:', goalError);
  }

  const { error: metricError } = await supabase.from('student_metrics').insert({
    student_id: student.id,
    date: getTodayDate(),
    weight,
    height,
    body_fat: bodyFat,
    target_body_fat: targetBodyFat,
    muscle_mass: muscleMass,
    water_intake: waterIntake,
  });

  if (metricError) {
    console.error('[StudentService] createStudent metric error:', metricError);
  }

  if (input.createAppAccess) {
    const tempPassword = generatePassword();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: tempPassword,
    });

    if (!authError && authData.user) {
      await supabase.from('user_profiles').insert({
        id: authData.user.id,
        email: input.email,
        name: input.name,
        role: 'student',
      });

      await supabase.from('student_accounts').insert({
        student_id: student.id,
        auth_user_id: authData.user.id,
        email: input.email,
        temporary_password: tempPassword,
      });

      await supabase
        .from('students')
        .update({
          auth_user_id: authData.user.id,
          app_access_status: 'invited',
          login_enabled: true,
        })
        .eq('id', student.id);
    }
  }

  return student;
}

export async function updateStudent(id: string, data: any) {
  const { data: student, error } = await supabase
    .from('students')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return mapStudentFromDb(student);
}

export async function getStudentByAuthUser(authUserId: string): Promise<Student | null> {
  try {
    const { data: account, error: accountError } = await supabase
      .from('student_accounts')
      .select(`
        *,
        student:students(*)
      `)
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (accountError) {
      console.error('[StudentService] getStudentByAuthUser account error:', accountError);
    }

    if (account?.student) {
      const student = Array.isArray(account.student) ? account.student[0] : account.student;

      if (student?.id) return student;
    }

    const { data: legacyStudent, error: legacyError } = await supabase
      .from('students')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (legacyError) {
      console.error('[StudentService] getStudentByAuthUser legacy error:', legacyError);
    }

    if (legacyStudent) return legacyStudent;

    return null;
  } catch (error) {
    console.error('[StudentService] getStudentByAuthUser exception:', error);
    return null;
  }
}

export async function getStudentAccountByAuthUser(
  authUserId: string
): Promise<{ account: StudentAccount | null; student: Student | null }> {
  try {
    const { data: account, error } = await supabase
      .from('student_accounts')
      .select(`
        *,
        student:students(*)
      `)
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (error) {
      console.error('[StudentService] getStudentAccountByAuthUser error:', error);
      return { account: null, student: null };
    }

    if (!account) return { account: null, student: null };

    const student = Array.isArray(account.student) ? account.student[0] : account.student;

    return { account, student: student || null };
  } catch (error) {
    console.error('[StudentService] getStudentAccountByAuthUser exception:', error);
    return { account: null, student: null };
  }
}