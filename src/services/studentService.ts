import { supabase } from '../lib/supabase';
import type { Student, StudentAccount } from '../types/database';
import type { CreateStudentData } from '../types/student';

type CreateStudentInput = CreateStudentData & {
  birthDate?: string | null;
  bodyFat?: number | string | null;
  bodyfat?: number | string | null;
  targetBodyFat?: number | string | null;
  targetbodyfat?: number | string | null;
  muscleMass?: number | string | null;
  musclemass?: number | string | null;
  waterIntake?: number | string | null;
  waterintake?: number | string | null;
  temporary_password?: string | null;
};

type StudentAccountCacheResult = {
  account: StudentAccount | null;
  student: Student | null;
};

type StudentAccountCacheRecord = StudentAccountCacheResult & {
  savedAt: number;
};

const STUDENT_ACCOUNT_CACHE_TTL = 1000 * 60 * 5;
const STUDENT_ACCOUNT_CACHE_PREFIX = 'vsfit_student_account_cache:';

const studentAccountMemoryCache = new Map<string, StudentAccountCacheRecord>();

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

function getStudentAccountCacheKey(authUserId: string) {
  return `${STUDENT_ACCOUNT_CACHE_PREFIX}${authUserId}`;
}

function isStudentAccountCacheValid(record?: StudentAccountCacheRecord | null) {
  if (!record) return false;

  return Date.now() - Number(record.savedAt || 0) < STUDENT_ACCOUNT_CACHE_TTL;
}

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function readStudentAccountCache(authUserId: string): StudentAccountCacheResult | null {
  const memoryRecord = studentAccountMemoryCache.get(authUserId);

  if (isStudentAccountCacheValid(memoryRecord)) {
    return {
      account: memoryRecord?.account || null,
      student: memoryRecord?.student || null,
    };
  }

  if (!canUseSessionStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(getStudentAccountCacheKey(authUserId));

    if (!raw) return null;

    const record = JSON.parse(raw) as StudentAccountCacheRecord;

    if (!isStudentAccountCacheValid(record)) {
      window.sessionStorage.removeItem(getStudentAccountCacheKey(authUserId));
      return null;
    }

    studentAccountMemoryCache.set(authUserId, record);

    return {
      account: record.account || null,
      student: record.student || null,
    };
  } catch {
    return null;
  }
}

function writeStudentAccountCache(authUserId: string, value: StudentAccountCacheResult) {
  const record: StudentAccountCacheRecord = {
    account: value.account || null,
    student: value.student || null,
    savedAt: Date.now(),
  };

  studentAccountMemoryCache.set(authUserId, record);

  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(
      getStudentAccountCacheKey(authUserId),
      JSON.stringify(record)
    );
  } catch {
    // Ignora erro de storage.
  }
}

export function clearStudentAccountCache(authUserId?: string) {
  if (authUserId) {
    studentAccountMemoryCache.delete(authUserId);

    if (canUseSessionStorage()) {
      try {
        window.sessionStorage.removeItem(getStudentAccountCacheKey(authUserId));
      } catch {
        // Ignora erro de storage.
      }
    }

    return;
  }

  studentAccountMemoryCache.clear();

  if (!canUseSessionStorage()) return;

  try {
    Object.keys(window.sessionStorage).forEach((key) => {
      if (key.startsWith(STUDENT_ACCOUNT_CACHE_PREFIX)) {
        window.sessionStorage.removeItem(key);
      }
    });
  } catch {
    // Ignora erro de storage.
  }
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

export async function createStudent(trainerId: string, data: CreateStudentInput) {
  const input = data;

  const weight = toNullableNumber(input.weight);
  const height = toNullableNumber(input.height);
  const bodyFat = toNullableNumber(input.bodyFat ?? input.bodyfat);
  const targetBodyFat = toNullableNumber(input.targetBodyFat ?? input.targetbodyfat);
  const muscleMass = toNullableNumber(input.muscleMass ?? input.musclemass);
  const waterIntake = toNullableNumber(input.waterIntake ?? input.waterintake);
  const targetWeight = toNullableNumber(input.targetWeight);
  let temporaryPassword = '';

  const { data: student, error } = await supabase
    .from('students')
    .insert({
      trainer_id: trainerId,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      birth_date: input.birthDate || null,
      status: 'active',
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

  const hasMetricData =
    weight !== null ||
    height !== null ||
    bodyFat !== null ||
    targetBodyFat !== null ||
    muscleMass !== null ||
    waterIntake !== null;

  if (hasMetricData) {
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
  }

  if (input.createAppAccess) {
    try {
      const { data, error: funcError } = await supabase.functions.invoke('create-student-access', {
        body: {
          studentId: student.id,
          email: input.email,
          name: input.name,
        },
      });

      if (funcError) throw funcError;
      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao criar acesso do aluno via Edge Function');
      }

      temporaryPassword = data.credentials.password;
    } catch (e) {
      console.error('[StudentService] create-student-access error:', e);
      throw e;
    }
  }

  clearStudentAccountCache();

  return {
    ...student,
    temporary_password: temporaryPassword || null,
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

  clearStudentAccountCache();

  return mapStudentFromDb(student);
}

export async function getStudentByAuthUser(
  authUserId: string,
  options: { force?: boolean } = {}
): Promise<Student | null> {
  const result = await getStudentAccountByAuthUser(authUserId, options);
  return result.student || null;
}

export async function getStudentAccountByAuthUser(
  authUserId: string,
  options: { force?: boolean } = {}
): Promise<{ account: StudentAccount | null; student: Student | null }> {
  try {
    if (!authUserId) {
      return { account: null, student: null };
    }

    if (!options.force) {
      const cached = readStudentAccountCache(authUserId);

      if (cached?.student?.id) {
        return cached;
      }
    }

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
    }

    if (account?.student) {
      const student = Array.isArray(account.student) ? account.student[0] : account.student;

      const result = {
        account: account as StudentAccount,
        student: student ? mapStudentFromDb(student) : null,
      };

      writeStudentAccountCache(authUserId, result);

      return result;
    }

    const { data: legacyStudent, error: legacyError } = await supabase
      .from('students')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (legacyError) {
      console.error(
        '[StudentService] getStudentAccountByAuthUser legacy student error:',
        legacyError
      );
    }

    if (legacyStudent?.id) {
      let linkedAccount: StudentAccount | null = null;

      try {
        const { data: accountByStudent } = await supabase
          .from('student_accounts')
          .select('*')
          .eq('student_id', legacyStudent.id)
          .maybeSingle();

        linkedAccount = (accountByStudent as StudentAccount) || null;
      } catch {
        linkedAccount = null;
      }

      const result = {
        account: linkedAccount,
        student: mapStudentFromDb(legacyStudent),
      };

      writeStudentAccountCache(authUserId, result);

      return result;
    }

    const emptyResult = { account: null, student: null };

    writeStudentAccountCache(authUserId, emptyResult);

    return emptyResult;
  } catch (error) {
    console.error('[StudentService] getStudentAccountByAuthUser exception:', error);
    return { account: null, student: null };
  }
}