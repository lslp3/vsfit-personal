import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Dumbbell, Plus, Search } from 'lucide-react';

import { ExerciseInfoPanel } from '../workout-execution/ExerciseInfoPanel';
import { ExerciseMediaCard } from '../workout-execution/ExerciseMediaCard';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { cn } from '../../lib/utils';
import type { Exercise } from '../../types/database';
import {
  DEFAULT_EXERCISE_CONFIG,
  ExerciseConfigFields,
  type ExerciseConfigValues,
} from './ExerciseConfigFields';

const LEVELS = [
  'Iniciante',
  'Intermediário',
  'Avançado',
];

export interface NewExerciseData {
  name: string;
  muscleGroup: string;
  category: string;
  equipment: string;
  difficulty: string;
  instructions: string;
}

type ExercisePickerModalProps = {
  open: boolean;
  onClose: () => void;
  exercises: Exercise[];
  loading: boolean;
  dayName: string;
  creating: boolean;
  onCreateExercise: (
    data: NewExerciseData
  ) => Promise<boolean>;
  onAdd: (
    exercise: Exercise,
    values: ExerciseConfigValues
  ) => void;
};

/**
 * Modal premium de exercício do Personal (Etapa — Modal Premium).
 *
 * Fase 1: busca + cards com preview de mídia e informações básicas.
 * Fase 2: ao selecionar, configuração completa do exercício (séries,
 * repetições, descanso, carga, tempo, observação e técnica) antes de
 * adicionar ao dia. "Criar exercício novo" migrado para dentro do modal.
 */
export function ExercisePickerModal({
  open,
  onClose,
  exercises,
  loading,
  dayName,
  creating,
  onCreateExercise,
  onAdd,
}: ExercisePickerModalProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] =
    useState<Exercise | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [config, setConfig] =
    useState<ExerciseConfigValues>(
      DEFAULT_EXERCISE_CONFIG
    );
  const [newEx, setNewEx] = useState({
    name: '',
    muscleGroup: '',
    category: '',
    equipment: '',
    difficulty: '',
    instructions: '',
  });

  useEffect(() => {
    if (!open) return;

    setSearch('');
    setSelected(null);
    setShowNew(false);
    setConfig(DEFAULT_EXERCISE_CONFIG);
    setNewEx({
      name: '',
      muscleGroup: '',
      category: '',
      equipment: '',
      difficulty: '',
      instructions: '',
    });
  }, [open]);

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return exercises;

    return exercises.filter((exercise) => {
      const name = String(
        exercise.name || ''
      ).toLowerCase();
      const category = String(
        exercise.category || ''
      ).toLowerCase();
      const muscle = String(
        exercise.muscle_group || ''
      ).toLowerCase();

      return (
        name.includes(query) ||
        category.includes(query) ||
        muscle.includes(query)
      );
    });
  }, [exercises, search]);

  function handleSelect(
    exercise: Exercise
  ) {
    setSelected(exercise);
    setConfig(DEFAULT_EXERCISE_CONFIG);
  }

  function handleAdd() {
    if (!selected) return;

    onAdd(selected, config);
    onClose();
  }

  async function handleCreate() {
    if (!newEx.name.trim()) return;

    const created = await onCreateExercise({
      name: newEx.name,
      muscleGroup: newEx.muscleGroup,
      category: newEx.category,
      equipment: newEx.equipment,
      difficulty: newEx.difficulty,
      instructions: newEx.instructions,
    });

    if (created) {
      onClose();
    }
  }

  function setNewExField(
    field: keyof typeof newEx,
    next: string
  ) {
    setNewEx((previous) => ({
      ...previous,
      [field]: next,
    }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        selected
          ? selected.name
          : showNew
            ? 'Criar exercício novo'
            : `Adicionar em ${dayName}`
      }
    >
      {selected ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />

            Voltar para a lista
          </button>

          <ExerciseMediaCard
            videoUrl={selected.video_url}
            imageUrl={selected.image_url}
            exerciseName={selected.name}
          />

          <ExerciseInfoPanel
            exerciseName={selected.name}
            muscleGroup={
              selected.muscle_group
            }
            equipment={
              selected.equipment
            }
            difficulty={
              selected.difficulty
            }
          />

          {selected.instructions && (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-left">
              <p className="text-[10px] font-black uppercase text-[#ff2a32]">
                Como executar
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                {selected.instructions}
              </p>
            </div>
          )}

          <div className="border-t border-white/10 pt-3">
            <ExerciseConfigFields
              value={config}
              onChange={setConfig}
            />
          </div>

          <Button
            onClick={handleAdd}
            className="w-full"
          >
            Adicionar ao treino
          </Button>
        </div>
      ) : showNew ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowNew(false)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />

            Voltar para a lista
          </button>

          <Input
            label="Nome"
            value={newEx.name}
            onChange={(event) =>
              setNewExField(
                'name',
                event.target.value
              )
            }
          />

          <Input
            label="Grupo muscular"
            value={newEx.muscleGroup}
            onChange={(event) =>
              setNewExField(
                'muscleGroup',
                event.target.value
              )
            }
          />

          <Input
            label="Categoria"
            value={newEx.category}
            onChange={(event) =>
              setNewExField(
                'category',
                event.target.value
              )
            }
          />

          <Input
            label="Equipamento"
            value={newEx.equipment}
            onChange={(event) =>
              setNewExField(
                'equipment',
                event.target.value
              )
            }
          />

          <div>
            <p className="mb-2 text-[10px] font-black uppercase text-zinc-500">
              Dificuldade
            </p>

            <div className="grid grid-cols-3 gap-2">
              {LEVELS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    setNewExField(
                      'difficulty',
                      option
                    )
                  }
                  className={cn(
                    'h-10 rounded-xl border text-[10px] font-black',
                    newEx.difficulty ===
                      option
                      ? 'border-[#ff2a32]/40 bg-[#ff2a32]/15 text-[#ff2a32]'
                      : 'border-white/10 text-zinc-500'
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Instruções"
            value={newEx.instructions}
            onChange={(event) =>
              setNewExField(
                'instructions',
                event.target.value
              )
            }
          />

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                setShowNew(false)
              }
            >
              Cancelar
            </Button>

            <Button
              onClick={() =>
                void handleCreate()
              }
              loading={creating}
              disabled={!newEx.name.trim()}
            >
              Criar exercício
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Buscar exercício..."
              className="input-field pl-10"
            />
          </div>

          {loading ? (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {Array.from({ length: 5 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                  >
                    <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-white/10" />

                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />

                      <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {filteredExercises.map(
                (exercise) => {
                  const imageUrl =
                    exercise.image_url;
                  const category =
                    exercise.category ||
                    exercise.muscle_group ||
                    'Exercício';

                  return (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() =>
                        handleSelect(
                          exercise
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/30">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={
                              exercise.name
                            }
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Dumbbell className="h-5 w-5 text-[#ff2a32]" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {exercise.name}
                        </p>

                        <p className="truncate text-xs text-zinc-500">
                          {category}
                        </p>
                      </div>
                    </button>
                  );
                }
              )}

              {filteredExercises.length ===
                0 && (
                <p className="py-6 text-center text-xs text-zinc-500">
                  Nenhum exercício encontrado.
                </p>
              )}
            </div>
          )}

          <div className="border-t border-white/10 pt-4">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setShowNew(true)}
            >
              <Plus className="h-4 w-4" />

              Criar exercício novo
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
