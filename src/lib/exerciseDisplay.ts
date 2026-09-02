/**
 * Funções de formatação e exibição de exercícios.
 * Centralizam a lógica de priorização de idioma e fallback.
 */

import type { Exercise } from '../types/database';

/**
 * Retorna o nome do exercício para exibição visual.
 * Prioriza `name_pt` (português) com fallback para `name` (inglês).
 * 
 * @param exercise Objeto Exercise com campos name e name_pt
 * @returns Nome formatado para exibição, ou 'Exercício' se vazio
 * 
 * @example
 * getExerciseDisplayName({ name: 'bench press', name_pt: 'supino' })
 * // → 'supino'
 * 
 * getExerciseDisplayName({ name: 'bench press', name_pt: null })
 * // → 'bench press'
 */
export function getExerciseDisplayName(
  exercise: Pick<Exercise, 'name' | 'name_pt'> | undefined | null
): string {
  if (!exercise) {
    return 'Exercício';
  }

  const trimmedPt = exercise.name_pt?.trim();
  const trimmedEn = exercise.name?.trim();

  return trimmedPt || trimmedEn || 'Exercício';
}

/**
 * Normaliza dados de exercício para exibição.
 * Converte nomes em camelCase e aplica fallback.
 * 
 * @param ex Objeto Exercise
 * @returns Objeto normalizado com campos de exibição
 */
export function normalizeExerciseForDisplay(ex: Exercise) {
  const r = ex as unknown as Record<string, string>;
  return {
    displayName: getExerciseDisplayName(ex),
    imageUrl: ex.image_url || r.imageUrl || '',
    videoUrl: ex.video_url || r.videoUrl || '',
    muscleGroup: ex.muscle_group || r.muscleGroup || '',
    difficulty: ex.difficulty || r.difficulty || 'Iniciante',
    category: ex.category || r.category || '',
    equipment: ex.equipment || r.equipment || '',
    instructions: ex.instructions || r.instructions || '',
    tips: ex.tips || r.tips || '',
  };
}
