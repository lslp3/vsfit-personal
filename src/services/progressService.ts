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
}

export interface ProgressPhotoRecord {
  id: string;
  student_id: string;
  photo_url: string;
  position: ProgressPhotoPosition | string;
  date: string;
  created_at: string;
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

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    (character) => {
      const random = Math.floor(Math.random() * 16);
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

      return [];
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

      return [];
    }

    return (data || []) as StudentMetricRecord[];
  } catch (error) {
    console.error(
      '[ProgressService] getStudentMetricsByTrainer exception:',
      error
    );

    return [];
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

      return [];
    }

    return (data || []) as StudentMetricRecord[];
  } catch (error) {
    console.error(
      '[ProgressService] getMetricsByStudent exception:',
      error
    );

    return [];
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

      return [];
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

      return [];
    }

    return (data || []).map(normalizeProgressPhoto);
  } catch (error) {
    console.error(
      '[ProgressService] getProgressPhotosByTrainer exception:',
      error
    );

    return [];
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

      return [];
    }

    return (data || []).map(normalizeProgressPhoto);
  } catch (error) {
    console.error(
      '[ProgressService] getProgressPhotosByStudent exception:',
      error
    );

    return [];
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
    throw new Error('O aluno nÃ£o foi informado.');
  }

  if (!photoUrl) {
    throw new Error('A imagem nÃ£o foi informada.');
  }

  if (!['front', 'side', 'back'].includes(position)) {
    throw new Error('A posiÃ§Ã£o da foto Ã© invÃ¡lida.');
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
    throw new Error('A foto nÃ£o foi informada.');
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
    throw new Error('O aluno nÃ£o foi informado.');
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

