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
  'Hipertrofia',
  'Emagrecimento',
  'Resistência',
  'Força',
  'Condicionamento',
  'Reabilitação',
];

const LEVELS = [
  'Iniciante',
  'Intermediário',
  'Avançado',
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

function createLocalId() {
  if (
    typeof crypto !== 'undefined' &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function normalizeExercise(exercise: Exercise) {
  const record =
    exercise as unknown as Record<string, string>;

  return {
    imageUrl:
      exercise.image_url ||
      record.imageUrl ||
      '',
    videoUrl:
      exercise.video_url ||
      record.videoUrl ||
      '',
    muscleGroup:
      exercise.muscle_group ||
      record.muscleGroup ||
      '',
    category:
      exercise.category ||
      record.category ||
      '',
    difficulty:
      exercise.difficulty ||
      record.difficulty ||
      '',
    equipment:
      exercise.equipment ||
      record.equipment ||
      '',
    instructions:
      exercise.instructions ||
      record.instructions ||
      '',
    tips:
      exercise.tips ||
      record.tips ||
      '',
  };
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
  if (technique === 'drop_set') {
    return 'DROP-SET';
  }

  if (technique === 'bi_set') {
    return 'BI-SET';
  }

  return 'NORMAL';
}

export function WorkoutBuilderPage() {
  const [searchParams] = useSearchParams();

  const { trainerProfile } = useAuthStore();
  const { students, fetchStudents } =
    useStudentStore();

  const [studentId, setStudentId] = useState(
    searchParams.get('studentId') || ''
  );

  const [studentSearch, setStudentSearch] =
    useState('');

  const [name, setName] = useState('');
  const [objective, setObjective] =
    useState('');
  const [level, setLevel] = useState('');
  const [duration, setDuration] =
    useState('');
  const [startDate, setStartDate] =
    useState('');
  const [endDate, setEndDate] =
    useState('');

  const [selectedDays, setSelectedDays] =
    useState<Set<WorkoutDayKey>>(
      new Set()
    );

  const [
    dayConfigurations,
    setDayConfigurations,
  ] = useState<
    Partial<
      Record<
        WorkoutDayKey,
        DayConfiguration
      >
    >
  >({});

  const [
    exercisesByDay,
    setExercisesByDay,
  ] = useState<
    Partial<
      Record<
        WorkoutDayKey,
        DayExercise[]
      >
    >
  >({});

  const [biSets, setBiSets] = useState<
    LocalBiSet[]
  >([]);

  const [error, setError] = useState('');
  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  const [saving, setSaving] =
    useState(false);

  const [publishing, setPublishing] =
    useState(false);

  const [
    createdPlanId,
    setCreatedPlanId,
  ] = useState<string | null>(null);

  const [
    showAddExercise,
    setShowAddExercise,
  ] = useState(false);

  const [currentDay, setCurrentDay] =
    useState<WorkoutDayKey | null>(null);

  const [exercises, setExercises] =
    useState<Exercise[]>([]);

  const [
    exerciseSearch,
    setExerciseSearch,
  ] = useState('');

  const [
    loadingExercises,
    setLoadingExercises,
  ] = useState(false);

  const [
    showNewExercise,
    setShowNewExercise,
  ] = useState(false);

  const [newExName, setNewExName] =
    useState('');

  const [newExMuscle, setNewExMuscle] =
    useState('');

  const [
    newExCategory,
    setNewExCategory,
  ] = useState('');

  const [
    newExDifficulty,
    setNewExDifficulty,
  ] = useState('');

  const [
    newExEquipment,
    setNewExEquipment,
  ] = useState('');

  const [
    newExInstructions,
    setNewExInstructions,
  ] = useState('');

  const [
    creatingExercise,
    setCreatingExercise,
  ] = useState(false);

  const [
    showBiSetModal,
    setShowBiSetModal,
  ] = useState(false);

  const [biSetDay, setBiSetDay] =
    useState<WorkoutDayKey | null>(null);

  const [biSetForm, setBiSetForm] =
    useState<BiSetForm>(
      EMPTY_BI_SET_FORM
    );

  useEffect(() => {
    if (!trainerProfile?.id) return;

    void fetchStudents(
      trainerProfile.id
    );
  }, [
    trainerProfile?.id,
    fetchStudents,
  ]);

  useEffect(() => {
    if (!studentId || studentSearch) {
      return;
    }

    const selectedStudent =
      students.find(
        (student) =>
          student.id === studentId
      );

    if (selectedStudent) {
      setStudentSearch(
        selectedStudent.name
      );
    }
  }, [
    studentId,
    studentSearch,
    students,
  ]);

  useEffect(() => {
    if (!currentDay) return;

    setLoadingExercises(true);

    exerciseService
      .getExercises()
      .then((result) => {
        setExercises(result || []);
      })
      .catch((loadError) => {
        console.error(
          '[WorkoutBuilderPage] exercises:',
          loadError
        );

        setExercises([]);
      })
      .finally(() => {
        setLoadingExercises(false);
      });
  }, [currentDay]);

  const selectedDaysArray =
    useMemo(
      () =>
        DAYS.filter((day) =>
          selectedDays.has(day)
        ),
      [selectedDays]
    );

  const totalSelectedExercises =
    useMemo(() => {
      return selectedDaysArray.reduce(
        (total, day) =>
          total +
          (
            exercisesByDay[day] || []
          ).length,
        0
      );
    }, [
      selectedDaysArray,
      exercisesByDay,
    ]);

  const filteredStudents =
    useMemo(() => {
      const query = studentSearch
        .trim()
        .toLowerCase();

      if (!query) return students;

      return students.filter(
        (student) => {
          const studentName =
            student.name || '';

          const studentEmail =
            student.email || '';

          const studentPhone =
            student.phone || '';

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
        }
      );
    }, [students, studentSearch]);

  const filteredExercises =
    useMemo(() => {
      const query = exerciseSearch
        .trim()
        .toLowerCase();

      if (!query) return exercises;

      return exercises.filter(
        (exercise) => {
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
        }
      );
    }, [exercises, exerciseSearch]);

  function resetMessages() {
    setError('');
    setSuccessMessage('');
  }

  function ensureDay(
    day: WorkoutDayKey
  ) {
    setDayConfigurations(
      (previous) => {
        if (previous[day]) {
          return previous;
        }

        return {
          ...previous,
          [day]: {
            localId:
              createLocalId(),
            name: '',
            notes: '',
          },
        };
      }
    );

    setExercisesByDay(
      (previous) => {
        if (previous[day]) {
          return previous;
        }

        return {
          ...previous,
          [day]: [],
        };
      }
    );
  }

  function toggleDay(
    day: WorkoutDayKey
  ) {
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

      if (
        biSets.some(
          (group) =>
            group.dayKey === day
        )
      ) {
        setError(
          `Desfaça os bi-sets de ${getWeekdayName(
            day
          )} antes de desmarcar o dia.`
        );

        return;
      }
    }

    setSelectedDays((previous) => {
      const next =
        new Set(previous);

      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }

      return next;
    });

    ensureDay(day);
  }

  function updateDayConfiguration(
    day: WorkoutDayKey,
    values: Partial<
      Pick<
        DayConfiguration,
        'name' | 'notes'
      >
    >
  ) {
    ensureDay(day);

    setDayConfigurations(
      (previous) => ({
        ...previous,
        [day]: {
          localId:
            previous[day]?.localId ||
            createLocalId(),
          name:
            values.name !== undefined
              ? values.name
              : previous[day]
                  ?.name || '',
          notes:
            values.notes !==
            undefined
              ? values.notes
              : previous[day]
                  ?.notes || '',
        },
      })
    );
  }

  function openAddExercise(
    day: WorkoutDayKey
  ) {
    resetMessages();
    ensureDay(day);
    setCurrentDay(day);
    setExerciseSearch('');
    setShowNewExercise(false);
    setShowAddExercise(true);
  }

  function closeExerciseModal() {
    setShowAddExercise(false);
    setCurrentDay(null);
    setExerciseSearch('');
    setShowNewExercise(false);
  }

  function addExerciseToDay(
    exercise: Exercise
  ) {
    if (!currentDay) return;

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
      exercise_group_local_id:
        null,
      group_order: null,
      execution_order:
        (
          exercisesByDay[
            currentDay
          ] || []
        ).length,
      image_url:
        normalized.imageUrl ||
        null,
      video_url:
        normalized.videoUrl ||
        null,
      muscle_group:
        normalized.muscleGroup ||
        null,
      category:
        normalized.category ||
        null,
      equipment:
        normalized.equipment ||
        null,
      difficulty:
        normalized.difficulty ||
        null,
      instructions:
        normalized.instructions ||
        null,
      tips:
        normalized.tips ||
        null,
    };

    setExercisesByDay(
      (previous) => ({
        ...previous,
        [currentDay]: [
          ...(
            previous[
              currentDay
            ] || []
          ),
          newExercise,
        ],
      })
    );

    closeExerciseModal();
  }

  function updateExercise(
    day: WorkoutDayKey,
    localId: string,
    values: Partial<DayExercise>
  ) {
    setExercisesByDay(
      (previous) => ({
        ...previous,
        [day]: (
          previous[day] || []
        ).map((exercise) =>
          exercise.localId ===
          localId
            ? {
                ...exercise,
                ...values,
              }
            : exercise
        ),
      })
    );
  }

  function removeExercise(
    day: WorkoutDayKey,
    localId: string
  ) {
    const linkedGroup =
      biSets.find(
        (group) =>
          group.firstExerciseLocalId ===
            localId ||
          group.secondExerciseLocalId ===
            localId
      );

    if (linkedGroup) {
      dissolveBiSet(
        linkedGroup.localId
      );
    }

    setExercisesByDay(
      (previous) => ({
        ...previous,
        [day]: (
          previous[day] || []
        )
          .filter(
            (exercise) =>
              exercise.localId !==
              localId
          )
          .map(
            (
              exercise,
              index
            ) => ({
              ...exercise,
              execution_order:
                index,
            })
          ),
      })
    );
  }

  function moveExercise(
    day: WorkoutDayKey,
    index: number,
    direction: 'up' | 'down'
  ) {
    const list = [
      ...(exercisesByDay[day] ||
        []),
    ];

    const newIndex =
      direction === 'up'
        ? index - 1
        : index + 1;

    if (
      newIndex < 0 ||
      newIndex >= list.length
    ) {
      return;
    }

    [
      list[index],
      list[newIndex],
    ] = [
      list[newIndex],
      list[index],
    ];

    setExercisesByDay(
      (previous) => ({
        ...previous,
        [day]: list.map(
          (exercise, position) => ({
            ...exercise,
            execution_order:
              position,
          })
        ),
      })
    );
  }

  function changeExerciseTechnique(
    day: WorkoutDayKey,
    exercise: DayExercise,
    technique: WorkoutTechniqueType
  ) {
    resetMessages();

    if (
      exercise.technique_type ===
        'bi_set' &&
      technique !== 'bi_set'
    ) {
      const linkedGroup =
        biSets.find(
          (group) =>
            group.localId ===
            exercise.exercise_group_local_id
        );

      if (linkedGroup) {
        dissolveBiSet(
          linkedGroup.localId
        );

        return;
      }
    }

    if (technique === 'bi_set') {
      openBiSetModal(
        day,
        exercise.localId
      );

      return;
    }

    if (technique === 'drop_set') {
      updateExercise(
        day,
        exercise.localId,
        {
          technique_type:
            'drop_set',
          technique_config: {
            drops: 2,
            reduction_percent: 20,
            rest_between_drops_seconds:
              0,
            notes: '',
          },
          exercise_group_local_id:
            null,
          group_order: null,
        }
      );

      return;
    }

    updateExercise(
      day,
      exercise.localId,
      {
        technique_type: 'normal',
        technique_config: {},
        exercise_group_local_id:
          null,
        group_order: null,
      }
    );
  }

  function updateDropSetConfig(
    day: WorkoutDayKey,
    exercise: DayExercise,
    values: Partial<DropSetConfig>
  ) {
    updateExercise(
      day,
      exercise.localId,
      {
        technique_type:
          'drop_set',
        technique_config: {
          ...getDropSetConfig(
            exercise
          ),
          ...values,
        },
      }
    );
  }

  function openBiSetModal(
    day: WorkoutDayKey,
    preferredFirstId?: string
  ) {
    resetMessages();

    const available =
      (
        exercisesByDay[day] ||
        []
      ).filter(
        (exercise) =>
          !exercise.exercise_group_local_id
      );

    if (available.length < 2) {
      setError(
        'Adicione pelo menos dois exercícios livres neste dia para criar um bi-set.'
      );

      return;
    }

    const first =
      available.find(
        (exercise) =>
          exercise.localId ===
          preferredFirstId
      ) || available[0];

    const second =
      available.find(
        (exercise) =>
          exercise.localId !==
          first.localId
      ) || available[1];

    setBiSetDay(day);

    setBiSetForm({
      ...EMPTY_BI_SET_FORM,
      firstExerciseLocalId:
        first.localId,
      secondExerciseLocalId:
        second.localId,
    });

    setShowBiSetModal(true);
  }

  function closeBiSetModal() {
    setShowBiSetModal(false);
    setBiSetDay(null);
    setBiSetForm(
      EMPTY_BI_SET_FORM
    );
  }

  function createBiSet() {
    if (!biSetDay) return;

    const firstId =
      biSetForm.firstExerciseLocalId;

    const secondId =
      biSetForm.secondExerciseLocalId;

    if (!firstId || !secondId) {
      setError(
        'Selecione os dois exercícios do bi-set.'
      );

      return;
    }

    if (firstId === secondId) {
      setError(
        'Selecione dois exercícios diferentes.'
      );

      return;
    }

    const rounds =
      biSetForm.rounds
        ? Number(
            biSetForm.rounds
          )
        : null;

    const restAfterSeconds =
      biSetForm.restAfterSeconds
        ? Number(
            biSetForm.restAfterSeconds
          )
        : null;

    if (
      rounds !== null &&
      (!Number.isFinite(
        rounds
      ) ||
        rounds <= 0)
    ) {
      setError(
        'A quantidade de rodadas precisa ser maior que zero.'
      );

      return;
    }

    if (
      restAfterSeconds !== null &&
      (!Number.isFinite(
        restAfterSeconds
      ) ||
        restAfterSeconds < 0)
    ) {
      setError(
        'O descanso não pode ser negativo.'
      );

      return;
    }

    const localId =
      createLocalId();

    const group: LocalBiSet = {
      localId,
      dayKey: biSetDay,
      firstExerciseLocalId:
        firstId,
      secondExerciseLocalId:
        secondId,
      name:
        biSetForm.name.trim(),
      rounds,
      restAfterSeconds,
      notes:
        biSetForm.notes.trim(),
      orderIndex: biSets.filter(
        (item) =>
          item.dayKey ===
          biSetDay
      ).length,
    };

    setBiSets((previous) => [
      ...previous,
      group,
    ]);

    setExercisesByDay(
      (previous) => ({
        ...previous,
        [biSetDay]: (
          previous[biSetDay] ||
          []
        ).map((exercise) => {
          if (
            exercise.localId ===
            firstId
          ) {
            return {
              ...exercise,
              technique_type:
                'bi_set',
              technique_config:
                {},
              exercise_group_local_id:
                localId,
              group_order: 1,
            };
          }

          if (
            exercise.localId ===
            secondId
          ) {
            return {
              ...exercise,
              technique_type:
                'bi_set',
              technique_config:
                {},
              exercise_group_local_id:
                localId,
              group_order: 2,
            };
          }

          return exercise;
        }),
      })
    );

    closeBiSetModal();

    setSuccessMessage(
      'Bi-set criado com sucesso.'
    );
  }

  function dissolveBiSet(
    groupLocalId: string
  ) {
    const group = biSets.find(
      (item) =>
        item.localId ===
        groupLocalId
    );

    if (!group) return;

    setExercisesByDay(
      (previous) => ({
        ...previous,
        [group.dayKey]: (
          previous[
            group.dayKey
          ] || []
        ).map((exercise) =>
          exercise.exercise_group_local_id ===
          groupLocalId
            ? {
                ...exercise,
                technique_type:
                  'normal',
                technique_config:
                  {},
                exercise_group_local_id:
                  null,
                group_order: null,
              }
            : exercise
        ),
      })
    );

    setBiSets((previous) =>
      previous.filter(
        (item) =>
          item.localId !==
          groupLocalId
      )
    );

    setSuccessMessage(
      'Bi-set desfeito.'
    );
  }

  function validateWorkout() {
    if (!trainerProfile?.id) {
      return 'Personal não identificado.';
    }

    if (!studentId) {
      return 'Selecione um aluno.';
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

    if (
      selectedDaysArray.length ===
      0
    ) {
      return 'Selecione pelo menos um dia.';
    }

    if (
      totalSelectedExercises ===
      0
    ) {
      return 'Adicione pelo menos um exercício.';
    }

    return '';
  }

  function buildCreateData(): CreateWorkoutData {
    const days: CreateWorkoutDay[] =
      selectedDaysArray.map(
        (day, index) => {
          const configuration =
            dayConfigurations[
              day
            ];

          return {
            local_id:
              configuration?.localId ||
              createLocalId(),
            weekday:
              WEEKDAY_NUMBER[day],
            day_key: day,
            order_index: index,
            name:
              configuration?.name.trim() ||
              undefined,
            notes:
              configuration?.notes.trim() ||
              undefined,
          };
        }
      );

    const dayIds = new Map<
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
          selectedDays.has(
            group.dayKey
          )
        )
        .map((group) => ({
          local_id:
            group.localId,
          workout_day_local_id:
            dayIds.get(
              group.dayKey
            ) || '',
          group_type: 'bi_set',
          name:
            group.name ||
            undefined,
          order_index:
            group.orderIndex,
          rounds: group.rounds,
          rest_after_seconds:
            group.restAfterSeconds,
          notes:
            group.notes ||
            undefined,
        }));

    const workoutExercises: CreateExerciseInWorkout[] =
      [];

    selectedDaysArray.forEach(
      (day) => {
        const dayExercises =
          exercisesByDay[day] ||
          [];

        dayExercises.forEach(
          (exercise, index) => {
            workoutExercises.push({
              local_id:
                exercise.localId,
              exercise_id:
                exercise.exercise_id,
              day_key: day,
              workout_day_local_id:
                dayIds.get(day) ||
                null,
              exercise_group_local_id:
                exercise.exercise_group_local_id ||
                null,
              technique_type:
                exercise.technique_type ||
                'normal',
              technique_config:
                exercise.technique_config ||
                {},
              group_order:
                exercise.group_order ??
                null,
              execution_order:
                index,
              name:
                exercise.name,
              sets:
                exercise.sets,
              reps:
                exercise.reps,
              rest_seconds:
                Number(
                  exercise.rest_seconds ||
                    0
                ),
              suggested_weight:
                exercise.suggested_weight ||
                '',
              observation:
                exercise.observation ||
                '',
              tempo:
                exercise.tempo ||
                '',
              image_url:
                exercise.image_url ||
                null,
              video_url:
                exercise.video_url ||
                null,
              muscle_group:
                exercise.muscle_group ||
                null,
              category:
                exercise.category ||
                null,
              equipment:
                exercise.equipment ||
                null,
              difficulty:
                exercise.difficulty ||
                null,
              instructions:
                exercise.instructions ||
                null,
              tips:
                exercise.tips ||
                null,
            });
          }
        );
      }
    );

    return {
      student_id: studentId,
      name: name.trim(),
      objective:
        objective ||
        undefined,
      level:
        level || undefined,
      duration_minutes:
        duration
          ? Number(duration)
          : undefined,
      start_date:
        startDate || null,
      end_date:
        endDate || null,
      days,
      groups,
      exercises:
        workoutExercises,
    };
  }

  async function handleSave() {
    const validationError =
      validateWorkout();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!trainerProfile?.id) {
      return;
    }

    setSaving(true);
    resetMessages();

    try {
      if (createdPlanId) {
        setSuccessMessage(
          'O treino já foi salvo. Agora você pode publicá-lo.'
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
        'Treino salvo como rascunho.'
      );
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Erro ao salvar treino.'
      );
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

    if (!trainerProfile?.id) {
      return;
    }

    setPublishing(true);
    resetMessages();

    try {
      let planId =
        createdPlanId;

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
        'Treino publicado com sucesso.'
      );
    } catch (
      publishError: unknown
    ) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : 'Erro ao publicar treino.'
      );
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
    setError('');

    try {
      const created =
        await exerciseService.createExercise(
          trainerProfile.id,
          {
            name:
              newExName.trim(),
            muscle_group:
              newExMuscle ||
              null,
            category:
              newExCategory ||
              null,
            equipment:
              newExEquipment ||
              null,
            difficulty:
              newExDifficulty ||
              null,
            instructions:
              newExInstructions ||
              null,
            tips: null,
          }
        );

      setExercises((previous) => [
        created,
        ...previous,
      ]);

      addExerciseToDay(created);

      setNewExName('');
      setNewExMuscle('');
      setNewExCategory('');
      setNewExDifficulty('');
      setNewExEquipment('');
      setNewExInstructions('');
      setShowNewExercise(false);
    } catch (createError) {
      console.error(
        '[WorkoutBuilderPage] create exercise:',
        createError
      );

      setError(
        'Erro ao criar exercício.'
      );
    } finally {
      setCreatingExercise(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header
        title="Montar Treino"
        showBack
      />

      <div className="page-container space-y-5 pb-36">
        {successMessage && (
          <motion.div
            initial={{
              opacity: 0,
              y: -8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          >
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{
              opacity: 0,
              y: -8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            <AlertCircle className="h-4 w-4" />
            {error}
          </motion.div>
        )}

        <Card>
          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

              <input
                value={studentSearch}
                onChange={(event) => {
                  setStudentSearch(
                    event.target.value
                  );

                  if (
                    studentId
                  ) {
                    setStudentId('');
                  }
                }}
                placeholder="Buscar aluno..."
                className="input-field pl-10"
              />
            </div>

            <div className="max-h-44 space-y-1 overflow-y-auto">
              {filteredStudents.map(
                (student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => {
                      setStudentId(
                        student.id
                      );

                      setStudentSearch(
                        student.name
                      );
                    }}
                    className={cn(
                      'w-full rounded-xl px-4 py-3 text-left text-sm',
                      studentId ===
                        student.id
                        ? 'border border-[#ff2a32]/30 bg-[#ff2a32]/15 text-[#ff2a32]'
                        : 'text-zinc-300 hover:bg-white/5'
                    )}
                  >
                    <p className="font-black">
                      {student.name}
                    </p>

                    <p className="text-xs text-zinc-500">
                      {student.email ||
                        student.phone}
                    </p>
                  </button>
                )
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <Input
              label="Nome do treino"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Ex: Plano de hipertrofia"
            />

            <div>
              <p className="mb-2 text-[11px] font-black uppercase text-zinc-500">
                Objetivo
              </p>

              <div className="grid grid-cols-2 gap-2">
                {OBJECTIVES.map(
                  (option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setObjective(
                          option
                        )
                      }
                      className={cn(
                        'min-h-11 rounded-2xl border px-3 text-[11px] font-black',
                        objective ===
                          option
                          ? 'border-[#ff2a32]/40 bg-[#ff2a32]/15 text-[#ff2a32]'
                          : 'border-white/10 bg-white/[0.04] text-zinc-400'
                      )}
                    >
                      {option}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-black uppercase text-zinc-500">
                Nível
              </p>

              <div className="grid grid-cols-3 gap-2">
                {LEVELS.map(
                  (option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setLevel(
                          option
                        )
                      }
                      className={cn(
                        'h-11 rounded-2xl border px-2 text-[10px] font-black',
                        level ===
                          option
                          ? 'border-[#ff2a32]/40 bg-[#ff2a32]/15 text-[#ff2a32]'
                          : 'border-white/10 bg-white/[0.04] text-zinc-400'
                      )}
                    >
                      {option}
                    </button>
                  )
                )}
              </div>
            </div>

            <Input
              label="Duração em minutos"
              type="number"
              min="1"
              value={duration}
              onChange={(event) =>
                setDuration(
                  event.target.value
                )
              }
              icon={
                <Clock className="h-4 w-4" />
              }
            />

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#ff2a32]" />

                <p className="text-xs font-black uppercase">
                  Período
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Data inicial"
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(
                      event.target.value
                    )
                  }
                />

                <Input
                  label="Data final"
                  type="date"
                  min={
                    startDate ||
                    undefined
                  }
                  value={endDate}
                  onChange={(event) =>
                    setEndDate(
                      event.target.value
                    )
                  }
                />
              </div>
            </div>
          </div>
        </Card>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black">
              Dias da semana
            </p>

            <span className="text-xs text-zinc-500">
              {totalSelectedExercises}{' '}
              exercícios
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() =>
                  toggleDay(day)
                }
                className={cn(
                  'rounded-full border px-4 py-2 text-[11px] font-black uppercase',
                  selectedDays.has(
                    day
                  )
                    ? 'border-[#ff2a32] bg-[#ff2a32] text-white'
                    : 'border-white/10 bg-white/[0.04] text-zinc-500'
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </section>

        {selectedDaysArray.map(
          (day) => {
            const dayExercises =
              exercisesByDay[day] ||
              [];

            const dayBiSets =
              biSets.filter(
                (group) =>
                  group.dayKey ===
                  day
              );

            return (
              <Card key={day}>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-black">
                        {getWeekdayName(
                          day
                        )}
                      </h2>

                      <p className="text-xs text-zinc-500">
                        {
                          dayExercises.length
                        }{' '}
                        exercícios
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          openBiSetModal(
                            day
                          )
                        }
                      >
                        <Layers2 className="h-4 w-4" />
                        Bi-set
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          openAddExercise(
                            day
                          )
                        }
                      >
                        <Plus className="h-4 w-4" />
                        Exercício
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 sm:grid-cols-2">
                    <Input
                      label="Nome do treino do dia"
                      value={
                        dayConfigurations[
                          day
                        ]?.name || ''
                      }
                      onChange={(event) =>
                        updateDayConfiguration(
                          day,
                          {
                            name:
                              event
                                .target
                                .value,
                          }
                        )
                      }
                      placeholder="Ex: Quadríceps"
                    />

                    <Textarea
                      label="Orientações do dia"
                      value={
                        dayConfigurations[
                          day
                        ]?.notes || ''
                      }
                      onChange={(event) =>
                        updateDayConfiguration(
                          day,
                          {
                            notes:
                              event
                                .target
                                .value,
                          }
                        )
                      }
                    />
                  </div>

                  {dayBiSets.map(
                    (group) => {
                      const first =
                        dayExercises.find(
                          (exercise) =>
                            exercise.localId ===
                            group.firstExerciseLocalId
                        );

                      const second =
                        dayExercises.find(
                          (exercise) =>
                            exercise.localId ===
                            group.secondExerciseLocalId
                        );

                      return (
                        <div
                          key={
                            group.localId
                          }
                          className="rounded-2xl border border-purple-400/25 bg-purple-400/10 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase text-purple-300">
                                Bi-set
                              </p>

                              <p className="mt-2 text-sm font-black">
                                {first?.name ||
                                  'Exercício 1'}
                                {' + '}
                                {second?.name ||
                                  'Exercício 2'}
                              </p>

                              <p className="mt-1 text-xs text-zinc-400">
                                {group.rounds ||
                                  0}{' '}
                                rodadas •{' '}
                                {group.restAfterSeconds ??
                                  0}
                                s de descanso
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                dissolveBiSet(
                                  group.localId
                                )
                              }
                              className="rounded-xl p-2 text-red-300 hover:bg-red-500/10"
                            >
                              <Unlink className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )}

                  {dayExercises.length ===
                  0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                      <Dumbbell className="mx-auto h-8 w-8 text-zinc-700" />

                      <p className="mt-2 text-xs text-zinc-500">
                        Nenhum exercício adicionado.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dayExercises.map(
                        (
                          exercise,
                          index
                        ) => {
                          const dropConfig =
                            getDropSetConfig(
                              exercise
                            );

                          return (
                            <motion.div
                              key={
                                exercise.localId
                              }
                              initial={{
                                opacity: 0,
                                y: 8,
                              }}
                              animate={{
                                opacity: 1,
                                y: 0,
                              }}
                              className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h3 className="truncate text-sm font-black">
                                    {
                                      exercise.name
                                    }
                                  </h3>

                                  <span
                                    className={cn(
                                      'mt-1 inline-flex rounded-full px-2 py-1 text-[9px] font-black',
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

                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    disabled={
                                      index ===
                                      0
                                    }
                                    onClick={() =>
                                      moveExercise(
                                        day,
                                        index,
                                        'up'
                                      )
                                    }
                                    className="rounded-lg p-1.5 disabled:opacity-30"
                                  >
                                    <ChevronUp className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      index ===
                                      dayExercises.length -
                                        1
                                    }
                                    onClick={() =>
                                      moveExercise(
                                        day,
                                        index,
                                        'down'
                                      )
                                    }
                                    className="rounded-lg p-1.5 disabled:opacity-30"
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
                                    className="rounded-lg p-1.5 text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              <div>
                                <p className="mb-2 text-[10px] font-black uppercase text-zinc-500">
                                  Técnica
                                </p>

                                <div className="grid grid-cols-3 gap-2">
                                  {(
                                    [
                                      'normal',
                                      'drop_set',
                                      'bi_set',
                                    ] as WorkoutTechniqueType[]
                                  ).map(
                                    (
                                      technique
                                    ) => (
                                      <button
                                        key={
                                          technique
                                        }
                                        type="button"
                                        onClick={() =>
                                          changeExerciseTechnique(
                                            day,
                                            exercise,
                                            technique
                                          )
                                        }
                                        className={cn(
                                          'min-h-10 rounded-xl border px-2 text-[10px] font-black',
                                          exercise.technique_type ===
                                            technique
                                            ? technique ===
                                              'drop_set'
                                              ? 'border-orange-400/40 bg-orange-400/15 text-orange-300'
                                              : technique ===
                                                  'bi_set'
                                                ? 'border-purple-400/40 bg-purple-400/15 text-purple-300'
                                                : 'border-[#ff2a32]/40 bg-[#ff2a32]/15 text-[#ff2a32]'
                                            : 'border-white/10 bg-black/20 text-zinc-500'
                                        )}
                                      >
                                        {technique ===
                                        'drop_set'
                                          ? 'Drop-set'
                                          : technique ===
                                              'bi_set'
                                            ? 'Bi-set'
                                            : 'Normal'}
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>

                              {exercise.technique_type ===
                                'drop_set' && (
                                <div className="space-y-3 rounded-2xl border border-orange-400/20 bg-orange-400/[0.06] p-3">
                                  <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-orange-300" />

                                    <p className="text-[10px] font-black uppercase text-orange-300">
                                      Configuração do drop-set
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2">
                                    <Input
                                      label="Quedas"
                                      type="number"
                                      min="1"
                                      value={
                                        dropConfig.drops ??
                                        ''
                                      }
                                      onChange={(event) =>
                                        updateDropSetConfig(
                                          day,
                                          exercise,
                                          {
                                            drops:
                                              event.target.value
                                                ? Number(
                                                    event.target.value
                                                  )
                                                : undefined,
                                          }
                                        )
                                      }
                                    />

                                    <Input
                                      label="Redução %"
                                      type="number"
                                      min="1"
                                      value={
                                        dropConfig.reduction_percent ??
                                        ''
                                      }
                                      onChange={(event) =>
                                        updateDropSetConfig(
                                          day,
                                          exercise,
                                          {
                                            reduction_percent:
                                              event.target.value
                                                ? Number(
                                                    event.target.value
                                                  )
                                                : undefined,
                                          }
                                        )
                                      }
                                    />

                                    <Input
                                      label="Descanso"
                                      type="number"
                                      min="0"
                                      value={
                                        dropConfig.rest_between_drops_seconds ??
                                        ''
                                      }
                                      onChange={(event) =>
                                        updateDropSetConfig(
                                          day,
                                          exercise,
                                          {
                                            rest_between_drops_seconds:
                                              Number(
                                                event.target.value ||
                                                  0
                                              ),
                                          }
                                        )
                                      }
                                    />
                                  </div>

                                  <Textarea
                                    label="Orientação"
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
                                            event.target.value,
                                        }
                                      )
                                    }
                                  />
                                </div>
                              )}

                              <div className="grid grid-cols-3 gap-2">
                                <Input
                                  label="Séries"
                                  value={
                                    exercise.sets
                                  }
                                  onChange={(event) =>
                                    updateExercise(
                                      day,
                                      exercise.localId,
                                      {
                                        sets:
                                          event.target.value,
                                      }
                                    )
                                  }
                                />

                                <Input
                                  label="Reps"
                                  value={
                                    exercise.reps
                                  }
                                  onChange={(event) =>
                                    updateExercise(
                                      day,
                                      exercise.localId,
                                      {
                                        reps:
                                          event.target.value,
                                      }
                                    )
                                  }
                                />

                                <Input
                                  label="Descanso"
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
                                            event.target.value ||
                                              0
                                          ),
                                      }
                                    )
                                  }
                                />
                              </div>

                              <div className="grid gap-2 sm:grid-cols-2">
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
                                          event.target.value,
                                      }
                                    )
                                  }
                                />

                                <Input
                                  label="Tempo"
                                  value={
                                    exercise.tempo ||
                                    ''
                                  }
                                  onChange={(event) =>
                                    updateExercise(
                                      day,
                                      exercise.localId,
                                      {
                                        tempo:
                                          event.target.value,
                                      }
                                    )
                                  }
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
                                        event.target.value,
                                    }
                                  )
                                }
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
          }
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            onClick={() =>
              void handleSave()
            }
            loading={saving}
            disabled={
              saving ||
              publishing
            }
          >
            <Save className="h-4 w-4" />
            Salvar
          </Button>

          <Button
            onClick={() =>
              void handlePublish()
            }
            loading={publishing}
            disabled={
              saving ||
              publishing
            }
          >
            <Send className="h-4 w-4" />
            Publicar
          </Button>
        </div>
      </div>

      <Modal
        open={showAddExercise}
        onClose={closeExerciseModal}
        title={
          currentDay
            ? `Adicionar em ${getWeekdayName(
                currentDay
              )}`
            : 'Adicionar exercício'
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

            <input
              value={exerciseSearch}
              onChange={(event) =>
                setExerciseSearch(
                  event.target.value
                )
              }
              placeholder="Buscar exercício..."
              className="input-field pl-10"
            />
          </div>

          {loadingExercises ? (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                  <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {filteredExercises.map(
                (exercise) => {
                  const normalized =
                    normalizeExercise(
                      exercise
                    );

                   return (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() =>
                        addExerciseToDay(
                          exercise
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/30">
                        {normalized.imageUrl ? (
                          <img
                            src={
                              normalized.imageUrl
                            }
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
                          {normalized.category ||
                            normalized.muscleGroup ||
                            'Exercício'}
                        </p>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}

          <div className="border-t border-white/10 pt-4">
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
                />

                <Input
                  label="Grupo muscular"
                  value={newExMuscle}
                  onChange={(event) =>
                    setNewExMuscle(
                      event.target.value
                    )
                  }
                />

                <Input
                  label="Categoria"
                  value={newExCategory}
                  onChange={(event) =>
                    setNewExCategory(
                      event.target.value
                    )
                  }
                />

                <Input
                  label="Equipamento"
                  value={newExEquipment}
                  onChange={(event) =>
                    setNewExEquipment(
                      event.target.value
                    )
                  }
                />

                <div>
                  <p className="mb-2 text-[10px] font-black uppercase text-zinc-500">
                    Dificuldade
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {LEVELS.map(
                      (option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            setNewExDifficulty(
                              option
                            )
                          }
                          className={cn(
                            'h-10 rounded-xl border text-[10px] font-black',
                            newExDifficulty ===
                              option
                              ? 'border-[#ff2a32]/40 bg-[#ff2a32]/15 text-[#ff2a32]'
                              : 'border-white/10 text-zinc-500'
                          )}
                        >
                          {option}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <Textarea
                  label="Instruções"
                  value={
                    newExInstructions
                  }
                  onChange={(event) =>
                    setNewExInstructions(
                      event.target.value
                    )
                  }
                />

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setShowNewExercise(
                        false
                      )
                    }
                  >
                    Cancelar
                  </Button>

                  <Button
                    onClick={() =>
                      void handleCreateExercise()
                    }
                    loading={
                      creatingExercise
                    }
                  >
                    Criar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() =>
                  setShowNewExercise(
                    true
                  )
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
        title="Criar bi-set"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-purple-400/20 bg-purple-400/[0.07] p-4">
            <div className="flex gap-3">
              <Layers2 className="h-5 w-5 shrink-0 text-purple-300" />

              <div>
                <p className="text-sm font-black">
                  Dois exercícios em sequência
                </p>

                <p className="mt-1 text-xs text-zinc-400">
                  O aluno executará o primeiro e o segundo exercício sem descanso entre eles.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase text-zinc-500">
              Primeiro exercício
            </label>

            <select
              className="input-field"
              value={
                biSetForm.firstExerciseLocalId
              }
              onChange={(event) =>
                setBiSetForm(
                  (previous) => ({
                    ...previous,
                    firstExerciseLocalId:
                      event.target.value,
                  })
                )
              }
            >
              <option value="">
                Selecione
              </option>

              {(
                biSetDay
                  ? exercisesByDay[
                      biSetDay
                    ] || []
                  : []
              )
                .filter(
                  (exercise) =>
                    !exercise.exercise_group_local_id
                )
                .map((exercise) => (
                  <option
                    key={
                      exercise.localId
                    }
                    value={
                      exercise.localId
                    }
                  >
                    {exercise.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase text-zinc-500">
              Segundo exercício
            </label>

            <select
              className="input-field"
              value={
                biSetForm.secondExerciseLocalId
              }
              onChange={(event) =>
                setBiSetForm(
                  (previous) => ({
                    ...previous,
                    secondExerciseLocalId:
                      event.target.value,
                  })
                )
              }
            >
              <option value="">
                Selecione
              </option>

              {(
                biSetDay
                  ? exercisesByDay[
                      biSetDay
                    ] || []
                  : []
              )
                .filter(
                  (exercise) =>
                    !exercise.exercise_group_local_id
                )
                .map((exercise) => (
                  <option
                    key={
                      exercise.localId
                    }
                    value={
                      exercise.localId
                    }
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
              setBiSetForm(
                (previous) => ({
                  ...previous,
                  name:
                    event.target.value,
                })
              )
            }
            placeholder="Ex: Bi-set de quadríceps"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Rodadas"
              type="number"
              min="1"
              value={
                biSetForm.rounds
              }
              onChange={(event) =>
                setBiSetForm(
                  (previous) => ({
                    ...previous,
                    rounds:
                      event.target.value,
                  })
                )
              }
            />

            <Input
              label="Descanso após"
              type="number"
              min="0"
              value={
                biSetForm.restAfterSeconds
              }
              onChange={(event) =>
                setBiSetForm(
                  (previous) => ({
                    ...previous,
                    restAfterSeconds:
                      event.target.value,
                  })
                )
              }
            />
          </div>

          <Textarea
            label="Orientação"
            value={biSetForm.notes}
            onChange={(event) =>
              setBiSetForm(
                (previous) => ({
                  ...previous,
                  notes:
                    event.target.value,
                })
              )
            }
            placeholder="Ex: Sem descanso entre os exercícios"
          />

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              onClick={
                closeBiSetModal
              }
            >
              Cancelar
            </Button>

            <Button
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