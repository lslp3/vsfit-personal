import { useState, useEffect } from 'react';
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
import { Input, Textarea, Select } from '../../components/ui/Input';
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
    if (trainerProfile) {
      fetchStudents(trainerProfile.id);
    }
  }, [trainerProfile, fetchStudents]);

  useEffect(() => {
    if (!currentDay) return;
    setLoadingExercises(true);
    exerciseService
      .getExercises()
      .then((data) => setExercises(data))
      .catch(() => {})
      .finally(() => setLoadingExercises(false));
  }, [currentDay]);

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredExercises = exercises.filter((ex) => {
    const r = ex as unknown as Record<string, string>;
    const muscleGroup = ex.muscle_group || r.muscleGroup || '';
    const category = ex.category || r.category || '';
    const q = exerciseSearch.toLowerCase();
    return (
      ex.name.toLowerCase().includes(q) ||
      muscleGroup.toLowerCase().includes(q) ||
      category.toLowerCase().includes(q)
    );
  });

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
    if (!exercisesByDay[day]) {
      setExercisesByDay((prev) => ({ ...prev, [day]: [] }));
    }
  };

  const addExerciseToDay = (exercise: Exercise) => {
    if (!currentDay) return;
    const r = exercise as unknown as Record<string, string>;
    const newEx: DayExercise = {
      localId: crypto.randomUUID(),
      exercise_id: exercise.id,
      day_key: currentDay,
      name: exercise.name,
      sets: '4',
      reps: '10',
      rest_seconds: 60,
      suggested_weight: '',
      observation: '',
      tempo: '2-0-2-0',
      image_url: exercise.image_url || r.imageUrl || null,
      video_url: exercise.video_url || r.videoUrl || null,
      muscle_group: exercise.muscle_group || r.muscleGroup || null,
      category: exercise.category || r.category || null,
      equipment: exercise.equipment || r.equipment || null,
      difficulty: exercise.difficulty || r.difficulty || null,
      instructions: exercise.instructions || r.instructions || null,
      tips: exercise.tips || r.tips || null,
    };
    setExercisesByDay((prev) => ({
      ...prev,
      [currentDay]: [...(prev[currentDay] || []), newEx],
    }));
    setShowAddExercise(false);
    setCurrentDay(null);
    setExerciseSearch('');
  };

  const updateExercise = (day: string, localId: string, data: Partial<DayExercise>) => {
    setExercisesByDay((prev) => ({
      ...prev,
      [day]: prev[day].map((ex) => (ex.localId === localId ? { ...ex, ...data } : ex)),
    }));
  };

  const removeExercise = (day: string, localId: string) => {
    setExercisesByDay((prev) => ({
      ...prev,
      [day]: prev[day].filter((ex) => ex.localId !== localId),
    }));
  };

  const moveExercise = (day: string, index: number, direction: 'up' | 'down') => {
    const list = [...(exercisesByDay[day] || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return;
    [list[index], list[newIndex]] = [list[newIndex], list[index]];
    setExercisesByDay((prev) => ({ ...prev, [day]: list }));
  };

  const buildCreateData = (): CreateWorkoutData => {
    const allExercises: CreateExerciseInWorkout[] = [];
    for (const day of DAYS) {
      const dayExs = exercisesByDay[day] || [];
      for (const ex of dayExs) {
        allExercises.push({
          exercise_id: ex.exercise_id,
          day_key: day,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          rest_seconds: ex.rest_seconds,
          suggested_weight: ex.suggested_weight,
          observation: ex.observation,
          tempo: ex.tempo,
          image_url: ex.image_url,
          video_url: ex.video_url,
          muscle_group: ex.muscle_group,
          category: ex.category,
          equipment: ex.equipment,
          difficulty: ex.difficulty,
          instructions: ex.instructions,
          tips: ex.tips,
        });
      }
    }
    return {
      student_id: studentId,
      name,
      objective: objective || undefined,
      level: level || undefined,
      duration_minutes: duration ? Number(duration) : undefined,
      exercises: allExercises,
    };
  };

  const handleSave = async () => {
    if (!trainerProfile || !studentId || !name.trim()) {
      setError('Preencha o aluno e o nome do treino.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      await workoutService.createWorkoutPlan(trainerProfile.id, buildCreateData());
      setSuccessMessage('Treino salvo como rascunho!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!trainerProfile || !studentId || !name.trim()) {
      setError('Preencha o aluno e o nome do treino.');
      return;
    }
    setPublishing(true);
    setError('');
    setSuccessMessage('');
    try {
      const plan = await workoutService.createWorkoutPlan(trainerProfile.id, buildCreateData());
      await workoutService.publishWorkoutPlan(plan.id);
      setSuccessMessage('Treino publicado com sucesso! O aluno já pode visualizar esse treino no aplicativo.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setError(err?.message || 'Erro ao publicar.');
    } finally {
      setPublishing(false);
    }
  };

  const handleCreateExercise = async () => {
    if (!trainerProfile || !newExName.trim()) return;
    setCreatingExercise(true);
    try {
      const ex = await exerciseService.createExercise(trainerProfile.id, {
        name: newExName.trim(),
        muscle_group: newExMuscle || null,
        category: newExCategory || null,
        equipment: newExEquipment || null,
        difficulty: newExDifficulty || null,
        instructions: newExInstructions || null,
        tips: null,
      });
      setExercises((prev) => [...prev, ex]);
      setShowNewExercise(false);
      setNewExName('');
      setNewExMuscle('');
      setNewExCategory('');
      setNewExDifficulty('');
      setNewExEquipment('');
      setNewExInstructions('');
    } catch {
      //
    } finally {
      setCreatingExercise(false);
    }
  };

  const openAddExercise = (day: string) => {
    setCurrentDay(day);
    setShowAddExercise(true);
    setExerciseSearch('');
  };

  return (
    <div>
      <Header title="Montar Treino" showBack />

      <div className="page-container space-y-5">
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-sm text-green-400"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMessage}
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}

        <Card>
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-vs-muted" />
              <input
                placeholder="Buscar aluno..."
                className="input-field pl-10"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredStudents.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setStudentId(s.id);
                    setStudentSearch(s.name);
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors',
                    studentId === s.id
                      ? 'bg-vs-primary/10 text-vs-primary border border-vs-primary/20'
                      : 'hover:bg-white/5 text-vs-text'
                  )}
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="text-vs-muted ml-2 text-xs">{s.email}</span>
                </button>
              ))}
              {filteredStudents.length === 0 && (
                <p className="text-xs text-vs-muted text-center py-2">Nenhum aluno encontrado</p>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <Input label="Nome do treino" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Treino A - Superior" />
            <Select label="Objetivo" options={OBJECTIVES} value={objective} onChange={(e) => setObjective(e.target.value)} />
            <Select label="Nível" options={LEVELS} value={level} onChange={(e) => setLevel(e.target.value)} />
            <Input
              label="Duração (minutos)"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Ex: 60"
              icon={<Clock className="w-4 h-4" />}
            />
          </div>
        </Card>

        <div>
          <h3 className="text-sm font-medium text-vs-muted mb-3">Dias da semana</h3>
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

        {DAYS.filter((d) => selectedDays.has(d)).map((day) => (
          <Card key={day}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-white">{getWeekdayName(day)}</h4>
              <Button variant="ghost" size="sm" onClick={() => openAddExercise(day)}>
                <Plus className="w-4 h-4" /> Exercício
              </Button>
            </div>

            {(exercisesByDay[day] || []).length === 0 ? (
              <p className="text-xs text-vs-muted text-center py-4">Nenhum exercício adicionado</p>
            ) : (
              <div className="space-y-2">
                {(exercisesByDay[day] || []).map((ex, idx) => (
                  <motion.div
                    key={ex.localId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 rounded-xl p-3 space-y-2 border border-vs-border"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{ex.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveExercise(day, idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 hover:bg-white/5 rounded-lg disabled:opacity-30"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveExercise(day, idx, 'down')}
                          disabled={idx === (exercisesByDay[day] || []).length - 1}
                          className="p-1 hover:bg-white/5 rounded-lg disabled:opacity-30"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeExercise(day, ex.localId)}
                          className="p-1 hover:bg-red-500/10 rounded-lg text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        label="Séries"
                        value={ex.sets}
                        onChange={(e) => updateExercise(day, ex.localId, { sets: e.target.value })}
                      />
                      <Input
                        label="Reps"
                        value={ex.reps}
                        onChange={(e) => updateExercise(day, ex.localId, { reps: e.target.value })}
                      />
                      <Input
                        label="Descanso (s)"
                        type="number"
                        value={ex.rest_seconds ?? ''}
                        onChange={(e) => updateExercise(day, ex.localId, { rest_seconds: Number(e.target.value) })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Carga sugerida"
                        value={ex.suggested_weight || ''}
                        onChange={(e) => updateExercise(day, ex.localId, { suggested_weight: e.target.value })}
                        placeholder="Ex: 20kg"
                      />
                      <Input
                        label="Tempo"
                        value={ex.tempo || ''}
                        onChange={(e) => updateExercise(day, ex.localId, { tempo: e.target.value })}
                        placeholder="Ex: 2-0-2-0"
                      />
                    </div>

                    <Textarea
                      label="Observação"
                      value={ex.observation || ''}
                      onChange={(e) => updateExercise(day, ex.localId, { observation: e.target.value })}
                      className="min-h-[60px]"
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        ))}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={handleSave} loading={saving} disabled={publishing}>
            <Save className="w-4 h-4" />
            Salvar rascunho
          </Button>
          <Button className="flex-1" onClick={handlePublish} loading={publishing} disabled={saving}>
            <Send className="w-4 h-4" />
            Publicar
          </Button>
        </div>
      </div>

      <Modal open={showAddExercise} onClose={() => { setShowAddExercise(false); setCurrentDay(null); setExerciseSearch(''); }} title="Adicionar Exercício">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-vs-muted" />
            <input
              className="input-field pl-10"
              placeholder="Buscar exercícios..."
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              autoFocus
            />
          </div>

          {loadingExercises ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-vs-muted" />
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2">
              {filteredExercises.map((ex) => {
                const r = ex as unknown as Record<string, string>;
                const imgUrl = ex.image_url || r.imageUrl || '';
                const vidUrl = ex.video_url || r.videoUrl || '';
                const cat = ex.category || r.category || '';
                const diff = ex.difficulty || r.difficulty || '';
                const muscle = ex.muscle_group || r.muscleGroup || '';

                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => addExerciseToDay(ex)}
                    className="w-full text-left flex gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-vs-border"
                  >
                    <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-zinc-950">
                      {imgUrl ? (
                        <img src={imgUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : vidUrl ? (
                        <video src={vidUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Dumbbell className="h-5 w-5 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 self-center">
                      <p className="text-sm font-medium truncate">{ex.name}</p>
                      <p className="text-xs text-vs-muted truncate">
                        {cat || muscle}
                        {diff && ` • ${diff}`}
                      </p>
                    </div>
                  </button>
                );
              })}
              {filteredExercises.length === 0 && (
                <p className="text-xs text-vs-muted text-center py-4">Nenhum exercício encontrado</p>
              )}
            </div>
          )}

          <div className="border-t border-vs-border pt-4">
            <p className="text-xs text-vs-muted mb-3">Não encontrou o exercício?</p>
            {showNewExercise ? (
              <div className="space-y-3">
                <Input label="Nome" value={newExName} onChange={(e) => setNewExName(e.target.value)} placeholder="Nome do exercício" />
                <Input label="Grupo muscular" value={newExMuscle} onChange={(e) => setNewExMuscle(e.target.value)} placeholder="Ex: Peito" />
                <Input label="Categoria" value={newExCategory} onChange={(e) => setNewExCategory(e.target.value)} placeholder="Ex: Empurrar" />
                <Select
                  label="Dificuldade"
                  options={[
                    { value: 'Iniciante', label: 'Iniciante' },
                    { value: 'Intermediário', label: 'Intermediário' },
                    { value: 'Avançado', label: 'Avançado' },
                  ]}
                  value={newExDifficulty}
                  onChange={(e) => setNewExDifficulty(e.target.value)}
                />
                <Input label="Equipamento" value={newExEquipment} onChange={(e) => setNewExEquipment(e.target.value)} placeholder="Ex: Halteres" />
                <Textarea label="Instruções" value={newExInstructions} onChange={(e) => setNewExInstructions(e.target.value)} />
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setShowNewExercise(false)}>
                    Voltar
                  </Button>
                  <Button className="flex-1" onClick={handleCreateExercise} loading={creatingExercise}>
                    Criar
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="secondary" className="w-full" onClick={() => setShowNewExercise(true)}>
                <Plus className="w-4 h-4" />
                Criar novo exercício
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
