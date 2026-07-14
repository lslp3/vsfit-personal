import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Layers2,
  Loader2,
  Play,
  Search,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import * as studentService from '../../services/studentService';
import * as workoutService from '../../services/workoutService';
import type {
  CompleteWorkoutPlan,
  WorkoutLog,
  WorkoutPlan,
} from '../../types/database';

type FilterType = 'all' | 'today' | 'pending' | 'completed';

type StudentWorkoutsState = {
  student: any | null;
  workouts: CompleteWorkoutPlan[];
  logs: WorkoutLog[];
};

type ExpirationStatus = {
  rank: number;
  label: string;
  description: string;
  className: string;
};

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'today', label: 'Hoje' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'completed', label: 'Concluídos' },
];

const DAY_LABELS: Record<string, string> = {
  dom: 'DOM',
  seg: 'SEG',
  ter: 'TER',
  qua: 'QUA',
  qui: 'QUI',
  sex: 'SEX',
  sab: 'SÁB',
  Sunday: 'DOM',
  Monday: 'SEG',
  Tuesday: 'TER',
  Wednesday: 'QUA',
  Thursday: 'QUI',
  Friday: 'SEX',
  Saturday: 'SÁB',
};

const DAY_ALIASES: Record<string, string> = {
  Sunday: 'dom',
  Monday: 'seg',
  Tuesday: 'ter',
  Wednesday: 'qua',
  Thursday: 'qui',
  Friday: 'sex',
  Saturday: 'sab',
  sunday: 'dom',
  monday: 'seg',
  tuesday: 'ter',
  wednesday: 'qua',
  thursday: 'qui',
  friday: 'sex',
  saturday: 'sab',
  dom: 'dom',
  seg: 'seg',
  ter: 'ter',
  qua: 'qua',
  qui: 'qui',
  sex: 'sex',
  sab: 'sab',
};

function normalizeDayKey(value?: string | null) {
  if (!value) return '';

  return DAY_ALIASES[value] || value;
}

function getTodayDayKey() {
  return ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][new Date().getDay()];
}

function getWorkoutName(workout: CompleteWorkoutPlan) {
  return workout.name || 'Treino personalizado';
}

function getWorkoutObjective(workout: CompleteWorkoutPlan) {
  return workout.objective || 'Treino personalizado';
}

function getWorkoutLevel(workout: CompleteWorkoutPlan) {
  return workout.level || 'Seu nível';
}

function getWorkoutDuration(workout: CompleteWorkoutPlan) {
  return workout.duration_minutes || null;
}

function getWorkoutUpdatedTime(workout: CompleteWorkoutPlan) {
  const time = new Date(workout.updated_at || workout.created_at).getTime();

  return Number.isFinite(time) ? time : 0;
}

function isVisibleWorkout(workout: WorkoutPlan) {
  return workout.status === 'published';
}

function parseDateOnly(value?: string | null) {
  if (!value) return null;

  const date = new Date(`${value}T12:00:00`);

  return Number.isFinite(date.getTime()) ? date : null;
}

function formatDate(value?: string | null) {
  const date = parseDateOnly(value);

  if (!date) return 'Não definida';

  return date.toLocaleDateString('pt-BR');
}

function formatShortDate(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return '';

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

function getExpirationStatus(endDate?: string | null): ExpirationStatus {
  const end = parseDateOnly(endDate);

  if (!end) {
    return {
      rank: 3,
      label: 'Sem vencimento',
      description: 'Plano sem data final.',
      className: 'border-white/10 bg-white/[0.05] text-zinc-400',
    };
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const days = Math.ceil(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (days < 0) {
    return {
      rank: 0,
      label: 'Vencido',
      description: `Venceu há ${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'}.`,
      className: 'border-red-400/25 bg-red-400/10 text-red-300',
    };
  }

  if (days <= 7) {
    return {
      rank: 1,
      label: days === 0 ? 'Vence hoje' : `Vence em ${days} dia${days === 1 ? '' : 's'}`,
      description: `Vencimento em ${formatDate(endDate)}.`,
      className: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    };
  }

  return {
    rank: 2,
    label: 'Vigente',
    description: `${days} dias restantes.`,
    className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  };
}

function getWorkoutScheduleDays(workout: CompleteWorkoutPlan) {
  if (workout.workout_days.length > 0) {
    return [...workout.workout_days]
      .sort((a, b) => a.order_index - b.order_index)
      .map((day) => normalizeDayKey(day.day_key))
      .filter(Boolean);
  }

  const uniqueDays = new Set<string>();

  workout.workout_plan_exercises.forEach((exercise) => {
    const key = normalizeDayKey(exercise.day_key);

    if (key) uniqueDays.add(key);
  });

  const order = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

  return [...uniqueDays].sort(
    (a, b) => order.indexOf(a) - order.indexOf(b)
  );
}

function isTodayWorkout(workout: CompleteWorkoutPlan) {
  return getWorkoutScheduleDays(workout).includes(getTodayDayKey());
}

function getLogWorkoutId(log: WorkoutLog) {
  return log.workout_plan_id || '';
}

function isCompletedLog(log: WorkoutLog) {
  return log.status === 'completed' || Boolean(log.completed_at);
}

function isWorkoutCompleted(workout: CompleteWorkoutPlan, logs: WorkoutLog[]) {
  return logs.some(
    (log) => getLogWorkoutId(log) === workout.id && isCompletedLog(log)
  );
}

function getWorkoutLastCompleted(
  workout: CompleteWorkoutPlan,
  logs: WorkoutLog[]
) {
  return logs
    .filter(
      (log) => getLogWorkoutId(log) === workout.id && isCompletedLog(log)
    )
    .sort((a, b) => {
      const dateA = new Date(a.completed_at || a.created_at).getTime();
      const dateB = new Date(b.completed_at || b.created_at).getTime();

      return dateB - dateA;
    })[0] || null;
}

function getStudentInitials(name?: string) {
  const safeName = String(name || 'Aluno').trim();
  const parts = safeName.split(' ').filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return safeName.slice(0, 2).toUpperCase();
}

function getStudentName(student: any) {
  return student?.name || student?.full_name || 'Aluno';
}

function countDropSets(workout: CompleteWorkoutPlan) {
  return workout.workout_plan_exercises.filter(
    (exercise) => exercise.technique_type === 'drop_set'
  ).length;
}

function countBiSets(workout: CompleteWorkoutPlan) {
  return workout.workout_exercise_groups.filter(
    (group) => group.group_type === 'bi_set'
  ).length;
}

async function hydrateWorkout(
  workout: WorkoutPlan
): Promise<CompleteWorkoutPlan | null> {
  try {
    return await workoutService.getWorkoutPlanById(workout.id);
  } catch (error) {
    console.error('[StudentWorkoutsPage] hydrate workout error:', error);
    return null;
  }
}

export function StudentWorkoutsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const [data, setData] = useState<StudentWorkoutsState>({
    student: null,
    workouts: [],
    logs: [],
  });

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      const authUser = authData.user;

      if (!authUser?.id) {
        throw new Error('Sessão do aluno não encontrada. Faça login novamente.');
      }

      const accountResult = await studentService.getStudentAccountByAuthUser(
        authUser.id
      );

      let studentData = accountResult?.student || null;

      if (!studentData) {
        studentData = await studentService.getStudentByAuthUser(authUser.id);
      }

      if (!studentData?.id) {
        throw new Error('Perfil do aluno não encontrado.');
      }

      const [workoutsData, logsData] = await Promise.all([
        workoutService.getWorkoutPlansByStudent(studentData.id),
        workoutService.getWorkoutLogsByStudent(studentData.id),
      ]);

      const visibleWorkouts = workoutsData.filter(isVisibleWorkout);

      const hydratedResults = await Promise.all(
        visibleWorkouts.map((workout) => hydrateWorkout(workout))
      );

      setData({
        student: studentData,
        workouts: hydratedResults.filter(
          (workout): workout is CompleteWorkoutPlan => Boolean(workout)
        ),
        logs: logsData,
      });
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Erro ao carregar treinos.';

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const orderedWorkouts = useMemo(() => {
    return [...data.workouts].sort((a, b) => {
      const expirationDifference =
        getExpirationStatus(a.end_date).rank -
        getExpirationStatus(b.end_date).rank;

      if (expirationDifference !== 0) {
        return expirationDifference;
      }

      return getWorkoutUpdatedTime(b) - getWorkoutUpdatedTime(a);
    });
  }, [data.workouts]);

  const filteredWorkouts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orderedWorkouts.filter((workout) => {
      const completed = isWorkoutCompleted(workout, data.logs);
      const today = isTodayWorkout(workout);

      const matchesSearch =
        !query ||
        getWorkoutName(workout).toLowerCase().includes(query) ||
        getWorkoutObjective(workout).toLowerCase().includes(query) ||
        getWorkoutLevel(workout).toLowerCase().includes(query);

      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'today' && today) ||
        (activeFilter === 'pending' && !completed) ||
        (activeFilter === 'completed' && completed);

      return matchesSearch && matchesFilter;
    });
  }, [orderedWorkouts, data.logs, search, activeFilter]);

  const todayCount = useMemo(
    () => orderedWorkouts.filter(isTodayWorkout).length,
    [orderedWorkouts]
  );

  const completedCount = useMemo(
    () =>
      orderedWorkouts.filter((workout) =>
        isWorkoutCompleted(workout, data.logs)
      ).length,
    [orderedWorkouts, data.logs]
  );

  const pendingCount = Math.max(orderedWorkouts.length - completedCount, 0);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15">
            <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
          </div>

          <div>
            <p className="text-sm font-black text-white">Carregando treinos...</p>
            <p className="mt-1 text-xs text-zinc-500">
              Buscando seus planos publicados.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data.student) {
    return (
      <div className="min-h-[calc(100vh-88px)] bg-[#050505] px-4 pb-28 pt-8 text-white">
        <div className="mx-auto max-w-lg rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-300" />

          <h1 className="mt-5 text-xl font-black text-white">
            Não foi possível carregar
          </h1>

          <p className="mt-2 text-sm text-red-200/80">
            {error || 'Perfil do aluno não encontrado.'}
          </p>

          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-6 h-12 w-full rounded-2xl bg-[#ff2a32] text-sm font-black text-white"
          >
            TENTAR NOVAMENTE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 pb-4 pt-4 text-white">
      <div className="mx-auto max-w-lg space-y-4">
        <section className="rounded-[32px] border border-white/10 bg-white/[0.045] p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-[#ff2a32]/20 bg-[#ff2a32]/15 text-lg font-black text-[#ff2a32]">
              {getStudentInitials(getStudentName(data.student))}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                Área do aluno
              </p>

              <h1 className="mt-1 text-[20px] font-black uppercase italic text-white">
                Meus Treinos
              </h1>

              <p className="mt-1 truncate text-[12px] text-zinc-500">
                {getStudentName(data.student)}, seus treinos publicados estão aqui.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <SummaryBox
              icon={Dumbbell}
              value={orderedWorkouts.length}
              label="Total"
            />

            <SummaryBox
              icon={CalendarDays}
              value={todayCount}
              label="Hoje"
            />

            <SummaryBox
              icon={CheckCircle2}
              value={completedCount}
              label="Feitos"
            />
          </div>
        </section>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar treino..."
            className="w-full rounded-[20px] border border-white/10 bg-white/[0.045] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#ff2a32]/40"
          />
        </div>

        <div className="grid grid-cols-4 gap-2 rounded-[22px] border border-white/5 bg-white/[0.03] p-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={cn(
                'min-h-[42px] rounded-[15px] px-2 text-[10px] font-black uppercase',
                activeFilter === filter.key
                  ? 'border border-[#ff2a32]/30 bg-[#ff2a32]/20 text-[#ff2a32]'
                  : 'text-zinc-500'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {filteredWorkouts.length === 0 ? (
          <div className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 text-center">
            <Dumbbell className="mx-auto h-10 w-10 text-zinc-700" />

            <h2 className="mt-6 text-xl font-black text-white">
              {orderedWorkouts.length === 0
                ? 'Nenhum treino liberado'
                : 'Nenhum resultado'}
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              {orderedWorkouts.length === 0
                ? 'Quando seu personal publicar um treino, ele aparecerá aqui.'
                : 'Tente alterar a busca ou o filtro selecionado.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredWorkouts.map((workout) => {
              const completed = isWorkoutCompleted(workout, data.logs);
              const lastCompleted = getWorkoutLastCompleted(workout, data.logs);
              const today = isTodayWorkout(workout);
              const days = getWorkoutScheduleDays(workout);
              const expiration = getExpirationStatus(workout.end_date);
              const dropSets = countDropSets(workout);
              const biSets = countBiSets(workout);

              return (
                <button
                  key={workout.id}
                  type="button"
                  onClick={() =>
                    navigate(`/student/workout-detail/${workout.id}`)
                  }
                  className="w-full rounded-[30px] border border-white/10 bg-white/[0.045] p-4 text-left transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-[22px]',
                        completed
                          ? 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-400'
                          : today
                            ? 'border border-[#ff2a32]/25 bg-[#ff2a32]/15 text-[#ff2a32]'
                            : 'border border-white/10 bg-white/[0.05] text-zinc-400'
                      )}
                    >
                      {completed ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : today ? (
                        <Flame className="h-6 w-6" />
                      ) : (
                        <Dumbbell className="h-6 w-6" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff2a32]">
                              {today
                                ? 'Treino de hoje'
                                : completed
                                  ? 'Concluído'
                                  : 'Treino liberado'}
                            </p>

                            <span
                              className={cn(
                                'rounded-full border px-2.5 py-1 text-[9px] font-black uppercase',
                                expiration.className
                              )}
                            >
                              {expiration.label}
                            </span>
                          </div>

                          <h3 className="mt-1 truncate text-[18px] font-black text-white">
                            {getWorkoutName(workout)}
                          </h3>
                        </div>

                        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-zinc-700" />
                      </div>

                      <p className="mt-2 text-[14px] text-zinc-400">
                        {getWorkoutObjective(workout)}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <DateBox label="Início" value={formatDate(workout.start_date)} />
                        <DateBox
                          label="Vencimento"
                          value={formatDate(workout.end_date)}
                        />
                      </div>

                      <p className="mt-2 text-[11px] text-zinc-500">
                        {expiration.description}
                      </p>

                      {days.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {days.map((day) => (
                            <span
                              key={`${workout.id}-${day}`}
                              className={cn(
                                'rounded-full border px-2.5 py-1 text-[10px] font-black',
                                day === getTodayDayKey()
                                  ? 'border-[#ff2a32]/30 bg-[#ff2a32]/15 text-[#ff2a32]'
                                  : 'border-white/10 bg-white/[0.04] text-zinc-400'
                              )}
                            >
                              {DAY_LABELS[day] || day.slice(0, 3).toUpperCase()}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Tag icon={Clock}>
                          {getWorkoutDuration(workout) || '--'} min
                        </Tag>

                        <Tag icon={Target}>{getWorkoutLevel(workout)}</Tag>

                        <Tag icon={Dumbbell}>
                          {workout.workout_plan_exercises.length} exercícios
                        </Tag>

                        {dropSets > 0 && (
                          <Tag icon={Zap}>{dropSets} drop-set</Tag>
                        )}

                        {biSets > 0 && (
                          <Tag icon={Layers2}>{biSets} bi-set</Tag>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-bold text-zinc-500">
                          {completed && lastCompleted
                            ? `Último: ${formatShortDate(
                                lastCompleted.completed_at ||
                                  lastCompleted.created_at
                              )}`
                            : 'Toque para abrir'}
                        </p>

                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black',
                            completed
                              ? 'bg-emerald-400/10 text-emerald-300'
                              : 'bg-[#ff2a32] text-white'
                          )}
                        >
                          {completed ? (
                            <>
                              <Trophy className="h-3.5 w-3.5" />
                              FEITO
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5" />
                              ABRIR
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                Resumo
              </p>

              <h3 className="mt-1 text-base font-black text-white">Sua rotina</h3>
            </div>

            <Sparkles className="h-5 w-5 text-[#ff2a32]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-center">
              <p className="text-xl font-black text-[#ff2a32]">{pendingCount}</p>
              <p className="mt-1 text-[10px] font-black uppercase text-zinc-600">
                Pendentes
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-center">
              <p className="text-xl font-black text-emerald-400">
                {completedCount}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase text-zinc-600">
                Concluídos
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryBox({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Dumbbell;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
      <Icon className="mx-auto mb-2 h-4 w-4 text-[#ff2a32]" />
      <p className="text-base font-black text-white">{value}</p>
      <p className="text-[9px] font-black uppercase text-zinc-600">{label}</p>
    </div>
  );
}

function DateBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-[9px] font-black uppercase text-zinc-600">{label}</p>
      <p className="mt-1 text-xs font-black text-white">{value}</p>
    </div>
  );
}

function Tag({
  icon: Icon,
  children,
}: {
  icon: typeof Clock;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold text-zinc-300">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

export default StudentWorkoutsPage;
