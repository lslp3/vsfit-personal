# Código para desbloqueio por dia e bloqueio por vencimento

## Arquivo: src/pages/student/StudentWorkoutsPage.tsx
` 	sx
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
  { key: 'completed', label: 'ConcluÃ­dos' },
];

const DAY_LABELS: Record<string, string> = {
  dom: 'DOM',
  seg: 'SEG',
  ter: 'TER',
  qua: 'QUA',
  qui: 'QUI',
  sex: 'SEX',
  sab: 'SÃB',
  Sunday: 'DOM',
  Monday: 'SEG',
  Tuesday: 'TER',
  Wednesday: 'QUA',
  Thursday: 'QUI',
  Friday: 'SEX',
  Saturday: 'SÃB',
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
  return workout.level || 'Seu nÃ­vel';
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

  if (!date) return 'NÃ£o definida';

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
      description: `Venceu hÃ¡ ${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'}.`,
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
        throw new Error('SessÃ£o do aluno nÃ£o encontrada. FaÃ§a login novamente.');
      }

      const accountResult = await studentService.getStudentAccountByAuthUser(
        authUser.id
      );

      let studentData = accountResult?.student || null;

      if (!studentData) {
        studentData = await studentService.getStudentByAuthUser(authUser.id);
      }

      if (!studentData?.id) {
        throw new Error('Perfil do aluno nÃ£o encontrado.');
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
            NÃ£o foi possÃ­vel carregar
          </h1>

          <p className="mt-2 text-sm text-red-200/80">
            {error || 'Perfil do aluno nÃ£o encontrado.'}
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
    <div className="min-h-screen bg-[#050505] px-4 pb-32 pt-6 text-white">
      <div className="mx-auto max-w-lg space-y-5">
        <section className="rounded-[32px] border border-white/10 bg-white/[0.045] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-[#ff2a32]/20 bg-[#ff2a32]/15 text-lg font-black text-[#ff2a32]">
              {getStudentInitials(getStudentName(data.student))}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                Ãrea do aluno
              </p>

              <h1 className="mt-1 text-[25px] font-black uppercase italic text-white">
                Meus Treinos
              </h1>

              <p className="mt-1 truncate text-[12px] text-zinc-500">
                {getStudentName(data.student)}, seus treinos publicados estÃ£o aqui.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
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
            className="w-full rounded-[20px] border border-white/10 bg-white/[0.045] py-4 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#ff2a32]/40"
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
          <div className="rounded-[32px] border border-white/10 bg-white/[0.035] p-8 text-center">
            <Dumbbell className="mx-auto h-10 w-10 text-zinc-700" />

            <h2 className="mt-6 text-xl font-black text-white">
              {orderedWorkouts.length === 0
                ? 'Nenhum treino liberado'
                : 'Nenhum resultado'}
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              {orderedWorkouts.length === 0
                ? 'Quando seu personal publicar um treino, ele aparecerÃ¡ aqui.'
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
                        'mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px]',
                        completed
                          ? 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-400'
                          : today
                            ? 'border border-[#ff2a32]/25 bg-[#ff2a32]/15 text-[#ff2a32]'
                            : 'border border-white/10 bg-white/[0.05] text-zinc-400'
                      )}
                    >
                      {completed ? (
                        <CheckCircle2 className="h-7 w-7" />
                      ) : today ? (
                        <Flame className="h-7 w-7" />
                      ) : (
                        <Dumbbell className="h-7 w-7" />
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
                                  ? 'ConcluÃ­do'
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

                          <h3 className="mt-1 truncate text-[20px] font-black text-white">
                            {getWorkoutName(workout)}
                          </h3>
                        </div>

                        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-zinc-700" />
                      </div>

                      <p className="mt-2 text-[14px] text-zinc-400">
                        {getWorkoutObjective(workout)}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <DateBox label="InÃ­cio" value={formatDate(workout.start_date)} />
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
                          {workout.workout_plan_exercises.length} exercÃ­cios
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
                            ? `Ãšltimo: ${formatShortDate(
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

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                Resumo
              </p>

              <h3 className="mt-1 text-lg font-black text-white">Sua rotina</h3>
            </div>

            <Sparkles className="h-5 w-5 text-[#ff2a32]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-center">
              <p className="text-2xl font-black text-[#ff2a32]">{pendingCount}</p>
              <p className="mt-1 text-[10px] font-black uppercase text-zinc-600">
                Pendentes
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-center">
              <p className="text-2xl font-black text-emerald-400">
                {completedCount}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase text-zinc-600">
                ConcluÃ­dos
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
      <p className="text-lg font-black text-white">{value}</p>
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

` 

## Arquivo: src/pages/student/WorkoutDetailPage.tsx
` 	sx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  Clock,
  Dumbbell,
  Flame,
  Layers,
  Layers2,
  Loader2,
  Play,
  Target,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';

import { getWorkoutPlanById } from '../../services/workoutService';
import { cn } from '../../lib/utils';
import type {
  CompleteWorkoutPlan,
  DropSetConfig,
  WorkoutDay,
  WorkoutExerciseGroup,
  WorkoutPlanExercise,
} from '../../types/database';

const DAY_ORDER = [
  'seg',
  'ter',
  'qua',
  'qui',
  'sex',
  'sab',
  'dom',
  '_default',
] as const;

const DAY_ALIASES: Record<string, string> = {
  Monday: 'seg',
  Tuesday: 'ter',
  Wednesday: 'qua',
  Thursday: 'qui',
  Friday: 'sex',
  Saturday: 'sab',
  Sunday: 'dom',
  monday: 'seg',
  tuesday: 'ter',
  wednesday: 'qua',
  thursday: 'qui',
  friday: 'sex',
  saturday: 'sab',
  sunday: 'dom',
  seg: 'seg',
  ter: 'ter',
  qua: 'qua',
  qui: 'qui',
  sex: 'sex',
  sab: 'sab',
  dom: 'dom',
};

const DAY_LABELS: Record<string, string> = {
  seg: 'SEG',
  ter: 'TER',
  qua: 'QUA',
  qui: 'QUI',
  sex: 'SEX',
  sab: 'SÃB',
  dom: 'DOM',
  _default: 'DIA',
};

const DAY_NAMES: Record<string, string> = {
  seg: 'Segunda-feira',
  ter: 'TerÃ§a-feira',
  qua: 'Quarta-feira',
  qui: 'Quinta-feira',
  sex: 'Sexta-feira',
  sab: 'SÃ¡bado',
  dom: 'Domingo',
  _default: 'Treino',
};

interface DaySection {
  key: string;
  day: WorkoutDay | null;
  exercises: WorkoutPlanExercise[];
  groups: WorkoutExerciseGroup[];
}

function normalizeDayKey(value?: string | null) {
  if (!value) return '_default';

  return DAY_ALIASES[value] || value;
}

function getTodayDayKey() {
  return ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][
    new Date().getDay()
  ];
}

function getDayPosition(dayKey: string) {
  const normalized = normalizeDayKey(dayKey);

  const index = DAY_ORDER.indexOf(
    normalized as (typeof DAY_ORDER)[number]
  );

  return index === -1 ? DAY_ORDER.length : index;
}

function getEffectiveExerciseOrder(
  exercise: WorkoutPlanExercise
) {
  return exercise.execution_order ?? exercise.order_index;
}

function getExerciseName(exercise: WorkoutPlanExercise) {
  return exercise.name || 'ExercÃ­cio';
}

function getExerciseObservation(
  exercise: WorkoutPlanExercise
) {
  return (
    exercise.observation ||
    exercise.instructions ||
    ''
  );
}

function getDropSetConfig(
  exercise: WorkoutPlanExercise
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

function parseDateOnly(value?: string | null) {
  if (!value) return null;

  const date = new Date(`${value}T12:00:00`);

  return Number.isFinite(date.getTime()) ? date : null;
}

function formatDate(value?: string | null) {
  const date = parseDateOnly(value);

  if (!date) return 'NÃ£o definida';

  return date.toLocaleDateString('pt-BR');
}

function getExpirationInfo(endDate?: string | null) {
  const end = parseDateOnly(endDate);

  if (!end) {
    return {
      label: 'Sem vencimento',
      description: 'Este plano nÃ£o possui data final.',
      className:
        'border-white/10 bg-white/[0.05] text-zinc-400',
    };
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const difference = Math.ceil(
    (end.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (difference < 0) {
    return {
      label: 'Vencido',
      description: `Venceu hÃ¡ ${Math.abs(difference)} dia${
        Math.abs(difference) === 1 ? '' : 's'
      }.`,
      className:
        'border-red-400/25 bg-red-400/10 text-red-300',
    };
  }

  if (difference <= 7) {
    return {
      label:
        difference === 0
          ? 'Vence hoje'
          : `Vence em ${difference} dia${
              difference === 1 ? '' : 's'
            }`,
      description: `Vencimento em ${formatDate(endDate)}.`,
      className:
        'border-amber-400/25 bg-amber-400/10 text-amber-300',
    };
  }

  return {
    label: 'Vigente',
    description: `${difference} dias restantes.`,
    className:
      'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  };
}

function buildDaySections(
  plan: CompleteWorkoutPlan
): DaySection[] {
  const days = plan.workout_days || [];
  const groups = plan.workout_exercise_groups || [];
  const exercises = plan.workout_plan_exercises || [];

  const dayById = new Map(
    days.map((day) => [day.id, day])
  );

  const sections = new Map<string, DaySection>();

  for (const day of days) {
    const key = normalizeDayKey(day.day_key);

    sections.set(key, {
      key,
      day,
      exercises: [],
      groups: groups.filter(
        (group) => group.workout_day_id === day.id
      ),
    });
  }

  for (const exercise of exercises) {
    const relatedDay = exercise.workout_day_id
      ? dayById.get(exercise.workout_day_id) || null
      : null;

    const key = relatedDay
      ? normalizeDayKey(relatedDay.day_key)
      : normalizeDayKey(exercise.day_key);

    const existing = sections.get(key);

    if (existing) {
      existing.exercises.push(exercise);
      continue;
    }

    sections.set(key, {
      key,
      day: relatedDay,
      exercises: [exercise],
      groups: relatedDay
        ? groups.filter(
            (group) =>
              group.workout_day_id === relatedDay.id
          )
        : [],
    });
  }

  return [...sections.values()]
    .filter(
      (section) =>
        section.day || section.exercises.length > 0
    )
    .map((section) => ({
      ...section,
      exercises: [...section.exercises].sort(
        (a, b) =>
          getEffectiveExerciseOrder(a) -
          getEffectiveExerciseOrder(b)
      ),
      groups: [...section.groups].sort(
        (a, b) => a.order_index - b.order_index
      ),
    }))
    .sort((a, b) => {
      const orderA =
        a.day?.order_index ??
        getDayPosition(a.key);

      const orderB =
        b.day?.order_index ??
        getDayPosition(b.key);

      return orderA - orderB;
    });
}

export function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] =
    useState<CompleteWorkoutPlan | null>(null);

  const [selectedDayKey, setSelectedDayKey] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('Identificador do treino nÃ£o encontrado.');
      setLoading(false);
      return;
    }

    void loadPlan(id);
  }, [id]);

  async function loadPlan(workoutId: string) {
    setLoading(true);
    setError('');

    try {
      const data =
        await getWorkoutPlanById(workoutId);

      if (!data) {
        setError('Treino nÃ£o encontrado.');
        setPlan(null);
        return;
      }

      setPlan(data);
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Erro ao carregar treino.';

      setError(message);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }

  const exercises = useMemo(() => {
    if (!plan) return [];

    return [...plan.workout_plan_exercises].sort(
      (a, b) =>
        getEffectiveExerciseOrder(a) -
        getEffectiveExerciseOrder(b)
    );
  }, [plan]);

  const daySections = useMemo(() => {
    if (!plan) return [];

    return buildDaySections(plan);
  }, [plan]);

  const selectedSection = useMemo(() => {
    return (
      daySections.find(
        (section) =>
          section.key === selectedDayKey
      ) || null
    );
  }, [daySections, selectedDayKey]);

  const totalSets = exercises.reduce(
    (sum, exercise) => {
      const parsed = Number.parseInt(
        String(exercise.sets || '0'),
        10
      );

      return (
        sum +
        (Number.isFinite(parsed) && parsed > 0
          ? parsed
          : 1)
      );
    },
    0
  );

  const todayDayKey = getTodayDayKey();

  const expirationInfo = getExpirationInfo(
    plan?.end_date
  );

  const totalBiSets =
    plan?.workout_exercise_groups.filter(
      (group) => group.group_type === 'bi_set'
    ).length || 0;

  const totalDropSets = exercises.filter(
    (exercise) =>
      exercise.technique_type === 'drop_set'
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15">
            <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
          </div>

          <div>
            <p className="text-sm font-black text-white">
              Carregando treino...
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Preparando os exercÃ­cios.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-[#050505] px-4 pb-28 pt-8 text-white">
        <div className="mx-auto max-w-lg rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-300" />

          <h1 className="mt-5 text-xl font-black text-white">
            Treino nÃ£o encontrado
          </h1>

          <p className="mt-2 text-sm text-red-200/80">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate('/student/workouts')
            }
            className="mt-6 h-12 w-full rounded-2xl bg-[#ff2a32] text-sm font-black text-white"
          >
            VOLTAR AOS TREINOS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-lg px-4 pb-48 pt-5">
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <span
            className={cn(
              'rounded-full border px-4 py-2 text-[11px] font-black uppercase',
              expirationInfo.className
            )}
          >
            {expirationInfo.label}
          </span>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[34px] border border-white/10 bg-gradient-to-br from-[#ff2a32]/16 via-white/[0.045] to-white/[0.025] p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
                Treino Premium
              </p>

              <h1 className="mt-2 text-[28px] font-black uppercase italic leading-none text-white">
                {plan.name}
              </h1>

              <p className="mt-3 text-sm text-zinc-400">
                {plan.objective ||
                  'Treino personalizado para sua evoluÃ§Ã£o.'}
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#ff2a32]">
              <Dumbbell className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <InfoCard
              icon={Layers}
              value={plan.level || 'Livre'}
              label="NÃ­vel"
            />

            <InfoCard
              icon={Clock}
              value={
                plan.duration_minutes
                  ? `${plan.duration_minutes} min`
                  : '--'
              }
              label="DuraÃ§Ã£o"
            />

            <InfoCard
              icon={Target}
              value={String(exercises.length)}
              label="ExercÃ­cios"
            />
          </div>
        </motion.section>

        <section className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#ff2a32]" />

            <p className="text-[11px] font-black uppercase text-zinc-500">
              PerÃ­odo do plano
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DateCard
              label="InÃ­cio"
              value={formatDate(plan.start_date)}
            />

            <DateCard
              label="Vencimento"
              value={formatDate(plan.end_date)}
            />
          </div>

          <p className="mt-3 text-xs text-zinc-500">
            {expirationInfo.description}
          </p>
        </section>

        <section className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#ff2a32]" />

            <p className="text-[11px] font-black uppercase text-zinc-500">
              Selecione o treino do dia
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {daySections.map((section) => {
              const selected =
                section.key === selectedDayKey;

              const today =
                section.key === todayDayKey;

              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() =>
                    setSelectedDayKey(section.key)
                  }
                  className={cn(
                    'rounded-full border px-4 py-2 text-[11px] font-black transition-all',
                    selected
                      ? 'border-[#ff2a32] bg-[#ff2a32] text-white'
                      : today
                        ? 'border-[#ff2a32]/40 bg-[#ff2a32]/15 text-[#ff2a32]'
                        : 'border-white/10 bg-white/[0.05] text-zinc-400'
                  )}
                >
                  {DAY_LABELS[section.key] ||
                    section.key
                      .slice(0, 3)
                      .toUpperCase()}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <StatisticCard
            icon={Flame}
            value={String(totalSets)}
            label="SÃ©ries totais"
          />

          <StatisticCard
            icon={Trophy}
            value={String(daySections.length)}
            label="Dias"
          />
        </section>

        {(totalDropSets > 0 || totalBiSets > 0) && (
          <section className="mt-3 grid grid-cols-2 gap-3">
            <StatisticCard
              icon={Zap}
              value={String(totalDropSets)}
              label="Drop-sets"
            />

            <StatisticCard
              icon={Layers2}
              value={String(totalBiSets)}
              label="Bi-sets"
            />
          </section>
        )}

        <section className="mt-6 space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
              Treinos do plano
            </p>

            <h2 className="mt-1 text-xl font-black">
              {selectedSection
                ? DAY_NAMES[selectedSection.key] ||
                  selectedSection.key
                : 'Selecione um dia'}
            </h2>
          </div>

          {!selectedSection ? (
            <div className="rounded-[30px] border border-white/10 bg-white/[0.035] p-7 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-zinc-700" />

              <h3 className="mt-4 text-lg font-black">
                Escolha um dia do plano
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                Selecione SEG, TER, QUA, QUI, SEX,
                SÃB ou DOM para visualizar os
                exercÃ­cios daquele dia.
              </p>
            </div>
          ) : (
            <DaySectionCard section={selectedSection} />
          )}
        </section>
      </div>

      {selectedSection && (
        <div className="fixed inset-x-0 bottom-[50px] z-40 border-t border-white/10 bg-[#050505]/98 px-4 pb-3 pt-3 backdrop-blur-xl">
          <div className="mx-auto max-w-lg">
            {selectedSection.key === todayDayKey ? (
              <button
                type="button"
                disabled={
                  selectedSection.exercises.length === 0
                }
                onClick={() =>
                  navigate(
                    `/student/workout-execution/${plan.id}?day=${selectedSection.key}`
                  )
                }
                className="flex h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-[#ff2a32] text-sm font-black uppercase text-white disabled:opacity-50"
              >
                <Play className="h-5 w-5" />
                Executar treino de hoje
              </button>
            ) : (
              <div className="rounded-[22px] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-center">
                <p className="text-xs font-black uppercase text-amber-300">
                  Treino bloqueado para hoje
                </p>

                <p className="mt-1 text-[11px] text-amber-100/70">
                  O treino de{' '}
                  {DAY_NAMES[selectedSection.key] ||
                    selectedSection.key}{' '}
                  sÃ³ poderÃ¡ ser executado no dia
                  correspondente.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DaySectionCard({
  section,
}: {
  section: DaySection;
}) {
  const groupedExerciseIds = new Set(
    section.groups.flatMap((group) =>
      section.exercises
        .filter(
          (exercise) =>
            exercise.exercise_group_id === group.id
        )
        .map((exercise) => exercise.id)
    )
  );

  const independentExercises =
    section.exercises.filter(
      (exercise) =>
        !groupedExerciseIds.has(exercise.id)
    );

  const title =
    section.day?.name ||
    DAY_NAMES[section.key] ||
    'Treino';

  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border border-[#ff2a32]/20 bg-[#ff2a32]/[0.07] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase text-[#ff2a32]">
              {DAY_NAMES[section.key] ||
                section.key}
            </p>

            <h3 className="mt-1 text-lg font-black">
              {title}
            </h3>
          </div>

          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black text-zinc-400">
            {section.exercises.length} exercÃ­cio
            {section.exercises.length === 1
              ? ''
              : 's'}
          </span>
        </div>

        {section.day?.notes && (
          <p className="mt-3 text-xs text-zinc-400">
            {section.day.notes}
          </p>
        )}
      </div>

      {section.groups.map((group) => {
        const groupedExercises =
          section.exercises
            .filter(
              (exercise) =>
                exercise.exercise_group_id === group.id
            )
            .sort(
              (a, b) =>
                (a.group_order ?? 0) -
                (b.group_order ?? 0)
            );

        if (groupedExercises.length === 0) {
          return null;
        }

        return (
          <BiSetCard
            key={group.id}
            group={group}
            exercises={groupedExercises}
          />
        );
      })}

      {independentExercises.map(
        (exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            index={index}
          />
        )
      )}

      {section.exercises.length === 0 && (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6 text-center">
          <Dumbbell className="mx-auto h-9 w-9 text-zinc-700" />

          <p className="mt-3 text-sm text-zinc-500">
            Nenhum exercÃ­cio cadastrado neste dia.
          </p>
        </div>
      )}
    </div>
  );
}

function BiSetCard({
  group,
  exercises,
}: {
  group: WorkoutExerciseGroup;
  exercises: WorkoutPlanExercise[];
}) {
  return (
    <div className="rounded-[30px] border border-purple-400/25 bg-purple-400/[0.07] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-400/15 px-3 py-1 text-[10px] font-black text-purple-200">
            <Layers2 className="h-3.5 w-3.5" />
            BI-SET
          </span>

          <h3 className="mt-2 text-base font-black">
            {group.name || 'Executar em sequÃªncia'}
          </h3>
        </div>

        {group.rounds && (
          <span className="rounded-full border border-purple-300/20 bg-black/20 px-3 py-1 text-[10px] font-bold text-purple-200">
            {group.rounds} rodadas
          </span>
        )}
      </div>

      <div className="space-y-3">
        {exercises.map((exercise, index) => (
          <div
            key={exercise.id}
            className="rounded-[22px] border border-white/10 bg-black/20 p-3"
          >
            <p className="text-[9px] font-black uppercase text-purple-300">
              ExercÃ­cio {index + 1}
            </p>

            <p className="mt-1 text-sm font-black">
              {getExerciseName(exercise)}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {exercise.sets && (
                <SmallTag>
                  {exercise.sets} sÃ©ries
                </SmallTag>
              )}

              {exercise.reps && (
                <SmallTag>
                  {exercise.reps} reps
                </SmallTag>
              )}

              {exercise.suggested_weight && (
                <SmallTag>
                  {exercise.suggested_weight}
                </SmallTag>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-purple-300/15 bg-black/20 p-3">
        <p className="text-xs text-purple-100/80">
          Execute os exercÃ­cios em sequÃªncia.
          {group.rest_after_seconds !== null &&
            ` Descanse ${group.rest_after_seconds}s depois de concluir o bi-set.`}
        </p>

        {group.notes && (
          <p className="mt-2 text-xs text-zinc-400">
            {group.notes}
          </p>
        )}
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  index,
}: {
  exercise: WorkoutPlanExercise;
  index: number;
}) {
  const technique =
    exercise.technique_type || 'normal';

  const dropConfig =
    getDropSetConfig(exercise);

  const observation =
    getExerciseObservation(exercise);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.25,
        delay: index * 0.04,
      }}
      className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4"
    >
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[22px] border border-white/10 bg-black/30">
          {exercise.video_url ? (
            <video
              src={exercise.video_url}
              muted
              loop
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          ) : exercise.image_url ? (
            <img
              src={exercise.image_url}
              alt={getExerciseName(exercise)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Dumbbell className="h-8 w-8 text-[#ff2a32]" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {technique === 'drop_set' && (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-orange-400/15 px-2.5 py-1 text-[9px] font-black text-orange-300">
              <Zap className="h-3 w-3" />
              DROP-SET
            </span>
          )}

          <h3 className="text-[16px] font-black">
            {getExerciseName(exercise)}
          </h3>

          <div className="mt-3 flex flex-wrap gap-2">
            {exercise.sets && (
              <SmallTag>
                {exercise.sets} sÃ©ries
              </SmallTag>
            )}

            {exercise.reps && (
              <SmallTag>
                {exercise.reps} reps
              </SmallTag>
            )}

            {exercise.suggested_weight && (
              <SmallTag>
                {exercise.suggested_weight}
              </SmallTag>
            )}

            {exercise.rest_seconds !== null &&
              exercise.rest_seconds > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold text-zinc-300">
                  <Timer className="h-3.5 w-3.5 text-[#ff2a32]" />
                  {exercise.rest_seconds}s
                </span>
              )}
          </div>

          {technique === 'drop_set' && (
            <div className="mt-3 rounded-2xl border border-orange-400/20 bg-orange-400/[0.06] p-3">
              <p className="text-[10px] font-black uppercase text-orange-300">
                ConfiguraÃ§Ã£o
              </p>

              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-orange-100/80">
                {dropConfig.drops !== undefined && (
                  <span>
                    {dropConfig.drops} queda
                    {dropConfig.drops === 1
                      ? ''
                      : 's'}
                  </span>
                )}

                {dropConfig.reduction_percent !==
                  undefined && (
                  <span>
                    â€¢ ReduÃ§Ã£o de{' '}
                    {dropConfig.reduction_percent}%
                  </span>
                )}

                {dropConfig.rest_between_drops_seconds !==
                  undefined && (
                  <span>
                    â€¢{' '}
                    {
                      dropConfig.rest_between_drops_seconds
                    }
                    s entre quedas
                  </span>
                )}
              </div>

              {dropConfig.notes && (
                <p className="mt-2 text-xs text-zinc-400">
                  {dropConfig.notes}
                </p>
              )}
            </div>
          )}

          {observation && (
            <p className="mt-3 rounded-2xl border border-white/5 bg-black/20 p-3 text-xs text-zinc-500">
              {observation}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function InfoCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Layers;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
      <Icon className="mx-auto mb-2 h-4 w-4 text-[#ff2a32]" />

      <p className="truncate text-sm font-black">
        {value}
      </p>

      <p className="text-[9px] font-black uppercase text-zinc-600">
        {label}
      </p>
    </div>
  );
}

function DateCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-[9px] font-black uppercase text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-black">
        {value}
      </p>
    </div>
  );
}

function StatisticCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Flame;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-4 text-center">
      <Icon className="mx-auto mb-2 h-5 w-5 text-[#ff2a32]" />

      <p className="text-2xl font-black">
        {value}
      </p>

      <p className="text-[10px] font-black uppercase text-zinc-600">
        {label}
      </p>
    </div>
  );
}

function SmallTag({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold text-zinc-300">
      {children}
    </span>
  );
}

export default WorkoutDetailPage;
` 

## Arquivo: src/pages/student/WorkoutExecutionPage.tsx
` 	sx
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Layers2,
  Loader2,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import * as studentService from '../../services/studentService';
import {
  getWorkoutPlanById,
  saveWorkoutLog,
} from '../../services/workoutService';
import type {
  CompleteWorkoutPlan,
  DropSetConfig,
  WorkoutExerciseGroup,
  WorkoutPlanExercise,
} from '../../types/database';

type CompletedExercise = {
  exerciseId: string;
  exerciseName: string;
  setsCompleted: number;
  repsCompleted: string;
  weightUsed: string;
};

type RestMode = 'set' | 'exercise';

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

const DAY_NAMES: Record<string, string> = {
  dom: 'Domingo',
  seg: 'Segunda-feira',
  ter: 'TerÃ§a-feira',
  qua: 'Quarta-feira',
  qui: 'Quinta-feira',
  sex: 'Sexta-feira',
  sab: 'SÃ¡bado',
};

function normalizeDayKey(value?: string | null) {
  if (!value) return '';

  return DAY_ALIASES[value] || value;
}

function getTodayDayKey() {
  return ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][
    new Date().getDay()
  ];
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds
  ).padStart(2, '0')}`;
}

function getExerciseOrder(
  exercise: WorkoutPlanExercise
) {
  return (
    exercise.execution_order ??
    exercise.order_index ??
    0
  );
}

function getExerciseName(
  exercise: WorkoutPlanExercise
) {
  return exercise.name || 'ExercÃ­cio';
}

function getExerciseSets(
  exercise: WorkoutPlanExercise
) {
  const parsed = Number.parseInt(
    String(exercise.sets || '1'),
    10
  );

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : 1;
}

function getExerciseReps(
  exercise: WorkoutPlanExercise
) {
  return exercise.reps || 'â€”';
}

function getExerciseWeight(
  exercise: WorkoutPlanExercise
) {
  return exercise.suggested_weight || 'â€”';
}

function getExerciseRest(
  exercise: WorkoutPlanExercise
) {
  const parsed = Number(
    exercise.rest_seconds || 0
  );

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : 0;
}

function getDropSetConfig(
  exercise: WorkoutPlanExercise
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

function getExercisesForDay(
  plan: CompleteWorkoutPlan,
  selectedDay: string
) {
  const normalizedDay =
    normalizeDayKey(selectedDay);

  const matchingDayIds = new Set(
    plan.workout_days
      .filter(
        (day) =>
          normalizeDayKey(day.day_key) ===
          normalizedDay
      )
      .map((day) => day.id)
  );

  return [...plan.workout_plan_exercises]
    .filter((exercise) => {
      if (
        exercise.workout_day_id &&
        matchingDayIds.has(
          exercise.workout_day_id
        )
      ) {
        return true;
      }

      return (
        normalizeDayKey(exercise.day_key) ===
        normalizedDay
      );
    })
    .sort(
      (a, b) =>
        getExerciseOrder(a) -
        getExerciseOrder(b)
    );
}

function getExerciseGroup(
  exercise: WorkoutPlanExercise,
  groups: WorkoutExerciseGroup[]
) {
  if (!exercise.exercise_group_id) {
    return null;
  }

  return (
    groups.find(
      (group) =>
        group.id ===
        exercise.exercise_group_id
    ) || null
  );
}

function getTransitionRest({
  exercise,
  nextExercise,
  groups,
}: {
  exercise: WorkoutPlanExercise;
  nextExercise: WorkoutPlanExercise | null;
  groups: WorkoutExerciseGroup[];
}) {
  const group = getExerciseGroup(
    exercise,
    groups
  );

  if (
    group?.group_type === 'bi_set' &&
    exercise.group_order === 1 &&
    nextExercise?.exercise_group_id ===
      group.id
  ) {
    return 0;
  }

  if (
    group?.group_type === 'bi_set' &&
    exercise.group_order === 2
  ) {
    return (
      group.rest_after_seconds ??
      getExerciseRest(exercise)
    );
  }

  return getExerciseRest(exercise);
}

function getTransitionTitle(
  exercise: WorkoutPlanExercise,
  groups: WorkoutExerciseGroup[]
) {
  const group = getExerciseGroup(
    exercise,
    groups
  );

  if (
    group?.group_type === 'bi_set' &&
    exercise.group_order === 2
  ) {
    return 'Descanso apÃ³s o bi-set';
  }

  return 'PrÃ³ximo exercÃ­cio';
}

async function resolveLoggedStudent() {
  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;

  if (!authData.user?.id) {
    throw new Error(
      'SessÃ£o do aluno nÃ£o encontrada.'
    );
  }

  const account =
    await studentService.getStudentAccountByAuthUser(
      authData.user.id
    );

  let student = account?.student || null;

  if (!student) {
    student =
      await studentService.getStudentByAuthUser(
        authData.user.id
      );
  }

  if (!student?.id) {
    throw new Error(
      'Perfil do aluno nÃ£o encontrado.'
    );
  }

  return student;
}

function getStudentName(student: any) {
  return (
    student?.name ||
    student?.full_name ||
    student?.email ||
    'Aluno'
  );
}

function getTrainerId(
  student: any,
  plan: CompleteWorkoutPlan
) {
  return (
    student?.trainer_id ||
    student?.coach_id ||
    plan.trainer_id ||
    ''
  );
}

async function resolveTrainerNotificationUserId(
  trainerId: string
) {
  if (!trainerId) return '';

  const { data: trainer } = await supabase
    .from('trainer_profiles')
    .select('*')
    .eq('id', trainerId)
    .maybeSingle();

  const trainerUserId =
    trainer?.auth_user_id ||
    trainer?.user_id ||
    trainer?.profile_id ||
    '';

  if (trainerUserId) {
    return trainerUserId;
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', trainerId)
    .maybeSingle();

  return profile?.id || '';
}

async function notifyTrainer({
  student,
  plan,
  durationSeconds,
  completedExercises,
  completedAt,
}: {
  student: any;
  plan: CompleteWorkoutPlan;
  durationSeconds: number;
  completedExercises: CompletedExercise[];
  completedAt: string;
}) {
  try {
    const trainerId = getTrainerId(
      student,
      plan
    );

    const userId =
      await resolveTrainerNotificationUserId(
        trainerId
      );

    if (!userId) {
      console.warn(
        '[WorkoutExecutionPage] user_id do personal nÃ£o encontrado.'
      );
      return;
    }

    const studentName =
      getStudentName(student);

    const minutes = Math.max(
      1,
      Math.round(durationSeconds / 60)
    );

    const total =
      completedExercises.length;

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: `${studentName} finalizou o treino`,
        message: `${studentName} finalizou "${plan.name}" com ${total} exercÃ­cio${
          total === 1 ? '' : 's'
        } em ${minutes} min.`,
        type: 'trainer_student_workout_completed',
        read: false,
        created_at: completedAt,
      });

    if (error) {
      console.error(
        '[WorkoutExecutionPage] notification error:',
        error
      );
    }
  } catch (error) {
    console.warn(
      '[WorkoutExecutionPage] notification exception:',
      error
    );
  }
}

function getSavedLogId(log: unknown) {
  if (Array.isArray(log)) {
    const first = log[0] as
      | Record<string, unknown>
      | undefined;

    return String(first?.id || '');
  }

  if (
    log &&
    typeof log === 'object' &&
    'id' in log
  ) {
    return String(
      (log as Record<string, unknown>).id ||
        ''
    );
  }

  return '';
}

export function WorkoutExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedDayKey = normalizeDayKey(
    searchParams.get('day')
  );

  const [student, setStudent] =
    useState<any | null>(null);

  const [plan, setPlan] =
    useState<CompleteWorkoutPlan | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] = useState('');

  const [
    currentExerciseIndex,
    setCurrentExerciseIndex,
  ] = useState(0);

  const [currentSet, setCurrentSet] =
    useState(1);

  const [isResting, setIsResting] =
    useState(false);

  const [restTimeLeft, setRestTimeLeft] =
    useState(0);

  const [restDuration, setRestDuration] =
    useState(0);

  const [restMode, setRestMode] =
    useState<RestMode>('exercise');

  const [restTitle, setRestTitle] =
    useState('Descanso');

  const [isCompleted, setIsCompleted] =
    useState(false);

  const [completedExercises, setCompletedExercises] =
    useState<CompletedExercise[]>([]);

  const [elapsedSeconds, setElapsedSeconds] =
    useState(0);

  const startedAtRef = useRef(
    new Date().toISOString()
  );

  useEffect(() => {
    void loadExecutionData();
  }, [id, selectedDayKey]);

  useEffect(() => {
    if (isCompleted) return;

    const interval = window.setInterval(() => {
      const startedAt = new Date(
        startedAtRef.current
      ).getTime();

      setElapsedSeconds(
        Math.floor(
          (Date.now() - startedAt) / 1000
        )
      );
    }, 1000);

    return () =>
      window.clearInterval(interval);
  }, [isCompleted]);

  useEffect(() => {
    if (!isResting) return;

    const interval = window.setInterval(() => {
      setRestTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          finishRest();
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () =>
      window.clearInterval(interval);
  }, [
    isResting,
    restMode,
    currentExerciseIndex,
  ]);

  async function loadExecutionData() {
    setLoading(true);
    setError('');
    setPlan(null);

    try {
      if (!id) {
        throw new Error(
          'Plano de treino nÃ£o encontrado.'
        );
      }

      if (!selectedDayKey) {
        throw new Error(
          'Selecione o dia do treino antes de iniciar.'
        );
      }

      const today = getTodayDayKey();

      if (selectedDayKey !== today) {
        throw new Error(
          `O treino de ${
            DAY_NAMES[selectedDayKey] ||
            selectedDayKey
          } nÃ£o pode ser executado hoje.`
        );
      }

      const [studentData, planData] =
        await Promise.all([
          resolveLoggedStudent(),
          getWorkoutPlanById(id),
        ]);

      if (!planData) {
        throw new Error(
          'Plano de treino nÃ£o encontrado.'
        );
      }

      const dayExercises =
        getExercisesForDay(
          planData,
          selectedDayKey
        );

      if (dayExercises.length === 0) {
        throw new Error(
          'Este dia nÃ£o possui exercÃ­cios cadastrados.'
        );
      }

      setStudent(studentData);
      setPlan(planData);
      setCurrentExerciseIndex(0);
      setCurrentSet(1);
      setCompletedExercises([]);
      setIsCompleted(false);
      startedAtRef.current =
        new Date().toISOString();
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Erro ao carregar treino.';

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const exercises = useMemo(() => {
    if (!plan || !selectedDayKey) {
      return [];
    }

    return getExercisesForDay(
      plan,
      selectedDayKey
    );
  }, [plan, selectedDayKey]);

  const dayGroups = useMemo(() => {
    if (!plan) return [];

    const selectedDayIds = new Set(
      plan.workout_days
        .filter(
          (day) =>
            normalizeDayKey(day.day_key) ===
            selectedDayKey
        )
        .map((day) => day.id)
    );

    return plan.workout_exercise_groups.filter(
      (group) =>
        selectedDayIds.has(
          group.workout_day_id
        )
    );
  }, [plan, selectedDayKey]);

  const currentExercise =
    exercises[currentExerciseIndex] || null;

  const nextExercise =
    exercises[currentExerciseIndex + 1] ||
    null;

  const currentGroup = currentExercise
    ? getExerciseGroup(
        currentExercise,
        dayGroups
      )
    : null;

  const safeTotalSets = currentExercise
    ? getExerciseSets(currentExercise)
    : 1;

  const exerciseName = currentExercise
    ? getExerciseName(currentExercise)
    : 'ExercÃ­cio';

  const exerciseReps = currentExercise
    ? getExerciseReps(currentExercise)
    : 'â€”';

  const exerciseWeight = currentExercise
    ? getExerciseWeight(currentExercise)
    : 'â€”';

  const dropConfig = currentExercise
    ? getDropSetConfig(currentExercise)
    : {};

  const progressPercent =
    exercises.length > 0
      ? ((currentExerciseIndex +
          (currentSet - 1) /
            safeTotalSets) /
          exercises.length) *
        100
      : 0;

  const completedPercent =
    exercises.length > 0
      ? Math.round(
          (completedExercises.length /
            exercises.length) *
            100
        )
      : 0;

  function startRest({
    seconds,
    mode,
    title,
  }: {
    seconds: number;
    mode: RestMode;
    title: string;
  }) {
    setRestMode(mode);
    setRestTitle(title);
    setRestDuration(seconds);
    setRestTimeLeft(seconds);
    setIsResting(true);
  }

  function goToNextExercise() {
    const nextIndex =
      currentExerciseIndex + 1;

    if (nextIndex < exercises.length) {
      setCurrentExerciseIndex(nextIndex);
      setCurrentSet(1);
      return;
    }

    setIsCompleted(true);
  }

  function finishRest() {
    setIsResting(false);
    setRestTimeLeft(0);

    if (restMode === 'set') {
      setCurrentSet(
        (previous) => previous + 1
      );
      return;
    }

    goToNextExercise();
  }

  function handleCompleteSet() {
    if (!currentExercise) return;

    if (currentSet < safeTotalSets) {
      const rest =
        getExerciseRest(currentExercise);

      if (rest > 0) {
        startRest({
          seconds: rest,
          mode: 'set',
          title: 'Descanso entre sÃ©ries',
        });

        return;
      }

      setCurrentSet(
        (previous) => previous + 1
      );

      return;
    }

    const completed: CompletedExercise = {
      exerciseId: currentExercise.id,
      exerciseName,
      setsCompleted: safeTotalSets,
      repsCompleted: exerciseReps,
      weightUsed: exerciseWeight,
    };

    setCompletedExercises((previous) => {
      const alreadyCompleted =
        previous.some(
          (exercise) =>
            exercise.exerciseId ===
            currentExercise.id
        );

      if (alreadyCompleted) {
        return previous;
      }

      return [...previous, completed];
    });

    if (!nextExercise) {
      setIsCompleted(true);
      return;
    }

    const transitionRest =
      getTransitionRest({
        exercise: currentExercise,
        nextExercise,
        groups: dayGroups,
      });

    if (transitionRest > 0) {
      startRest({
        seconds: transitionRest,
        mode: 'exercise',
        title: getTransitionTitle(
          currentExercise,
          dayGroups
        ),
      });

      return;
    }

    goToNextExercise();
  }

  async function handleSave() {
    if (
      !student ||
      !plan ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const completedAt =
        new Date().toISOString();

      const durationSeconds =
        Math.floor(
          (Date.now() -
            new Date(
              startedAtRef.current
            ).getTime()) /
            1000
        );

      const trainerId =
        getTrainerId(student, plan);

      const log = await saveWorkoutLog({
        student_id: student.id,
        trainer_id: trainerId,
        workout_plan_id: plan.id,
        started_at:
          startedAtRef.current,
        completed_at: completedAt,
        duration_seconds:
          durationSeconds,
        status: 'completed',
        exercises_data:
          completedExercises.map(
            (exercise) => ({
              exercise_id:
                exercise.exerciseId,
              exercise_name:
                exercise.exerciseName,
              sets_completed:
                exercise.setsCompleted,
              reps_completed:
                exercise.repsCompleted,
              weight_used:
                exercise.weightUsed,
              day_key:
                selectedDayKey,
            })
          ),
      });

      await notifyTrainer({
        student,
        plan,
        durationSeconds,
        completedExercises,
        completedAt,
      });

      const logId = getSavedLogId(log);

      navigate(
        `/student/workout-completed/${
          logId || plan.id
        }`,
        {
          replace: true,
        }
      );
    } catch (saveError: unknown) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Erro ao salvar o treino.';

      setError(message);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#050505] text-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#ff2a32]" />

          <p className="mt-4 text-sm font-black">
            Abrindo treino...
          </p>
        </div>
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#050505] px-5 text-white">
        <div className="w-full max-w-sm rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-300" />

          <h1 className="mt-5 text-xl font-black">
            NÃ£o foi possÃ­vel iniciar
          </h1>

          <p className="mt-2 text-sm text-red-200/80">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="mt-6 h-12 w-full rounded-2xl bg-[#ff2a32] text-sm font-black"
          >
            VOLTAR AO PLANO
          </button>
        </div>
      </div>
    );
  }

  if (
    !plan ||
    !student ||
    !currentExercise
  ) {
    return null;
  }

  const observation =
    currentExercise.observation ||
    currentExercise.instructions ||
    '';

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-[#050505] text-white">
      <AnimatePresence mode="wait">
        {isCompleted ? (
          <motion.main
            key="completed"
            initial={{
              opacity: 0,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            className="flex min-h-screen items-center px-4 py-6"
          >
            <div className="mx-auto w-full max-w-lg">
              <section className="rounded-[36px] border border-yellow-400/20 bg-yellow-400/10 p-6 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] bg-gradient-to-br from-yellow-400 to-orange-500">
                  <Trophy className="h-12 w-12" />
                </div>

                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.25em] text-yellow-300">
                  Finalizado
                </p>

                <h1 className="mt-2 text-3xl font-black uppercase italic">
                  Treino concluÃ­do
                </h1>

                <p className="mt-3 text-sm text-zinc-400">
                  ParabÃ©ns,{' '}
                  {getStudentName(student)}.
                </p>

                <div className="mt-6 grid grid-cols-3 gap-2">
                  <SummaryCard
                    icon={Clock3}
                    value={formatDuration(
                      elapsedSeconds
                    )}
                    label="Tempo"
                  />

                  <SummaryCard
                    icon={Dumbbell}
                    value={String(
                      completedExercises.length
                    )}
                    label="ExercÃ­cios"
                  />

                  <SummaryCard
                    icon={Flame}
                    value={`${completedPercent}%`}
                    label="Feito"
                  />
                </div>
              </section>

              <section className="mt-5 rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
                <p className="mb-4 text-[10px] font-black uppercase text-[#ff2a32]">
                  ExercÃ­cios concluÃ­dos
                </p>

                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {completedExercises.map(
                    (exercise) => (
                      <div
                        key={
                          exercise.exerciseId
                        }
                        className="flex items-center gap-3 rounded-2xl bg-black/20 p-3"
                      >
                        <CheckCircle2 className="h-5 w-5 text-emerald-300" />

                        <div>
                          <p className="text-sm font-black">
                            {
                              exercise.exerciseName
                            }
                          </p>

                          <p className="text-xs text-zinc-500">
                            {
                              exercise.setsCompleted
                            }{' '}
                            sÃ©ries Ã—{' '}
                            {
                              exercise.repsCompleted
                            }
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>

              {error && (
                <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-center text-xs text-red-300">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={() =>
                  void handleSave()
                }
                disabled={saving}
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-[#ff2a32] text-sm font-black uppercase disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}

                Salvar treino
              </button>
            </div>
          </motion.main>
        ) : isResting ? (
          <motion.main
            key="rest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex min-h-screen items-center px-4"
          >
            <div className="mx-auto w-full max-w-lg rounded-[38px] border border-[#ff2a32]/20 bg-[#ff2a32]/10 p-6 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ff2a32]">
                Descanso
              </p>

              <h1 className="mt-2 text-2xl font-black uppercase">
                {restTitle}
              </h1>

              <div className="my-8">
                <Timer className="mx-auto h-10 w-10 text-[#ff2a32]" />

                <p className="mt-3 text-7xl font-black">
                  {restTimeLeft}
                </p>

                <p className="text-xs text-zinc-500">
                  segundos
                </p>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full bg-[#ff2a32]"
                  animate={{
                    width: `${
                      restDuration > 0
                        ? (restTimeLeft /
                            restDuration) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>

              <button
                type="button"
                onClick={finishRest}
                className="mt-6 h-14 w-full rounded-[22px] border border-white/10 bg-white/[0.06] text-sm font-black uppercase"
              >
                Pular descanso
              </button>
            </div>
          </motion.main>
        ) : (
          <motion.main
            key="execution"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 py-5"
          >
            <header>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate(-1)
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="min-w-0 flex-1 text-center">
                  <p className="truncate text-[10px] font-black uppercase text-[#ff2a32]">
                    {plan.name}
                  </p>

                  <p className="text-xs text-zinc-500">
                    {DAY_NAMES[
                      selectedDayKey
                    ] || selectedDayKey}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs font-black">
                  {formatDuration(
                    elapsedSeconds
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-between text-xs">
                <span className="text-zinc-500">
                  ExercÃ­cio{' '}
                  {currentExerciseIndex + 1}{' '}
                  de {exercises.length}
                </span>

                <span className="font-black text-[#ff2a32]">
                  {Math.round(
                    progressPercent
                  )}
                  %
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full bg-[#ff2a32]"
                  animate={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
            </header>

            <section className="flex flex-1 flex-col justify-center py-6">
              <motion.div
                key={`${currentExercise.id}-${currentSet}`}
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="rounded-[38px] border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="h-56 overflow-hidden rounded-[30px] border border-white/10 bg-black/30">
                  {currentExercise.video_url ? (
                    <video
                      src={
                        currentExercise.video_url
                      }
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : currentExercise.image_url ? (
                    <img
                      src={
                        currentExercise.image_url
                      }
                      alt={exerciseName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Dumbbell className="h-16 w-16 text-[#ff2a32]" />
                    </div>
                  )}
                </div>

                <div className="mt-5 text-center">
                  <TechniqueBadge
                    technique={
                      currentExercise.technique_type ||
                      'normal'
                    }
                    group={currentGroup}
                    groupOrder={
                      currentExercise.group_order
                    }
                  />

                  <h1 className="mt-3 text-3xl font-black">
                    {exerciseName}
                  </h1>

                  <p className="mt-2 text-xs font-black uppercase text-[#ff2a32]">
                    SÃ©rie {currentSet} de{' '}
                    {safeTotalSets}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <MetricCard
                      label="RepetiÃ§Ãµes"
                      value={exerciseReps}
                    />

                    <MetricCard
                      label="Carga"
                      value={exerciseWeight}
                    />
                  </div>

                  {currentExercise.technique_type ===
                    'drop_set' && (
                    <DropSetPanel
                      config={dropConfig}
                    />
                  )}

                  {currentGroup?.group_type ===
                    'bi_set' && (
                    <div className="mt-4 rounded-[22px] border border-purple-400/20 bg-purple-400/[0.07] p-4 text-left">
                      <p className="text-[10px] font-black uppercase text-purple-300">
                        Bi-set
                      </p>

                      <p className="mt-1 text-sm text-zinc-300">
                        ExercÃ­cio{' '}
                        {currentExercise.group_order ||
                          1}{' '}
                        de 2.
                        {currentExercise.group_order ===
                        1
                          ? ' O prÃ³ximo exercÃ­cio serÃ¡ iniciado sem descanso.'
                          : ` Depois dele, descanse ${
                              currentGroup.rest_after_seconds ||
                              0
                            } segundos.`}
                      </p>
                    </div>
                  )}

                  {observation && (
                    <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-4 text-left">
                      <p className="text-[10px] font-black uppercase text-[#ff2a32]">
                        ObservaÃ§Ã£o
                      </p>

                      <p className="mt-1 text-sm text-zinc-400">
                        {observation}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </section>

            <button
              type="button"
              onClick={handleCompleteSet}
              className="flex h-16 items-center justify-center gap-3 rounded-[24px] bg-[#ff2a32] text-base font-black uppercase"
            >
              <CheckCircle2 className="h-6 w-6" />

              {currentSet < safeTotalSets
                ? 'Concluir sÃ©rie'
                : nextExercise
                  ? 'PrÃ³ximo exercÃ­cio'
                  : 'Finalizar treino'}

              <ChevronRight className="h-5 w-5" />
            </button>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}

function TechniqueBadge({
  technique,
  group,
  groupOrder,
}: {
  technique: string;
  group: WorkoutExerciseGroup | null;
  groupOrder: number | null;
}) {
  if (
    technique === 'bi_set' ||
    group?.group_type === 'bi_set'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-[11px] font-black text-purple-300">
        <Layers2 className="h-3.5 w-3.5" />
        BI-SET â€¢ EXERCÃCIO{' '}
        {groupOrder || 1}
      </span>
    );
  }

  if (technique === 'drop_set') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-[11px] font-black text-orange-300">
        <Zap className="h-3.5 w-3.5" />
        DROP-SET
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff2a32]/20 bg-[#ff2a32]/10 px-3 py-1 text-[11px] font-black text-[#ff2a32]">
      <Zap className="h-3.5 w-3.5" />
      EXERCÃCIO NORMAL
    </span>
  );
}

function DropSetPanel({
  config,
}: {
  config: DropSetConfig;
}) {
  return (
    <div className="mt-4 rounded-[22px] border border-orange-400/20 bg-orange-400/[0.07] p-4 text-left">
      <p className="text-[10px] font-black uppercase text-orange-300">
        Drop-set
      </p>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-300">
        {config.drops !== undefined && (
          <span>
            {config.drops} queda
            {config.drops === 1 ? '' : 's'}
          </span>
        )}

        {config.reduction_percent !==
          undefined && (
          <span>
            â€¢ ReduÃ§Ã£o de{' '}
            {config.reduction_percent}%
          </span>
        )}

        {config.rest_between_drops_seconds !==
          undefined && (
          <span>
            â€¢{' '}
            {
              config.rest_between_drops_seconds
            }
            s entre quedas
          </span>
        )}
      </div>

      {config.notes && (
        <p className="mt-2 text-xs text-zinc-400">
          {config.notes}
        </p>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
      <p className="text-[10px] font-black uppercase text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-3xl font-black">
        {value}
      </p>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Clock3;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/25 p-3">
      <Icon className="mx-auto mb-2 h-4 w-4 text-[#ff2a32]" />

      <p className="text-lg font-black">
        {value}
      </p>

      <p className="text-[9px] font-black uppercase text-zinc-600">
        {label}
      </p>
    </div>
  );
}

export default WorkoutExecutionPage;
` 

## Arquivo: src/pages/personal/StudentProfilePage.tsx
` 	sx
import {
  useCallback,
  useEffect,
  useState,
  type ElementType,
} from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Check,
  ChevronRight,
  Copy,
  DollarSign,
  Dumbbell,
  FileText,
  Key,
  KeyRound,
  Loader2,
  Lock,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Save,
  Send,
  Target,
  Trash2,
  TrendingUp,
  Unlock,
  User,
  X,
} from 'lucide-react';

import { Header } from '../../components/ui/Header';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
} from '../../lib/formatters';

import * as studentService from '../../services/studentService';
import * as workoutService from '../../services/workoutService';
import * as paymentService from '../../services/paymentService';
import * as messageService from '../../services/messageService';

import type {
  Message,
  Payment,
  Student,
  StudentGoals,
  StudentMetrics,
  WorkoutPlan,
} from '../../types/database';

type TabKey =
  | 'resumo'
  | 'treinos'
  | 'progresso'
  | 'financeiro'
  | 'chat'
  | 'dados';

type Credentials = {
  email: string;
  password: string;
  studentName: string;
  phone: string | null;
};

const tabs: {
  key: TabKey;
  label: string;
  icon: ElementType;
}[] = [
  {
    key: 'resumo',
    label: 'Resumo',
    icon: User,
  },
  {
    key: 'treinos',
    label: 'Treinos',
    icon: Dumbbell,
  },
  {
    key: 'progresso',
    label: 'Progresso',
    icon: TrendingUp,
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    icon: DollarSign,
  },
  {
    key: 'chat',
    label: 'Chat',
    icon: MessageSquare,
  },
  {
    key: 'dados',
    label: 'Dados',
    icon: FileText,
  },
];

const PAYMENT_METHODS = [
  {
    value: 'pix',
    label: 'PIX',
  },
  {
    value: 'credit_card',
    label: 'CartÃ£o',
  },
  {
    value: 'cash',
    label: 'Dinheiro',
  },
  {
    value: 'transfer',
    label: 'TransferÃªncia',
  },
];

function getStudentInitials(name?: string) {
  const safeName = String(
    name || 'Aluno'
  ).trim();

  const parts = safeName
    .split(' ')
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return safeName
    .slice(0, 2)
    .toUpperCase();
}

function getStudentAvatarUrl(
  student: Student
) {
  const record =
    student as unknown as Record<
      string,
      string | null
    >;

  return (
    record.avatar_url ||
    record.photo_url ||
    record.profile_photo_url ||
    record.image_url ||
    ''
  );
}

function normalizeWhatsappPhone(
  value?: string | null
) {
  const digits = String(
    value || ''
  ).replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (
    digits.length === 10 ||
    digits.length === 11
  ) {
    return `55${digits}`;
  }

  return digits;
}

function StudentAvatar({
  student,
}: {
  student: Student;
}) {
  const avatarUrl =
    getStudentAvatarUrl(student);

  const initials =
    getStudentInitials(student.name);

  if (avatarUrl) {
    return (
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
        <img
          src={avatarUrl}
          alt={
            student.name || 'Aluno'
          }
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display =
              'none';
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#ff2a32]/20 bg-[#ff2a32]/15 text-[15px] font-black text-[#ff2a32]">
      {initials}
    </div>
  );
}

function StudentStatusBadge({
  status,
}: {
  status?: string;
}) {
  const normalized = String(
    status || 'active'
  ).toLowerCase();

  const label =
    normalized === 'active'
      ? 'Ativo'
      : normalized === 'paused'
        ? 'Pausado'
        : normalized === 'inactive'
          ? 'Inativo'
          : 'Ativo';

  const className =
    normalized === 'active'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
      : normalized === 'paused'
        ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300'
        : 'border-zinc-400/20 bg-zinc-400/10 text-zinc-300';

  return (
    <span
      className={cn(
        'rounded-full border px-2.5 py-1 text-[10px] font-black uppercase',
        className
      )}
    >
      {label}
    </span>
  );
}

function AccessBadge({
  student,
}: {
  student: Student;
}) {
  const accounts =
    student.student_accounts;

  const accountHasAccess =
    Array.isArray(accounts)
      ? accounts.some(
          (account) =>
            account.auth_user_id
        )
      : Boolean(
          (
            accounts as unknown as {
              auth_user_id?: string;
            }
          )?.auth_user_id
        );

  const hasAccess =
    Boolean(student.auth_user_id) ||
    accountHasAccess ||
    student.app_access_status ===
      'active' ||
    student.app_access_status ===
      'invited';

  const blocked =
    student.app_access_status ===
      'blocked' ||
    student.login_enabled === false;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold',
        blocked
          ? 'border-red-400/25 bg-red-400/10 text-red-300'
          : hasAccess
            ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
            : 'border-white/10 bg-white/[0.04] text-zinc-400'
      )}
    >
      {blocked ? (
        <Lock className="h-3 w-3" />
      ) : (
        <KeyRound className="h-3 w-3" />
      )}

      {blocked
        ? 'Bloqueado'
        : hasAccess
          ? 'Com acesso'
          : 'Sem acesso'}
    </span>
  );
}

function getWorkoutStatusLabel(
  workout: WorkoutPlan
) {
  const status = String(
    workout.status || ''
  ).toLowerCase();

  if (status === 'published') {
    return 'Publicado';
  }

  if (status === 'draft') {
    return 'Rascunho';
  }

  if (status === 'archived') {
    return 'Arquivado';
  }

  return status || 'Treino';
}

function getWorkoutStatusClass(
  workout: WorkoutPlan
) {
  const status = String(
    workout.status || ''
  ).toLowerCase();

  if (status === 'published') {
    return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300';
  }

  if (status === 'draft') {
    return 'border-yellow-400/25 bg-yellow-400/10 text-yellow-300';
  }

  return 'border-white/10 bg-white/[0.05] text-zinc-400';
}

export function StudentProfilePage() {
  const { id } =
    useParams<{ id: string }>();

  const navigate = useNavigate();

  const { trainerProfile } =
    useAuthStore();

  const [activeTab, setActiveTab] =
    useState<TabKey>('resumo');

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [student, setStudent] =
    useState<Student | null>(null);

  const [goals, setGoals] =
    useState<StudentGoals | null>(
      null
    );

  const [metrics, setMetrics] =
    useState<StudentMetrics[]>([]);

  const [workouts, setWorkouts] =
    useState<WorkoutPlan[]>([]);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [
    deletingWorkoutId,
    setDeletingWorkoutId,
  ] = useState<string | null>(
    null
  );

  const [
    editModalOpen,
    setEditModalOpen,
  ] = useState(false);

  const [
    paymentModalOpen,
    setPaymentModalOpen,
  ] = useState(false);

  const [chatInput, setChatInput] =
    useState('');

  const [
    credentialsModalOpen,
    setCredentialsModalOpen,
  ] = useState(false);

  const [
    generatedCredentials,
    setGeneratedCredentials,
  ] = useState<Credentials | null>(
    null
  );

  const [
    resettingPassword,
    setResettingPassword,
  ] = useState(false);

  const [
    passwordError,
    setPasswordError,
  ] = useState('');

  const [copiedText, setCopiedText] =
    useState(false);

  const [editForm, setEditForm] =
    useState({
      name: '',
      email: '',
      phone: '',
      birthDate: '',
    });

  const [
    paymentForm,
    setPaymentForm,
  ] = useState({
    amount: '',
    dueDate: '',
    description: '',
    method: 'pix',
  });

  const loadStudent =
    useCallback(async () => {
      if (
        !id ||
        !trainerProfile?.id
      ) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const studentData =
          await studentService.getStudentById(
            id
          );

        if (!studentData) {
          throw new Error(
            'Aluno nÃ£o encontrado.'
          );
        }

        const [
          goalsResult,
          paymentsResult,
          workoutsResult,
          messagesResult,
          metricsResult,
        ] = await Promise.all([
          supabase
            .from('student_goals')
            .select('*')
            .eq('student_id', id)
            .maybeSingle(),

          paymentService.getPaymentsByStudent(
            id
          ),

          workoutService.getWorkoutPlansByStudent(
            id
          ),

          messageService.getMessages(
            trainerProfile.id,
            id
          ),

          supabase
            .from('student_metrics')
            .select('*')
            .eq('student_id', id)
            .order('created_at', {
              ascending: false,
            }),
        ]);

        setStudent(studentData);

        setGoals(
          goalsResult.data || null
        );

        setPayments(
          paymentsResult || []
        );

        setWorkouts(
          workoutsResult || []
        );

        setMessages(
          messagesResult || []
        );

        setMetrics(
          metricsResult.data || []
        );
      } catch (
        loadError: unknown
      ) {
        console.error(
          '[StudentProfilePage] load:',
          loadError
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Erro ao carregar dados do aluno.'
        );
      } finally {
        setLoading(false);
      }
    }, [
      id,
      trainerProfile?.id,
    ]);

  useEffect(() => {
    void loadStudent();
  }, [loadStudent]);

  useEffect(() => {
    if (!student) {
      return;
    }

    setEditForm({
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      birthDate:
        student.birth_date || '',
    });
  }, [student]);

  async function handleEditStudent() {
    if (!student) {
      return;
    }

    setError('');

    try {
      const updated =
        await studentService.updateStudent(
          student.id,
          {
            name:
              editForm.name.trim(),
            email:
              editForm.email.trim(),
            phone:
              editForm.phone.trim() ||
              null,
            birth_date:
              editForm.birthDate ||
              null,
          }
        );

      setStudent(updated);
      setEditModalOpen(false);
    } catch (
      updateError: unknown
    ) {
      console.error(
        '[StudentProfilePage] update student:',
        updateError
      );

      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Erro ao editar o aluno.'
      );
    }
  }

  async function handleDeleteWorkout(
    workout: WorkoutPlan
  ) {
    if (!trainerProfile?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Tem certeza que deseja excluir o treino "${workout.name}"?\n\nEsta aÃ§Ã£o nÃ£o poderÃ¡ ser desfeita.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingWorkoutId(
      workout.id
    );

    setError('');

    try {
      const {
        error: exercisesError,
      } = await supabase
        .from(
          'workout_plan_exercises'
        )
        .delete()
        .eq(
          'workout_plan_id',
          workout.id
        );

      if (exercisesError) {
        throw exercisesError;
      }

      const {
        error: groupsError,
      } = await supabase
        .from(
          'workout_exercise_groups'
        )
        .delete()
        .eq(
          'workout_plan_id',
          workout.id
        );

      if (groupsError) {
        throw groupsError;
      }

      const {
        error: daysError,
      } = await supabase
        .from('workout_days')
        .delete()
        .eq(
          'workout_plan_id',
          workout.id
        );

      if (daysError) {
        throw daysError;
      }

      const {
        error: planError,
      } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', workout.id)
        .eq(
          'trainer_id',
          trainerProfile.id
        );

      if (planError) {
        throw planError;
      }

      setWorkouts((previous) =>
        previous.filter(
          (item) =>
            item.id !== workout.id
        )
      );
    } catch (
      deleteError: unknown
    ) {
      console.error(
        '[StudentProfilePage] delete workout:',
        deleteError
      );

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Erro ao excluir o treino.'
      );
    } finally {
      setDeletingWorkoutId(null);
    }
  }

  async function handleCreatePayment() {
    if (
      !student ||
      !trainerProfile?.id ||
      !paymentForm.amount
    ) {
      return;
    }

    setError('');

    try {
      await paymentService.createPayment(
        trainerProfile.id,
        {
          student_id: student.id,
          student_name:
            student.name,
          amount: Number(
            paymentForm.amount
          ),
          due_date:
            paymentForm.dueDate ||
            undefined,
          description:
            paymentForm.description ||
            undefined,
          method:
            paymentForm.method ||
            undefined,
        }
      );

      setPaymentModalOpen(false);

      setPaymentForm({
        amount: '',
        dueDate: '',
        description: '',
        method: 'pix',
      });

      const updated =
        await paymentService.getPaymentsByStudent(
          student.id
        );

      setPayments(updated);
    } catch (
      paymentError: unknown
    ) {
      console.error(
        '[StudentProfilePage] payment:',
        paymentError
      );

      setError(
        paymentError instanceof Error
          ? paymentError.message
          : 'Erro ao criar pagamento.'
      );
    }
  }

  async function handleSendMessage() {
    if (
      !student ||
      !trainerProfile?.id ||
      !chatInput.trim()
    ) {
      return;
    }

    try {
      await messageService.sendMessage({
        trainer_id:
          trainerProfile.id,
        student_id: student.id,
        sender_role: 'personal',
        sender_id:
          trainerProfile.id,
        content: chatInput.trim(),
      });

      setChatInput('');

      const updated =
        await messageService.getMessages(
          trainerProfile.id,
          student.id
        );

      setMessages(updated);
    } catch (
      messageError: unknown
    ) {
      console.error(
        '[StudentProfilePage] message:',
        messageError
      );

      setError(
        messageError instanceof Error
          ? messageError.message
          : 'Erro ao enviar mensagem.'
      );
    }
  }

  async function handleToggleAccess() {
    if (!student) {
      return;
    }

    try {
      const newStatus =
        student.login_enabled
          ? {
              login_enabled: false,
              app_access_status:
                'blocked' as const,
            }
          : {
              login_enabled: true,
              app_access_status:
                'active' as const,
            };

      const updated =
        await studentService.updateStudent(
          student.id,
          newStatus
        );

      setStudent(updated);
    } catch (
      accessError: unknown
    ) {
      console.error(
        '[StudentProfilePage] access:',
        accessError
      );

      setError(
        accessError instanceof Error
          ? accessError.message
          : 'Erro ao alterar acesso.'
      );
    }
  }

  async function handleResetPassword() {
    if (!student) {
      return;
    }

    setResettingPassword(true);
    setPasswordError('');

    try {
      const studentName =
        student.name ||
        student.email?.split(
          '@'
        )[0] ||
        'Aluno';

      const {
        resetStudentPassword,
      } = await import(
        '../../services/resetStudentPassword'
      );

      const password =
        await resetStudentPassword(
          student.id,
          student.email,
          studentName
        );

      setGeneratedCredentials({
        email: student.email,
        password,
        studentName,
        phone:
          student.phone || null,
      });

      setCredentialsModalOpen(
        true
      );
    } catch (
      resetError: unknown
    ) {
      console.error(
        '[StudentProfilePage] reset password:',
        resetError
      );

      setPasswordError(
        resetError instanceof Error
          ? resetError.message
          : 'Erro ao resetar senha.'
      );
    } finally {
      setResettingPassword(
        false
      );
    }
  }

  function handleCopyCredentials() {
    if (!generatedCredentials) {
      return;
    }

    const text = `Email: ${generatedCredentials.email}\nSenha: ${generatedCredentials.password}`;

    void navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedText(true);

        window.setTimeout(() => {
          setCopiedText(false);
        }, 2000);
      });
  }

  function handleSendWhatsApp() {
    if (
      !generatedCredentials ||
      !student
    ) {
      return;
    }

    const message = `OlÃ¡ ${student.name}, seu acesso ao VSFit Personal foi criado:

Email: ${generatedCredentials.email}
Senha temporÃ¡ria: ${generatedCredentials.password}

Acesse o aplicativo e altere sua senha apÃ³s o primeiro login.`;

    const phone =
      normalizeWhatsappPhone(
        generatedCredentials.phone
      );

    if (phone) {
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(
          message
        )}`,
        '_blank'
      );

      return;
    }

    void navigator.clipboard.writeText(
      message
    );

    setPasswordError(
      'Telefone nÃ£o informado. A mensagem foi copiada.'
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header
          title="Carregando..."
          showBack
        />

        <div className="flex items-center justify-center pt-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff2a32]" />
        </div>
      </div>
    );
  }

  if (error && !student) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header
          title="Aluno"
          showBack
        />

        <EmptyState
          title="Aluno nÃ£o encontrado"
          description={error}
          action={
            <Button
              variant="secondary"
              onClick={() =>
                navigate(-1)
              }
            >
              Voltar
            </Button>
          }
        />
      </div>
    );
  }

  if (!student) {
    return null;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] text-white">
      <Header
        title="Perfil do Aluno"
        showBack
        right={
          <button
            type="button"
            onClick={() =>
              setEditModalOpen(true)
            }
            className="flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-4 text-xs font-black text-white"
          >
            EDITAR
          </button>
        }
      />

      <div className="mx-auto w-full max-w-lg px-4 pb-32 pt-4">
        {error && (
          <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mb-6 rounded-[24px] border border-white/10 bg-white/[0.045] p-5">
          <div className="flex items-center gap-4">
            <StudentAvatar
              student={student}
            />

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-black">
                {student.name}
              </h1>

              <p className="truncate text-[13px] text-zinc-400">
                {student.email}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <StudentStatusBadge
                  status={
                    student.status
                  }
                />

                <AccessBadge
                  student={student}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mb-6 grid grid-cols-3 gap-2 rounded-[22px] border border-white/5 bg-white/[0.03] p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() =>
                  setActiveTab(tab.key)
                }
                className={cn(
                  'flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-[16px] px-1 text-[10px] font-black uppercase',
                  activeTab ===
                    tab.key
                    ? 'border border-[#ff2a32]/30 bg-[#ff2a32]/20 text-[#ff2a32]'
                    : 'text-zinc-500'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab ===
          'resumo' && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="space-y-4"
          >
            <SectionCard
              title="Dados do aluno"
              icon={User}
            >
              <InfoRow
                icon={Phone}
                label="Telefone"
                value={
                  student.phone
                    ? formatPhone(
                        student.phone
                      )
                    : 'NÃ£o informado'
                }
              />

              <InfoRow
                icon={Calendar}
                label="Nascimento"
                value={
                  student.birth_date
                    ? formatDate(
                        student.birth_date
                      )
                    : 'NÃ£o informado'
                }
              />
            </SectionCard>

            <SectionCard
              title="Metas"
              icon={Target}
            >
              <div className="grid grid-cols-2 gap-3">
                <InfoBox
                  label="Objetivo"
                  value={
                    goals?.objective ||
                    'NÃ£o informado'
                  }
                />

                <InfoBox
                  label="NÃ­vel"
                  value={
                    goals?.level ||
                    'NÃ£o informado'
                  }
                />

                <InfoBox
                  label="FrequÃªncia"
                  value={
                    goals?.weekly_frequency
                      ? `${goals.weekly_frequency}x por semana`
                      : 'NÃ£o informada'
                  }
                />

                <InfoBox
                  label="Peso-alvo"
                  value={
                    goals?.target_weight
                      ? `${goals.target_weight} kg`
                      : 'NÃ£o informado'
                  }
                />
              </div>
            </SectionCard>

            <div className="grid grid-cols-2 gap-3">
              <CounterCard
                value={workouts.length}
                label="Treinos"
              />

              <CounterCard
                value={
                  payments.filter(
                    (payment) =>
                      payment.status ===
                      'paid'
                  ).length
                }
                label="Pagamentos"
              />
            </div>
          </motion.div>
        )}

        {activeTab ===
          'treinos' && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black uppercase text-zinc-500">
                Planos de treino
              </h2>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/personal/workout-builder?studentId=${student.id}`
                  )
                }
                className="flex items-center gap-2 rounded-full bg-[#ff2a32] px-4 py-2 text-[11px] font-black"
              >
                <Plus className="h-4 w-4" />
                NOVO
              </button>
            </div>

            {workouts.length === 0 ? (
              <EmptyState
                title="Nenhum treino criado"
                description="Crie o primeiro plano de treino para este aluno."
                action={
                  <Button
                    onClick={() =>
                      navigate(
                        `/personal/workout-builder?studentId=${student.id}`
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Criar treino
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {workouts.map(
                  (workout) => (
                    <article
                      key={workout.id}
                      className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/personal/workout-builder?studentId=${student.id}&workoutId=${workout.id}`
                          )
                        }
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ff2a32]/15 text-[#ff2a32]">
                            <Dumbbell className="h-6 w-6" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  'rounded-full border px-2.5 py-1 text-[9px] font-black uppercase',
                                  getWorkoutStatusClass(
                                    workout
                                  )
                                )}
                              >
                                {getWorkoutStatusLabel(
                                  workout
                                )}
                              </span>
                            </div>

                            <h3 className="mt-2 truncate text-base font-black">
                              {workout.name}
                            </h3>

                            <p className="mt-1 text-xs text-zinc-500">
                              {workout.objective ||
                                'Treino personalizado'}
                            </p>
                          </div>

                          <ChevronRight className="h-5 w-5 text-zinc-700" />
                        </div>
                      </button>

                      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/personal/workout-builder?studentId=${student.id}&workoutId=${workout.id}`
                            )
                          }
                          className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] text-[11px] font-black"
                        >
                          <Pencil className="h-4 w-4" />
                          EDITAR
                        </button>

                        <button
                          type="button"
                          disabled={
                            deletingWorkoutId ===
                            workout.id
                          }
                          onClick={() =>
                            void handleDeleteWorkout(
                              workout
                            )
                          }
                          className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 text-[11px] font-black text-red-300 disabled:opacity-50"
                        >
                          {deletingWorkoutId ===
                          workout.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}

                          EXCLUIR
                        </button>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab ===
          'progresso' && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black uppercase text-zinc-500">
                Progresso
              </h2>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/personal/progress'
                  )
                }
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-black"
              >
                <Plus className="h-4 w-4" />
                NOVA
              </button>
            </div>

            {metrics.length === 0 ? (
              <EmptyState
                title="Nenhuma medida"
                description="As avaliaÃ§Ãµes fÃ­sicas aparecerÃ£o aqui."
              />
            ) : (
              <div className="space-y-3">
                {metrics.map(
                  (metric) => (
                    <article
                      key={metric.id}
                      className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4"
                    >
                      <p className="mb-3 text-[10px] font-black uppercase text-zinc-500">
                        {formatDateTime(
                          metric.created_at
                        )}
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <MetricBox
                          label="Peso"
                          value={
                            metric.weight
                              ? `${metric.weight} kg`
                              : 'â€”'
                          }
                        />

                        <MetricBox
                          label="Altura"
                          value={
                            metric.height
                              ? `${metric.height} m`
                              : 'â€”'
                          }
                        />

                        <MetricBox
                          label="Gordura"
                          value={
                            metric.body_fat
                              ? `${metric.body_fat}%`
                              : 'â€”'
                          }
                        />

                        <MetricBox
                          label="Massa muscular"
                          value={
                            metric.muscle_mass
                              ? `${metric.muscle_mass} kg`
                              : 'â€”'
                          }
                        />
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab ===
          'financeiro' && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase text-zinc-500">
                Financeiro
              </h2>

              <button
                type="button"
                onClick={() =>
                  setPaymentModalOpen(
                    true
                  )
                }
                className="flex items-center gap-2 rounded-full bg-[#ff2a32] px-4 py-2 text-[11px] font-black"
              >
                <Plus className="h-4 w-4" />
                NOVO
              </button>
            </div>

            {payments.length === 0 ? (
              <EmptyState
                title="Nenhum pagamento"
                description="As cobranÃ§as deste aluno aparecerÃ£o aqui."
              />
            ) : (
              <div className="space-y-3">
                {payments.map(
                  (payment) => (
                    <article
                      key={payment.id}
                      className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xl font-black">
                            {formatCurrency(
                              payment.amount
                            )}
                          </p>

                          <p className="mt-1 text-sm text-zinc-400">
                            {payment.description ||
                              'Sem descriÃ§Ã£o'}
                          </p>
                        </div>

                        <Badge
                          status={
                            payment.status
                          }
                        />
                      </div>

                      <p className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                        <Calendar className="h-4 w-4" />
                        Vencimento:{' '}
                        {payment.due_date
                          ? formatDate(
                              payment.due_date
                            )
                          : 'NÃ£o definido'}
                      </p>
                    </article>
                  )
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab ===
          'chat' && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="space-y-4"
          >
            <h2 className="text-sm font-black uppercase text-zinc-500">
              Conversa
            </h2>

            <div className="max-h-[480px] space-y-3 overflow-y-auto">
              {messages.length === 0 ? (
                <EmptyState
                  title="Nenhuma mensagem"
                  description="Inicie uma conversa com o aluno."
                />
              ) : (
                messages.map(
                  (message) => {
                    const personal =
                      message.sender_role ===
                      'personal';

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex',
                          personal
                            ? 'justify-end'
                            : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[85%] rounded-[20px] px-4 py-3',
                            personal
                              ? 'rounded-tr-sm bg-[#ff2a32]'
                              : 'rounded-tl-sm border border-white/10 bg-white/[0.06]'
                          )}
                        >
                          <p className="break-words text-sm">
                            {message.content}
                          </p>

                          <p className="mt-1 text-[9px] opacity-60">
                            {formatDateTime(
                              message.created_at
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>

            <div className="flex gap-2 border-t border-white/10 pt-4">
              <input
                value={chatInput}
                onChange={(event) =>
                  setChatInput(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    void handleSendMessage();
                  }
                }}
                placeholder="Escreva sua mensagem..."
                className="min-w-0 flex-1 rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none"
              />

              <button
                type="button"
                disabled={
                  !chatInput.trim()
                }
                onClick={() =>
                  void handleSendMessage()
                }
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#ff2a32] disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}

        {activeTab ===
          'dados' && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="space-y-4"
          >
            <SectionCard
              title="Controle de acesso"
              icon={KeyRound}
            >
              <p className="text-sm text-zinc-400">
                {student.login_enabled
                  ? 'O aluno pode acessar o aplicativo.'
                  : 'O acesso do aluno estÃ¡ bloqueado.'}
              </p>

              <button
                type="button"
                onClick={() =>
                  void handleToggleAccess()
                }
                className={cn(
                  'mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] text-sm font-black',
                  student.login_enabled
                    ? 'border border-red-400/20 bg-red-400/10 text-red-300'
                    : 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                )}
              >
                {student.login_enabled ? (
                  <>
                    <Lock className="h-4 w-4" />
                    BLOQUEAR ACESSO
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    LIBERAR ACESSO
                  </>
                )}
              </button>
            </SectionCard>

            <SectionCard
              title="SeguranÃ§a"
              icon={Key}
            >
              <p className="text-sm text-zinc-400">
                Gere uma nova senha temporÃ¡ria para o aluno.
              </p>

              <button
                type="button"
                disabled={
                  resettingPassword
                }
                onClick={() =>
                  void handleResetPassword()
                }
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.06] text-sm font-black disabled:opacity-50"
              >
                {resettingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Key className="h-4 w-4" />
                )}

                RESETAR SENHA
              </button>

              {passwordError && (
                <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300">
                  {passwordError}
                </p>
              )}
            </SectionCard>
          </motion.div>
        )}
      </div>

      <Modal
        open={editModalOpen}
        onClose={() =>
          setEditModalOpen(false)
        }
        title="Editar Aluno"
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            value={editForm.name}
            onChange={(event) =>
              setEditForm(
                (previous) => ({
                  ...previous,
                  name:
                    event.target.value,
                })
              )
            }
          />

          <Input
            label="Email"
            type="email"
            value={editForm.email}
            onChange={(event) =>
              setEditForm(
                (previous) => ({
                  ...previous,
                  email:
                    event.target.value,
                })
              )
            }
          />

          <Input
            label="Telefone"
            value={editForm.phone}
            onChange={(event) =>
              setEditForm(
                (previous) => ({
                  ...previous,
                  phone:
                    event.target.value,
                })
              )
            }
          />

          <Input
            label="Data de nascimento"
            type="date"
            value={
              editForm.birthDate
            }
            onChange={(event) =>
              setEditForm(
                (previous) => ({
                  ...previous,
                  birthDate:
                    event.target.value,
                })
              )
            }
          />

          <Button
            onClick={() =>
              void handleEditStudent()
            }
          >
            <Save className="h-4 w-4" />
            Salvar alteraÃ§Ãµes
          </Button>
        </div>
      </Modal>

      <Modal
        open={paymentModalOpen}
        onClose={() =>
          setPaymentModalOpen(false)
        }
        title="Novo Pagamento"
      >
        <div className="space-y-4">
          <Input
            label="Valor"
            type="number"
            step="0.01"
            value={
              paymentForm.amount
            }
            onChange={(event) =>
              setPaymentForm(
                (previous) => ({
                  ...previous,
                  amount:
                    event.target.value,
                })
              )
            }
          />

          <Input
            label="Vencimento"
            type="date"
            value={
              paymentForm.dueDate
            }
            onChange={(event) =>
              setPaymentForm(
                (previous) => ({
                  ...previous,
                  dueDate:
                    event.target.value,
                })
              )
            }
          />

          <Input
            label="DescriÃ§Ã£o"
            value={
              paymentForm.description
            }
            onChange={(event) =>
              setPaymentForm(
                (previous) => ({
                  ...previous,
                  description:
                    event.target.value,
                })
              )
            }
          />

          <div>
            <p className="mb-2 text-[10px] font-black uppercase text-zinc-500">
              MÃ©todo
            </p>

            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(
                (method) => (
                  <button
                    key={
                      method.value
                    }
                    type="button"
                    onClick={() =>
                      setPaymentForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          method:
                            method.value,
                        })
                      )
                    }
                    className={cn(
                      'h-11 rounded-2xl border text-[11px] font-black',
                      paymentForm.method ===
                        method.value
                        ? 'border-[#ff2a32]/40 bg-[#ff2a32]/15 text-[#ff2a32]'
                        : 'border-white/10 bg-white/[0.04] text-zinc-400'
                    )}
                  >
                    {method.label}
                  </button>
                )
              )}
            </div>
          </div>

          <Button
            onClick={() =>
              void handleCreatePayment()
            }
          >
            <Plus className="h-4 w-4" />
            Criar pagamento
          </Button>
        </div>
      </Modal>

      {generatedCredentials &&
        credentialsModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
            <button
              type="button"
              aria-label="Fechar"
              className="absolute inset-0"
              onClick={() =>
                setCredentialsModalOpen(
                  false
                )
              }
            />

            <div className="relative w-full max-w-[380px] rounded-[32px] border border-white/10 bg-[#080808] p-5">
              <button
                type="button"
                onClick={() =>
                  setCredentialsModalOpen(
                    false
                  )
                }
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-500/15 text-emerald-400">
                <KeyRound className="h-8 w-8" />
              </div>

              <h2 className="mt-5 text-center text-xl font-black">
                Senha temporÃ¡ria
              </h2>

              <div className="mt-5 space-y-3">
                <CredentialBox
                  label="Aluno"
                  value={
                    generatedCredentials.studentName
                  }
                />

                <CredentialBox
                  label="Email"
                  value={
                    generatedCredentials.email
                  }
                />

                <CredentialBox
                  label="Senha"
                  value={
                    generatedCredentials.password
                  }
                  highlighted
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={
                    handleCopyCredentials
                  }
                  className="flex h-12 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.06] text-sm font-black"
                >
                  {copiedText ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}

                  {copiedText
                    ? 'Copiado'
                    : 'Copiar'}
                </button>

                <button
                  type="button"
                  onClick={
                    handleSendWhatsApp
                  }
                  className="flex h-12 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.06] text-sm font-black"
                >
                  <Send className="h-4 w-4" />
                  WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff2a32]/10">
          <Icon className="h-4 w-4 text-[#ff2a32]" />
        </div>

        <h3 className="text-xs font-black uppercase text-zinc-500">
          {title}
        </h3>
      </div>

      {children}
    </section>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3 last:mb-0">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04]">
        <Icon className="h-4 w-4 text-zinc-400" />
      </div>

      <div>
        <p className="text-[10px] font-black uppercase text-zinc-500">
          {label}
        </p>

        <p className="text-sm font-black">
          {value}
        </p>
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
      <p className="text-[9px] font-black uppercase text-zinc-600">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-black">
        {value}
      </p>
    </div>
  );
}

function CounterCard({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5 text-center">
      <p className="text-3xl font-black text-[#ff2a32]">
        {value}
      </p>

      <p className="mt-1 text-[10px] font-black uppercase text-zinc-500">
        {label}
      </p>
    </div>
  );
}

function MetricBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
      <p className="text-[9px] font-black uppercase text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-lg font-black">
        {value}
      </p>
    </div>
  );
}

function CredentialBox({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-[18px] border p-3',
        highlighted
          ? 'border-[#ff2a32]/20 bg-[#ff2a32]/10'
          : 'border-white/10 bg-white/[0.045]'
      )}
    >
      <p
        className={cn(
          'text-[10px] font-black uppercase',
          highlighted
            ? 'text-red-300'
            : 'text-zinc-500'
        )}
      >
        {label}
      </p>

      <p
        className={cn(
          'mt-1 break-all font-black',
          highlighted
            ? 'text-lg text-[#ff2a32]'
            : 'text-sm text-white'
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default StudentProfilePage;
` 

## Arquivo: src/services/workoutService.ts
` 	sx
import { supabase } from '../lib/supabase';

import type {
  CompleteWorkoutPlan,
  WorkoutDay,
  WorkoutExerciseGroup,
  WorkoutLog,
  WorkoutPlan,
  WorkoutPlanExercise,
} from '../types/database';

import type {
  CreateExerciseInWorkout,
  CreateWorkoutData,
  CreateWorkoutDay,
  CreateWorkoutExerciseGroup,
} from '../types/workout';

type WorkoutPlanWithStudent = WorkoutPlan & {
  students?: {
    name?: string | null;
  } | null;
};

function normalizeNullableText(value?: string | null) {
  const normalized = String(value || '').trim();

  return normalized || null;
}

function normalizeNullableNumber(value?: number | null) {
  if (value === null || value === undefined) return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function buildPlanPayload(
  trainerId: string,
  data: CreateWorkoutData
) {
  return {
    trainer_id: trainerId,
    student_id: data.student_id,
    name: data.name.trim(),
    objective: normalizeNullableText(data.objective),
    level: normalizeNullableText(data.level),
    duration_minutes: normalizeNullableNumber(
      data.duration_minutes
    ),
    start_date: data.start_date || null,
    end_date: data.end_date || null,
  };
}

function buildExercisePayload({
  exercise,
  workoutPlanId,
  index,
  workoutDayId,
  exerciseGroupId,
}: {
  exercise: CreateExerciseInWorkout;
  workoutPlanId: string;
  index: number;
  workoutDayId: string | null;
  exerciseGroupId: string | null;
}) {
  return {
    workout_plan_id: workoutPlanId,
    exercise_id: exercise.exercise_id || null,

    workout_day_id: workoutDayId,
    exercise_group_id: exerciseGroupId,

    day_key: exercise.day_key || null,
    order_index: index,
    execution_order:
      exercise.execution_order ?? index,
    group_order: exercise.group_order ?? null,

    technique_type:
      exercise.technique_type || 'normal',
    technique_config:
      exercise.technique_config || {},

    name: exercise.name.trim(),
    sets: normalizeNullableText(exercise.sets),
    reps: normalizeNullableText(exercise.reps),
    rest_seconds:
      normalizeNullableNumber(exercise.rest_seconds),
    suggested_weight:
      normalizeNullableText(exercise.suggested_weight),
    observation:
      normalizeNullableText(exercise.observation),
    tempo: normalizeNullableText(exercise.tempo),

    image_url: exercise.image_url || null,
    video_url: exercise.video_url || null,
    muscle_group: exercise.muscle_group || null,
    category: exercise.category || null,
    equipment: exercise.equipment || null,
    difficulty: exercise.difficulty || null,
    instructions: exercise.instructions || null,
    tips: exercise.tips || null,
  };
}

async function insertWorkoutDays(
  workoutPlanId: string,
  days: CreateWorkoutDay[]
) {
  const idMap = new Map<string, string>();
  const createdDays: WorkoutDay[] = [];

  for (const day of days) {
    const { data, error } = await supabase
      .from('workout_days')
      .insert({
        workout_plan_id: workoutPlanId,
        weekday: day.weekday,
        day_key: day.day_key,
        order_index: day.order_index,
        name: normalizeNullableText(day.name),
        notes: normalizeNullableText(day.notes),
      })
      .select('*')
      .single();

    if (error) throw error;

    const createdDay = data as WorkoutDay;

    idMap.set(day.local_id, createdDay.id);
    createdDays.push(createdDay);
  }

  return {
    idMap,
    createdDays,
  };
}

async function insertExerciseGroups({
  workoutPlanId,
  groups,
  workoutDayIdMap,
}: {
  workoutPlanId: string;
  groups: CreateWorkoutExerciseGroup[];
  workoutDayIdMap: Map<string, string>;
}) {
  const idMap = new Map<string, string>();
  const createdGroups: WorkoutExerciseGroup[] = [];

  for (const group of groups) {
    const workoutDayId = workoutDayIdMap.get(
      group.workout_day_local_id
    );

    if (!workoutDayId) {
      throw new Error(
        'NÃ£o foi possÃ­vel localizar o dia relacionado ao bi-set.'
      );
    }

    const { data, error } = await supabase
      .from('workout_exercise_groups')
      .insert({
        workout_plan_id: workoutPlanId,
        workout_day_id: workoutDayId,
        group_type: group.group_type,
        name: normalizeNullableText(group.name),
        order_index: group.order_index,
        rounds: normalizeNullableNumber(group.rounds),
        rest_after_seconds: normalizeNullableNumber(
          group.rest_after_seconds
        ),
        notes: normalizeNullableText(group.notes),
      })
      .select('*')
      .single();

    if (error) throw error;

    const createdGroup =
      data as WorkoutExerciseGroup;

    idMap.set(group.local_id, createdGroup.id);
    createdGroups.push(createdGroup);
  }

  return {
    idMap,
    createdGroups,
  };
}

async function insertWorkoutExercises({
  workoutPlanId,
  exercises,
  workoutDayIdMap,
  exerciseGroupIdMap,
}: {
  workoutPlanId: string;
  exercises: CreateExerciseInWorkout[];
  workoutDayIdMap: Map<string, string>;
  exerciseGroupIdMap: Map<string, string>;
}) {
  if (exercises.length === 0) return [];

  const payload = exercises.map((exercise, index) => {
    const workoutDayId =
      exercise.workout_day_id ||
      (
        exercise.workout_day_local_id
          ? workoutDayIdMap.get(
              exercise.workout_day_local_id
            )
          : null
      ) ||
      null;

    const exerciseGroupId =
      exercise.exercise_group_id ||
      (
        exercise.exercise_group_local_id
          ? exerciseGroupIdMap.get(
              exercise.exercise_group_local_id
            )
          : null
      ) ||
      null;

    return buildExercisePayload({
      exercise,
      workoutPlanId,
      index,
      workoutDayId,
      exerciseGroupId,
    });
  });

  const { data, error } = await supabase
    .from('workout_plan_exercises')
    .insert(payload)
    .select('*');

  if (error) throw error;

  return (data || []) as WorkoutPlanExercise[];
}

export async function getWorkoutPlansByStudent(
  studentId: string
): Promise<WorkoutPlan[]> {
  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.error(
        '[WorkoutService] getWorkoutPlansByStudent error:',
        error
      );

      return [];
    }

    return (data || []) as WorkoutPlan[];
  } catch (error) {
    console.error(
      '[WorkoutService] getWorkoutPlansByStudent exception:',
      error
    );

    return [];
  }
}

export async function getWorkoutPlansByTrainer(
  trainerId: string
): Promise<WorkoutPlanWithStudent[]> {
  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*, students(name)')
      .eq('trainer_id', trainerId)
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.error(
        '[WorkoutService] getWorkoutPlansByTrainer error:',
        error
      );

      return [];
    }

    return (data || []) as WorkoutPlanWithStudent[];
  } catch (error) {
    console.error(
      '[WorkoutService] getWorkoutPlansByTrainer exception:',
      error
    );

    return [];
  }
}

export async function getCompleteWorkoutPlan(
  id: string
): Promise<CompleteWorkoutPlan | null> {
  try {
    const { data: plan, error: planError } =
      await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (planError) throw planError;
    if (!plan) return null;

    const [
      daysResult,
      groupsResult,
      exercisesResult,
    ] = await Promise.all([
      supabase
        .from('workout_days')
        .select('*')
        .eq('workout_plan_id', id)
        .order('order_index', {
          ascending: true,
        }),

      supabase
        .from('workout_exercise_groups')
        .select('*')
        .eq('workout_plan_id', id)
        .order('order_index', {
          ascending: true,
        }),

      supabase
        .from('workout_plan_exercises')
        .select('*')
        .eq('workout_plan_id', id)
        .order('order_index', {
          ascending: true,
        }),
    ]);

    if (daysResult.error) {
      throw daysResult.error;
    }

    if (groupsResult.error) {
      throw groupsResult.error;
    }

    if (exercisesResult.error) {
      throw exercisesResult.error;
    }

    return {
      ...(plan as WorkoutPlan),

      workout_days:
        (daysResult.data || []) as WorkoutDay[],

      workout_exercise_groups:
        (groupsResult.data ||
          []) as WorkoutExerciseGroup[],

      workout_plan_exercises:
        (exercisesResult.data ||
          []) as WorkoutPlanExercise[],
    };
  } catch (error) {
    console.error(
      '[WorkoutService] getCompleteWorkoutPlan error:',
      error
    );

    return null;
  }
}

export async function getWorkoutPlanById(
  id: string
): Promise<CompleteWorkoutPlan | null> {
  return getCompleteWorkoutPlan(id);
}

export async function createWorkoutPlan(
  trainerId: string,
  data: CreateWorkoutData
): Promise<CompleteWorkoutPlan> {
  const { data: planData, error: planError } =
    await supabase
      .from('workout_plans')
      .insert(buildPlanPayload(trainerId, data))
      .select('*')
      .single();

  if (planError) throw planError;

  const plan = planData as WorkoutPlan;

  try {
    const days = data.days || [];
    const groups = data.groups || [];

    const {
      idMap: workoutDayIdMap,
      createdDays,
    } = await insertWorkoutDays(plan.id, days);

    const {
      idMap: exerciseGroupIdMap,
      createdGroups,
    } = await insertExerciseGroups({
      workoutPlanId: plan.id,
      groups,
      workoutDayIdMap,
    });

    const createdExercises =
      await insertWorkoutExercises({
        workoutPlanId: plan.id,
        exercises: data.exercises,
        workoutDayIdMap,
        exerciseGroupIdMap,
      });

    return {
      ...plan,
      workout_days: createdDays,
      workout_exercise_groups: createdGroups,
      workout_plan_exercises: createdExercises,
    };
  } catch (error) {
    const { error: cleanupError } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', plan.id);

    if (cleanupError) {
      console.error(
        '[WorkoutService] erro ao desfazer plano incompleto:',
        cleanupError
      );
    }

    throw error;
  }
}

export async function updateWorkoutPlanBasic({
  id,
  studentId,
  name,
  objective,
  level,
  durationMinutes,
  startDate,
  endDate,
}: {
  id: string;
  studentId?: string;
  name?: string;
  objective?: string | null;
  level?: string | null;
  durationMinutes?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}) {
  const payload: Record<string, unknown> = {};

  if (studentId !== undefined) {
    payload.student_id = studentId;
  }

  if (name !== undefined) {
    payload.name = name.trim();
  }

  if (objective !== undefined) {
    payload.objective =
      normalizeNullableText(objective);
  }

  if (level !== undefined) {
    payload.level = normalizeNullableText(level);
  }

  if (durationMinutes !== undefined) {
    payload.duration_minutes =
      normalizeNullableNumber(durationMinutes);
  }

  if (startDate !== undefined) {
    payload.start_date = startDate || null;
  }

  if (endDate !== undefined) {
    payload.end_date = endDate || null;
  }

  const { data, error } = await supabase
    .from('workout_plans')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return data as WorkoutPlan;
}

export async function createWorkoutDay(
  workoutPlanId: string,
  day: Omit<CreateWorkoutDay, 'local_id'>
) {
  const { data, error } = await supabase
    .from('workout_days')
    .insert({
      workout_plan_id: workoutPlanId,
      weekday: day.weekday,
      day_key: day.day_key,
      order_index: day.order_index,
      name: normalizeNullableText(day.name),
      notes: normalizeNullableText(day.notes),
    })
    .select('*')
    .single();

  if (error) throw error;

  return data as WorkoutDay;
}

export async function updateWorkoutDay(
  id: string,
  day: Partial<
    Omit<CreateWorkoutDay, 'local_id'>
  >
) {
  const payload: Record<string, unknown> = {};

  if (day.weekday !== undefined) {
    payload.weekday = day.weekday;
  }

  if (day.day_key !== undefined) {
    payload.day_key = day.day_key;
  }

  if (day.order_index !== undefined) {
    payload.order_index = day.order_index;
  }

  if (day.name !== undefined) {
    payload.name =
      normalizeNullableText(day.name);
  }

  if (day.notes !== undefined) {
    payload.notes =
      normalizeNullableText(day.notes);
  }

  const { data, error } = await supabase
    .from('workout_days')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return data as WorkoutDay;
}

export async function deleteWorkoutDay(
  id: string
) {
  const { error } = await supabase
    .from('workout_days')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function createExerciseGroup({
  workoutPlanId,
  workoutDayId,
  group,
}: {
  workoutPlanId: string;
  workoutDayId: string;
  group: Omit<
    CreateWorkoutExerciseGroup,
    'local_id' | 'workout_day_local_id'
  >;
}) {
  const { data, error } = await supabase
    .from('workout_exercise_groups')
    .insert({
      workout_plan_id: workoutPlanId,
      workout_day_id: workoutDayId,
      group_type: group.group_type,
      name: normalizeNullableText(group.name),
      order_index: group.order_index,
      rounds: normalizeNullableNumber(
        group.rounds
      ),
      rest_after_seconds:
        normalizeNullableNumber(
          group.rest_after_seconds
        ),
      notes: normalizeNullableText(
        group.notes
      ),
    })
    .select('*')
    .single();

  if (error) throw error;

  return data as WorkoutExerciseGroup;
}

export async function updateExerciseGroup({
  id,
  group,
}: {
  id: string;
  group: Partial<
    Omit<
      CreateWorkoutExerciseGroup,
      'local_id' | 'workout_day_local_id'
    >
  >;
}) {
  const payload: Record<string, unknown> = {};

  if (group.group_type !== undefined) {
    payload.group_type = group.group_type;
  }

  if (group.name !== undefined) {
    payload.name =
      normalizeNullableText(group.name);
  }

  if (group.order_index !== undefined) {
    payload.order_index = group.order_index;
  }

  if (group.rounds !== undefined) {
    payload.rounds =
      normalizeNullableNumber(group.rounds);
  }

  if (group.rest_after_seconds !== undefined) {
    payload.rest_after_seconds =
      normalizeNullableNumber(
        group.rest_after_seconds
      );
  }

  if (group.notes !== undefined) {
    payload.notes =
      normalizeNullableText(group.notes);
  }

  const { data, error } = await supabase
    .from('workout_exercise_groups')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return data as WorkoutExerciseGroup;
}

export async function deleteExerciseGroup(
  id: string
) {
  const { error: unlinkError } = await supabase
    .from('workout_plan_exercises')
    .update({
      exercise_group_id: null,
      group_order: null,
      technique_type: 'normal',
      technique_config: {},
    })
    .eq('exercise_group_id', id);

  if (unlinkError) throw unlinkError;

  const { error } = await supabase
    .from('workout_exercise_groups')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateWorkoutExercise({
  id,
  exercise,
}: {
  id: string;
  exercise: Partial<CreateExerciseInWorkout>;
}) {
  const payload: Record<string, unknown> = {};

  if (exercise.exercise_id !== undefined) {
    payload.exercise_id =
      exercise.exercise_id || null;
  }

  if (exercise.workout_day_id !== undefined) {
    payload.workout_day_id =
      exercise.workout_day_id || null;
  }

  if (
    exercise.exercise_group_id !== undefined
  ) {
    payload.exercise_group_id =
      exercise.exercise_group_id || null;
  }

  if (exercise.day_key !== undefined) {
    payload.day_key =
      exercise.day_key || null;
  }

  if (exercise.execution_order !== undefined) {
    payload.execution_order =
      exercise.execution_order;
  }

  if (exercise.group_order !== undefined) {
    payload.group_order =
      exercise.group_order;
  }

  if (exercise.technique_type !== undefined) {
    payload.technique_type =
      exercise.technique_type || 'normal';
  }

  if (
    exercise.technique_config !== undefined
  ) {
    payload.technique_config =
      exercise.technique_config || {};
  }

  if (exercise.name !== undefined) {
    payload.name = exercise.name.trim();
  }

  if (exercise.sets !== undefined) {
    payload.sets =
      normalizeNullableText(exercise.sets);
  }

  if (exercise.reps !== undefined) {
    payload.reps =
      normalizeNullableText(exercise.reps);
  }

  if (exercise.rest_seconds !== undefined) {
    payload.rest_seconds =
      normalizeNullableNumber(
        exercise.rest_seconds
      );
  }

  if (
    exercise.suggested_weight !== undefined
  ) {
    payload.suggested_weight =
      normalizeNullableText(
        exercise.suggested_weight
      );
  }

  if (exercise.observation !== undefined) {
    payload.observation =
      normalizeNullableText(
        exercise.observation
      );
  }

  if (exercise.tempo !== undefined) {
    payload.tempo =
      normalizeNullableText(exercise.tempo);
  }

  const { data, error } = await supabase
    .from('workout_plan_exercises')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return data as WorkoutPlanExercise;
}

export async function deleteWorkoutExercise(
  id: string
) {
  const { error } = await supabase
    .from('workout_plan_exercises')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function publishWorkoutPlan(
  id: string
) {
  const { data, error } = await supabase
    .from('workout_plans')
    .update({
      status: 'published',
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return data as WorkoutPlan;
}

export async function archiveWorkoutPlan(
  id: string
) {
  const { data, error } = await supabase
    .from('workout_plans')
    .update({
      status: 'archived',
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return data as WorkoutPlan;
}

export async function saveWorkoutLog(
  data: Record<string, unknown>
) {
  const { data: log, error } = await supabase
    .from('workout_logs')
    .insert(data)
    .select('*')
    .single();

  if (error) throw error;

  return log as WorkoutLog;
}

export async function getWorkoutLogsByStudent(
  studentId: string
): Promise<WorkoutLog[]> {
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.error(
        '[WorkoutService] getWorkoutLogsByStudent error:',
        error
      );

      return [];
    }

    return (data || []) as WorkoutLog[];
  } catch (error) {
    console.error(
      '[WorkoutService] getWorkoutLogsByStudent exception:',
      error
    );

    return [];
  }
}

export async function getWorkoutLogsByTrainer(
  trainerId: string
): Promise<WorkoutLog[]> {
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*, students(name)')
      .eq('trainer_id', trainerId)
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.error(
        '[WorkoutService] getWorkoutLogsByTrainer error:',
        error
      );

      return [];
    }

    return (data || []) as WorkoutLog[];
  } catch (error) {
    console.error(
      '[WorkoutService] getWorkoutLogsByTrainer exception:',
      error
    );

    return [];
  }
}
` 

## Arquivo: src/types/workout.ts
` 	sx
import type {
  DropSetConfig,
  JsonValue,
  WorkoutExerciseGroup,
  WorkoutPlan,
  WorkoutPlanExercise,
  WorkoutTechniqueType,
  WorkoutDay,
} from './database';

export const WORKOUT_DAY_ORDER = [
  'dom',
  'seg',
  'ter',
  'qua',
  'qui',
  'sex',
  'sab',
] as const;

export type WorkoutDayKey =
  (typeof WORKOUT_DAY_ORDER)[number];

export interface WorkoutWithExercises extends WorkoutPlan {
  exercises: WorkoutPlanExercise[];
}

export interface CompleteWorkoutWithExercises extends WorkoutPlan {
  workout_days: WorkoutDay[];
  workout_exercise_groups: WorkoutExerciseGroup[];
  workout_plan_exercises: WorkoutPlanExercise[];
}

export interface CreateWorkoutData {
  student_id: string;
  name: string;
  objective?: string;
  level?: string;
  duration_minutes?: number;

  start_date?: string | null;
  end_date?: string | null;

  days?: CreateWorkoutDay[];
  groups?: CreateWorkoutExerciseGroup[];
  exercises: CreateExerciseInWorkout[];
}

export interface CreateWorkoutDay {
  local_id: string;
  weekday: number;
  day_key: WorkoutDayKey;
  order_index: number;
  name?: string;
  notes?: string;
}

export interface CreateWorkoutExerciseGroup {
  local_id: string;
  workout_day_local_id: string;
  group_type: 'bi_set';
  name?: string;
  order_index: number;
  rounds?: number | null;
  rest_after_seconds?: number | null;
  notes?: string;
}

export interface CreateExerciseInWorkout {
  id?: string;
  local_id?: string;

  exercise_id?: string;
  day_key: WorkoutDayKey | string;

  workout_day_id?: string | null;
  workout_day_local_id?: string | null;

  exercise_group_id?: string | null;
  exercise_group_local_id?: string | null;

  technique_type?: WorkoutTechniqueType;
  technique_config?: DropSetConfig | JsonValue;

  group_order?: number | null;
  execution_order?: number | null;

  name: string;
  sets: string;
  reps: string;
  rest_seconds?: number;
  suggested_weight?: string;
  observation?: string;
  tempo?: string;

  image_url?: string | null;
  video_url?: string | null;
  muscle_group?: string | null;
  category?: string | null;
  equipment?: string | null;
  difficulty?: string | null;
  instructions?: string | null;
  tips?: string | null;
}

export interface WorkoutExecutionState {
  currentExerciseIndex: number;
  currentSet: number;
  totalExercises: number;
  totalSets: number;
  isResting: boolean;
  restTimeLeft: number;
  startedAt: string;
  completedExercises: CompletedExercise[];
}

export interface CompletedExercise {
  exerciseName: string;
  setsCompleted: number;
  repsCompleted: string;
  weightUsed: string;
}

export function getEffectiveExerciseOrder(
  exercise: Pick<
    WorkoutPlanExercise,
    'execution_order' | 'order_index'
  >
) {
  return exercise.execution_order ?? exercise.order_index;
}

export function getEffectiveTechnique(
  exercise: Pick<WorkoutPlanExercise, 'technique_type'>
): WorkoutTechniqueType {
  return exercise.technique_type ?? 'normal';
}

export function isWorkoutDayKey(
  value: string
): value is WorkoutDayKey {
  return WORKOUT_DAY_ORDER.includes(
    value as WorkoutDayKey
  );
}

export function getWorkoutDayPosition(value?: string | null) {
  const index = WORKOUT_DAY_ORDER.indexOf(
    value as WorkoutDayKey
  );

  return index === -1
    ? WORKOUT_DAY_ORDER.length
    : index;
}
` 

## Arquivo: src/types/database.ts
` 	sx
import type { PlanSlug } from '../lib/planLimits';

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type WorkoutTechniqueType =
  | 'normal'
  | 'drop_set'
  | 'bi_set';

export type WorkoutRenewalStatus =
  | 'none'
  | 'renewed';

export interface DropSetConfig {
  drops?: number;
  reduction_percent?: number;
  rest_between_drops_seconds?: number;
  notes?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'personal' | 'student';
  created_at: string;
  updated_at: string;
}

export interface TrainerProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  cref: string | null;
  cref_status: 'pending' | 'approved' | 'rejected' | 'not_submitted';
  cref_submitted_at: string | null;
  cref_verified_at: string | null;
  cref_rejection_reason: string | null;
  instagram: string | null;
  location: string | null;
  niche: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  trainer_id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  status: 'active' | 'inactive' | 'paused';
  app_access_status: 'no_access' | 'invited' | 'active' | 'blocked';
  login_enabled: boolean;
  created_at: string;
  updated_at: string;
  student_accounts?: StudentAccount[];
}

export interface StudentAccount {
  id: string;
  student_id: string;
  auth_user_id: string | null;
  email: string;
  temporary_password: string | null;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentGoals {
  id: string;
  student_id: string;
  objective: string | null;
  goal_notes: string | null;
  level: string | null;
  weekly_frequency: number | null;
  target_weight: number | null;
  goal_deadline_weeks: number | null;
  created_at: string;
  updated_at: string;
}

export interface StudentMetrics {
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

export interface Exercise {
  id: string;
  trainer_id: string | null;
  name: string;
  muscle_group: string | null;
  category: string | null;
  equipment: string | null;
  difficulty: string | null;
  instructions: string | null;
  tips: string | null;
  image_url: string | null;
  video_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutPlan {
  id: string;
  trainer_id: string;
  student_id: string;
  name: string;
  objective: string | null;
  level: string | null;
  duration_minutes: number | null;
  status: 'draft' | 'published' | 'archived';

  start_date: string | null;
  end_date: string | null;
  renewal_status: WorkoutRenewalStatus | string | null;
  renewed_from_plan_id: string | null;
  renewal_created_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface WorkoutDay {
  id: string;
  workout_plan_id: string;
  weekday: number | null;
  day_key: string | null;
  order_index: number;
  name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExerciseGroup {
  id: string;
  workout_day_id: string;
  workout_plan_id: string;
  group_type: 'bi_set' | string;
  name: string | null;
  order_index: number;
  rounds: number | null;
  rest_after_seconds: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutPlanExercise {
  id: string;
  workout_plan_id: string;
  exercise_id: string | null;

  workout_day_id: string | null;
  exercise_group_id: string | null;

  day_key: string | null;
  order_index: number;
  execution_order: number | null;
  group_order: number | null;

  technique_type: WorkoutTechniqueType | null;
  technique_config: DropSetConfig | JsonValue | null;

  name: string;
  sets: string | null;
  reps: string | null;
  rest_seconds: number | null;
  suggested_weight: string | null;
  observation: string | null;
  tempo: string | null;

  image_url?: string | null;
  video_url?: string | null;
  muscle_group?: string | null;
  category?: string | null;
  equipment?: string | null;
  difficulty?: string | null;
  instructions?: string | null;
  tips?: string | null;

  created_at: string;
  updated_at?: string | null;
}

export interface CompleteWorkoutPlan extends WorkoutPlan {
  workout_days: WorkoutDay[];
  workout_exercise_groups: WorkoutExerciseGroup[];
  workout_plan_exercises: WorkoutPlanExercise[];
}

export interface WorkoutLog {
  id: string;
  student_id: string;
  trainer_id: string;
  workout_plan_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  status: string;
  exercises_data: ExerciseRecord[];
  notes: string | null;
  created_at: string;
}

export interface ExerciseRecord {
  exercise_name: string;
  sets_completed: number;
  reps_completed: string;
  weight_used: string;
}

export interface Payment {
  id: string;
  trainer_id: string;
  student_id: string | null;
  student_name: string | null;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  method: string | null;
  description: string | null;
  pix_key: string | null;
  pix_code: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  trainer_id: string;
  student_id: string;
  sender_role: 'personal' | 'student';
  sender_id: string;
  content: string;
  type: string;
  media_url: string | null;
  read: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  trainer_id: string;
  plan_slug: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  slug: PlanSlug;
  name: string;
  price_monthly: number;
  student_limit: number;
  features: string[];
  is_active: boolean;
  created_at: string;
}

export interface SignupLink {
  id: string;
  trainer_id: string;
  title: string | null;
  slug: string;
  message: string | null;
  is_active: boolean;
  plan_name: string | null;
  visits_count: number | null;
  created_at: string;
}

export interface SignupLead {
  id: string;
  signup_link_id: string | null;
  trainer_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  goal: string | null;
  message: string | null;
  status: string;
  converted_student_id: string | null;
  converted_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: string | null;
  read: boolean;
  created_at: string;
}
` 

## Arquivo: src/services/studentService.ts
(consulta personal responsável pelo aluno)
` 	sx
import { supabase } from '../lib/supabase';
import type { Student, StudentAccount } from '../types/database';
import type { CreateStudentData } from '../types/student';
import { generatePassword } from '../lib/utils';

type CreateStudentInput = CreateStudentData & {
  birthDate?: string | null;
  bodyFat?: number | string | null;
  bodyfat?: number | string | null;
  targetBodyFat?: number | string | null;
  targetbodyfat?: number | string | null;
  muscleMass?: number | string | null;
  musclemass?: number | string | null;
  waterIntake?: number | string | null;
  waterintake?: number | string | null;
  temporary_password?: string | null;
};

type StudentAccountCacheResult = {
  account: StudentAccount | null;
  student: Student | null;
};

type StudentAccountCacheRecord = StudentAccountCacheResult & {
  savedAt: number;
};

const STUDENT_ACCOUNT_CACHE_TTL = 1000 * 60 * 5;
const STUDENT_ACCOUNT_CACHE_PREFIX = 'vsfit_student_account_cache:';

const studentAccountMemoryCache = new Map<string, StudentAccountCacheRecord>();

function mapStudentFromDb(db: any): Student {
  return db;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;

  const parsed = Number(String(value).replace(',', '.'));

  return Number.isFinite(parsed) ? parsed : null;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getStudentAccountCacheKey(authUserId: string) {
  return `${STUDENT_ACCOUNT_CACHE_PREFIX}${authUserId}`;
}

function isStudentAccountCacheValid(record?: StudentAccountCacheRecord | null) {
  if (!record) return false;

  return Date.now() - Number(record.savedAt || 0) < STUDENT_ACCOUNT_CACHE_TTL;
}

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function readStudentAccountCache(authUserId: string): StudentAccountCacheResult | null {
  const memoryRecord = studentAccountMemoryCache.get(authUserId);

  if (isStudentAccountCacheValid(memoryRecord)) {
    return {
      account: memoryRecord?.account || null,
      student: memoryRecord?.student || null,
    };
  }

  if (!canUseSessionStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(getStudentAccountCacheKey(authUserId));

    if (!raw) return null;

    const record = JSON.parse(raw) as StudentAccountCacheRecord;

    if (!isStudentAccountCacheValid(record)) {
      window.sessionStorage.removeItem(getStudentAccountCacheKey(authUserId));
      return null;
    }

    studentAccountMemoryCache.set(authUserId, record);

    return {
      account: record.account || null,
      student: record.student || null,
    };
  } catch {
    return null;
  }
}

function writeStudentAccountCache(authUserId: string, value: StudentAccountCacheResult) {
  const record: StudentAccountCacheRecord = {
    account: value.account || null,
    student: value.student || null,
    savedAt: Date.now(),
  };

  studentAccountMemoryCache.set(authUserId, record);

  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(
      getStudentAccountCacheKey(authUserId),
      JSON.stringify(record)
    );
  } catch {
    // Ignora erro de storage.
  }
}

export function clearStudentAccountCache(authUserId?: string) {
  if (authUserId) {
    studentAccountMemoryCache.delete(authUserId);

    if (canUseSessionStorage()) {
      try {
        window.sessionStorage.removeItem(getStudentAccountCacheKey(authUserId));
      } catch {
        // Ignora erro de storage.
      }
    }

    return;
  }

  studentAccountMemoryCache.clear();

  if (!canUseSessionStorage()) return;

  try {
    Object.keys(window.sessionStorage).forEach((key) => {
      if (key.startsWith(STUDENT_ACCOUNT_CACHE_PREFIX)) {
        window.sessionStorage.removeItem(key);
      }
    });
  } catch {
    // Ignora erro de storage.
  }
}

export async function getStudentsByTrainer(trainerId: string): Promise<Student[]> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        student_accounts(*)
      `)
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[StudentService] getStudentsByTrainer error:', error);
      return [];
    }

    return (data || []).map(mapStudentFromDb);
  } catch (error) {
    console.error('[StudentService] getStudentsByTrainer exception:', error);
    return [];
  }
}

export async function getStudentById(id: string): Promise<Student | null> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        student_accounts(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[StudentService] getStudentById error:', error);
      return null;
    }

    return data ? mapStudentFromDb(data) : null;
  } catch (error) {
    console.error('[StudentService] getStudentById exception:', error);
    return null;
  }
}

export async function createStudent(trainerId: string, data: CreateStudentInput) {
  const input = data;

  const weight = toNullableNumber(input.weight);
  const height = toNullableNumber(input.height);
  const bodyFat = toNullableNumber(input.bodyFat ?? input.bodyfat);
  const targetBodyFat = toNullableNumber(input.targetBodyFat ?? input.targetbodyfat);
  const muscleMass = toNullableNumber(input.muscleMass ?? input.musclemass);
  const waterIntake = toNullableNumber(input.waterIntake ?? input.waterintake);
  const targetWeight = toNullableNumber(input.targetWeight);
  let temporaryPassword = '';

  const { data: student, error } = await supabase
    .from('students')
    .insert({
      trainer_id: trainerId,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      birth_date: input.birthDate || null,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;

  const { error: goalError } = await supabase.from('student_goals').insert({
    student_id: student.id,
    objective: input.objective || null,
    level: input.level || 'Iniciante',
    weekly_frequency: input.weeklyFrequency || null,
    target_weight: targetWeight,
  });

  if (goalError) {
    console.error('[StudentService] createStudent goal error:', goalError);
  }

  const hasMetricData =
    weight !== null ||
    height !== null ||
    bodyFat !== null ||
    targetBodyFat !== null ||
    muscleMass !== null ||
    waterIntake !== null;

  if (hasMetricData) {
    const { error: metricError } = await supabase.from('student_metrics').insert({
      student_id: student.id,
      date: getTodayDate(),
      weight,
      height,
      body_fat: bodyFat,
      target_body_fat: targetBodyFat,
      muscle_mass: muscleMass,
      water_intake: waterIntake,
    });

    if (metricError) {
      console.error('[StudentService] createStudent metric error:', metricError);
    }
  }

  if (input.createAppAccess) {
    temporaryPassword = generatePassword();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: temporaryPassword,
      options: {
        data: {
          role: 'student',
          student_id: student.id,
          name: input.name,
        },
      },
    });

    if (!authError && authData.user) {
      await supabase.from('user_profiles').insert({
        id: authData.user.id,
        email: input.email,
        name: input.name,
        role: 'student',
      });

      await supabase.from('student_accounts').insert({
        student_id: student.id,
        auth_user_id: authData.user.id,
        email: input.email,
        temporary_password: temporaryPassword,
        must_change_password: true,
        is_active: true,
      });

      await supabase
        .from('students')
        .update({
          auth_user_id: authData.user.id,
          app_access_status: 'invited',
          login_enabled: true,
        })
        .eq('id', student.id);
    } else if (authError) {
      console.error('[StudentService] createStudent auth error:', authError);
    }
  }

  clearStudentAccountCache();

  return {
    ...student,
    temporary_password: temporaryPassword || null,
  };
}

export async function updateStudent(id: string, data: any) {
  const { data: student, error } = await supabase
    .from('students')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  clearStudentAccountCache();

  return mapStudentFromDb(student);
}

export async function getStudentByAuthUser(
  authUserId: string,
  options: { force?: boolean } = {}
): Promise<Student | null> {
  const result = await getStudentAccountByAuthUser(authUserId, options);
  return result.student || null;
}

export async function getStudentAccountByAuthUser(
  authUserId: string,
  options: { force?: boolean } = {}
): Promise<{ account: StudentAccount | null; student: Student | null }> {
  try {
    if (!authUserId) {
      return { account: null, student: null };
    }

    if (!options.force) {
      const cached = readStudentAccountCache(authUserId);

      if (cached?.student?.id) {
        return cached;
      }
    }

    const { data: account, error } = await supabase
      .from('student_accounts')
      .select(`
        *,
        student:students(*)
      `)
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (error) {
      console.error('[StudentService] getStudentAccountByAuthUser error:', error);
    }

    if (account?.student) {
      const student = Array.isArray(account.student) ? account.student[0] : account.student;

      const result = {
        account: account as StudentAccount,
        student: student ? mapStudentFromDb(student) : null,
      };

      writeStudentAccountCache(authUserId, result);

      return result;
    }

    const { data: legacyStudent, error: legacyError } = await supabase
      .from('students')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (legacyError) {
      console.error(
        '[StudentService] getStudentAccountByAuthUser legacy student error:',
        legacyError
      );
    }

    if (legacyStudent?.id) {
      let linkedAccount: StudentAccount | null = null;

      try {
        const { data: accountByStudent } = await supabase
          .from('student_accounts')
          .select('*')
          .eq('student_id', legacyStudent.id)
          .maybeSingle();

        linkedAccount = (accountByStudent as StudentAccount) || null;
      } catch {
        linkedAccount = null;
      }

      const result = {
        account: linkedAccount,
        student: mapStudentFromDb(legacyStudent),
      };

      writeStudentAccountCache(authUserId, result);

      return result;
    }

    const emptyResult = { account: null, student: null };

    writeStudentAccountCache(authUserId, emptyResult);

    return emptyResult;
  } catch (error) {
    console.error('[StudentService] getStudentAccountByAuthUser exception:', error);
    return { account: null, student: null };
  }
}
` 

## Arquivo: src/components/NotificationsView.tsx
(listagem notificações do personal)
` 	sx
import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Dumbbell,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';

import { supabase } from '../lib/supabase';

type NotificationRow = {
  id: string;
  user_id?: string | null;
  title: string;
  message?: string | null;
  type: string;
  read?: boolean | null;
  created_at?: string | null;
};

type NotificationsViewProps = {
  [key: string]: any;
};

function fixTextEncoding(value?: string | null) {
  if (!value) return '';

  return String(value)
    .replace(/ÃƒÂ¡/g, 'Ã¡')
    .replace(/Ãƒ /g, 'Ã ')
    .replace(/ÃƒÂ¢/g, 'Ã¢')
    .replace(/ÃƒÂ£/g, 'Ã£')
    .replace(/ÃƒÂ©/g, 'Ã©')
    .replace(/ÃƒÂª/g, 'Ãª')
    .replace(/ÃƒÂ­/g, 'Ã­')
    .replace(/ÃƒÂ³/g, 'Ã³')
    .replace(/ÃƒÂ´/g, 'Ã´')
    .replace(/ÃƒÂµ/g, 'Ãµ')
    .replace(/ÃƒÂº/g, 'Ãº')
    .replace(/ÃƒÂ§/g, 'Ã§')
    .replace(/ÃƒÂ/g, 'Ã')
    .replace(/Ãƒâ‚¬/g, 'Ã€')
    .replace(/Ãƒâ€š/g, 'Ã‚')
    .replace(/ÃƒÆ’/g, 'Ãƒ')
    .replace(/Ãƒâ€°/g, 'Ã‰')
    .replace(/ÃƒÅ /g, 'ÃŠ')
    .replace(/ÃƒÂ/g, 'Ã')
    .replace(/Ãƒâ€œ/g, 'Ã“')
    .replace(/Ãƒâ€/g, 'Ã”')
    .replace(/Ãƒâ€¢/g, 'Ã•')
    .replace(/ÃƒÅ¡/g, 'Ãš')
    .replace(/Ãƒâ€¡/g, 'Ã‡');
}

function cleanNotificationMessage(value?: string | null) {
  const text = fixTextEncoding(value || 'Sem descriÃ§Ã£o.');

  return text
    // Remove Log antigo
    .replace(/\s*Log:\s*[0-9a-f-]{20,}\.?/gi, '')

    // Remove datas ISO antigas completas
    .replace(/\s*InÃ­cio:\s*\d{4}-\d{2}-\d{2}T[^\s.]+(?:\.\d+)?Z?\.?/gi, '')
    .replace(/\s*Inicio:\s*\d{4}-\d{2}-\d{2}T[^\s.]+(?:\.\d+)?Z?\.?/gi, '')
    .replace(/\s*Finalizado:\s*\d{4}-\d{2}-\d{2}T[^\s.]+(?:\.\d+)?Z?\.?/gi, '')

    // Remove qualquer resto de ISO que tenha sobrado
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/gi, '')

    // Corrige resto tipo: min.103Z
    .replace(/min\.\d+Z\.?/gi, 'min.')

    // Limpa espaÃ§os e pontuaÃ§Ã£o sobrando
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .trim();
}

function getCurrentCoachEmail() {
  try {
    const direct =
      localStorage.getItem('vsfit_coach_email') ||
      localStorage.getItem('coachEmail') ||
      localStorage.getItem('user_email') ||
      localStorage.getItem('email');

    if (direct) return String(direct).toLowerCase();

    const possibleKeys = [
      'vsfit_user_profile',
      'vsfit_profile',
      'vsfit_session',
      'supabase.auth.token',
    ];

    for (const key of possibleKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);

      const email =
        parsed?.email ||
        parsed?.user?.email ||
        parsed?.profile?.email ||
        parsed?.currentSession?.user?.email ||
        parsed?.currentUser?.email;

      if (email) return String(email).toLowerCase();
    }
  } catch {
    return '';
  }

  return '';
}

function getCurrentCoachUserIdFromLocalStorage() {
  try {
    const direct =
      localStorage.getItem('vsfit_coach_user_id') ||
      localStorage.getItem('coachUserId') ||
      localStorage.getItem('user_id') ||
      localStorage.getItem('auth_user_id');

    if (direct) return String(direct);

    const possibleKeys = [
      'vsfit_user_profile',
      'vsfit_profile',
      'vsfit_session',
      'supabase.auth.token',
    ];

    for (const key of possibleKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);

      const id =
        parsed?.id ||
        parsed?.user_id ||
        parsed?.auth_user_id ||
        parsed?.user?.id ||
        parsed?.profile?.id ||
        parsed?.profile?.user_id ||
        parsed?.currentSession?.user?.id ||
        parsed?.currentUser?.id;

      if (id) return String(id);
    }
  } catch {
    return '';
  }

  return '';
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

function getTypeLabel(type?: string | null) {
  const value = String(type || '').toLowerCase();

  const map: Record<string, string> = {
    system: 'Sistema',
    milestone: 'Meta',
    trainer_student_workout_completed: 'Treino concluÃ­do',
    signup_lead_created: 'Novo cadastro',
    payment: 'Pagamento',
    billing: 'Financeiro',
    cref_submitted: 'CREF',
  };

  return map[value] || type || 'Sistema';
}

function getTypeIcon(type?: string | null) {
  const value = String(type || '').toLowerCase();

  if (value.includes('workout')) return Dumbbell;

  return Bell;
}

function getTypeStyle(type?: string | null) {
  const value = String(type || '').toLowerCase();

  if (value.includes('workout')) {
    return {
      badge: 'border-blue-500/25 bg-blue-500/15 text-blue-300',
      icon: 'border-blue-500/25 bg-blue-500/15 text-blue-300',
      glow: 'from-blue-500/14',
    };
  }

  if (value.includes('signup')) {
    return {
      badge: 'border-emerald-500/25 bg-emerald-500/15 text-emerald-300',
      icon: 'border-emerald-500/25 bg-emerald-500/15 text-emerald-300',
      glow: 'from-emerald-500/14',
    };
  }

  return {
    badge: 'border-[#FF2B2B]/25 bg-[#FF2B2B]/15 text-[#FF4D4D]',
    icon: 'border-[#FF2B2B]/25 bg-[#FF2B2B]/15 text-[#FF4D4D]',
    glow: 'from-[#FF2B2B]/14',
  };
}

function isStudentOnlyNotification(notification: NotificationRow) {
  const type = String(notification.type || '').toLowerCase();
  const title = fixTextEncoding(String(notification.title || '')).toLowerCase();
  const message = fixTextEncoding(String(notification.message || '')).toLowerCase();

  return (
    type.includes('student_workout_assigned') ||
    type.includes('workout_assigned_to_student') ||
    type.includes('student_assigned_workout') ||
    title.includes('novo treino atribuÃ­do') ||
    title.includes('novo treino atribuido') ||
    message.includes('seu personal atribuiu o treino')
  );
}

export default function NotificationsView(_props: NotificationsViewProps) {
  const [coachEmail, setCoachEmail] = useState(getCurrentCoachEmail());
  const [coachUserId, setCoachUserId] = useState(getCurrentCoachUserIdFromLocalStorage());
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  async function resolveCoachIdentity() {
    let resolvedUserId = getCurrentCoachUserIdFromLocalStorage();
    let resolvedEmail = getCurrentCoachEmail();

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.warn('[NotificationsView] auth identity error:', error);
      }

      const authUser = data?.user || null;

      if (authUser?.id) {
        resolvedUserId = authUser.id;
        localStorage.setItem('vsfit_coach_user_id', authUser.id);
      }

      if (authUser?.email) {
        resolvedEmail = String(authUser.email).toLowerCase();
        localStorage.setItem('vsfit_coach_email', resolvedEmail);
      }
    } catch (error) {
      console.warn('[NotificationsView] auth identity exception:', error);
    }

    setCoachUserId(resolvedUserId);
    setCoachEmail(resolvedEmail);

    return {
      userId: resolvedUserId,
      email: resolvedEmail,
    };
  }

  async function loadNotifications() {
    setLoading(true);

    try {
      const identity = await resolveCoachIdentity();

      if (!identity.userId) {
        setNotifications([]);
        setLastUpdated(new Date().toLocaleString('pt-BR'));
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', identity.userId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('[NotificationsView] load error:', error);
        alert('Erro ao carregar notificaÃ§Ãµes reais. Veja o console.');
        return;
      }

      setNotifications(
        ((data || []) as NotificationRow[]).filter((item) => !isStudentOnlyNotification(item))
      );

      setLastUpdated(new Date().toLocaleString('pt-BR'));
    } catch (error) {
      console.error('[NotificationsView] exception:', error);
      alert('Erro inesperado ao carregar notificaÃ§Ãµes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  const filteredNotifications = useMemo(() => {
    const search = query.trim().toLowerCase();

    return notifications.filter((item) => {
      if (isStudentOnlyNotification(item)) return false;

      const message = cleanNotificationMessage(item.message);
      const title = fixTextEncoding(item.title);

      const matchesUnread = !showUnreadOnly || !item.read;

      const matchesSearch =
        !search ||
        title.toLowerCase().includes(search) ||
        message.toLowerCase().includes(search) ||
        String(item.type || '').toLowerCase().includes(search);

      return matchesUnread && matchesSearch;
    });
  }, [notifications, showUnreadOnly, query]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  async function toggleRead(notification: NotificationRow) {
    try {
      const nextRead = !Boolean(notification.read);

      const { error } = await supabase
        .from('notifications')
        .update({
          read: nextRead,
        })
        .eq('id', notification.id);

      if (error) {
        console.error('[NotificationsView] toggle read error:', error);
        alert('Erro ao atualizar notificaÃ§Ã£o.');
        return;
      }

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                read: nextRead,
              }
            : item
        )
      );
    } catch (error) {
      console.error('[NotificationsView] toggle read exception:', error);
      alert('Erro inesperado ao atualizar notificaÃ§Ã£o.');
    }
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id);

    if (unreadIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          read: true,
        })
        .in('id', unreadIds);

      if (error) {
        console.error('[NotificationsView] mark all error:', error);
        alert('Erro ao marcar todas como lidas.');
        return;
      }

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          read: true,
        }))
      );
    } catch (error) {
      console.error('[NotificationsView] mark all exception:', error);
      alert('Erro inesperado ao marcar todas como lidas.');
    }
  }

  async function deleteNotification(notification: NotificationRow) {
    const confirmed = window.confirm('Deseja excluir esta notificaÃ§Ã£o?');

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notification.id);

      if (error) {
        console.error('[NotificationsView] delete error:', error);
        alert('Erro ao excluir notificaÃ§Ã£o.');
        return;
      }

      setNotifications((prev) => prev.filter((item) => item.id !== notification.id));
    } catch (error) {
      console.error('[NotificationsView] delete exception:', error);
      alert('Erro inesperado ao excluir notificaÃ§Ã£o.');
    }
  }

  return (
    <main className="relative -mx-4 -my-8 min-h-[100dvh] w-[calc(100%+2rem)] overflow-x-hidden bg-[#050505] text-white md:-mx-8 md:w-[calc(100%+4rem)] lg:mx-0 lg:my-0 lg:min-h-0 lg:w-full lg:bg-transparent">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(255,43,43,0.13),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,43,43,0.08),transparent_34%)] lg:hidden" />

      <section className="relative z-10 mx-auto w-full max-w-[393px] overflow-x-hidden px-4 pb-44 pt-5 lg:max-w-none lg:px-0 lg:pb-8 lg:pt-0">
        <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.24em] text-[#FF2B2B]">
              Inbox do Sistema
            </p>

            <h1 className="mt-1 flex items-center gap-3 text-[28px] font-black leading-none tracking-tight text-white lg:text-3xl">
              <Bell className="h-8 w-8 text-[#FF2B2B]" />
              Central de NotificaÃ§Ãµes
            </h1>

            <p className="mt-2 text-[13px] font-semibold text-[#909090]">
              Alertas reais do personal {coachEmail || coachUserId || 'logado'}.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:flex lg:items-center">
            <button
              type="button"
              onClick={loadNotifications}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#252525] bg-[#151515] px-4 text-[11px] font-black uppercase text-white"
            >
              <RefreshCw className={`h-4 w-4 text-[#FF2B2B] ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>

            <button
              type="button"
              onClick={() => setShowUnreadOnly((prev) => !prev)}
              className={`flex h-12 items-center justify-center rounded-2xl border px-4 text-[11px] font-black uppercase ${
                showUnreadOnly
                  ? 'border-[#FF2B2B] bg-[#FF2B2B]/15 text-[#FF4D4D]'
                  : 'border-[#252525] bg-[#151515] text-white'
              }`}
            >
              {showUnreadOnly ? 'Ver todas' : 'NÃ£o lidas'}
            </button>
          </div>
        </header>

        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <article className="rounded-[22px] border border-[#242424] bg-[#151515]/95 p-4">
            <Bell className="mb-3 h-5 w-5 text-[#FF2B2B]" />
            <p className="text-[10px] font-bold uppercase text-[#A0A0A0]">Total</p>
            <strong className="mt-1 block text-[24px] font-black text-white">
              {loading ? '...' : notifications.length}
            </strong>
          </article>

          <article className="rounded-[22px] border border-[#242424] bg-[#151515]/95 p-4">
            <Clock className="mb-3 h-5 w-5 text-yellow-400" />
            <p className="text-[10px] font-bold uppercase text-[#A0A0A0]">NÃ£o lidas</p>
            <strong className="mt-1 block text-[24px] font-black text-white">
              {loading ? '...' : unreadCount}
            </strong>
          </article>

          <article className="rounded-[22px] border border-[#242424] bg-[#151515]/95 p-4">
            <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-400" />
            <p className="text-[10px] font-bold uppercase text-[#A0A0A0]">Lidas</p>
            <strong className="mt-1 block text-[24px] font-black text-white">
              {loading ? '...' : notifications.length - unreadCount}
            </strong>
          </article>

          <article className="rounded-[22px] border border-[#242424] bg-[#151515]/95 p-4">
            <RefreshCw className="mb-3 h-5 w-5 text-blue-400" />
            <p className="text-[10px] font-bold uppercase text-[#A0A0A0]">Atualizado</p>
            <strong className="mt-1 block truncate text-[12px] font-black text-white">
              {lastUpdated || '-'}
            </strong>
          </article>
        </section>

        <section className="mb-5 rounded-[24px] border border-[#242424] bg-[#151515]/95 p-3 lg:p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="flex h-12 items-center gap-3 rounded-2xl border border-[#2A2A2A] bg-[#090909] px-4">
              <Search className="h-4 w-4 shrink-0 text-[#707070]" />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar tÃ­tulo, mensagem ou tipo..."
                className="min-w-0 flex-1 bg-transparent text-[12px] font-bold text-white outline-none placeholder:text-[#707070]"
              />
            </label>

            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 text-[11px] font-black uppercase text-emerald-400 disabled:opacity-40"
            >
              <CheckCircle2 className="h-4 w-4" />
              Marcar todas lidas
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#242424] bg-[#151515]/95 p-3 lg:p-5">
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#1A1A1A] px-4 py-3">
            <span className="text-[11px] font-black uppercase text-white">
              Alertas registrados ({filteredNotifications.length})
            </span>

            <span className="text-[10px] font-black uppercase text-[#808080]">
              {unreadCount === 0 ? 'Tudo lido' : `${unreadCount} nova(s)`}
            </span>
          </div>

          <div className="space-y-3">
            {loading && (
              <div className="rounded-2xl border border-[#252525] bg-[#090909] p-8 text-center">
                <Loader2 className="mx-auto mb-3 h-9 w-9 animate-spin text-[#FF2B2B]" />
                <p className="text-[13px] font-black text-white">
                  Carregando notificaÃ§Ãµes...
                </p>
              </div>
            )}

            {!loading && filteredNotifications.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#333333] p-8 text-center">
                <Bell className="mx-auto mb-3 h-9 w-9 text-[#505050]" />

                <p className="text-[13px] font-black text-white">
                  Nenhuma notificaÃ§Ã£o encontrada.
                </p>

                <p className="mt-1 text-[12px] font-bold text-[#808080]">
                  Quando um aluno finalizar treino, o alerta aparecerÃ¡ aqui.
                </p>
              </div>
            )}

            {!loading &&
              filteredNotifications.map((notification) => {
                const style = getTypeStyle(notification.type);
                const Icon = getTypeIcon(notification.type);
                const title = fixTextEncoding(notification.title);
                const message = cleanNotificationMessage(notification.message);

                return (
                  <article
                    key={notification.id}
                    className={`relative overflow-hidden rounded-[24px] border p-4 shadow-[0_20px_55px_rgba(0,0,0,0.35)] ${
                      notification.read
                        ? 'border-[#252525] bg-[#080808]'
                        : 'border-[#FF2B2B]/35 bg-[#120808]'
                    }`}
                  >
                    <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${style.glow} to-transparent`} />

                    <div className="relative flex gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${style.icon}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-wide ${style.badge}`}
                          >
                            {getTypeLabel(notification.type)}
                          </span>

                          <span
                            className={`rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                              notification.read
                                ? 'border-emerald-500/25 bg-emerald-500/15 text-emerald-400'
                                : 'border-yellow-500/25 bg-yellow-500/15 text-yellow-400'
                            }`}
                          >
                            {notification.read ? 'Lida' : 'Nova'}
                          </span>
                        </div>

                        <h3 className="text-[15px] font-black leading-tight text-white">
                          {title}
                        </h3>

                        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#A5A5A5]">
                          {message}
                        </p>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <p className="text-[10px] font-bold text-[#707070]">
                            {formatDateTime(notification.created_at)}
                          </p>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleRead(notification)}
                              className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-500/25 bg-emerald-500/10"
                              title={notification.read ? 'Marcar como nova' : 'Marcar como lida'}
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteNotification(notification)}
                              className="grid h-9 w-9 place-items-center rounded-xl border border-[#FF2B2B]/35 bg-[#FF2B2B]/10"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-[#FF4D4D]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      </section>
    </main>
  );
}
` 

## Arquivo: src/pages/student/StudentNotificationsPage.tsx
(notificações do aluno)
` 	sx
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Apple,
  ArrowLeft,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Dumbbell,
  Loader2,
  MessageCircle,
  RefreshCcw,
  Sparkles,
  Trophy,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { timeAgo } from '../../lib/formatters';
import * as studentService from '../../services/studentService';
import * as workoutService from '../../services/workoutService';

type NotificationItem = {
  id: string;
  source: 'database' | 'smart';
  type: 'message' | 'workout' | 'nutrition' | 'progress' | 'system';
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
  raw?: any;
};

type NotificationRow = {
  id: string;
  user_id?: string | null;
  title?: string | null;
  message?: string | null;
  type?: string | null;
  read?: boolean | null;
  created_at?: string | null;
};

function fixTextEncoding(value?: string | null) {
  if (!value) return '';

  return String(value)
    .replace(/ÃƒÂ¡/g, 'Ã¡')
    .replace(/Ãƒ /g, 'Ã ')
    .replace(/ÃƒÂ¢/g, 'Ã¢')
    .replace(/ÃƒÂ£/g, 'Ã£')
    .replace(/ÃƒÂ©/g, 'Ã©')
    .replace(/ÃƒÂª/g, 'Ãª')
    .replace(/ÃƒÂ­/g, 'Ã­')
    .replace(/ÃƒÂ³/g, 'Ã³')
    .replace(/ÃƒÂ´/g, 'Ã´')
    .replace(/ÃƒÂµ/g, 'Ãµ')
    .replace(/ÃƒÂº/g, 'Ãº')
    .replace(/ÃƒÂ§/g, 'Ã§')
    .replace(/ÃƒÂ/g, 'Ã')
    .replace(/Ãƒâ‚¬/g, 'Ã€')
    .replace(/Ãƒâ€š/g, 'Ã‚')
    .replace(/ÃƒÆ’/g, 'Ãƒ')
    .replace(/Ãƒâ€°/g, 'Ã‰')
    .replace(/ÃƒÅ /g, 'ÃŠ')
    .replace(/ÃƒÂ/g, 'Ã')
    .replace(/Ãƒâ€œ/g, 'Ã“')
    .replace(/Ãƒâ€/g, 'Ã”')
    .replace(/Ãƒâ€¢/g, 'Ã•')
    .replace(/ÃƒÅ¡/g, 'Ãš')
    .replace(/Ãƒâ€¡/g, 'Ã‡');
}

function getStudentName(student: any) {
  return student?.name || student?.full_name || student?.email || 'Aluno';
}

function getFirstName(student: any) {
  const name = getStudentName(student);
  const first = String(name || 'Aluno').trim().split(/\s+/)[0] || 'Aluno';

  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function getCreatedAt(item: any) {
  return (
    item?.created_at ||
    item?.createdAt ||
    item?.updated_at ||
    item?.updatedAt ||
    item?.date ||
    new Date().toISOString()
  );
}

function isReadNotification(item: any) {
  return typeof item?.read === 'boolean' ? item.read : false;
}

function getNotificationTitle(item: any) {
  return fixTextEncoding(
    item?.title ||
      item?.titulo ||
      item?.name ||
      item?.subject ||
      'NotificaÃ§Ã£o'
  );
}

function getNotificationMessage(item: any) {
  return fixTextEncoding(
    item?.message ||
      item?.mensagem ||
      item?.description ||
      item?.body ||
      item?.content ||
      'VocÃª tem uma nova atualizaÃ§Ã£o.'
  );
}

function getNotificationType(item: any): NotificationItem['type'] {
  const value = String(item?.type || item?.category || '').toLowerCase();

  if (value.includes('message') || value.includes('chat') || value.includes('mensagem')) {
    return 'message';
  }

  if (value.includes('workout') || value.includes('treino')) {
    return 'workout';
  }

  if (value.includes('nutrition') || value.includes('nutri') || value.includes('alimentar')) {
    return 'nutrition';
  }

  if (value.includes('progress') || value.includes('progresso')) {
    return 'progress';
  }

  return 'system';
}

function isPersonalOnlyNotification(item: any) {
  const type = String(item?.type || '').toLowerCase();
  const title = String(item?.title || '').toLowerCase();
  const message = String(item?.message || '').toLowerCase();

  return (
    type.includes('trainer_student_workout_completed') ||
    title.includes('finalizou o treino') ||
    message.includes('finalizou o treino')
  );
}

function getActionUrlByType(type: NotificationItem['type']) {
  if (type === 'message') return '/student/chat';
  if (type === 'workout') return '/student/workouts';
  if (type === 'nutrition') return '/student/nutrition';
  if (type === 'progress') return '/student/progress';

  return '/student/home';
}

function getWorkoutName(workout: any) {
  return workout?.name || workout?.title || workout?.plan_name || 'Treino personalizado';
}

function getNutritionTitle(plan: any) {
  return plan?.name || plan?.title || plan?.objective || 'Plano alimentar';
}

function isPublishedWorkout(workout: any) {
  const status = String(workout?.status || '').toLowerCase();

  return status !== 'draft' && status !== 'rascunho' && status !== 'archived';
}

function getTimeLabel(value?: string | null) {
  if (!value) return 'agora';

  try {
    return timeAgo(value);
  } catch {
    return 'agora';
  }
}

function sortNotifications(items: NotificationItem[]) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();

    return bTime - aTime;
  });
}

function uniqueNotifications(items: NotificationItem[]) {
  const map = new Map<string, NotificationItem>();

  items.forEach((item) => {
    const key = `${item.source}-${item.id}`;

    if (!map.has(key)) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
}

function NotificationIcon({ type }: { type: NotificationItem['type'] }) {
  if (type === 'message') {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/10 text-blue-300">
        <MessageCircle className="h-6 w-6" />
      </div>
    );
  }

  if (type === 'workout') {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#ff2a32]/20 bg-[#ff2a32]/10 text-[#ff2a32]">
        <Dumbbell className="h-6 w-6" />
      </div>
    );
  }

  if (type === 'nutrition') {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
        <Apple className="h-6 w-6" />
      </div>
    );
  }

  if (type === 'progress') {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-300">
        <Trophy className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-zinc-300">
      <Bell className="h-6 w-6" />
    </div>
  );
}

function SmallStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-3 text-center">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-[#ff2a32]">
        {icon}
      </div>

      <p className="text-lg font-black text-white">{value}</p>

      <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
        {label}
      </p>
    </div>
  );
}

export function StudentNotificationsPage() {
  const navigate = useNavigate();

  const [student, setStudent] = useState<any | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = useMemo(() => {
    return items.filter((item) => !item.read).length;
  }, [items]);

  const smartCount = useMemo(() => {
    return items.filter((item) => item.source === 'smart').length;
  }, [items]);

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/student/home');
  }

  async function loadDatabaseNotifications(authUserId: string) {
    try {
      const { data, error: queryError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (queryError) {
        console.warn('[StudentNotificationsPage] notifications query warning:', queryError);
        return [];
      }

      return ((data || []) as NotificationRow[]).filter(
        (item) => !isPersonalOnlyNotification(item)
      );
    } catch (queryError) {
      console.warn('[StudentNotificationsPage] notifications query exception:', queryError);
      return [];
    }
  }

  async function loadNutritionPlans(studentId: string) {
    try {
      const { data, error } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && Array.isArray(data)) return data;
    } catch (error) {
      console.warn('[StudentNotificationsPage] nutrition student_id warning:', error);
    }

    try {
      const { data, error } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('studentid', studentId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && Array.isArray(data)) return data;
    } catch (error) {
      console.warn('[StudentNotificationsPage] nutrition studentid warning:', error);
    }

    return [];
  }

  async function loadSmartNotifications(studentData: any) {
    const studentId = studentData.id;
    const trainerId = studentData.trainer_id || null;

    const [
      messagesResponse,
      workoutsResponse,
      nutritionResponse,
      logsResponse,
    ] = await Promise.allSettled([
      trainerId
        ? supabase
            .from('messages')
            .select('*')
            .eq('trainer_id', trainerId)
            .eq('student_id', studentId)
            .eq('sender_role', 'personal')
            .order('created_at', { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [], error: null }),

      workoutService.getWorkoutPlansByStudent(studentId),

      loadNutritionPlans(studentId),

      supabase
        .from('workout_logs')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    const smartItems: NotificationItem[] = [];

    const messages =
      messagesResponse.status === 'fulfilled' && Array.isArray(messagesResponse.value?.data)
        ? messagesResponse.value.data
        : [];

    messages.forEach((message) => {
      smartItems.push({
        id: `message-${message.id}`,
        source: 'smart',
        type: 'message',
        title: 'Nova mensagem do personal',
        description: fixTextEncoding(message.content || 'Seu personal enviou uma nova mensagem.'),
        createdAt: getCreatedAt(message),
        read: Boolean(message.read),
        actionUrl: '/student/chat',
        raw: message,
      });
    });

    const workouts =
      workoutsResponse.status === 'fulfilled' && Array.isArray(workoutsResponse.value)
        ? workoutsResponse.value.filter(isPublishedWorkout)
        : [];

    const latestWorkouts = [...workouts]
      .sort((a, b) => {
        const aTime = new Date(getCreatedAt(a)).getTime();
        const bTime = new Date(getCreatedAt(b)).getTime();
        return bTime - aTime;
      })
      .slice(0, 3);

    latestWorkouts.forEach((workout) => {
      smartItems.push({
        id: `workout-${workout.id}`,
        source: 'smart',
        type: 'workout',
        title: 'Treino disponÃ­vel',
        description: getWorkoutName(workout),
        createdAt: getCreatedAt(workout),
        read: true,
        actionUrl: workout?.id
          ? `/student/workout-detail/${workout.id}`
          : '/student/workouts',
        raw: workout,
      });
    });

    const nutritionPlans =
      nutritionResponse.status === 'fulfilled' && Array.isArray(nutritionResponse.value)
        ? nutritionResponse.value
        : [];

    nutritionPlans.forEach((plan) => {
      smartItems.push({
        id: `nutrition-${plan.id}`,
        source: 'smart',
        type: 'nutrition',
        title: 'Plano alimentar publicado',
        description: getNutritionTitle(plan),
        createdAt: getCreatedAt(plan),
        read: true,
        actionUrl: '/student/nutrition',
        raw: plan,
      });
    });

    const logs =
      logsResponse.status === 'fulfilled' && Array.isArray(logsResponse.value?.data)
        ? logsResponse.value.data
        : [];

    logs.forEach((log) => {
      smartItems.push({
        id: `progress-${log.id}`,
        source: 'smart',
        type: 'progress',
        title: 'Treino concluÃ­do',
        description: 'ParabÃ©ns! Seu progresso foi registrado.',
        createdAt: getCreatedAt(log),
        read: true,
        actionUrl: '/student/progress',
        raw: log,
      });
    });

    return smartItems;
  }

  async function loadNotifications() {
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      const authUser = authData.user;

      if (!authUser?.id) {
        setError('SessÃ£o do aluno nÃ£o encontrada. FaÃ§a login novamente.');
        return;
      }

      const accountResult = await studentService.getStudentAccountByAuthUser(authUser.id);
      let studentData = accountResult?.student || null;

      if (!studentData) {
        studentData = await studentService.getStudentByAuthUser(authUser.id);
      }

      if (!studentData?.id) {
        setError('Perfil do aluno nÃ£o encontrado.');
        return;
      }

      setStudent(studentData);

      const [databaseRows, smartRows] = await Promise.all([
        loadDatabaseNotifications(authUser.id),
        loadSmartNotifications(studentData),
      ]);

      const databaseItems: NotificationItem[] = databaseRows.map((row) => {
        const type = getNotificationType(row);

        return {
          id: String(row.id),
          source: 'database',
          type,
          title: getNotificationTitle(row),
          description: getNotificationMessage(row),
          createdAt: getCreatedAt(row),
          read: isReadNotification(row),
          actionUrl: getActionUrlByType(type),
          raw: row,
        };
      });

      const allItems = sortNotifications(uniqueNotifications([...databaseItems, ...smartRows]));

      setItems(allItems);
    } catch (loadError: any) {
      console.error('[StudentNotificationsPage] load error:', loadError);
      setError(loadError?.message || 'Erro ao carregar notificaÃ§Ãµes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadNotifications();
  }

  async function markOneAsRead(item: NotificationItem) {
    if (item.read) {
      if (item.actionUrl) navigate(item.actionUrl);
      return;
    }

    setItems((prev) =>
      prev.map((current) =>
        current.id === item.id && current.source === item.source
          ? { ...current, read: true }
          : current
      )
    );

    if (item.source === 'database') {
      try {
        const { error: readError } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', item.id);

        if (readError) {
          console.warn('[StudentNotificationsPage] mark one read warning:', readError);
        }
      } catch (readError) {
        console.warn('[StudentNotificationsPage] mark one read exception:', readError);
      }
    }

    if (item.source === 'smart' && item.type === 'message' && item.raw?.id) {
      try {
        await supabase.from('messages').update({ read: true }).eq('id', item.raw.id);
      } catch (messageReadError) {
        console.warn('[StudentNotificationsPage] mark message read warning:', messageReadError);
      }
    }

    if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  }

  async function markAllAsRead() {
    if (!student?.id || markingAll) return;

    setMarkingAll(true);

    const databaseIds = items
      .filter((item) => item.source === 'database' && !item.read)
      .map((item) => item.id);

    const messageIds = items
      .filter((item) => item.source === 'smart' && item.type === 'message' && !item.read)
      .map((item) => item.raw?.id)
      .filter(Boolean);

    setItems((prev) => prev.map((item) => ({ ...item, read: true })));

    try {
      if (databaseIds.length > 0) {
        const { error: readError } = await supabase
          .from('notifications')
          .update({ read: true })
          .in('id', databaseIds);

        if (readError) {
          console.warn('[StudentNotificationsPage] mark all notifications warning:', readError);
        }
      }

      if (messageIds.length > 0) {
        await supabase.from('messages').update({ read: true }).in('id', messageIds);
      }
    } catch (markError) {
      console.warn('[StudentNotificationsPage] mark all warning:', markError);
    } finally {
      setMarkingAll(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15 shadow-[0_18px_45px_rgba(255,42,48,0.22)]">
            <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
          </div>

          <div>
            <p className="text-sm font-black text-white">Carregando notificaÃ§Ãµes...</p>
            <p className="mt-1 text-xs text-zinc-500">
              Buscando atualizaÃ§Ãµes do seu treino.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] px-4 pb-32 pt-6 text-white">
        <div className="mx-auto max-w-lg rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-300">
            <AlertCircle className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-xl font-black text-white">Erro nas notificaÃ§Ãµes</h1>

          <p className="mt-2 text-sm leading-relaxed text-red-200/80">{error}</p>

          <button
            type="button"
            onClick={loadNotifications}
            className="mt-6 h-12 w-full rounded-2xl bg-[#ff2a32] text-sm font-black text-white"
          >
            TENTAR NOVAMENTE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 pb-32 pt-6 text-white">
      <div className="mx-auto max-w-lg space-y-5">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#ff2a32]/20 to-transparent" />

          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white active:scale-95"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
                  Central
                </p>

                <h1 className="mt-1 truncate text-[28px] font-black uppercase italic tracking-[-0.06em] text-white">
                  NotificaÃ§Ãµes
                </h1>

                <p className="mt-1 truncate text-[12px] font-medium text-zinc-500">
                  {student ? `${getFirstName(student)}, veja suas atualizaÃ§Ãµes.` : 'Suas atualizaÃ§Ãµes.'}
                </p>
              </div>

              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-[#ff2a32]/20 bg-[#ff2a32]/15 text-[#ff2a32]">
                <BellRing className="h-7 w-7" />

                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#ff2a32] px-1.5 text-[10px] font-black text-white ring-4 ring-[#050505]">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <SmallStat
                icon={<Bell className="h-4 w-4" />}
                label="Total"
                value={items.length}
              />

              <SmallStat
                icon={<BellRing className="h-4 w-4" />}
                label="NÃ£o lidas"
                value={unreadCount}
              />

              <SmallStat
                icon={<Sparkles className="h-4 w-4" />}
                label="Sistema"
                value={smartCount}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] text-xs font-black uppercase text-white active:scale-95 disabled:opacity-60"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Atualizar
              </button>

              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0 || markingAll}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#ff2a32] text-xs font-black uppercase text-white shadow-[0_18px_45px_rgba(255,42,48,0.28)] active:scale-95 disabled:opacity-50"
              >
                {markingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4" />
                )}
                Marcar lidas
              </button>
            </div>
          </div>
        </section>

        {items.length === 0 ? (
          <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.04] text-zinc-600">
              <Bell className="h-10 w-10" />
            </div>

            <h2 className="mt-5 text-xl font-black text-white">Tudo em dia</h2>

            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              VocÃª ainda nÃ£o tem notificaÃ§Ãµes. Quando tiver treino, mensagem ou plano alimentar novo,
              aparecerÃ¡ aqui.
            </p>
          </section>
        ) : (
          <section className="space-y-3">
            {items.map((item) => (
              <button
                key={`${item.source}-${item.id}`}
                type="button"
                onClick={() => markOneAsRead(item)}
                className={cn(
                  'w-full rounded-[28px] border p-4 text-left transition-all active:scale-[0.98]',
                  item.read
                    ? 'border-white/10 bg-white/[0.035]'
                    : 'border-[#ff2a32]/25 bg-[#ff2a32]/10 shadow-[0_18px_60px_rgba(255,42,48,0.12)]'
                )}
              >
                <div className="flex items-start gap-3">
                  <NotificationIcon type={item.type} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'truncate text-sm font-black',
                            item.read ? 'text-white' : 'text-[#ffdddd]'
                          )}
                        >
                          {item.title}
                        </p>

                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                          {item.description}
                        </p>
                      </div>

                      {!item.read && (
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#ff2a32]" />
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-zinc-600">
                        <Clock3 className="h-3.5 w-3.5" />
                        {getTimeLabel(item.createdAt)}
                      </span>

                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase',
                          item.read
                            ? 'bg-white/[0.04] text-zinc-500'
                            : 'bg-[#ff2a32] text-white'
                        )}
                      >
                        {item.read ? (
                          <>
                            <Check className="h-3 w-3" />
                            Lida
                          </>
                        ) : (
                          <>
                            <BellRing className="h-3 w-3" />
                            Nova
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="mt-3 h-5 w-5 shrink-0 text-zinc-700" />
                </div>
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

export default StudentNotificationsPage;

` 

# Análise para implementação

## Onde está o bloqueio por dia da semana

**WorkoutDetailPage.tsx**, linha 674:
`	sx
{selectedSection.key === todayDayKey ? (
  <button ... onClick={() => navigate(...)}>
    Executar treino de hoje
  </button>
) : (
  <div>Treino bloqueado para hoje</div>
)}
`

**WorkoutExecutionPage.tsx**, linhas 588-597:
`	sx
const today = getTodayDayKey();
if (selectedDayKey !== today) {
  throw new Error(\O treino de \ não pode ser executado hoje.\);
}
`

## Onde aparece o texto \"TREINO BLOQUEADO PARA HOJE\"

**WorkoutDetailPage.tsx**, linha 693:
`	sx
<p className=\"text-xs font-black uppercase text-amber-300\">
  Treino bloqueado para hoje
</p>
`

## Onde o botão de execução é escondido/desabilitado

**WorkoutDetailPage.tsx**, linhas 671-706: Quando selectedSection.key !== todayDayKey, o botão de execução é substituído por um div com a mensagem \"Treino bloqueado para hoje\". O botão só aparece quando o dia selecionado coincide com 	odayDayKey.

## Onde a rota de execução valida o dia selecionado

**WorkoutExecutionPage.tsx**, linhas 588-597: A função loadExecutionData() compara selectedDayKey com getTodayDayKey() e lança erro se diferente.

## Campos que representam início e vencimento do plano

- start_date: string | null — data de início
- end_date: string | null — data de vencimento

Ambos estão na interface WorkoutPlan em src/types/database.ts:137-138.

## Tipo exato desses campos

`	s
start_date: string | null;
end_date: string | null;
`

São string | null. O valor é uma string de data ISO (ex: \"2026-07-06\") sem hora, armazenada como date no PostgreSQL. O parsing é feito por parseDateOnly() que adiciona T12:00:00 para evitar problemas de timezone.

## Como o sistema identifica o personal responsável pelo aluno

1. O **Student** tem o campo 	rainer_id: string (src/types/database.ts:56)
2. O **WorkoutPlan** também tem 	rainer_id: string (src/types/database.ts:129)
3. A função getTrainerId() em WorkoutExecutionPage.tsx:329-339 tenta obter de: student.trainer_id || student.coach_id || plan.trainer_id
4. O 	rainer_id em students é a FK que liga o aluno ao personal (tabela 	rainer_profiles)

## Nome da tabela de notificações


otifications

## Colunas disponíveis na tabela de notificações

Conforme a interface Notification em src/types/database.ts:319-327:
- id: string
- user_id: string
- 	itle: string
- message: string | null
- 	ype: string | null
- ead: boolean
- created_at: string

Não há coluna updated_at.

## Existe campo para chave única, referência, metadata ou tipo da notificação?

- **Tipo**: sim, 	ype: string | null. Usado como 	rainer_student_workout_completed no código atual.
- **Chave única**: **NÃO**. Não existe nenhum campo de chave única como unique_key, dedup_key ou similar.
- **Metadata**: **NÃO**. Não existe campo JSON ou metadata.

## Como evitar notificações duplicadas

Atualmente **não há mecanismo de dedup**. A notificação é inserida diretamente via supabase.from('notifications').insert(...) em WorkoutExecutionPage.tsx:414-424. Para evitar duplicatas seria necessário:

1. **Antes de inserir**, consultar se já existe notificação do mesmo tipo para o mesmo user_id com mesmo conteúdo (ex: mesmo plan.id para 	rainer_student_workout_completed) dentro de um período.
2. Ou criar uma **constraint única** no banco (ex: unique(user_id, 	ype, ...)), mas atualmente não existe.
3. Ou usar um campo unique_key gerado (ex: ${trainerId}__expired) e upsert com conflito.

## Já existe função de notificação reutilizável?

**NÃO**. A criação de notificação é feita **inline** na função 
otifyTrainer() em WorkoutExecutionPage.tsx:371-438. Esta função faz:
1. Obtém o 	rainerId via getTrainerId(student, plan)
2. Resolve o uth_user_id do personal via esolveTrainerNotificationUserId() (consulta 	rainer_profiles e user_profiles)
3. Insere na tabela 
otifications com type=	rainer_student_workout_completed

## StudentProfilePage já possui editar, excluir e criar plano?

**Sim**:
- **Criar**: botão \"NOVO\" (linha 1260-1269) navega para /personal/workout-builder?studentId=
- **Editar**: botão \"EDITAR\" (linhas 1343-1354) navega para /personal/workout-builder?studentId=&workoutId=
- **Excluir**: botão \"EXCLUIR\" (linhas 1356-1377) com função handleDeleteWorkout() nas linhas 635-741

## Compatibilidade necessária com planos antigos

A interface WorkoutPlan possui campos de renovação:
- enewal_status: WorkoutRenewalStatus | string | null (pode ser 'none' ou 'renewed')
- enewed_from_plan_id: string | null
- enewal_created_at: string | null

Também existe fallback para alunos legados em getStudentAccountByAuthUser() (studentService.ts:378-414) que consulta students.auth_user_id diretamente além da tabela student_accounts.

## Risco relacionado a timezone

**RISCO BAIXO, MAS EXISTE**: A função parseDateOnly() em todos os arquivos usa:
`	s
const date = new Date(\\T12:00:00\);
`
Isso fixa o meio-dia UTC para evitar que a data \"2026-07-06\" seja interpretada como \"2026-07-05T21:00:00\" em fusos negativos. A comparação em getExpirationStatus() também usa:
`	s
const today = new Date();
today.setHours(12, 0, 0, 0);
`

Isso torna a comparação **estável** independente do timezone do usuário, pois ambas as datas estão fixadas em 12:00 UTC. O risco seria se o servidor ou o cliente estivessem em fusos muito extremos (+14 ou -12), mas para o Brasil inteiro (UTC-2 a UTC-5) o meio-dia UTC cai entre 7h e 10h da manhã, o que é seguro.

No entanto, a função getExpirationStatus em StudentWorkoutsPage.tsx:159-202 faz:
`	s
const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
`

Se end_date for \"2026-07-06\" (meio-dia UTC) e 	oday for 2026-07-06 (meio-dia UTC), a diferença será 0 — o plano **vence hoje** (rank 1). Isso está correto para a regra de data inclusiva (end_date = 06/07/2026 ainda permite treinar em 06/07/2026). O bloqueio começa quando days < 0, ou seja, em 07/07/2026.
