import { supabase } from '../lib/supabase';

export type ProgressPhotoPosition = 'front' | 'side' | 'back';

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
  /** Circunferências (Sprint 9 — colunas novas no Supabase). */
  arm_cm?: number | null;
  chest_cm?: number | null;
  waist_cm?: number | null;
  abdomen_cm?: number | null;
  hips_cm?: number | null;
  thigh_cm?: number | null;
  calf_cm?: number | null;
}

export interface ProgressPhotoRecord {
  id: string;
  student_id: string;
  photo_url: string;
  position: ProgressPhotoPosition | string;
  date: string;
  created_at: string;
}

/** Registro mínimo de progresso (student_progress) para a Central de Alunos. */
export interface StudentProgressRecord {
  id: string;
  student_id: string;
  created_at?: string;
}

export interface SaveProgressPhotoInput {
  studentId: string;
  photoUrl: string;
  position: ProgressPhotoPosition;
  date?: string;
}

function createUuid() {
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let byteIndex = 0;

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    (character) => {
      const random = bytes[byteIndex++] % 16;
      const value =
        character === 'x'
          ? random
          : (random & 0x3) | 0x8;

      return value.toString(16);
    }
  );
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeProgressPhoto(
  photo: any
): ProgressPhotoRecord {
  return {
    id: String(photo?.id || ''),
    student_id: String(photo?.student_id || ''),
    photo_url: String(photo?.photo_url || ''),
    position: String(photo?.position || ''),
    date: String(photo?.date || getTodayDate()),
    created_at: String(
      photo?.created_at || new Date().toISOString()
    ),
  };
}

export async function getStudentMetricsByTrainer(
  trainerId: string
): Promise<StudentMetricRecord[]> {
  try {
    const { data: students, error: studentsError } =
      await supabase
        .from('students')
        .select('id')
        .eq('trainer_id', trainerId);

    if (studentsError) {
      console.error(
        '[ProgressService] students error:',
        studentsError
      );

      throw studentsError;
    }

    const studentIds = (students || [])
      .map((student) => student.id)
      .filter(Boolean);

    if (studentIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('student_metrics')
      .select('*')
      .in('student_id', studentIds)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error(
        '[ProgressService] student_metrics error:',
        error
      );

      throw error;
    }

    return (data || []) as StudentMetricRecord[];
  } catch (error) {
    console.error(
      '[ProgressService] getStudentMetricsByTrainer exception:',
      error
    );

    throw error;
  }
}

/**
 * Busca em lote os registros de progresso (student_progress) dos alunos do
 * trainer. Mesmo padrão do `getStudentMetricsByTrainer`: primeiro resolve os
 * ids dos alunos (students.trainer_id) e depois filtra `student_progress`
 * por student_id — a tabela não possui trainer_id.
 */
export async function getStudentProgressByTrainer(
  trainerId: string
): Promise<StudentProgressRecord[]> {
  try {
    const { data: students, error: studentsError } =
      await supabase
        .from('students')
        .select('id')
        .eq('trainer_id', trainerId);

    if (studentsError) {
      console.error(
        '[ProgressService] student_progress students error:',
        studentsError
      );

      throw studentsError;
    }

    const studentIds = (students || [])
      .map((student) => student.id)
      .filter(Boolean);

    if (studentIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('student_progress')
      .select('id, student_id, created_at')
      .in('student_id', studentIds);

    if (error) {
      console.error(
        '[ProgressService] student_progress error:',
        error
      );

      throw error;
    }

    return (data || []) as StudentProgressRecord[];
  } catch (error) {
    console.error(
      '[ProgressService] getStudentProgressByTrainer exception:',
      error
    );

    throw error;
  }
}

export async function getMetricsByStudent(
  studentId: string
): Promise<StudentMetricRecord[]> {
  try {
    if (!studentId) {
      return [];
    }

    const { data, error } = await supabase
      .from('student_metrics')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error(
        '[ProgressService] getMetricsByStudent error:',
        error
      );

      throw error;
    }

    return (data || []) as StudentMetricRecord[];
  } catch (error) {
    console.error(
      '[ProgressService] getMetricsByStudent exception:',
      error
    );

    throw error;
  }
}

export async function getProgressPhotosByTrainer(
  trainerId: string
): Promise<ProgressPhotoRecord[]> {
  try {
    const { data: students, error: studentsError } =
      await supabase
        .from('students')
        .select('id')
        .eq('trainer_id', trainerId);

    if (studentsError) {
      console.error(
        '[ProgressService] students photos error:',
        studentsError
      );

      throw studentsError;
    }

    const studentIds = (students || [])
      .map((student) => student.id)
      .filter(Boolean);

    if (studentIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('progress_photos')
      .select('*')
      .in('student_id', studentIds)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error(
        '[ProgressService] progress_photos error:',
        error
      );

      throw error;
    }

    return (data || []).map(normalizeProgressPhoto);
  } catch (error) {
    console.error(
      '[ProgressService] getProgressPhotosByTrainer exception:',
      error
    );

    throw error;
  }
}

export async function getProgressPhotosByStudent(
  studentId: string
): Promise<ProgressPhotoRecord[]> {
  try {
    if (!studentId) {
      return [];
    }

    const { data, error } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error(
        '[ProgressService] getProgressPhotosByStudent error:',
        error
      );

      throw error;
    }

    return (data || []).map(normalizeProgressPhoto);
  } catch (error) {
    console.error(
      '[ProgressService] getProgressPhotosByStudent exception:',
      error
    );

    throw error;
  }
}

export async function saveProgressPhoto(
  input: SaveProgressPhotoInput
): Promise<ProgressPhotoRecord> {
  const studentId = String(input.studentId || '').trim();
  const photoUrl = String(input.photoUrl || '').trim();
  const position = input.position;
  const date = input.date || getTodayDate();

  if (!studentId) {
    throw new Error('O aluno não foi informado.');
  }

  if (!photoUrl) {
    throw new Error('A imagem não foi informada.');
  }

  if (!['front', 'side', 'back'].includes(position)) {
    throw new Error('A posição da foto é inválida.');
  }

  /*
   * Se jÃ¡ existir uma foto da mesma posiÃ§Ã£o e mesma data,
   * ela serÃ¡ substituÃ­da. Fotos de outras datas permanecem
   * salvas no histÃ³rico.
   */
  const { error: deleteExistingError } = await supabase
    .from('progress_photos')
    .delete()
    .eq('student_id', studentId)
    .eq('position', position)
    .eq('date', date);

  if (deleteExistingError) {
    console.error(
      '[ProgressService] erro ao substituir foto:',
      deleteExistingError
    );

    throw deleteExistingError;
  }

  const payload = {
    id: createUuid(),
    student_id: studentId,
    photo_url: photoUrl,
    position,
    date,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('progress_photos')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error(
      '[ProgressService] saveProgressPhoto error:',
      error
    );

    throw error;
  }

  return normalizeProgressPhoto(data);
}

export async function deleteProgressPhoto(
  photoId: string
): Promise<void> {
  const cleanPhotoId = String(photoId || '').trim();

  if (!cleanPhotoId) {
    throw new Error('A foto não foi informada.');
  }

  const { error } = await supabase
    .from('progress_photos')
    .delete()
    .eq('id', cleanPhotoId);

  if (error) {
    console.error(
      '[ProgressService] deleteProgressPhoto error:',
      error
    );

    throw error;
  }
}

export async function deleteProgressPhotoByPosition(
  studentId: string,
  position: ProgressPhotoPosition,
  date?: string
): Promise<void> {
  if (!studentId) {
    throw new Error('O aluno não foi informado.');
  }

  let query = supabase
    .from('progress_photos')
    .delete()
    .eq('student_id', studentId)
    .eq('position', position);

  if (date) {
    query = query.eq('date', date);
  }

  const { error } = await query;

  if (error) {
    console.error(
      '[ProgressService] deleteProgressPhotoByPosition error:',
      error
    );

    throw error;
  }
}

/**
 * Cria ou atualiza uma avaliação (student_metrics).
 *
 * Sprint 9 — Opção A: medidas corporais (circunferências) integradas ao
 * modelo de avaliação existente. Se `metricId` for informado, atualiza;
 * caso contrário, insere uma nova avaliação.
 */
export interface SaveStudentMetricInput {
  studentId: string;
  date?: string;
  height?: number | null;
  weight?: number | null;
  body_fat?: number | null;
  target_body_fat?: number | null;
  muscle_mass?: number | null;
  water_intake?: number | null;
  notes?: string | null;
  arm_cm?: number | null;
  chest_cm?: number | null;
  waist_cm?: number | null;
  abdomen_cm?: number | null;
  hips_cm?: number | null;
  thigh_cm?: number | null;
  calf_cm?: number | null;
}

export async function saveStudentMetric(
  input: SaveStudentMetricInput,
  metricId?: string
): Promise<StudentMetricRecord> {
  const studentId = String(input.studentId || '').trim();

  if (!studentId) {
    throw new Error('O aluno não foi informado.');
  }

  const date = input.date || getTodayDate();

  const payload = {
    student_id: studentId,
    date,
    height: input.height ?? null,
    weight: input.weight ?? null,
    body_fat: input.body_fat ?? null,
    target_body_fat: input.target_body_fat ?? null,
    muscle_mass: input.muscle_mass ?? null,
    water_intake: input.water_intake ?? null,
    notes: input.notes ?? null,
    arm_cm: input.arm_cm ?? null,
    chest_cm: input.chest_cm ?? null,
    waist_cm: input.waist_cm ?? null,
    abdomen_cm: input.abdomen_cm ?? null,
    hips_cm: input.hips_cm ?? null,
    thigh_cm: input.thigh_cm ?? null,
    calf_cm: input.calf_cm ?? null,
  };

  const result = metricId
    ? await supabase
        .from('student_metrics')
        .update(payload)
        .eq('id', metricId)
        .select('*')
        .single()
    : await supabase
        .from('student_metrics')
        .insert({ ...payload, id: createUuid() })
        .select('*')
        .single();

  const { data, error, status, statusText } = result;

  if (error) {
    console.error(
      '[ProgressService] saveStudentMetric error:',
      error
    );
    console.error(
      '[ProgressService] saveStudentMetric error JSON:',
      JSON.stringify(error, null, 2)
    );
    console.error(
      '[ProgressService] saveStudentMetric response meta:',
      {
        data,
        status,
        statusText,
      }
    );

    throw error;
  }

  return data as StudentMetricRecord;
}

export async function deleteStudentMetric(
  metricId: string
): Promise<void> {
  const cleanId = String(metricId || '').trim();

  if (!cleanId) {
    throw new Error('A avaliação não foi informada.');
  }

  const { error } = await supabase
    .from('student_metrics')
    .delete()
    .eq('id', cleanId);

  if (error) {
    console.error(
      '[ProgressService] deleteStudentMetric error:',
      error
    );

    throw error;
  }
}

/**
 * Salva as metas do aluno (student_goals). Insere quando não existe
 * registro; atualiza quando existe (upsert pela student_id).
 */
export interface SaveStudentGoalsInput {
  studentId: string;
  objective?: string | null;
  goal_notes?: string | null;
  level?: string | null;
  weekly_frequency?: number | null;
  target_weight?: number | null;
  goal_deadline_weeks?: number | null;
}

export async function saveStudentGoals(
  input: SaveStudentGoalsInput
): Promise<void> {
  const studentId = String(input.studentId || '').trim();

  if (!studentId) {
    throw new Error('O aluno não foi informado.');
  }

  const payload = {
    student_id: studentId,
    objective: input.objective ?? null,
    goal_notes: input.goal_notes ?? null,
    level: input.level ?? null,
    weekly_frequency: input.weekly_frequency ?? null,
    target_weight: input.target_weight ?? null,
    goal_deadline_weeks: input.goal_deadline_weeks ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('student_goals')
    .upsert(payload, {
      onConflict: 'student_id',
    });

  if (error) {
    console.error(
      '[ProgressService] saveStudentGoals error:',
      error
    );

    throw error;
  }
}

