import { supabase } from '../lib/supabase';
import type { Exercise } from '../types/database';

const BUCKET = 'exercicios';

let exercisesCache: Exercise[] | null = null;
let exercisesCacheTimestamp = 0;
const EXERCISES_CACHE_TTL = 5 * 60 * 1000;

export function invalidateExercisesCache() {
  exercisesCache = null;
  exercisesCacheTimestamp = 0;
}

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  antebraco: 'Antebraço',
  biceps: 'Bíceps',
  calistenia: 'Calistenia',
  cardio: 'Cardio',
  costas: 'Costas',
  crossfit: 'Crossfit',
  eretorLombar: 'Eretor Lombar',
  funcional: 'Funcional',
  gluteos: 'Glúteos',
  mobilidade: 'Mobilidade',
  ombros: 'Ombros',
  panturrilha: 'Panturrilha',
  peitoral: 'Peitoral',
  pernas: 'Pernas',
  trapezio: 'Trapézio',
  triceps: 'Tríceps',
};

const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

function isVideo(fileName: string): boolean {
  return VIDEO_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(`.${ext}`));
}

function isImage(fileName: string): boolean {
  return IMAGE_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(`.${ext}`));
}

function getBaseNameFromStoragePath(path: string): {
  folder: string;
  fileName: string;
  baseName: string;
  extension: string;
} {
  const parts = path.split('/');
  const folder = parts[0];
  const fileName = parts.slice(1).join('/');

  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  let baseName = fileName
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .trim();

  baseName = baseName
    .replace(/_fixed$/i, '')
    .replace(/-fixed$/i, '')
    .replace(/_watermarked$/i, '')
    .replace(/-watermarked$/i, '')
    .replace(/^video-watermarked-/i, '')
    .replace(/^video-watermarked_/i, '')
    .replace(/video-watermarked-/gi, '')
    .replace(/video-watermarked_/gi, '')
    .replace(/_+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return { folder, fileName, baseName, extension };
}

function formatExerciseName(baseName: string): string {
  const accents: Record<string, string> = {
    flexao: 'Flexão',
    extensao: 'Extensão',
    rotacao: 'Rotação',
    elevacao: 'Elevação',
    antebraco: 'Antebraço',
    biceps: 'Bíceps',
    triceps: 'Tríceps',
    gluteos: 'Glúteos',
    trapezio: 'Trapézio',
    maquina: 'Máquina',
    abdominal: 'Abdominal',
  };

  const smallWords = ['de', 'da', 'do', 'das', 'dos', 'com', 'no', 'na', 'em', 'e', 'ao'];

  return baseName
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => {
      const lower = word.toLowerCase();
      if (smallWords.includes(lower)) return lower;
      if (accents[lower]) return accents[lower];
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export function getStoragePublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export interface ScannedExercise {
  storage_key: string;
  name: string;
  muscle_group: string;
  category: string;
  equipment: string;
  difficulty: string;
  instructions: string;
  tips: string;
  image_url: string;
  video_url: string;
  is_public: boolean;
}

function scannedToExercise(ex: ScannedExercise, idx: number): Exercise {
  return {
    id: `scan-${idx}`,
    trainer_id: null,
    name: ex.name,
    muscle_group: ex.muscle_group,
    category: ex.category,
    equipment: ex.equipment || null,
    difficulty: ex.difficulty,
    instructions: ex.instructions || null,
    tips: ex.tips || null,
    image_url: ex.image_url || null,
    video_url: ex.video_url || null,
    is_public: ex.is_public,
    created_at: '',
    updated_at: '',
  };
}

async function fetchAllExerciseStorageFiles(): Promise<Array<{ name: string }>> {
  const pageSize = 1000;
  let from = 0;
  let allFiles: Array<{ name: string }> = [];

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .rpc('get_exercise_storage_files')
      .range(from, to);

    if (error) {
      console.error('[EXERCISES RPC PAGE] error:', error);
      break;
    }

    const page = (data as { name: string }[]) || [];

    console.log('[EXERCISES RPC PAGE]', { from, to, count: page.length });

    allFiles = [...allFiles, ...page];

    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  console.log('[EXERCISES RPC] total files paginated:', allFiles.length);

  return allFiles;
}

export async function scanStorageExercises(): Promise<ScannedExercise[]> {
  try {
    const files = await fetchAllExerciseStorageFiles();

    const totalFiles = files.length;
    console.log('[EXERCISES SCAN] total files:', totalFiles);

    if (totalFiles === 0) {
      console.warn('[EXERCISES RPC] no files returned');
      return [];
    }

    const grouped = new Map<string, { image: string | null; video: string | null; folder: string }>();

    for (const item of files) {
      const { folder, fileName, baseName } = getBaseNameFromStoragePath(item.name);
      if (!fileName) continue;

      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(item.name).data.publicUrl;
      const key = `${folder}/${baseName}`;

      if (!grouped.has(key)) {
        grouped.set(key, { image: null, video: null, folder });
      }

      const entry = grouped.get(key)!;
      if (isVideo(fileName)) {
        entry.video = publicUrl;
      } else if (isImage(fileName)) {
        entry.image = publicUrl;
      }
    }

    console.log('[EXERCISES SCAN] grouped keys:', grouped.size);

    const exercises: ScannedExercise[] = [];
    for (const [key, media] of grouped) {
      const [folder, baseName] = key.split('/');
      const name = formatExerciseName(baseName);
      exercises.push({
        storage_key: key,
        name,
        muscle_group: folder,
        category: MUSCLE_GROUP_LABELS[folder] || folder,
        equipment: '',
        difficulty: 'Iniciante',
        instructions: '',
        tips: '',
        image_url: media.image || '',
        video_url: media.video || '',
        is_public: true,
      });
    }

    const withVideo = exercises.filter((e) => e.video_url).length;
    const withImage = exercises.filter((e) => e.image_url).length;
    const onlyVideo = exercises.filter((e) => e.video_url && !e.image_url).length;
    const onlyImage = exercises.filter((e) => e.image_url && !e.video_url).length;

    console.log('[EXERCISES SCAN] exercises:', exercises.length);
    console.log('[EXERCISES SCAN] with video:', withVideo);
    console.log('[EXERCISES SCAN] with image:', withImage);
    console.log('[EXERCISES SCAN] only video:', onlyVideo);
    console.log('[EXERCISES SCAN] only image:', onlyImage);

    return exercises;
  } catch (error) {
    console.error('[EXERCISES SCAN] exception:', error);
    return [];
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function syncStorageExercises(trainerId?: string): Promise<{
  scanned: number;
  upserted: number;
  total: number;
  withVideo: number;
  withImage: number;
}> {
  const scanned = await scanStorageExercises();
  if (scanned.length === 0) {
    return { scanned: 0, upserted: 0, total: 0, withVideo: 0, withImage: 0 };
  }

  if (scanned.length < 750) {
    console.warn('[EXERCISES SYNC] scanned < 750 (' + scanned.length + '), cancelando resync para nao apagar dados existentes');
    return { scanned: scanned.length, upserted: 0, total: scanned.length, withVideo: 0, withImage: 0 };
  }

  console.log('[EXERCISES SYNC] deleting old public exercises...');
  await supabase.from('exercises').delete().eq('is_public', true);

  const chunks = chunkArray(scanned, 100);
  let totalUpserted = 0;

  for (const chunk of chunks) {
    const rows = chunk.map((ex) => ({
      storage_key: ex.storage_key,
      name: ex.name,
      muscle_group: ex.muscle_group,
      category: ex.category,
      equipment: ex.equipment || null,
      difficulty: ex.difficulty || 'Iniciante',
      instructions: ex.instructions || null,
      tips: ex.tips || null,
      image_url: ex.image_url || null,
      video_url: ex.video_url || null,
      is_public: true,
      trainer_id: trainerId || null,
    }));

    const { error } = await supabase
      .from('exercises')
      .upsert(rows, { onConflict: 'storage_key' });

    if (error) {
      console.error('[EXERCISES UPSERT CHUNK]', error);
    } else {
      totalUpserted += chunk.length;
    }
  }

  const withVideo = scanned.filter((e) => e.video_url).length;
  const withImage = scanned.filter((e) => e.image_url).length;

  console.log('[EXERCISES SYNC] upserted:', totalUpserted);
  invalidateExercisesCache();
  return { scanned: scanned.length, upserted: totalUpserted, total: scanned.length, withVideo, withImage };
}

export async function resyncAllStorageExercises(trainerId?: string): Promise<{
  scanned: number;
  upserted: number;
  total: number;
  withVideo: number;
  withImage: number;
}> {
  console.log('[EXERCISES RESYNC] deleting all public exercises...');
  await supabase.from('exercises').delete().eq('is_public', true);
  console.log('[EXERCISES RESYNC] deleted, re-syncing...');
  return syncStorageExercises(trainerId);
}

export async function getExercises(): Promise<Exercise[]> {
  const now = Date.now();
  if (exercisesCache && now - exercisesCacheTimestamp < EXERCISES_CACHE_TTL) {
    console.log('[EXERCISES DB] returning cached:', exercisesCache.length);
    return exercisesCache;
  }

  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('muscle_group', { ascending: true })
      .order('name', { ascending: true });
    console.log('[EXERCISES DB] total:', data?.length || 0);
    if (error) {
      console.error('[ExerciseService] getExercises error:', error);
      const scanned = await scanStorageExercises();
      return scanned.map(scannedToExercise);
    }
    if (data && data.length > 0) {
      exercisesCache = data;
      exercisesCacheTimestamp = now;
      return data;
    }
    console.log('[ExerciseService] DB table empty, scanning storage');
    const scanned = await scanStorageExercises();
    return scanned.map(scannedToExercise);
  } catch (error) {
    console.error('[ExerciseService] getExercises exception:', error);
    const scanned = await scanStorageExercises();
    return scanned.map(scannedToExercise);
  }
}

export async function getExercisesByTrainer(trainerId: string): Promise<Exercise[]> {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .or(`trainer_id.eq.${trainerId},is_public.eq.true`)
      .order('muscle_group', { ascending: true })
      .order('name', { ascending: true });
    console.log('[EXERCISES DB by trainer] total:', data?.length || 0);
    if (error) {
      console.error('[ExerciseService] getExercisesByTrainer error:', error);
      const scanned = await scanStorageExercises();
      return scanned.map(scannedToExercise);
    }
    if (data && data.length > 0) return data;
    console.log('[ExerciseService] getExercisesByTrainer empty, scanning storage');
    const scanned = await scanStorageExercises();
    return scanned.map(scannedToExercise);
  } catch (error) {
    console.error('[ExerciseService] getExercisesByTrainer exception:', error);
    const scanned = await scanStorageExercises();
    return scanned.map(scannedToExercise);
  }
}

export async function getPublicExercises(): Promise<Exercise[]> {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('is_public', true)
      .order('name');
    if (error) {
      console.error('[ExerciseService] getPublicExercises error:', error);
      const scanned = await scanStorageExercises();
      return scanned.map(scannedToExercise);
    }
    if (data && data.length > 0) return data;
    const scanned = await scanStorageExercises();
    return scanned.map(scannedToExercise);
  } catch (error) {
    console.error('[ExerciseService] getPublicExercises exception:', error);
    const scanned = await scanStorageExercises();
    return scanned.map(scannedToExercise);
  }
}

export async function createExercise(trainerId: string, data: Partial<Exercise>): Promise<Exercise> {
  const { data: exercise, error } = await supabase
    .from('exercises')
    .insert({ ...data, trainer_id: trainerId })
    .select()
    .maybeSingle();
  if (error) throw error;
  invalidateExercisesCache();
  return exercise ?? (() => { throw new Error('Falha ao criar exercício'); })();
}

export async function updateExercise(id: string, data: Partial<Exercise>): Promise<Exercise> {
  const { data: exercise, error } = await supabase
    .from('exercises')
    .update(data)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  invalidateExercisesCache();
  return exercise ?? (() => { throw new Error('Falha ao atualizar exercício'); })();
}

export async function deleteExercise(id: string) {
  const { error } = await supabase
    .from('exercises')
    .delete()
    .eq('id', id);
  if (error) throw error;
  invalidateExercisesCache();
}

export { MUSCLE_GROUP_LABELS };
