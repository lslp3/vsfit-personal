import { supabase } from '../lib/supabase';
import type { Student, StudentAccount } from '../types/database';
import type { CreateStudentData } from '../types/student';

function mapStudentFromDb(db: any): Student {
  return db;
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

async function createStudentAccess(params: {
  studentId: string;
  email: string;
  name: string;
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error('Sessão do personal não encontrada. Faça login novamente.');
  }

  const { data, error } = await supabase.functions.invoke('create-student-access', {
    body: {
      studentId: params.studentId,
      email: params.email,
      name: params.name,
    },
  });

  if (error) {
    console.error('[StudentService] createStudentAccess function error:', error);
    throw new Error(error.message || 'Erro ao criar acesso do aluno.');
  }

  if (!data?.success) {
    console.error('[StudentService] createStudentAccess response error:', data);
    throw new Error(data?.error || 'Erro ao criar acesso do aluno.');
  }

  return data;
}

export async function createStudent(trainerId: string, data: CreateStudentData) {
  const normalizedEmail = String(data.email || '').trim().toLowerCase();
  const normalizedName = String(data.name || '').trim();

  if (!trainerId) {
    throw new Error('Personal não encontrado.');
  }

  if (!normalizedName) {
    throw new Error('Nome do aluno é obrigatório.');
  }

  if (!normalizedEmail) {
    throw new Error('Email do aluno é obrigatório.');
  }

  const { data: student, error } = await supabase
    .from('students')
    .insert({
      trainer_id: trainerId,
      name: normalizedName,
      email: normalizedEmail,
      phone: data.phone || null,
      birth_date: data.birthDate || null,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('[StudentService] createStudent students error:', error);
    throw error;
  }

  const { error: goalError } = await supabase.from('student_goals').insert({
    student_id: student.id,
    objective: data.objective || null,
    level: data.level || 'Iniciante',
    weekly_frequency: data.weeklyFrequency || null,
    target_weight: data.targetWeight || null,
  });

  if (goalError) {
    console.warn('[StudentService] createStudent student_goals warning:', goalError);
  }

  const { error: metricsError } = await supabase.from('student_metrics').insert({
    student_id: student.id,
    weight: data.weight || null,
    height: data.height || null,
  });

  if (metricsError) {
    console.warn('[StudentService] createStudent student_metrics warning:', metricsError);
  }

  if (data.createAppAccess) {
    const accessResult = await createStudentAccess({
      studentId: student.id,
      email: normalizedEmail,
      name: normalizedName,
    });

    return {
      student: mapStudentFromDb(accessResult.student || student),
      credentials: {
        email: accessResult.credentials?.email || normalizedEmail,
        password: accessResult.credentials?.password || '',
        temporary_password:
          accessResult.credentials?.temporary_password ||
          accessResult.credentials?.password ||
          '',
      },
      password: accessResult.credentials?.password || '',
      temporary_password:
        accessResult.credentials?.temporary_password ||
        accessResult.credentials?.password ||
        '',
      auth_user_id: accessResult.auth_user_id || '',
    };
  }

  const { data: createdStudentWithRelations } = await supabase
    .from('students')
    .select(`
      *,
      student_accounts(*)
    `)
    .eq('id', student.id)
    .maybeSingle();

  return {
    student: mapStudentFromDb(createdStudentWithRelations || student),
    credentials: null,
    password: '',
    temporary_password: '',
    auth_user_id: '',
  };
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