import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Layers2,
  Loader2,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  Unlink,
  User,
  Zap,
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
import type {
  CreateExerciseInWorkout,
  CreateWorkoutData,
  CreateWorkoutDay,
  CreateWorkoutExerciseGroup,
  WorkoutDayKey,
} from '../../types/workout';
import type {
  DropSetConfig,
  Exercise,
  WorkoutTechniqueType,
} from '../../types/database';
import { cn, getWeekdayName } from '../../lib/utils';

const DAYS = [
  'seg',
  'ter',
  'qua',
  'qui',
  'sex',
  'sab',
  'dom',
] as const satisfies readonly WorkoutDayKey[];

const WEEKDAY_NUMBER: Record<WorkoutDayKey, number> = {
  dom: 0,
  seg: 1,
  ter: 2,
  qua: 3,
  qui: 4,
  sex: 5,
  sab: 6,
};

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

const TECHNIQUES: {
  value: WorkoutTechniqueType;
  label: string;
}[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'drop_set', label: 'Drop-set' },
  { value: 'bi_set', label: 'Bi-set' },
];

interface DayExercise extends CreateExerciseInWorkout {
  localId: string;
}

interface DayConfiguration {
  localId: string;
  name: string;
  notes: string;
}

interface LocalBiSet {
  localId: string;
  dayKey: WorkoutDayKey;
  firstExerciseLocalId: string;
  secondExerciseLocalId: string;
  name: string;
  rounds: number | null;
  restAfterSeconds: number | null;
  notes: string;
  orderIndex: number;
}

interface BiSetForm {
  firstExerciseLocalId: string;
  secondExerciseLocalId: string;
  name: string;
  rounds: string;
  restAfterSeconds: string;
  notes: string;
}

const EMPTY_BI_SET_FORM: BiSetForm = {
  firstExerciseLocalId: '',
  secondExerciseLocalId: '',
  name: '',
  rounds: '3',
  restAfterSeconds: '60',
  notes: '',
};

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
  if (
    typeof crypto !== 'undefined' &&
    'randomUUID' in crypto
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function getDropSetConfig(
  exercise: DayExercise
): DropSetConfig {
  const config = exercise.technique_config;

  if (
    config &&
    typeof config === 'object' &&
    !Array.isArray(config)
  ) {
    return config as DropSetConfig;
  }

  return {};
}

function getTechniqueLabel(
  technique?: WorkoutTechniqueType
) {
  if (technique === 'drop_set') return 'DROP-SET';
  if (technique === 'bi_set') return 'BI-SET';

  return 'NORMAL';
}

export function WorkoutBuilderPage() {
  const [searchParams] = useSearchParams();
  const { trainerProfile } = useAuthStore();
  const { students, fetchStudents } = useStudentStore();

  const [studentId, setStudentId] = useState(
    searchParams.get('studentId') || ''
  );
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [level, setLevel] = useState('');
  const [duration, setDuration] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedDays, setSelectedDays] = useState<
    Set<WorkoutDayKey>
  >(new Set());

  const [dayConfigurations, setDayConfigurations] =
    useState<
      Partial<Record<WorkoutDayKey, DayConfiguration>>
    >({});

  const [exercisesByDay, setExercisesByDay] =
    useState<
      Partial<Record<WorkoutDayKey, DayExercise[]>>
    >({});

  const [biSets, setBiSets] = useState<LocalBiSet[]>(
    []
  );

  const [studentSearch, setStudentSearch] =
    useState('');

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] =
    useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] =
    useState('');
  const [createdPlanId, setCreatedPlanId] =
    useState<string | null>(null);

  const [showAddExercise, setShowAddExercise] =
    useState(false);
  const [currentDay, setCurrentDay] =
    useState<WorkoutDayKey | null>(null);
  const [exercises, setExercises] = useState<
    Exercise[]
  >([]);
  const [exerciseSearch, setExerciseSearch] =
    useState('');
  const [loadingExercises, setLoadingExercises] =
    useState(false);

  const [showNewExercise, setShowNewExercise] =
    useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] =
    useState('');
  const [newExCategory, setNewExCategory] =
    useState('');
  const [newExDifficulty, setNewExDifficulty] =
    useState('');
  const [newExEquipment, setNewExEquipment] =
    useState('');
  const [newExInstructions, setNewExInstructions] =
    useState('');
  const [creatingExercise, setCreatingExercise] =
    useState(false);

  const [showBiSetModal, setShowBiSetModal] =
    useState(false);
  const [biSetDay, setBiSetDay] =
    useState<WorkoutDayKey | null>(null);
  const [biSetForm, setBiSetForm] =
    useState<BiSetForm>(EMPTY_BI_SET_FORM);

  useEffect(() => {
    if (!trainerProfile?.id) return;

    fetchStudents(trainerProfile.id);
  }, [trainerProfile?.id, fetchStudents]);

  useEffect(() => {
    if (!studentId || studentSearch) return;

    const selectedStudent = students.find(
      (student) => student.id === studentId
    );

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
        console.error(
          '[WorkoutBuilderPage] exercises error:',
          err
        );
        setExercises([]);
      })
      .finally(() => setLoadingExercises(false));
  }, [currentDay]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch
      .trim()
      .toLowerCase();

    if (!query) return students;

    return students.filter((student) => {
      const studentName = student.name || '';
      const studentEmail = student.email || '';
      const studentPhone = student.phone || '';

      return (
        studentName
          .toLowerCase()
          .includes(query) ||
        studentEmail
          .toLowerCase()
          .includes(query) ||
        studentPhone
          .toLowerCase()
          .includes(query)
      );
    });
  }, [students, studentSearch]);

  const filteredExercises = useMemo(() => {
    const query = exerciseSearch
      .trim()
      .toLowerCase();

    if (!query) return exercises;

    return exercises.filter((exercise) => {
      const normalized =
        normalizeExercise(exercise);

      return (
        exercise.name
          .toLowerCase()
          .includes(query) ||
        normalized.muscleGroup
          .toLowerCase()
          .includes(query) ||
        normalized.category
          .toLowerCase()
          .includes(query) ||
        normalized.equipment
          .toLowerCase()
          .includes(query)
      );
    });
  }, [exercises, exerciseSearch]);

  const selectedDaysArray = DAYS.filter((day) =>
    selectedDays.has(day)
  );

  const totalSelectedExercises =
    selectedDaysArray.reduce((sum, day) => {
      return (
        sum + (exercisesByDay[day] || []).length
      );
    }, 0);

  function resetMessages() {
    setError('');
    setSuccessMessage('');
  }

  function ensureDayConfiguration(
    day: WorkoutDayKey
  ) {
    setDayConfigurations((previous) => {
      if (previous[day]) return previous;

      return {
        ...previous,
        [day]: {
          localId: createLocalId(),
          name: '',
          notes: '',
        },
      };
    });

    setExercisesByDay((previous) => {
      if (previous[day]) return previous;

      return {
        ...previous,
        [day]: [],
      };
    });
  }

  function toggleDay(day: WorkoutDayKey) {
    resetMessages();

    if (selectedDays.has(day)) {
      const dayExercises =
        exercisesByDay[day] || [];

      if (dayExercises.length > 0) {
        setError(
          `Remova os exercícios de ${getWeekdayName(
            day
          )} antes de desmarcar o dia.`
        );
        return;
      }

      const dayHasBiSet = biSets.some(
        (group) => group.dayKey === day
      );

      if (dayHasBiSet) {
        setError(
          `Desfaça os bi-sets de ${getWeekdayName(
            day
          )} antes de desmarcar o dia.`
        );
        return;
      }
    }

    setSelectedDays((previous) => {
      const next = new Set(previous);

      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }

      return next;
    });

    ensureDayConfiguration(day);
  }

  function updateDayConfiguration(
    day: WorkoutDayKey,
    data: Partial<
      Pick<DayConfiguration, 'name' | 'notes'>
    >
  ) {
    ensureDayConfiguration(day);

    setDayConfigurations((previous) => ({
      ...previous,
      [day]: {
        localId:
          previous[day]?.localId ||
          createLocalId(),
        name:
          data.name !== undefined
            ? data.name
            : previous[day]?.name || '',
        notes:
          data.notes !== undefined
            ? data.notes
            : previous[day]?.notes || '',
      },
    }));
  }

  function addExerciseToDay(exercise: Exercise) {
    if (!currentDay) return;

    ensureDayConfiguration(currentDay);

    const normalized =
      normalizeExercise(exercise);

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
      technique_type: 'normal',
      technique_config: {},
      exercise_group_local_id: null,
      group_order: null,
      execution_order:
        (exercisesByDay[currentDay] || [])
          .length,
      image_url: normalized.imageUrl || null,
      video_url: normalized.videoUrl || null,
      muscle_group:
        normalized.muscleGroup || null,
      category: normalized.category || null,
      equipment: normalized.equipment || null,
      difficulty:
        normalized.difficulty || null,
      instructions:
        normalized.instructions || null,
      tips: normalized.tips || null,
    };

    setExercisesByDay((previous) => ({
      ...previous,
      [currentDay]: [
        ...(previous[currentDay] || []),
        newExercise,
      ],
    }));

    closeExerciseModal();
  }

  function updateExercise(
    day: WorkoutDayKey,
    localId: string,
    data: Partial<DayExercise>
  ) {
    setExercisesByDay((previous) => ({
      ...previous,
      [day]: (previous[day] || []).map(
        (exercise) =>
          exercise.localId === localId
            ? { ...exercise, ...data }
            : exercise
      ),
    }));
  }

  function changeExerciseTechnique(
    day: WorkoutDayKey,
    exercise: DayExercise,
    technique: WorkoutTechniqueType
  ) {
    if (
      exercise.technique_type === 'bi_set' &&
      technique !== 'bi_set'
    ) {
      const relatedGroup = biSets.find(
        (group) =>
          group.localId ===
          exercise.exercise_group_local_id
      );

      if (relatedGroup) {
        dissolveBiSet(relatedGroup.localId);
        return;
      }
    }

    if (technique === 'drop_set') {
      updateExercise(day, exercise.localId, {
        technique_type: 'drop_set',
        technique_config: {
          drops: 2,
          reduction_percent: 20,
          rest_between_drops_seconds: 0,
          notes: '',
        },
        exercise_group_local_id: null,
        group_order: null,
      });

      return;
    }

    if (technique === 'bi_set') {
      setError(
        'Use o botão “Criar bi-set” do dia para juntar dois exercícios.'
      );
      return;
    }

    updateExercise(day, exercise.localId, {
      technique_type: 'normal',
      technique_config: {},
      exercise_group_local_id: null,
      group_order: null,
    });
  }

  function updateDropSetConfig(
    day: WorkoutDayKey,
    exercise: DayExercise,
    data: Partial<DropSetConfig>
  ) {
    const previousConfig =
      getDropSetConfig(exercise);

    updateExercise(day, exercise.localId, {
      technique_type: 'drop_set',
      technique_config: {
        ...previousConfig,
        ...data,
      },
    });
  }

  function removeExercise(
    day: WorkoutDayKey,
    localId: string
  ) {
    const linkedBiSet = biSets.find(
      (group) =>
        group.firstExerciseLocalId === localId ||
        group.secondExerciseLocalId === localId
    );

    if (linkedBiSet) {
      dissolveBiSet(linkedBiSet.localId);
    }

    setExercisesByDay((previous) => ({
      ...previous,
      [day]: (previous[day] || [])
        .filter(
          (exercise) =>
            exercise.localId !== localId
        )
        .map((exercise, index) => ({
          ...exercise,
          execution_order: index,
        })),
    }));
  }

  function moveExercise(
    day: WorkoutDayKey,
    index: number,
    direction: 'up' | 'down'
  ) {
    const list = [
      ...(exercisesByDay[day] || []),
    ];

    const newIndex =
      direction === 'up' ? index - 1 : index + 1;

    if (
      newIndex < 0 ||
      newIndex >= list.length
    ) {
      return;
    }

    [list[index], list[newIndex]] = [
      list[newIndex],
      list[index],
    ];

    const reordered = list.map(
      (exercise, exerciseIndex) => ({
        ...exercise,
        execution_order: exerciseIndex,
      })
    );

    setExercisesByDay((previous) => ({
      ...previous,
      [day]: reordered,
    }));
  }

  function openBiSetModal(day: WorkoutDayKey) {
    const availableExercises = (
      exercisesByDay[day] || []
    ).filter(
      (exercise) =>
        !exercise.exercise_group_local_id
    );

    if (availableExercises.length < 2) {
      setError(
        'Adicione pelo menos dois exercícios livres neste dia para criar um bi-set.'
      );
      return;
    }

    setBiSetDay(day);
    setBiSetForm({
      ...EMPTY_BI_SET_FORM,
      firstExerciseLocalId:
        availableExercises[0]?.localId || '',
      secondExerciseLocalId:
        availableExercises[1]?.localId || '',
    });
    setShowBiSetModal(true);
    resetMessages();
  }

  function closeBiSetModal() {
    setShowBiSetModal(false);
    setBiSetDay(null);
    setBiSetForm(EMPTY_BI_SET_FORM);
  }

  function createBiSet() {
    if (!biSetDay) return;

    const {
      firstExerciseLocalId,
      secondExerciseLocalId,
    } = biSetForm;

    if (
      !firstExerciseLocalId ||
      !secondExerciseLocalId
    ) {
      setError(
        'Selecione os dois exercícios do bi-set.'
      );
      return;
    }

    if (
      firstExerciseLocalId ===
      secondExerciseLocalId
    ) {
      setError(
        'O primeiro e o segundo exercício precisam ser diferentes.'
      );
      return;
    }

    const rounds = biSetForm.rounds
      ? Number(biSetForm.rounds)
      : null;

    const restAfterSeconds =
      biSetForm.restAfterSeconds
        ? Number(biSetForm.restAfterSeconds)
        : null;

    if (
      rounds !== null &&
      (!Number.isFinite(rounds) || rounds <= 0)
    ) {
      setError(
        'A quantidade de rodadas precisa ser maior que zero.'
      );
      return;
    }

    if (
      restAfterSeconds !== null &&
      (!Number.isFinite(restAfterSeconds) ||
        restAfterSeconds < 0)
    ) {
      setError(
        'O descanso do bi-set não pode ser negativo.'
      );
      return;
    }

    const groupLocalId = createLocalId();
    const dayGroups = biSets.filter(
      (group) => group.dayKey === biSetDay
    );

    const newGroup: LocalBiSet = {
      localId: groupLocalId,
      dayKey: biSetDay,
      firstExerciseLocalId,
      secondExerciseLocalId,
      name: biSetForm.name.trim(),
      rounds,
      restAfterSeconds,
      notes: biSetForm.notes.trim(),
      orderIndex: dayGroups.length,
    };

    setBiSets((previous) => [
      ...previous,
      newGroup,
    ]);

    setExercisesByDay((previous) => ({
      ...previous,
      [biSetDay]: (
        previous[biSetDay] || []
      ).map((exercise) => {
        if (
          exercise.localId ===
          firstExerciseLocalId
        ) {
          return {
            ...exercise,
            technique_type: 'bi_set',
            technique_config: {},
            exercise_group_local_id:
              groupLocalId,
            group_order: 1,
          };
        }

        if (
          exercise.localId ===
          secondExerciseLocalId
        ) {
          return {
            ...exercise,
            technique_type: 'bi_set',
            technique_config: {},
            exercise_group_local_id:
              groupLocalId,
            group_order: 2,
          };
        }

        return exercise;
      }),
    }));

    closeBiSetModal();
    setSuccessMessage(
      'Bi-set criado com sucesso.'
    );
  }

  function dissolveBiSet(groupLocalId: string) {
    const group = biSets.find(
      (item) => item.localId === groupLocalId
    );

    if (!group) return;

    setExercisesByDay((previous) => ({
      ...previous,
      [group.dayKey]: (
        previous[group.dayKey] || []
      ).map((exercise) =>
        exercise.exercise_group_local_id ===
        groupLocalId
          ? {
              ...exercise,
              technique_type: 'normal',
              technique_config: {},
              exercise_group_local_id: null,
              group_order: null,
            }
          : exercise
      ),
    }));

    setBiSets((previous) =>
      previous.filter(
        (item) => item.localId !== groupLocalId
      )
    );

    setSuccessMessage(
      'Bi-set desfeito. Os exercícios foram preservados.'
    );
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

    if (
      startDate &&
      endDate &&
      endDate < startDate
    ) {
      return 'A data de término não pode ser anterior à data de início.';
    }

    if (selectedDays.size === 0) {
      return 'Selecione pelo menos um dia da semana.';
    }

    if (totalSelectedExercises === 0) {
      return 'Adicione pelo menos um exercício no treino.';
    }

    for (const day of selectedDaysArray) {
      const dayExercises =
        exercisesByDay[day] || [];

      for (const exercise of dayExercises) {
        if (!exercise.name.trim()) {
          return `Existe um exercício sem nome em ${getWeekdayName(
            day
          )}.`;
        }

        if (
          exercise.technique_type ===
          'drop_set'
        ) {
          const config =
            getDropSetConfig(exercise);

          if (
            config.drops !== undefined &&
            Number(config.drops) <= 0
          ) {
            return `A quantidade de quedas do drop-set de “${exercise.name}” precisa ser maior que zero.`;
          }

          if (
            config.reduction_percent !==
              undefined &&
            Number(config.reduction_percent) <=
              0
          ) {
            return `O percentual de redução do drop-set de “${exercise.name}” precisa ser maior que zero.`;
          }

          if (
            config.rest_between_drops_seconds !==
              undefined &&
            Number(
              config.rest_between_drops_seconds
            ) < 0
          ) {
            return `O descanso do drop-set de “${exercise.name}” não pode ser negativo.`;
          }
        }
      }
    }

    return '';
  }

  function buildCreateData(): CreateWorkoutData {
    const days: CreateWorkoutDay[] =
      selectedDaysArray.map((day, index) => {
        const configuration =
          dayConfigurations[day];

        return {
          local_id:
            configuration?.localId ||
            createLocalId(),
          weekday: WEEKDAY_NUMBER[day],
          day_key: day,
          order_index: index,
          name:
            configuration?.name.trim() ||
            undefined,
          notes:
            configuration?.notes.trim() ||
            undefined,
        };
      });

    const dayLocalIdByKey = new Map<
      WorkoutDayKey,
      string
    >(
      days.map((day) => [
        day.day_key,
        day.local_id,
      ])
    );

    const groups: CreateWorkoutExerciseGroup[] =
      biSets
        .filter((group) =>
          selectedDays.has(group.dayKey)
        )
        .map((group) => ({
          local_id: group.localId,
          workout_day_local_id:
            dayLocalIdByKey.get(
              group.dayKey
            ) || '',
          group_type: 'bi_set',
          name: group.name || undefined,
          order_index: group.orderIndex,
          rounds: group.rounds,
          rest_after_seconds:
            group.restAfterSeconds,
          notes: group.notes || undefined,
        }));

    const allExercises: CreateExerciseInWorkout[] =
      [];

    selectedDaysArray.forEach((day) => {
      const dayExercises =
        exercisesByDay[day] || [];

      dayExercises.forEach(
        (exercise, index) => {
          allExercises.push({
            local_id: exercise.localId,
            exercise_id:
              exercise.exercise_id,
            day_key: day,
            workout_day_local_id:
              dayLocalIdByKey.get(day) ||
              null,
            exercise_group_local_id:
              exercise.exercise_group_local_id ||
              null,
            technique_type:
              exercise.technique_type ||
              'normal',
            technique_config:
              exercise.technique_config || {},
            group_order:
              exercise.group_order ?? null,
            execution_order: index,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            rest_seconds: Number(
              exercise.rest_seconds || 0
            ),
            suggested_weight:
              exercise.suggested_weight || '',
            observation:
              exercise.observation || '',
            tempo: exercise.tempo || '',
            image_url:
              exercise.image_url || null,
            video_url:
              exercise.video_url || null,
            muscle_group:
              exercise.muscle_group || null,
            category:
              exercise.category || null,
            equipment:
              exercise.equipment || null,
            difficulty:
              exercise.difficulty || null,
            instructions:
              exercise.instructions || null,
            tips: exercise.tips || null,
          });
        }
      );
    });

    return {
      student_id: studentId,
      name: name.trim(),
      objective: objective || undefined,
      level: level || undefined,
      duration_minutes: duration
        ? Number(duration)
        : undefined,
      start_date: startDate || null,
      end_date: endDate || null,
      days,
      groups,
      exercises: allExercises,
    };
  }

  async function handleSave() {
    const validationError =
      validateWorkout();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!trainerProfile?.id) return;

    setSaving(true);
    resetMessages();

    try {
      if (createdPlanId) {
        setSuccessMessage(
          'Este treino já foi salvo. Use “Publicar” para disponibilizá-lo ao aluno.'
        );
        return;
      }

      const plan =
        await workoutService.createWorkoutPlan(
          trainerProfile.id,
          buildCreateData()
        );

      setCreatedPlanId(plan.id);
      setSuccessMessage(
        'Treino salvo como rascunho!'
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao salvar o treino.';

      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    const validationError =
      validateWorkout();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!trainerProfile?.id) return;

    setPublishing(true);
    resetMessages();

    try {
      let planId = createdPlanId;

      if (!planId) {
        const plan =
          await workoutService.createWorkoutPlan(
            trainerProfile.id,
            buildCreateData()
          );

        planId = plan.id;
        setCreatedPlanId(plan.id);
      }

      await workoutService.publishWorkoutPlan(
        planId
      );

      setSuccessMessage(
        'Treino publicado com sucesso! O aluno já pode visualizar esse treino no aplicativo.'
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao publicar o treino.';

      setError(message);
    } finally {
      setPublishing(false);
    }
  }

  async function handleCreateExercise() {
    if (
      !trainerProfile?.id ||
      !newExName.trim()
    ) {
      return;
    }

    setCreatingExercise(true);

    try {
      const exercise =
        await exerciseService.createExercise(
          trainerProfile.id,
          {
            name: newExName.trim(),
            muscle_group:
              newExMuscle || null,
            category:
              newExCategory || null,
            equipment:
              newExEquipment || null,
            difficulty:
              newExDifficulty || null,
            instructions:
              newExInstructions || null,
            tips: null,
          }
        );

      setExercises((previous) => [
        exercise,
        ...previous,
      ]);

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
      console.error(
        '[WorkoutBuilderPage] create exercise error:',
        err
      );
      setError('Erro ao criar exercício.');
    } finally {
      setCreatingExercise(false);
    }
  }

  function openAddExercise(day: WorkoutDayKey) {
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
      <Header
        title="Montar Treino"
        showBack
      />

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
                onChange={(event) =>
                  setStudentSearch(
                    event.target.value
                  )
                }
              />
            </div>

            <div className="max-h-40 space-y-1 overflow-y-auto">
              {filteredStudents.map(
                (student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => {
                      setStudentId(student.id);
                      setStudentSearch(
                        student.name
                      );
                      resetMessages();
                    }}
                    className={cn(
                      'w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors',
                      studentId === student.id
                        ? 'border border-vs-primary/20 bg-vs-primary/10 text-vs-primary'
                        : 'text-vs-text hover:bg-white/5'
                    )}
                  >
                    <span className="font-medium">
                      {student.name}
                    </span>

                    {(student.email ||
                      student.phone) && (
                      <span className="ml-2 text-xs text-vs-muted">
                        {student.email ||
                          student.phone}
                      </span>
                    )}
                  </button>
                )
              )}

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
                    onClick={() =>
                      setObjective(option.value)
                    }
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
                    onClick={() =>
                      setLevel(option.value)
                    }
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
              onChange={(event) =>
                setDuration(event.target.value)
              }
              placeholder="Ex: 60"
              icon={
                <Clock className="h-4 w-4" />
              }
            />

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#ff2a32]" />

                <span className="text-xs font-black uppercase tracking-wide text-white">
                  Período do plano
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Data de início"
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(
                      event.target.value
                    );
                    resetMessages();
                  }}
                />

                <Input
                  label="Data de término"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => {
                    setEndDate(
                      event.target.value
                    );
                    resetMessages();
                  }}
                />
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
                As datas são opcionais. Planos sem
                data final serão exibidos como “Sem
                vencimento”.
              </p>
            </div>
          </div>
        </Card>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-vs-muted">
              Dias da semana
            </h3>

            {totalSelectedExercises > 0 && (
              <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-bold text-vs-muted">
                {totalSelectedExercises}{' '}
                exercício
                {totalSelectedExercises === 1
                  ? ''
                  : 's'}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  'chip transition-all',
                  selectedDays.has(day) &&
                    'chip-active'
                )}
              >
                {getWeekdayName(day).slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {selectedDaysArray.map((day) => {
          const dayExercises =
            exercisesByDay[day] || [];

          const dayBiSets = biSets.filter(
            (group) => group.dayKey === day
          );

          return (
            <Card key={day}>
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-semibold text-white">
                      {getWeekdayName(day)}
                    </h4>

                    <p className="text-[11px] text-zinc-500">
                      {dayExercises.length}{' '}
                      exercício
                      {dayExercises.length === 1
                        ? ''
                        : 's'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        openBiSetModal(day)
                      }
                    >
                      <Layers2 className="h-4 w-4" />
                      Criar bi-set
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        openAddExercise(day)
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Exercício
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      label="Nome do treino do dia"
                      value={
                        dayConfigurations[day]
                          ?.name || ''
                      }
                      onChange={(event) =>
                        updateDayConfiguration(
                          day,
                          {
                            name: event.target.value,
                          }
                        )
                      }
                      placeholder="Ex: Quadríceps"
                    />

                    <Textarea
                      label="Observações do dia"
                      value={
                        dayConfigurations[day]
                          ?.notes || ''
                      }
                      onChange={(event) =>
                        updateDayConfiguration(
                          day,
                          {
                            notes:
                              event.target.value,
                          }
                        )
                      }
                      placeholder="Orientações gerais deste dia"
                      className="min-h-[74px]"
                    />
                  </div>
                </div>

                {dayBiSets.length > 0 && (
                  <div className="space-y-2">
                    {dayBiSets.map((group) => {
                      const firstExercise =
                        dayExercises.find(
                          (exercise) =>
                            exercise.localId ===
                            group.firstExerciseLocalId
                        );

                      const secondExercise =
                        dayExercises.find(
                          (exercise) =>
                            exercise.localId ===
                            group.secondExerciseLocalId
                        );

                      return (
                        <div
                          key={group.localId}
                          className="rounded-2xl border border-purple-400/25 bg-purple-400/10 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="mb-2 flex items-center gap-2">
                                <span className="rounded-full bg-purple-400/20 px-2.5 py-1 text-[10px] font-black text-purple-200">
                                  BI-SET
                                </span>

                                {group.name && (
                                  <span className="truncate text-xs font-bold text-white">
                                    {group.name}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-zinc-300">
                                1.{' '}
                                {firstExercise?.name ||
                                  'Exercício removido'}
                              </p>

                              <p className="mt-1 text-xs text-zinc-300">
                                2.{' '}
                                {secondExercise?.name ||
                                  'Exercício removido'}
                              </p>

                              <p className="mt-2 text-[11px] text-zinc-500">
                                {group.rounds
                                  ? `${group.rounds} rodadas`
                                  : 'Rodadas livres'}
                                {' • '}
                                {group.restAfterSeconds !==
                                null
                                  ? `${group.restAfterSeconds}s de descanso`
                                  : 'Sem descanso definido'}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                dissolveBiSet(
                                  group.localId
                                )
                              }
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-red-300 transition-colors hover:bg-red-500/10"
                              title="Desfazer bi-set"
                            >
                              <Unlink className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {dayExercises.length === 0 ? (
                  <p className="py-4 text-center text-xs text-vs-muted">
                    Nenhum exercício adicionado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dayExercises.map(
                      (exercise, index) => {
                        const dropConfig =
                          getDropSetConfig(
                            exercise
                          );

                        return (
                          <motion.div
                            key={exercise.localId}
                            initial={{
                              opacity: 0,
                              y: 8,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            className="space-y-3 rounded-xl border border-vs-border bg-white/5 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">
                                  {exercise.name}
                                </span>

                                <span
                                  className={cn(
                                    'mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black',
                                    exercise.technique_type ===
                                      'drop_set'
                                      ? 'bg-orange-400/15 text-orange-300'
                                      : exercise.technique_type ===
                                          'bi_set'
                                        ? 'bg-purple-400/15 text-purple-300'
                                        : 'bg-white/5 text-zinc-500'
                                  )}
                                >
                                  {getTechniqueLabel(
                                    exercise.technique_type
                                  )}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    moveExercise(
                                      day,
                                      index,
                                      'up'
                                    )
                                  }
                                  disabled={index === 0}
                                  className="rounded-lg p-1 hover:bg-white/5 disabled:opacity-30"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    moveExercise(
                                      day,
                                      index,
                                      'down'
                                    )
                                  }
                                  disabled={
                                    index ===
                                    dayExercises.length -
                                      1
                                  }
                                  className="rounded-lg p-1 hover:bg-white/5 disabled:opacity-30"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeExercise(
                                      day,
                                      exercise.localId
                                    )
                                  }
                                  className="rounded-lg p-1 text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <span className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
                                Técnica
                              </span>

                              <div className="grid grid-cols-3 gap-2">
                                {TECHNIQUES.map(
                                  (technique) => (
                                    <button
                                      key={
                                        technique.value
                                      }
                                      type="button"
                                      onClick={() =>
                                        changeExerciseTechnique(
                                          day,
                                          exercise,
                                          technique.value
                                        )
                                      }
                                      className={cn(
                                        'min-h-10 rounded-xl border px-2 text-[10px] font-black transition-all',
                                        exercise.technique_type ===
                                          technique.value
                                          ? technique.value ===
                                            'drop_set'
                                            ? 'border-orange-400/40 bg-orange-400/15 text-orange-300'
                                            : technique.value ===
                                                'bi_set'
                                              ? 'border-purple-400/40 bg-purple-400/15 text-purple-300'
                                              : 'border-[#ff2a32]/40 bg-[#ff2a32]/15 text-[#ff2a32]'
                                          : 'border-white/10 bg-black/20 text-zinc-500'
                                      )}
                                    >
                                      {technique.label}
                                    </button>
                                  )
                                )}
                              </div>
                            </div>

                            {exercise.technique_type ===
                              'drop_set' && (
                              <div className="rounded-2xl border border-orange-400/20 bg-orange-400/[0.06] p-3">
                                <div className="mb-3 flex items-center gap-2">
                                  <Zap className="h-4 w-4 text-orange-300" />
                                  <span className="text-[11px] font-black uppercase text-orange-200">
                                    Configuração do
                                    drop-set
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                  <Input
                                    label="Quedas"
                                    type="number"
                                    min="1"
                                    value={
                                      dropConfig.drops ??
                                      ''
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      updateDropSetConfig(
                                        day,
                                        exercise,
                                        {
                                          drops: event
                                            .target
                                            .value
                                            ? Number(
                                                event
                                                  .target
                                                  .value
                                              )
                                            : undefined,
                                        }
                                      )
                                    }
                                  />

                                  <Input
                                    label="Redução (%)"
                                    type="number"
                                    min="1"
                                    value={
                                      dropConfig.reduction_percent ??
                                      ''
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      updateDropSetConfig(
                                        day,
                                        exercise,
                                        {
                                          reduction_percent:
                                            event
                                              .target
                                              .value
                                              ? Number(
                                                  event
                                                    .target
                                                    .value
                                                )
                                              : undefined,
                                        }
                                      )
                                    }
                                  />

                                  <Input
                                    label="Descanso entre quedas"
                                    type="number"
                                    min="0"
                                    value={
                                      dropConfig.rest_between_drops_seconds ??
                                      ''
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      updateDropSetConfig(
                                        day,
                                        exercise,
                                        {
                                          rest_between_drops_seconds:
                                            event
                                              .target
                                              .value
                                              ? Number(
                                                  event
                                                    .target
                                                    .value
                                                )
                                              : 0,
                                        }
                                      )
                                    }
                                  />
                                </div>

                                <Textarea
                                  label="Orientação do drop-set"
                                  value={
                                    dropConfig.notes ||
                                    ''
                                  }
                                  onChange={(event) =>
                                    updateDropSetConfig(
                                      day,
                                      exercise,
                                      {
                                        notes:
                                          event.target
                                            .value,
                                      }
                                    )
                                  }
                                  className="mt-2 min-h-[60px]"
                                />
                              </div>
                            )}

                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                label="Séries"
                                value={exercise.sets}
                                onChange={(event) =>
                                  updateExercise(
                                    day,
                                    exercise.localId,
                                    {
                                      sets: event
                                        .target.value,
                                    }
                                  )
                                }
                              />

                              <Input
                                label="Reps"
                                value={exercise.reps}
                                onChange={(event) =>
                                  updateExercise(
                                    day,
                                    exercise.localId,
                                    {
                                      reps: event
                                        .target.value,
                                    }
                                  )
                                }
                              />

                              <Input
                                label="Descanso (s)"
                                type="number"
                                min="0"
                                value={
                                  exercise.rest_seconds ??
                                  ''
                                }
                                onChange={(event) =>
                                  updateExercise(
                                    day,
                                    exercise.localId,
                                    {
                                      rest_seconds:
                                        Number(
                                          event.target
                                            .value || 0
                                        ),
                                    }
                                  )
                                }
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                label="Carga sugerida"
                                value={
                                  exercise.suggested_weight ||
                                  ''
                                }
                                onChange={(event) =>
                                  updateExercise(
                                    day,
                                    exercise.localId,
                                    {
                                      suggested_weight:
                                        event.target
                                          .value,
                                    }
                                  )
                                }
                                placeholder="Ex: 20kg"
                              />

                              <Input
                                label="Tempo"
                                value={
                                  exercise.tempo || ''
                                }
                                onChange={(event) =>
                                  updateExercise(
                                    day,
                                    exercise.localId,
                                    {
                                      tempo:
                                        event.target
                                          .value,
                                    }
                                  )
                                }
                                placeholder="Ex: 2-0-2-0"
                              />
                            </div>

                            <Textarea
                              label="Observação"
                              value={
                                exercise.observation ||
                                ''
                              }
                              onChange={(event) =>
                                updateExercise(
                                  day,
                                  exercise.localId,
                                  {
                                    observation:
                                      event.target
                                        .value,
                                  }
                                )
                              }
                              className="min-h-[60px]"
                            />
                          </motion.div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}

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

      <Modal
        open={showAddExercise}
        onClose={closeExerciseModal}
        title="Adicionar Exercício"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-vs-muted" />

            <input
              className="input-field pl-10"
              placeholder="Buscar exercícios..."
              value={exerciseSearch}
              onChange={(event) =>
                setExerciseSearch(
                  event.target.value
                )
              }
              autoFocus
            />
          </div>

          {loadingExercises ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-vs-muted" />
            </div>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {filteredExercises.map(
                (exercise) => {
                  const normalized =
                    normalizeExercise(exercise);

                  return (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() =>
                        addExerciseToDay(
                          exercise
                        )
                      }
                      className="flex w-full gap-3 rounded-xl border border-transparent p-2 text-left transition-colors hover:border-vs-border hover:bg-white/5"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-950">
                        {normalized.imageUrl ? (
                          <img
                            src={
                              normalized.imageUrl
                            }
                            alt={exercise.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : normalized.videoUrl ? (
                          <video
                            src={
                              normalized.videoUrl
                            }
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
                        <p className="truncate text-sm font-medium">
                          {exercise.name}
                        </p>

                        <p className="truncate text-xs text-vs-muted">
                          {normalized.category ||
                            normalized.muscleGroup}
                          {normalized.difficulty &&
                            ` • ${normalized.difficulty}`}
                        </p>
                      </div>
                    </button>
                  );
                }
              )}

              {filteredExercises.length === 0 && (
                <p className="py-4 text-center text-xs text-vs-muted">
                  Nenhum exercício encontrado
                </p>
              )}
            </div>
          )}

          <div className="border-t border-vs-border pt-4">
            <p className="mb-3 text-xs text-vs-muted">
              Não encontrou o exercício?
            </p>

            {showNewExercise ? (
              <div className="space-y-3">
                <Input
                  label="Nome"
                  value={newExName}
                  onChange={(event) =>
                    setNewExName(
                      event.target.value
                    )
                  }
                  placeholder="Nome do exercício"
                />

                <Input
                  label="Grupo muscular"
                  value={newExMuscle}
                  onChange={(event) =>
                    setNewExMuscle(
                      event.target.value
                    )
                  }
                  placeholder="Ex: Peito"
                />

                <Input
                  label="Categoria"
                  value={newExCategory}
                  onChange={(event) =>
                    setNewExCategory(
                      event.target.value
                    )
                  }
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
                        onClick={() =>
                          setNewExDifficulty(
                            option.value
                          )
                        }
                        className={cn(
                          'h-11 rounded-2xl border px-2 text-[11px] font-black transition-all active:scale-[0.97]',
                          newExDifficulty ===
                            option.value
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
                  onChange={(event) =>
                    setNewExEquipment(
                      event.target.value
                    )
                  }
                  placeholder="Ex: Halteres"
                />

                <Textarea
                  label="Instruções"
                  value={newExInstructions}
                  onChange={(event) =>
                    setNewExInstructions(
                      event.target.value
                    )
                  }
                />

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() =>
                      setShowNewExercise(false)
                    }
                  >
                    Voltar
                  </Button>

                  <Button
                    className="flex-1"
                    onClick={
                      handleCreateExercise
                    }
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
                onClick={() =>
                  setShowNewExercise(true)
                }
              >
                <Plus className="h-4 w-4" />
                Criar novo exercício
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={showBiSetModal}
        onClose={closeBiSetModal}
        title="Criar Bi-set"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-purple-400/20 bg-purple-400/[0.07] p-4">
            <div className="flex items-center gap-2">
              <Layers2 className="h-5 w-5 text-purple-300" />

              <div>
                <p className="text-sm font-black text-white">
                  Dois exercícios em sequência
                </p>

                <p className="text-xs text-zinc-400">
                  O descanso será feito depois
                  dos dois exercícios.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
              Primeiro exercício
            </label>

            <select
              className="input-field"
              value={
                biSetForm.firstExerciseLocalId
              }
              onChange={(event) =>
                setBiSetForm((previous) => ({
                  ...previous,
                  firstExerciseLocalId:
                    event.target.value,
                }))
              }
            >
              <option value="">
                Selecione
              </option>

              {(biSetDay
                ? exercisesByDay[biSetDay] || []
                : []
              )
                .filter(
                  (exercise) =>
                    !exercise.exercise_group_local_id
                )
                .map((exercise) => (
                  <option
                    key={exercise.localId}
                    value={exercise.localId}
                  >
                    {exercise.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
              Segundo exercício
            </label>

            <select
              className="input-field"
              value={
                biSetForm.secondExerciseLocalId
              }
              onChange={(event) =>
                setBiSetForm((previous) => ({
                  ...previous,
                  secondExerciseLocalId:
                    event.target.value,
                }))
              }
            >
              <option value="">
                Selecione
              </option>

              {(biSetDay
                ? exercisesByDay[biSetDay] || []
                : []
              )
                .filter(
                  (exercise) =>
                    !exercise.exercise_group_local_id
                )
                .map((exercise) => (
                  <option
                    key={exercise.localId}
                    value={exercise.localId}
                  >
                    {exercise.name}
                  </option>
                ))}
            </select>
          </div>

          <Input
            label="Nome do bi-set"
            value={biSetForm.name}
            onChange={(event) =>
              setBiSetForm((previous) => ({
                ...previous,
                name: event.target.value,
              }))
            }
            placeholder="Ex: Bi-set de quadríceps"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Rodadas"
              type="number"
              min="1"
              value={biSetForm.rounds}
              onChange={(event) =>
                setBiSetForm((previous) => ({
                  ...previous,
                  rounds: event.target.value,
                }))
              }
            />

            <Input
              label="Descanso após o bi-set"
              type="number"
              min="0"
              value={
                biSetForm.restAfterSeconds
              }
              onChange={(event) =>
                setBiSetForm((previous) => ({
                  ...previous,
                  restAfterSeconds:
                    event.target.value,
                }))
              }
            />
          </div>

          <Textarea
            label="Observação"
            value={biSetForm.notes}
            onChange={(event) =>
              setBiSetForm((previous) => ({
                ...previous,
                notes: event.target.value,
              }))
            }
            placeholder="Ex: Executar sem descanso entre os exercícios"
          />

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={closeBiSetModal}
            >
              Cancelar
            </Button>

            <Button
              className="flex-1"
              onClick={createBiSet}
            >
              <Layers2 className="h-4 w-4" />
              Criar bi-set
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default WorkoutBuilderPage;