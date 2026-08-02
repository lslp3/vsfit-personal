import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  Send,
  Trash2,
  Unlink,
  User,
} from 'lucide-react';

import { Header } from '../../components/ui/Header';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { ExercisePickerModal, type NewExerciseData } from '../../components/personal/ExercisePickerModal';
import {
  TECHNIQUE_OPTIONS,
  TechniqueConfigPanels,
  getTechniqueOption,
  type ExerciseConfigValues,
} from '../../components/personal/ExerciseConfigFields';
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
import { isWorkoutDayKey } from '../../types/workout';
import type {
  CompleteWorkoutPlan,
  Exercise,
  WorkoutDay,
  WorkoutExerciseGroup,
  WorkoutPlanExercise,
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
  id?: string;
  localId: string;
  name: string;
  notes: string;
}

interface LocalBiSet {
  id?: string;
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

  const values = new Uint32Array(1);
  crypto.getRandomValues(values);

  return `${Date.now()}-${values[0].toString(16)}`;
}

// ─── RASCUNHO AUTOMÁTICO (localStorage) ─────────────────────────
// O builder mantém todo o estado só em memória React: ao trocar de app
// ou a activity/webview recarregar, o treino montado se perde. Um rascunho
// é gravado em localStorage após cada edição e restaurado ao reabrir a tela.
const DRAFT_KEY = 'vsfit_workout_draft_v1';
const DRAFT_VERSION = 1;

interface WorkoutDraftState {
  version: number;
  savedAt: number;
  studentId: string;
  name: string;
  objective: string;
  level: string;
  duration: string;
  startDate: string;
  endDate: string;
  selectedDays: WorkoutDayKey[];
  dayConfigurations: Partial<Record<WorkoutDayKey, DayConfiguration>>;
  exercisesByDay: Partial<Record<WorkoutDayKey, DayExercise[]>>;
  biSets: LocalBiSet[];
}

interface WorkoutDraftInput {
  studentId: string;
  name: string;
  objective: string;
  level: string;
  duration: string;
  startDate: string;
  endDate: string;
  selectedDays: WorkoutDayKey[];
  dayConfigurations: Partial<Record<WorkoutDayKey, DayConfiguration>>;
  exercisesByDay: Partial<Record<WorkoutDayKey, DayExercise[]>>;
  biSets: LocalBiSet[];
}

function buildDraftPayload(
  input: WorkoutDraftInput
): WorkoutDraftState {
  return {
    version: DRAFT_VERSION,
    savedAt: Date.now(),
    ...input,
  };
}

function loadWorkoutDraft(): WorkoutDraftState | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as WorkoutDraftState;

    if (
      !parsed ||
      parsed.version !== DRAFT_VERSION ||
      typeof parsed !== 'object'
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function saveWorkoutDraft(draft: WorkoutDraftState) {
  try {
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify(draft)
    );
  } catch {
    // Quota/private mode — ignora silenciosamente.
  }
}

function clearWorkoutDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

function draftHasContent(
  draft: WorkoutDraftState
) {
  return Boolean(
    draft.name.trim() ||
      draft.objective.trim() ||
      draft.level.trim() ||
      draft.duration.trim() ||
      draft.startDate ||
      draft.endDate ||
      draft.selectedDays.length > 0 ||
      Object.keys(draft.dayConfigurations).length > 0 ||
      Object.keys(draft.exercisesByDay).length > 0 ||
      draft.biSets.length > 0
  );
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

function getExerciseTechniqueConfig<
  T extends object
>(
  exercise: DayExercise
): T {
  const config = exercise.technique_config;

  if (
    config &&
    typeof config === 'object' &&
    !Array.isArray(config)
  ) {
    return config as T;
  }

  return {} as T;
}

function getTechniqueLabel(
  technique?: WorkoutTechniqueType
) {
  if (!technique || technique === 'normal') {
    return 'NORMAL';
  }

  return (
    getTechniqueOption(technique)?.label.toUpperCase() ||
    'NORMAL'
  );
}

/**
 * Ordena os exercícios de um dia para persistência do execution_order:
 * preserva a ordem visual dos exercícios normais e mantém os blocos de
 * bi-set adjacentes (group_order 1 antes do 2), na posição do primeiro
 * membro do grupo. Não muta o array de origem.
 */
function orderExercisesForDay(
  exercises: DayExercise[]
): DayExercise[] {
  const byGroup = new Map<
    string,
    DayExercise[]
  >();

  for (const exercise of exercises) {
    const groupLocalId =
      exercise.exercise_group_local_id;

    if (!groupLocalId) continue;

    const bucket =
      byGroup.get(groupLocalId) || [];

    bucket.push(exercise);
    byGroup.set(groupLocalId, bucket);
  }

  const emitted = new Set<string>();
  const ordered: DayExercise[] = [];

  for (const exercise of exercises) {
    const groupLocalId =
      exercise.exercise_group_local_id;

    if (!groupLocalId) {
      ordered.push(exercise);
      continue;
    }

    if (emitted.has(groupLocalId)) {
      continue;
    }

    const members = byGroup.get(
      groupLocalId
    ) || [];

    ordered.push(
      ...[...members].sort(
        (a, b) =>
          (a.group_order ?? 0) -
          (b.group_order ?? 0)
      )
    );

    emitted.add(groupLocalId);
  }

  return ordered;
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

  // Issue 2: cards de exercício em acordeão — localIds expandidos.
  const [
    expandedExercises,
    setExpandedExercises,
  ] = useState<Set<string>>(new Set());

  function toggleExerciseExpanded(
    localId: string
  ) {
    setExpandedExercises((previous) => {
      const next = new Set(previous);

      if (next.has(localId)) {
        next.delete(localId);
      } else {
        next.add(localId);
      }

      return next;
    });
  }

  const [error, setError] = useState('');
  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  const [saving, setSaving] =
    useState(false);

  const [publishing, setPublishing] =
    useState(false);

  const workoutId =
    searchParams.get('workoutId');

  const [isEditMode, setIsEditMode] =
    useState(Boolean(workoutId));

  const [loadingWorkout, setLoadingWorkout] =
    useState(false);

  const [editingPlanId, setEditingPlanId] =
    useState<string | null>(
      workoutId || null
    );

  const serverDaysRef = useRef<WorkoutDay[]>([]);

  const serverGroupsRef = useRef<
    WorkoutExerciseGroup[]
  >([]);

  const serverExercisesRef = useRef<
    WorkoutPlanExercise[]
  >([]);

  const dayServerIdsRef = useRef(
    new Map<string, string>()
  );

  const groupServerIdsRef = useRef(
    new Map<string, string>()
  );

  const exerciseServerIdsRef = useRef(
    new Map<string, string>()
  );

  const [
    showAddExercise,
    setShowAddExercise,
  ] = useState(false);

  const [currentDay, setCurrentDay] =
    useState<WorkoutDayKey | null>(null);

  const [exercises, setExercises] =
    useState<Exercise[]>([]);

  const [
    loadingExercises,
    setLoadingExercises,
  ] = useState(false);

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

  // Rascunho automático: existe um rascunho salvo localmente?
  const [hasDraft, setHasDraft] = useState(
    () =>
      !workoutId &&
      loadWorkoutDraft() !== null
  );

  // Último payload completo do rascunho + se estamos em modo criação.
  // Usados pelo flush síncrono ao background (events de lifecycle) para
  // gravar imediatamente sem depender do debounce de 400ms.
  const draftPayloadRef =
    useRef<WorkoutDraftState | null>(null);
  const inCreateModeRef =
    useRef(!workoutId && !editingPlanId);
  inCreateModeRef.current =
    !workoutId && !editingPlanId;

  // Restaura o rascunho ao abrir a tela em modo criação.
  // INVARIANTE do guard: o restore só roda em Criação (sem `workoutId`).
  // Em modo edição (`workoutId` presente), o rascunho de criação NUNCA é
  // restaurado nem sobrescrito aqui — ele é apenas preservado e só é limpo
  // no sucesso explícito de Salvar/Publicar. Evita: app fecha c/ param
  // antigo → abre como edição → tela vazia e draft ignorado/perdido.
  useEffect(() => {
    if (workoutId) return;

    const draft = loadWorkoutDraft();

    if (!draft) return;

    restoreDraft(draft);
    setHasDraft(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Grava o rascunho automaticamente a cada edição (com debounce),
  // somente em criação de plano novo (nunca deve sobrescrever a edição).
  useEffect(() => {
    if (workoutId || editingPlanId) return;

    const draft = buildDraftPayload({
      studentId,
      name,
      objective,
      level,
      duration,
      startDate,
      endDate,
      selectedDays: Array.from(selectedDays),
      dayConfigurations,
      exercisesByDay,
      biSets,
    });

    // Mantém o último payload completo no ref para o flush síncrono
    // ao trocar de app / ir para background.
    draftPayloadRef.current = draft;

    if (!draftHasContent(draft)) {
      setHasDraft(false);
      return;
    }

    const timer = window.setTimeout(() => {
      saveWorkoutDraft(draft);
      setHasDraft(true);
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    workoutId,
    editingPlanId,
    studentId,
    name,
    objective,
    level,
    duration,
    startDate,
    endDate,
    selectedDays,
    dayConfigurations,
    exercisesByDay,
    biSets,
  ]);

  // Flush síncrono ao perder foco (troca de app / background / reload da
  // WebView). Grava imediatamente o último rascunho PRONTO no ref, sem
  // depender do debounce de 400ms — elimina a janela de perda ao sair.
  useEffect(() => {
    const flushDraft = () => {
      if (!inCreateModeRef.current) return;

      const payload = draftPayloadRef.current;

      if (
        !payload ||
        !draftHasContent(payload)
      ) {
        return;
      }

      saveWorkoutDraft(payload);
      setHasDraft(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushDraft();
      }
    };

    const handlePageHide = () => {
      flushDraft();
    };

    const handleBeforeUnload = () => {
      flushDraft();
    };

    // Perda de foco: quando a WebView vai para background (abre outro app)
    // ou navega, o evento `focusout` dispara e faz o flush síncrono.
    const handleFocusOut = () => {
      flushDraft();
    };

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );
    window.addEventListener(
      'pagehide',
      handlePageHide
    );
    window.addEventListener(
      'beforeunload',
      handleBeforeUnload
    );
    window.addEventListener(
      'focusout',
      handleFocusOut
    );

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
      window.removeEventListener(
        'pagehide',
        handlePageHide
      );
      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      );
      window.removeEventListener(
        'focusout',
        handleFocusOut
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      .getExercises({ limit: 2000 })
      .then((result) => {
        setExercises(result.exercises || []);
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

  // ─── MODO EDIÇÃO ────────────────────────────────────────────
  // Quando a URL carrega `workoutId`, o builder abre um plano
  // existente em vez de criar um novo.
  useEffect(() => {
    if (!workoutId) return;

    let cancelled = false;

    setLoadingWorkout(true);
    resetMessages();
    // Guard de proteção: este caminho (edição) NÃO apaga nem sobrescreve o
    // draft de criação. O rascunho em localStorage só é removido no
    // Salvar/Publicar explícitos. Se o plano do `workoutId` não existir,
    // cai para criação sem destruir o draft guardado.

    workoutService
      .getCompleteWorkoutPlan(workoutId)
      .then((plan) => {
        if (cancelled) return;

        if (!plan) {
          setIsEditMode(false);
          setEditingPlanId(null);
          setError(
            'Treino não encontrado. O formulário foi aberto para criar um novo treino.'
          );
          return;
        }

        applyWorkoutPlanToState(plan);
      })
      .catch(() => {
        if (cancelled) return;

        setError(
          'Erro ao carregar o treino. Tente novamente.'
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingWorkout(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutId]);

  // Converte o plano completo (banco) no estado local do builder.
  function applyWorkoutPlanToState(
    plan: CompleteWorkoutPlan
  ) {
    const serverDays = plan.workout_days || [];
    const serverGroups =
      plan.workout_exercise_groups || [];
    const serverExercises =
      plan.workout_plan_exercises || [];

    serverDaysRef.current = serverDays;
    serverGroupsRef.current = serverGroups;
    serverExercisesRef.current = serverExercises;

    setName(plan.name || '');
    setObjective(plan.objective || '');
    setLevel(plan.level || '');
    setDuration(
      plan.duration_minutes
        ? String(plan.duration_minutes)
        : ''
    );
    setStartDate(plan.start_date || '');
    setEndDate(plan.end_date || '');

    const nextSelectedDays =
      new Set<WorkoutDayKey>();

    const nextDayConfigurations: Partial<
      Record<WorkoutDayKey, DayConfiguration>
    > = {};

    const nextExercisesByDay: Partial<
      Record<WorkoutDayKey, DayExercise[]>
    > = {};

    for (const day of serverDays) {
      if (!isWorkoutDayKey(day.day_key)) {
        continue;
      }

      const dayKey = day.day_key as WorkoutDayKey;

      nextSelectedDays.add(dayKey);

      nextDayConfigurations[dayKey] = {
        id: day.id,
        localId: day.id,
        name: day.name || '',
        notes: day.notes || '',
      };

      nextExercisesByDay[dayKey] = [];
    }

    const sortedExercises = [
      ...serverExercises,
    ].sort(
      (a, b) =>
        (a.execution_order ??
          a.order_index) -
        (b.execution_order ??
          b.order_index)
    );

    for (const exercise of sortedExercises) {
      if (
        !isWorkoutDayKey(exercise.day_key)
      ) {
        continue;
      }

      const dayKey =
        exercise.day_key as WorkoutDayKey;

      if (!nextSelectedDays.has(dayKey)) {
        continue;
      }

      const mapped: DayExercise = {
        id: exercise.id,
        localId: createLocalId(),
        exercise_id: exercise.exercise_id || '',
        day_key: dayKey,
        workout_day_id:
          exercise.workout_day_id || null,
        exercise_group_id:
          exercise.exercise_group_id || null,
        exercise_group_local_id:
          exercise.exercise_group_id ||
          null,
        technique_type:
          exercise.technique_type ?? 'normal',
        technique_config:
          exercise.technique_config || {},
        group_order: exercise.group_order ?? null,
        execution_order:
          exercise.execution_order ??
          exercise.order_index,
        name: exercise.name,
        sets: exercise.sets ?? '4',
        reps: exercise.reps ?? '10',
        rest_seconds: exercise.rest_seconds ?? 60,
        suggested_weight:
          exercise.suggested_weight || '',
        observation: exercise.observation || '',
        tempo: exercise.tempo || '',
        image_url: exercise.image_url || null,
        video_url: exercise.video_url || null,
        muscle_group:
          exercise.muscle_group || null,
        category: exercise.category || null,
        equipment: exercise.equipment || null,
        difficulty: exercise.difficulty || null,
        instructions:
          exercise.instructions || null,
        tips: exercise.tips || null,
      };

      nextExercisesByDay[dayKey]!.push(mapped);
    }

    const nextBiSets: LocalBiSet[] = [];

    for (const group of serverGroups) {
      if (group.group_type !== 'bi_set') {
        continue;
      }

      const members = sortedExercises.filter(
        (exercise) =>
          exercise.exercise_group_id ===
          group.id
      );

      const firstMember = members.find(
        (member) => member.group_order === 1
      );

      const dayKey = firstMember
        ? isWorkoutDayKey(firstMember.day_key)
          ? (firstMember.day_key as WorkoutDayKey)
          : null
        : null;

      if (
        !dayKey ||
        !nextSelectedDays.has(dayKey)
      ) {
        continue;
      }

      const secondMember = members.find(
        (member) => member.group_order === 2
      );

      const firstLocalId =
        nextExercisesByDay[dayKey]!.find(
          (exercise) =>
            exercise.id === firstMember?.id
        )?.localId;

      const secondLocalId =
        nextExercisesByDay[dayKey]!.find(
          (exercise) =>
            exercise.id === secondMember?.id
        )?.localId;

      if (!firstLocalId || !secondLocalId) {
        continue;
      }

      for (const exercise of nextExercisesByDay[
        dayKey
      ]!) {
        if (
          exercise.exercise_group_id ===
          group.id
        ) {
          exercise.exercise_group_local_id =
            group.id;
        }
      }

      nextBiSets.push({
        id: group.id,
        localId: group.id,
        dayKey,
        firstExerciseLocalId: firstLocalId,
        secondExerciseLocalId: secondLocalId,
        name: group.name || '',
        rounds: group.rounds ?? null,
        restAfterSeconds:
          group.rest_after_seconds ?? null,
        notes: group.notes || '',
        orderIndex: group.order_index,
      });
    }

    setSelectedDays(nextSelectedDays);
    setDayConfigurations(nextDayConfigurations);
    setExercisesByDay(nextExercisesByDay);
    setBiSets(nextBiSets);
  }

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

  function resetMessages() {
    setError('');
    setSuccessMessage('');
  }

  // Restaura o rascunho salvo no estado do builder.
  function restoreDraft(draft: WorkoutDraftState) {
    setStudentId(draft.studentId || studentId);
    setName(draft.name || '');
    setObjective(draft.objective || '');
    setLevel(draft.level || '');
    setDuration(draft.duration || '');
    setStartDate(draft.startDate || '');
    setEndDate(draft.endDate || '');
    setSelectedDays(new Set(draft.selectedDays || []));
    setDayConfigurations(draft.dayConfigurations || {});
    setExercisesByDay(draft.exercisesByDay || {});
    setBiSets(draft.biSets || []);
    setExpandedExercises(new Set());
  }

  // Descarta o rascunho salvo e volta a um builder limpo (novo plano).
  function discardDraft() {
    clearWorkoutDraft();
    setHasDraft(false);
    setName('');
    setObjective('');
    setLevel('');
    setDuration('');
    setStartDate('');
    setEndDate('');
    setSelectedDays(new Set());
    setDayConfigurations({});
    setExercisesByDay({});
    setBiSets([]);
    setExpandedExercises(new Set());
    setSuccessMessage('Rascunho descartado.');
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
          id: previous[day]?.id,
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
    setShowAddExercise(true);
  }

  function closeExerciseModal() {
    setShowAddExercise(false);
    setCurrentDay(null);
  }

  function addExerciseToDay(
    exercise: Exercise,
    values?: ExerciseConfigValues
  ) {
    if (!currentDay) return;

    const normalized =
      normalizeExercise(exercise);

    const newExercise: DayExercise = {
      localId: createLocalId(),
      exercise_id: exercise.id,
      day_key: currentDay,
      name: exercise.name,
      sets: values?.sets ?? '4',
      reps: values?.reps ?? '10',
      rest_seconds:
        values?.rest_seconds ?? 60,
      suggested_weight:
        values?.suggested_weight ?? '',
      observation:
        values?.observation ?? '',
      tempo: values?.tempo ?? '2-0-2-0',
      technique_type:
        values?.technique ?? 'normal',
      technique_config:
        values?.technique_config ?? {},
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

    if (technique === 'rest_pause') {
      updateExercise(
        day,
        exercise.localId,
        {
          technique_type:
            'rest_pause',
          technique_config: {
            pause_seconds: 15,
            max_pauses: 3,
            notes: '',
          },
          exercise_group_local_id:
            null,
          group_order: null,
        }
      );

      return;
    }

    if (technique === 'pyramid') {
      updateExercise(
        day,
        exercise.localId,
        {
          technique_type: 'pyramid',
          technique_config: {
            top_sets: 3,
            increment_percent: 10,
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

  function updateTechniqueConfig(
    day: WorkoutDayKey,
    exercise: DayExercise,
    values: Record<string, unknown>
  ) {
    updateExercise(
      day,
      exercise.localId,
      {
        technique_type:
          exercise.technique_type ||
          'normal',
        technique_config: {
          ...getExerciseTechniqueConfig<
            Record<string, unknown>
          >(exercise),
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
                exercise_group_id: null,
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
          orderExercisesForDay(
            exercisesByDay[day] || []
          );

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

  // ─── MODO EDIÇÃO: persistência ──────────────────────────────
  // Atualiza o plano existente preservando ids do banco. Não
  // remove nada que continue no estado; cria apenas o que é novo.
  async function updateExistingWorkout(
    planId: string
  ) {
    await workoutService.updateWorkoutPlanBasic({
      id: planId,
      studentId: studentId || undefined,
      name,
      objective: objective || null,
      level: level || null,
      durationMinutes: duration
        ? Number(duration)
        : null,
      startDate: startDate || null,
      endDate: endDate || null,
    });

    const stateExerciseIds = new Set<string>();

    for (const day of DAYS) {
      for (const exercise of exercisesByDay[
        day
      ] || []) {
        if (exercise.id) {
          stateExerciseIds.add(exercise.id);
        }
      }
    }

    // 1) Grupos órfãos: existem no banco (ou foram criados nesta
    // sessão) mas não fazem mais parte do estado.
    const liveGroupIds = new Set(
      biSets
        .filter((group) => group.id)
        .map((group) => group.id as string)
    );

    const trackedGroupIds = new Set<string>([
      ...serverGroupsRef.current.map(
        (group) => group.id
      ),
      ...groupServerIdsRef.current.values(),
    ]);

    for (const groupId of trackedGroupIds) {
      if (!liveGroupIds.has(groupId)) {
        await workoutService.deleteExerciseGroup(
          groupId
        );
      }
    }

    // 2) Exercícios órfãos (inclui os de dias/grupos removidos).
    const trackedExerciseIds = new Set<string>([
      ...serverExercisesRef.current.map(
        (exercise) => exercise.id
      ),
      ...exerciseServerIdsRef.current.values(),
    ]);

    for (const exerciseId of trackedExerciseIds) {
      if (!stateExerciseIds.has(exerciseId)) {
        await workoutService.deleteWorkoutExercise(
          exerciseId
        );
      }
    }

    // 3) Dias órfãos.
    for (const serverDay of serverDaysRef.current) {
      if (
        serverDay.day_key &&
        !selectedDays.has(
          serverDay.day_key as WorkoutDayKey
        )
      ) {
        await workoutService.deleteWorkoutDay(
          serverDay.id
        );
      }
    }

    for (const [
      dayKey,
      dayId,
    ] of dayServerIdsRef.current) {
      if (
        !selectedDays.has(
          dayKey as WorkoutDayKey
        )
      ) {
        await workoutService.deleteWorkoutDay(
          dayId
        );
      }
    }

    // 4) Upsert de dias.
    const dayIdMap =
      new Map<WorkoutDayKey, string>();

    for (
      let index = 0;
      index < selectedDaysArray.length;
      index++
    ) {
      const day = selectedDaysArray[index];
      const configuration =
        dayConfigurations[day];

      const dayPayload = {
        weekday: WEEKDAY_NUMBER[day],
        day_key: day,
        order_index: index,
        name: configuration?.name || undefined,
        notes: configuration?.notes || undefined,
      };

      const serverDayId =
        configuration?.id ||
        dayServerIdsRef.current.get(day);

      if (serverDayId) {
        await workoutService.updateWorkoutDay(
          serverDayId,
          dayPayload
        );

        dayIdMap.set(day, serverDayId);
      } else {
        const created =
          await workoutService.createWorkoutDay(
            planId,
            dayPayload
          );

        dayServerIdsRef.current.set(
          day,
          created.id
        );

        dayIdMap.set(day, created.id);
      }
    }

    // 5) Upsert de grupos (bi-sets).
    const groupIdMap = new Map<string, string>();

    for (const group of biSets) {
      if (!selectedDays.has(group.dayKey)) {
        continue;
      }

      const workoutDayId =
        dayIdMap.get(group.dayKey);

      if (!workoutDayId) {
        continue;
      }

      const serverId =
        group.id ||
        groupServerIdsRef.current.get(
          group.localId
        );

      const groupPayload = {
        group_type: 'bi_set' as const,
        name: group.name || undefined,
        order_index: group.orderIndex,
        rounds: group.rounds,
        rest_after_seconds: group.restAfterSeconds,
        notes: group.notes || undefined,
      };

      if (serverId) {
        await workoutService.updateExerciseGroup({
          id: serverId,
          group: groupPayload,
        });

        groupIdMap.set(group.localId, serverId);
      } else {
        const created =
          await workoutService.createExerciseGroup({
            workoutPlanId: planId,
            workoutDayId,
            group: groupPayload,
          });

        groupServerIdsRef.current.set(
          group.localId,
          created.id
        );

        groupIdMap.set(
          group.localId,
          created.id
        );
      }
    }

    // 6) Upsert de exercícios.
    for (const day of selectedDaysArray) {
      const workoutDayId = dayIdMap.get(day);

      if (!workoutDayId) {
        continue;
      }

      const dayExercises = orderExercisesForDay(
        exercisesByDay[day] || []
      );

      for (
        let index = 0;
        index < dayExercises.length;
        index++
      ) {
        const exercise = dayExercises[index];

        const serverId =
          exercise.id ||
          exerciseServerIdsRef.current.get(
            exercise.localId
          );

        const exerciseGroupId =
          (exercise.exercise_group_local_id
            ? (groupIdMap.get(
                exercise.exercise_group_local_id
              ) ??
              exercise.exercise_group_id)
            : (exercise.exercise_group_id ??
              null)) ??
          null;

        const exercisePayload = {
          exercise_id:
            exercise.exercise_id || undefined,
          workout_day_id: workoutDayId,
          exercise_group_id: exerciseGroupId,
          day_key: day,
          execution_order: index,
          group_order: exerciseGroupId
            ? (exercise.group_order ?? null)
            : null,
          technique_type:
            exercise.technique_type || 'normal',
          technique_config:
            exercise.technique_config || {},
          name: exercise.name,
          sets: exercise.sets ?? '4',
          reps: exercise.reps ?? '10',
          rest_seconds:
            exercise.rest_seconds ?? 0,
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
          tips:
            exercise.tips || null,
        };

        if (serverId) {
          await workoutService.updateWorkoutExercise(
            {
              id: serverId,
              exercise: exercisePayload,
            }
          );
        } else {
          const created =
            await workoutService.createWorkoutExercise(
              {
                workoutPlanId: planId,
                exercise: exercisePayload,
                index,
                workoutDayId,
                exerciseGroupId,
              }
            );

          exerciseServerIdsRef.current.set(
            exercise.localId,
            created.id
          );
        }
      }
    }
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
      if (isEditMode && editingPlanId) {
        await updateExistingWorkout(editingPlanId);

        setSuccessMessage(
          'Treino atualizado com sucesso.'
        );
      } else {
        const plan =
          await workoutService.createWorkoutPlan(
            trainerProfile.id,
            buildCreateData()
          );

        setIsEditMode(true);
        setEditingPlanId(plan.id);
        clearWorkoutDraft();
        setHasDraft(false);

        setSuccessMessage(
          'Treino salvo como rascunho.'
        );
      }
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
      let planId = editingPlanId;

      if (isEditMode && planId) {
        await updateExistingWorkout(planId);
      } else {
        const plan =
          await workoutService.createWorkoutPlan(
            trainerProfile.id,
            buildCreateData()
          );

        planId = plan.id;
        setIsEditMode(true);
        setEditingPlanId(plan.id);
        clearWorkoutDraft();
        setHasDraft(false);
      }

      if (!planId) return;

      await workoutService.publishWorkoutPlan(
        planId
      );

      setSuccessMessage(
        'Treino publicado com sucesso.'
      );
    } catch (
      publishError: unknown
    ) {
      // ─── DIAGNÓSTICO TEMPORÁRIO (remover após identificar a causa) ───
      const errObj = publishError as Record<string, unknown>;
      console.error('[DIAG-PUBLISH] valor lançado:', publishError);
      console.error('[DIAG-PUBLISH] detalhes:', {
        tipo: typeof publishError,
        eInstanceOfError: publishError instanceof Error,
        name: errObj?.name ?? null,
        message: errObj?.message ?? String(publishError),
        code: errObj?.code ?? null,
        details: errObj?.details ?? null,
        hint: errObj?.hint ?? null,
        stack: publishError instanceof Error ? (publishError as Error).stack : null,
        json: (() => {
          try {
            return JSON.stringify(publishError);
          } catch {
            return null;
          }
        })(),
      });
      setError(
        [
          `msg: ${errObj?.message ?? String(publishError)}`,
          `code: ${errObj?.code ?? '-'}`,
          `details: ${errObj?.details ?? '-'}`,
          `hint: ${errObj?.hint ?? '-'}`,
        ].join(' | ')
      );
      // ─── FIM DO DIAGNÓSTICO TEMPORÁRIO ───
    } finally {
      setPublishing(false);
    }
  }

  async function handleCreateExerciseFromModal(
    data: NewExerciseData
  ): Promise<boolean> {
    if (
      !trainerProfile?.id ||
      !data.name.trim()
    ) {
      return false;
    }

    setCreatingExercise(true);
    setError('');

    try {
      const created =
        await exerciseService.createExercise(
          trainerProfile.id,
          {
            name:
              data.name.trim(),
            muscle_group:
              data.muscleGroup ||
              null,
            category:
              data.category ||
              null,
            equipment:
              data.equipment ||
              null,
            difficulty:
              data.difficulty ||
              null,
            instructions:
              data.instructions ||
              null,
            tips: null,
          }
        );

      setExercises((previous) => [
        created,
        ...previous,
      ]);

      addExerciseToDay(created);

      return true;
    } catch (createError) {
      console.error(
        '[WorkoutBuilderPage] create exercise:',
        createError
      );

      setError(
        'Erro ao criar exercício.'
      );

      return false;
    } finally {
      setCreatingExercise(false);
    }
  }

  if (loadingWorkout) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <Header
          title="Editar Treino"
          showBack
        />

        <div className="page-container space-y-5 pb-36">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-8 text-center text-sm text-zinc-400">
            Carregando treino...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header
        title={
          isEditMode
            ? 'Editar Treino'
            : 'Montar Treino'
        }
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
                          const expanded =
                            expandedExercises.has(
                              exercise.localId
                            );

                          const techniqueOption =
                            getTechniqueOption(
                              exercise.technique_type
                            );

                          const badgeClass =
                            exercise.technique_type &&
                            exercise.technique_type !==
                              'normal'
                              ? techniqueOption
                                  ?.activeClass
                              : 'border-white/10 bg-white/5 text-zinc-500';

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
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleExerciseExpanded(
                                      exercise.localId
                                    )
                                  }
                                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <h3 className="truncate text-sm font-black">
                                        {
                                          exercise.name
                                        }
                                      </h3>

                                      <span
                                        className={cn(
                                          'inline-flex shrink-0 rounded-full border px-2 py-1 text-[9px] font-black',
                                          badgeClass
                                        )}
                                      >
                                        {getTechniqueLabel(
                                          exercise
                                            .technique_type
                                        )}
                                      </span>
                                    </div>

                                    <p className="mt-0.5 text-[10px] text-zinc-500">
                                      {exercise.sets ||
                                        '—'}{' '}
                                      séries ·{' '}
                                      {exercise.reps ||
                                        '—'}{' '}
                                      reps ·{' '}
                                      {exercise.rest_seconds ??
                                        0}{' '}
                                      s descanso
                                    </p>
                                  </div>

                                  <ChevronDown
                                    className={cn(
                                      'h-4 w-4 shrink-0 text-zinc-500 transition-transform',
                                      expanded &&
                                        'rotate-180'
                                    )}
                                  />
                                </button>

                                <div className="flex shrink-0 gap-1">
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

                              {expanded && (
                                <div className="space-y-4">
                                  <div>
                                    <p className="mb-2 text-[10px] font-black uppercase text-zinc-500">
                                      Técnica
                                    </p>

                                    <div className="grid grid-cols-3 gap-2">
                                      {TECHNIQUE_OPTIONS.map(
                                        (
                                          option
                                        ) => (
                                          <button
                                            key={
                                              option.value
                                            }
                                            type="button"
                                            onClick={() =>
                                              changeExerciseTechnique(
                                                day,
                                                exercise,
                                                option.value
                                              )
                                            }
                                            className={cn(
                                              'min-h-10 rounded-xl border px-2 text-[10px] font-black',
                                              exercise.technique_type ===
                                                option.value
                                                ? option.activeClass
                                                : 'border-white/10 bg-black/20 text-zinc-500'
                                            )}
                                          >
                                            {
                                              option.label
                                            }
                                          </button>
                                        )
                                      )}
                                    </div>
                                  </div>

                                  {exercise.technique_type !==
                                    'normal' &&
                                    exercise.technique_type !==
                                      'bi_set' && (
                                    <TechniqueConfigPanels
                                      technique={
                                        exercise.technique_type ??
                                        'normal'
                                      }
                                      config={
                                        exercise.technique_config ??
                                        {}
                                      }
                                      onConfigChange={(
                                        field,
                                        fieldValue
                                      ) =>
                                        updateTechniqueConfig(
                                          day,
                                          exercise,
                                          {
                                            [field]:
                                              fieldValue,
                                          }
                                        )
                                      }
                                    />
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
                                </div>
                              )}
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
            {isEditMode
              ? 'Atualizar'
              : 'Salvar'}
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

        {hasDraft && !isEditMode && (
          <Button
            variant="danger"
            className="mt-3 w-full"
            onClick={discardDraft}
            disabled={saving || publishing}
          >
            <Trash2 className="h-4 w-4" />
            Descartar rascunho
          </Button>
        )}
      </div>

      <ExercisePickerModal
        open={showAddExercise}
        onClose={closeExerciseModal}
        exercises={exercises}
        loading={loadingExercises}
        dayName={
          currentDay
            ? getWeekdayName(
                currentDay
              )
            : 'treino'
        }
        creating={creatingExercise}
        onCreateExercise={
          handleCreateExerciseFromModal
        }
        onAdd={(
          exercise,
          values
        ) =>
          addExerciseToDay(
            exercise,
            values
          )
        }
      />

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