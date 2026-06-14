import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Save,
  Send,
  Loader2,
  User,
  Clock,
  Dumbbell,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

import { Header } from '../../components/ui/Header';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { useAuthStore } from '../../store/authStore';
import { useStudentStore } from '../../store/studentStore';
import * as workoutService from '../../services/workoutService';
import * as exerciseService from '../../services/exerciseService';
import type { CreateExerciseInWorkout, CreateWorkoutData } from '../../types/workout';
import type { Exercise } from '../../types/database';
import { cn, getWeekdayName } from '../../lib/utils';

const DAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'] as const;

const OBJECTIVES = [
  { value: 'Hipertrofia', label: 'Hipertrofia' },
  { value: 'Emagrecimento', label: 'Emagrecimento' },
  { value: 'Resistência', label: 'Resistência' },
  { value: 'Força', label: 'Força' },
  { value: 'Condicionamento', label: 'Condicionamento' },
  { value: 'Reabilitação', label: 'Reabilitação' },
];

const LEVELS = [
  { value: 'Iniciante', label: 'Iniciante' },
  { value: 'Intermediário', label: 'Intermediário' },
  { value: 'Avançado', label: 'Avançado' },
];

interface DayExercise extends CreateExerciseInWorkout {
  localId: string;
}

function normalizeExercise(exercise: Exercise) {
  const record = exercise as unknown as Record<string, string>;

  return {
    imageUrl: exercise.image_url || record.imageUrl || '',
    videoUrl: exercise.video_url || record.videoUrl || '',
    muscleGroup: exercise.muscle_group || record.muscleGroup || '',
    category: exercise.category || record.category || '',
    difficulty: exercise.difficulty || record.difficulty || '',
    equipment: exercise.equipment || record.equipment || '',
    instructions: exercise.instructions || record.instructions || '',
    tips: exercise.tips || record.tips || '',
  };
}

function createLocalId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function WorkoutBuilderPage() {
  const [searchParams] = useSearchParams();
  const { trainerProfile } = useAuthStore();
  const { students, fetchStudents } = useStudentStore();

  const [studentId, setStudentId] = useState(searchParams.get('studentId') || '');
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [level, setLevel] = useState('');
  const [duration, setDuration] = useState('');
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [exercisesByDay, setExercisesByDay] = useState<Record<string, DayExercise[]>>({});
  const [studentSearch, setStudentSearch] = useState('');

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [currentDay, setCurrentDay] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [loadingExercises, setLoadingExercises] = useState(false);

  const [showNewExercise, setShowNewExercise] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState('');
  const [newExCategory, setNewExCategory] = useState('');
  const [newExDifficulty, setNewExDifficulty] = useState('');
  const [newExEquipment, setNewExEquipment] = useState('');
  const [newExInstructions, setNewExInstructions] = useState('');
  const [creatingExercise, setCreatingExercise] = useState(false);

  useEffect(() => {
    if (!trainerProfile?.id) return;

    fetchStudents(trainerProfile.id);
  }, [trainerProfile?.id, fetchStudents]);

  useEffect(() => {
    if (!studentId || studentSearch) return;

    const selectedStudent = students.find((student) => student.id === studentId);

    if (selectedStudent) {
      setStudentSearch(selectedStudent.name);
    }
  }, [studentId, studentSearch, students]);

  useEffect(() => {
    if (!currentDay) return;

    setLoadingExercises(true);

    exerciseService
      .getExercises()
      .then((data) => setExercises(data || []))
      .catch((err) => {
        console.error('[WorkoutBuilderPage] exercises error:', err);
        setExercises([]);
      })
      .finally(() => setLoadingExercises(false));
  }, [currentDay]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();

    if (!query) return students;

    return students.filter((student) => {
      const studentName = student.name || '';
      const studentEmail = student.email || '';
      const studentPhone = (student as any).phone || '';

      return (
        studentName.toLowerCase().includes(query) ||
        studentEmail.toLowerCase().includes(query) ||
        studentPhone.toLowerCase().includes(query)
      );
    });
  }, [students, studentSearch]);

  const filteredExercises = useMemo(() => {
    const query = exerciseSearch.trim().toLowerCase();

    if (!query) return exercises;

    return exercises.filter((exercise) => {
      const normalized = normalizeExercise(exercise);

      return (
        exercise.name.toLowerCase().includes(query) ||
        normalized.muscleGroup.toLowerCase().includes(query) ||
        normalized.category.toLowerCase().includes(query) ||
        normalized.equipment.toLowerCase().includes(query)
      );
    });
  }, [exercises, exerciseSearch]);

  const selectedDaysArray = DAYS.filter((day) => selectedDays.has(day));

  const totalSelectedExercises = selectedDaysArray.reduce((sum, day) => {
    return sum + (exercisesByDay[day] || []).length;
  }, 0);

  function resetMessages() {
    setError('');
    setSuccessMessage('');
  }

  function toggleDay(day: string) {
    resetMessages();

    setSelectedDays((prev) => {
      const next = new Set(prev);

      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }

      return next;
    });

    setExercisesByDay((prev) => {
      if (prev[day]) return prev;

      return {
        ...prev,
        [day]: [],
      };
    });
  }

  function addExerciseToDay(exercise: Exercise) {
    if (!currentDay) return;

    const normalized = normalizeExercise(exercise);

    const newExercise: DayExercise = {
      localId: createLocalId(),
      exercise_id: exercise.id,
      day_key: currentDay,
      name: exercise.name,
      sets: '4',
      reps: '10',
      rest_seconds: 60,
      suggested_weight: '',
      observation: '',
      tempo: '2-0-2-0',
      image_url: normalized.imageUrl || null,
      video_url: normalized.videoUrl || null,
      muscle_group: normalized.muscleGroup || null,
      category: normalized.category || null,
      equipment: normalized.equipment || null,
      difficulty: normalized.difficulty || null,
      instructions: normalized.instructions || null,
      tips: normalized.tips || null,
    };

    setExercisesByDay((prev) => ({
      ...prev,
      [currentDay]: [...(prev[currentDay] || []), newExercise],
    }));

    setShowAddExercise(false);
    setCurrentDay(null);
    setExerciseSearch('');
    setShowNewExercise(false);
  }

  function updateExercise(day: string, localId: string, data: Partial<DayExercise>) {
    setExercisesByDay((prev) => ({
      ...prev,
      [day]: (prev[day] || []).map((exercise) =>
        exercise.localId === localId ? { ...exercise, ...data } : exercise
      ),
    }));
  }

  function removeExercise(day: string, localId: string) {
    setExercisesByDay((prev) => ({
      ...prev,
      [day]: (prev[day] || []).filter((exercise) => exercise.localId !== localId),
    }));
  }

  function moveExercise(day: string, index: number, direction: 'up' | 'down') {
    const list = [...(exercisesByDay[day] || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= list.length) return;

    [list[index], list[newIndex]] = [list[newIndex], list[index]];

    setExercisesByDay((prev) => ({
      ...prev,
      [day]: list,
    }));
  }

  function validateWorkout() {
    if (!trainerProfile?.id) {
      return 'Não foi possível identificar o personal logado.';
    }

    if (!studentId) {
      return 'Selecione um aluno para esse treino.';
    }

    if (!name.trim()) {
      return 'Preencha o nome do treino.';
    }

    if (selectedDays.size === 0) {
      return 'Selecione pelo menos um dia da semana.';
    }

    if (totalSelectedExercises === 0) {
      return 'Adicione pelo menos um exercício no treino.';
    }

    return '';
  }

  function buildCreateData(): CreateWorkoutData {
    const allExercises: CreateExerciseInWorkout[] = [];

    selectedDaysArray.forEach((day) => {
      const dayExercises = exercisesByDay[day] || [];

      dayExercises.forEach((exercise) => {
        allExercises.push({
          exercise_id: exercise.exercise_id,
          day_key: day,
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          rest_seconds: Number(exercise.rest_seconds || 0),
          suggested_weight: exercise.suggested_weight || '',
          observation: exercise.observation || '',
          tempo: exercise.tempo || '',
          image_url: exercise.image_url || null,
          video_url: exercise.video_url || null,
          muscle_group: exercise.muscle_group || null,
          category: exercise.category || null,
          equipment: exercise.equipment || null,
          difficulty: exercise.difficulty || null,
          instructions: exercise.instructions || null,
          tips: exercise.tips || null,
        });
      });
    });

    return {
      student_id: studentId,
      name: name.trim(),
      objective: objective || undefined,
      level: level || undefined,
      duration_minutes: duration ? Number(duration) : undefined,
      exercises: allExercises,
    };
  }

  async function handleSave() {
    const validationError = validateWorkout();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!trainerProfile?.id) return;

    setSaving(true);
    resetMessages();

    try {
      await workoutService.createWorkoutPlan(trainerProfile.id, buildCreateData());

      setSuccessMessage('Treino salvo como rascunho!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar o treino.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    const validationError = validateWorkout();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!trainerProfile?.id) return;

    setPublishing(true);
    resetMessages();

    try {
      const plan = await workoutService.createWorkoutPlan(
        trainerProfile.id,
        buildCreateData()
      );

      await workoutService.publishWorkoutPlan(plan.id);

      setSuccessMessage(
        'Treino publicado com sucesso! O aluno já pode visualizar esse treino no aplicativo.'
      );

      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setError(err?.message || 'Erro ao publicar o treino.');
    } finally {
      setPublishing(false);
    }
  }

  async function handleCreateExercise() {
    if (!trainerProfile?.id || !newExName.trim()) return;

    setCreatingExercise(true);

    try {
      const exercise = await exerciseService.createExercise(trainerProfile.id, {
        name: newExName.trim(),
        muscle_group: newExMuscle || null,
        category: newExCategory || null,
        equipment: newExEquipment || null,
        difficulty: newExDifficulty || null,
        instructions: newExInstructions || null,
        tips: null,
      });

      setExercises((prev) => [exercise, ...prev]);

      if (currentDay) {
        addExerciseToDay(exercise);
      }

      setShowNewExercise(false);
      setNewExName('');
      setNewExMuscle('');
      setNewExCategory('');
      setNewExDifficulty('');
      setNewExEquipment('');
      setNewExInstructions('');
    } catch (err) {
      console.error('[WorkoutBuilderPage] create exercise error:', err);
      setError('Erro ao criar exercício.');
    } finally {
      setCreatingExercise(false);
    }
  }

  function openAddExercise(day: string) {
    setCurrentDay(day);
    setShowAddExercise(true);
    setExerciseSearch('');
    setShowNewExercise(false);
  }

  function closeExerciseModal() {
    setShowAddExercise(false);
    setCurrentDay(null);
    setExerciseSearch('');
    setShowNewExercise(false);
  }

  return (
    <div>
      <Header title="Montar Treino" showBack />

      <div className="page-container space-y-5">
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMessage}
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        )}

        <Card>
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-vs-muted" />

              <input
                placeholder="Buscar aluno..."
                className="input-field pl-10"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
              />
            </div>

            <div className="max-h-40 space-y-1 overflow-y-auto">
              {filteredStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => {
                    setStudentId(student.id);
                    setStudentSearch(student.name);
                    resetMessages();
                  }}
                  className={cn(
                    'w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors',
                    studentId === student.id
                      ? 'border border-vs-primary/20 bg-vs-primary/10 text-vs-primary'
                      : 'text-vs-text hover:bg-white/5'
                  )}
                >
                  <span className="font-medium">{student.name}</span>

                  {(student.email || (student as any).phone) && (
                    <span className="ml-2 text-xs text-vs-muted">
                      {student.email || (student as any).phone}
                    </span>
                  )}
                </button>
              ))}

              {filteredStudents.length === 0 && (
                <p className="py-2 text-center text-xs text-vs-muted">
                  Nenhum aluno encontrado
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-5">
            <Input
              label="Nome do treino"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                resetMessages();
              }}
              placeholder="Ex: Treino A - Superior"
            />

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Objetivo
              </span>

              <div className="grid grid-cols-2 gap-2">
                {OBJECTIVES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setObjective(option.value)}
                    className={cn(
                      'min-h-11 rounded-2xl border px-3 py-2 text-[11px] font-black transition-all active:scale-[0.97]',
                      objective === option.value
                        ? 'border-[#ff2a32]/40 bg-[#ff2a32]/15 text-[#ff2a32] shadow-[0_12px_30px_rgba(255,42,48,0.18)]'
                        : 'border-white/10 bg-white/[0.045] text-zinc-400'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Nível
              </span>

              <div className="grid grid-cols-3 gap-2">
                {LEVELS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLevel(option.value)}
                    className={cn(
                      'h-11 rounded-2xl border px-2 text-[11px] font-black transition-all active:scale-[0.97]',
                      level === option.value
                        ? 'border-[#ff2a32]/40 bg-[#ff2a32]/15 text-[#ff2a32] shadow-[0_12px_30px_rgba(255,42,48,0.18)]'
                        : 'border-white/10 bg-white/[0.045] text-zinc-400'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Duração (minutos)"
              type="number"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              placeholder="Ex: 60"
              icon={<Clock className="h-4 w-4" />}
            />
          </div>
        </Card>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-vs-muted">Dias da semana</h3>

            {totalSelectedExercises > 0 && (
              <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-bold text-vs-muted">
                {totalSelectedExercises} exercício{totalSelectedExercises === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn('chip transition-all', selectedDays.has(day) && 'chip-active')}
              >
                {getWeekdayName(day).slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {selectedDaysArray.map((day) => (
          <Card key={day}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold text-white">{getWeekdayName(day)}</h4>

              <Button variant="ghost" size="sm" onClick={() => openAddExercise(day)}>
                <Plus className="h-4 w-4" /> Exercício
              </Button>
            </div>

            {(exercisesByDay[day] || []).length === 0 ? (
              <p className="py-4 text-center text-xs text-vs-muted">
                Nenhum exercício adicionado
              </p>
            ) : (
              <div className="space-y-2">
                {(exercisesByDay[day] || []).map((exercise, index) => (
                  <motion.div
                    key={exercise.localId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2 rounded-xl border border-vs-border bg-white/5 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {exercise.name}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveExercise(day, index, 'up')}
                          disabled={index === 0}
                          className="rounded-lg p-1 hover:bg-white/5 disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveExercise(day, index, 'down')}
                          disabled={index === (exercisesByDay[day] || []).length - 1}
                          className="rounded-lg p-1 hover:bg-white/5 disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeExercise(day, exercise.localId)}
                          className="rounded-lg p-1 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        label="Séries"
                        value={exercise.sets}
                        onChange={(event) =>
                          updateExercise(day, exercise.localId, {
                            sets: event.target.value,
                          })
                        }
                      />

                      <Input
                        label="Reps"
                        value={exercise.reps}
                        onChange={(event) =>
                          updateExercise(day, exercise.localId, {
                            reps: event.target.value,
                          })
                        }
                      />

                      <Input
                        label="Descanso (s)"
                        type="number"
                        value={exercise.rest_seconds ?? ''}
                        onChange={(event) =>
                          updateExercise(day, exercise.localId, {
                            rest_seconds: Number(event.target.value || 0),
                          })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Carga sugerida"
                        value={exercise.suggested_weight || ''}
                        onChange={(event) =>
                          updateExercise(day, exercise.localId, {
                            suggested_weight: event.target.value,
                          })
                        }
                        placeholder="Ex: 20kg"
                      />

                      <Input
                        label="Tempo"
                        value={exercise.tempo || ''}
                        onChange={(event) =>
                          updateExercise(day, exercise.localId, {
                            tempo: event.target.value,
                          })
                        }
                        placeholder="Ex: 2-0-2-0"
                      />
                    </div>

                    <Textarea
                      label="Observação"
                      value={exercise.observation || ''}
                      onChange={(event) =>
                        updateExercise(day, exercise.localId, {
                          observation: event.target.value,
                        })
                      }
                      className="min-h-[60px]"
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        ))}

        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handleSave}
            loading={saving}
            disabled={publishing}
          >
            <Save className="h-4 w-4" />
            Salvar rascunho
          </Button>

          <Button
            className="flex-1"
            onClick={handlePublish}
            loading={publishing}
            disabled={saving}
          >
            <Send className="h-4 w-4" />
            Publicar
          </Button>
        </div>
      </div>

      <Modal open={showAddExercise} onClose={closeExerciseModal} title="Adicionar Exercício">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-vs-muted" />

            <input
              className="input-field pl-10"
              placeholder="Buscar exercícios..."
              value={exerciseSearch}
              onChange={(event) => setExerciseSearch(event.target.value)}
              autoFocus
            />
          </div>

          {loadingExercises ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-vs-muted" />
            </div>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {filteredExercises.map((exercise) => {
                const normalized = normalizeExercise(exercise);

                return (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => addExerciseToDay(exercise)}
                    className="flex w-full gap-3 rounded-xl border border-transparent p-2 text-left transition-colors hover:border-vs-border hover:bg-white/5"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-950">
                      {normalized.imageUrl ? (
                        <img
                          src={normalized.imageUrl}
                          alt={exercise.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : normalized.videoUrl ? (
                        <video
                          src={normalized.videoUrl}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Dumbbell className="h-5 w-5 text-zinc-600" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 self-center">
                      <p className="truncate text-sm font-medium">{exercise.name}</p>

                      <p className="truncate text-xs text-vs-muted">
                        {normalized.category || normalized.muscleGroup}
                        {normalized.difficulty && ` • ${normalized.difficulty}`}
                      </p>
                    </div>
                  </button>
                );
              })}

              {filteredExercises.length === 0 && (
                <p className="py-4 text-center text-xs text-vs-muted">
                  Nenhum exercício encontrado
                </p>
              )}
            </div>
          )}

          <div className="border-t border-vs-border pt-4">
            <p className="mb-3 text-xs text-vs-muted">Não encontrou o exercício?</p>

            {showNewExercise ? (
              <div className="space-y-3">
                <Input
                  label="Nome"
                  value={newExName}
                  onChange={(event) => setNewExName(event.target.value)}
                  placeholder="Nome do exercício"
                />

                <Input
                  label="Grupo muscular"
                  value={newExMuscle}
                  onChange={(event) => setNewExMuscle(event.target.value)}
                  placeholder="Ex: Peito"
                />

                <Input
                  label="Categoria"
                  value={newExCategory}
                  onChange={(event) => setNewExCategory(event.target.value)}
                  placeholder="Ex: Empurrar"
                />

                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                    Dificuldade
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    {LEVELS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setNewExDifficulty(option.value)}
                        className={cn(
                          'h-11 rounded-2xl border px-2 text-[11px] font-black transition-all active:scale-[0.97]',
                          newExDifficulty === option.value
                            ? 'border-[#ff2a32]/40 bg-[#ff2a32]/15 text-[#ff2a32] shadow-[0_12px_30px_rgba(255,42,48,0.18)]'
                            : 'border-white/10 bg-white/[0.045] text-zinc-400'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Equipamento"
                  value={newExEquipment}
                  onChange={(event) => setNewExEquipment(event.target.value)}
                  placeholder="Ex: Halteres"
                />

                <Textarea
                  label="Instruções"
                  value={newExInstructions}
                  onChange={(event) => setNewExInstructions(event.target.value)}
                />

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowNewExercise(false)}
                  >
                    Voltar
                  </Button>

                  <Button
                    className="flex-1"
                    onClick={handleCreateExercise}
                    loading={creatingExercise}
                  >
                    Criar e adicionar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowNewExercise(true)}
              >
                <Plus className="h-4 w-4" />
                Criar novo exercício
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default WorkoutBuilderPage;