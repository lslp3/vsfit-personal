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
  Loader2,
  Play,
  Search,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import * as studentService from '../../services/studentService';
import * as workoutService from '../../services/workoutService';

type FilterType = 'all' | 'today' | 'pending' | 'completed';

type StudentWorkoutsState = {
  student: any | null;
  workouts: any[];
  logs: any[];
};

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'today', label: 'Hoje' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'completed', label: 'Concluídos' },
];

const WEEK_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const DAY_LABELS: Record<string, string> = {
  Sunday: 'DOM',
  Monday: 'SEG',
  Tuesday: 'TER',
  Wednesday: 'QUA',
  Thursday: 'QUI',
  Friday: 'SEX',
  Saturday: 'SAB',
};

function getTodayDayKey() {
  return WEEK_DAYS[new Date().getDay()];
}

function getWorkoutName(workout: any) {
  return workout?.name || workout?.title || workout?.workout_name || workout?.plan_name || 'Treino personalizado';
}

function getWorkoutObjective(workout: any) {
  return workout?.objective || workout?.goal || workout?.focus || 'Treino personalizado';
}

function getWorkoutLevel(workout: any) {
  return workout?.level || workout?.difficulty || 'Seu nível';
}

function getWorkoutDuration(workout: any) {
  return (
    workout?.duration_minutes ||
    workout?.duration ||
    workout?.estimated_duration ||
    workout?.time ||
    null
  );
}

function getWorkoutUpdatedTime(workout: any) {
  const raw =
    workout?.updated_at ||
    workout?.updatedAt ||
    workout?.created_at ||
    workout?.createdAt ||
    '';

  const time = new Date(raw).getTime();

  return Number.isFinite(time) ? time : 0;
}

function isVisibleWorkout(workout: any) {
  const status = String(workout?.status || '').toLowerCase();

  return status !== 'draft' && status !== 'rascunho' && status !== 'archived';
}

function normalizeArray(value: any) {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function getWorkoutExercises(workout: any) {
  const directExercises = normalizeArray(workout?.exercises);

  if (directExercises.length > 0) return directExercises;

  const dayGroups = normalizeArray(workout?.dayGroups || workout?.day_groups);

  return dayGroups.flatMap((group: any) => normalizeArray(group?.exercises));
}

function getWorkoutDayGroups(workout: any) {
  const dayGroups = normalizeArray(workout?.dayGroups || workout?.day_groups);

  if (dayGroups.length > 0) return dayGroups;

  const scheduleDays = normalizeArray(workout?.scheduleDays || workout?.scheduledays);

  return scheduleDays.map((dayKey: string) => ({
    dayKey,
    dayLabel: DAY_LABELS[dayKey] || 'DIA',
    exercises: [],
  }));
}

function getWorkoutScheduleDays(workout: any) {
  const directDays = normalizeArray(workout?.scheduleDays || workout?.scheduledays);

  if (directDays.length > 0) return directDays;

  return getWorkoutDayGroups(workout)
    .map((group: any) => group?.dayKey || group?.day || group?.day_key)
    .filter(Boolean);
}

function isTodayWorkout(workout: any) {
  const today = getTodayDayKey();
  const scheduleDays = getWorkoutScheduleDays(workout);

  if (scheduleDays.length === 0) return false;

  return scheduleDays.some((day: string) => String(day) === today);
}

function getLogWorkoutId(log: any) {
  return (
    log?.workout_plan_id ||
    log?.workout_id ||
    log?.plan_id ||
    log?.workoutPlanId ||
    log?.workoutId ||
    ''
  );
}

function isCompletedLog(log: any) {
  const status = String(log?.status || '').toLowerCase();

  return (
    status === 'completed' ||
    status === 'complete' ||
    status === 'done' ||
    Boolean(log?.completed_at) ||
    Boolean(log?.completedAt)
  );
}

function isWorkoutCompleted(workout: any, logs: any[]) {
  return logs.some((log) => {
    const logWorkoutId = getLogWorkoutId(log);

    return logWorkoutId === workout.id && isCompletedLog(log);
  });
}

function getWorkoutLastCompleted(workout: any, logs: any[]) {
  const completedLogs = logs
    .filter((log) => getLogWorkoutId(log) === workout.id && isCompletedLog(log))
    .sort((a, b) => {
      const dateA = new Date(a.completed_at || a.created_at || a.date || '').getTime();
      const dateB = new Date(b.completed_at || b.created_at || b.date || '').getTime();

      return dateB - dateA;
    });

  return completedLogs[0] || null;
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

export function WorkoutsPage() {
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
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      const authUser = authData.user;

      if (!authUser?.id) {
        setError('Sessão do aluno não encontrada. Faça login novamente.');
        return;
      }

      const { student } = await studentService.getStudentAccountByAuthUser(authUser.id);

      let studentData = student;

      if (!studentData) {
        studentData = await studentService.getStudentByAuthUser(authUser.id);
      }

      if (!studentData?.id) {
        setError('Perfil do aluno não encontrado.');
        return;
      }

      const [workoutsData, logsResponse] = await Promise.allSettled([
        workoutService.getWorkoutPlansByStudent(studentData.id),
        workoutService.getWorkoutLogsByStudent(studentData.id),
      ]);

      const workouts =
        workoutsData.status === 'fulfilled' && Array.isArray(workoutsData.value)
          ? workoutsData.value.filter(isVisibleWorkout)
          : [];

      const logs =
        logsResponse.status === 'fulfilled' && Array.isArray(logsResponse.value)
          ? logsResponse.value
          : [];

      setData({
        student: studentData,
        workouts,
        logs,
      });
    } catch (err: any) {
      console.error('[WorkoutsPage] loadData error:', err);
      setError(err?.message || 'Erro ao carregar treinos.');
    } finally {
      setLoading(false);
    }
  }

  const orderedWorkouts = useMemo(() => {
    return [...data.workouts].sort(
      (a, b) => getWorkoutUpdatedTime(b) - getWorkoutUpdatedTime(a)
    );
  }, [data.workouts]);

  const filteredWorkouts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orderedWorkouts.filter((workout) => {
      const completed = isWorkoutCompleted(workout, data.logs);
      const today = isTodayWorkout(workout);

      const matchesSearch =
        !query ||
        String(getWorkoutName(workout)).toLowerCase().includes(query) ||
        String(getWorkoutObjective(workout)).toLowerCase().includes(query) ||
        String(getWorkoutLevel(workout)).toLowerCase().includes(query);

      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'today' && today) ||
        (activeFilter === 'pending' && !completed) ||
        (activeFilter === 'completed' && completed);

      return matchesSearch && matchesFilter;
    });
  }, [orderedWorkouts, data.logs, search, activeFilter]);

  const todayCount = useMemo(() => {
    return orderedWorkouts.filter(isTodayWorkout).length;
  }, [orderedWorkouts]);

  const completedCount = useMemo(() => {
    return orderedWorkouts.filter((workout) => isWorkoutCompleted(workout, data.logs)).length;
  }, [orderedWorkouts, data.logs]);

  const pendingCount = Math.max(orderedWorkouts.length - completedCount, 0);

  function handleOpenWorkout(workout: any) {
    navigate(`/student/workout-detail/${workout.id}`);
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15 shadow-[0_18px_45px_rgba(255,42,48,0.22)]">
            <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
          </div>

          <div>
            <p className="text-sm font-black text-white">Carregando treinos...</p>
            <p className="mt-1 text-xs text-zinc-500">Buscando seus planos publicados.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data.student) {
    return (
      <div className="min-h-[calc(100vh-88px)] bg-[#050505] px-4 pb-28 pt-8 text-white">
        <div className="mx-auto max-w-lg rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-300">
            <AlertCircle className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-xl font-black text-white">Não foi possível carregar</h1>

          <p className="mt-2 text-sm leading-relaxed text-red-200/80">
            {error || 'Perfil do aluno não encontrado.'}
          </p>

          <button
            type="button"
            onClick={loadData}
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
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-[#ff2a32]/20 bg-[#ff2a32]/15 text-lg font-black text-[#ff2a32]">
              {getStudentInitials(getStudentName(data.student))}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                Área do aluno
              </p>

              <h1 className="mt-1 text-[25px] font-black uppercase italic tracking-[-0.05em] text-white">
                Meus Treinos
              </h1>

              <p className="mt-1 truncate text-[12px] font-medium text-zinc-500">
                {getStudentName(data.student)}, seus treinos publicados estão aqui.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
              <Dumbbell className="mx-auto mb-2 h-4 w-4 text-[#ff2a32]" />
              <p className="text-lg font-black text-white">{orderedWorkouts.length}</p>
              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                Total
              </p>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
              <CalendarDays className="mx-auto mb-2 h-4 w-4 text-blue-400" />
              <p className="text-lg font-black text-white">{todayCount}</p>
              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                Hoje
              </p>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-4 w-4 text-emerald-400" />
              <p className="text-lg font-black text-white">{completedCount}</p>
              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                Feitos
              </p>
            </div>
          </div>
        </section>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar treino..."
            className="w-full rounded-[20px] border border-white/10 bg-white/[0.045] py-4 pl-11 pr-4 text-sm font-medium text-white outline-none placeholder:text-zinc-600 focus:border-[#ff2a32]/40"
          />
        </div>

        <div className="grid grid-cols-4 gap-2 rounded-[22px] border border-white/5 bg-white/[0.03] p-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={cn(
                'min-h-[42px] rounded-[15px] px-2 text-[10px] font-black uppercase tracking-wide transition-all',
                activeFilter === filter.key
                  ? 'border border-[#ff2a32]/30 bg-[#ff2a32]/20 text-[#ff2a32] shadow-[0_8px_20px_rgba(255,42,48,0.12)]'
                  : 'text-zinc-500'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {filteredWorkouts.length === 0 ? (
          <div className="py-10">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.035] p-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
                <Dumbbell className="h-10 w-10 text-zinc-700" />
              </div>

              <h2 className="mt-6 text-xl font-black text-white">
                {orderedWorkouts.length === 0 ? 'Nenhum treino liberado' : 'Nenhum resultado'}
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {orderedWorkouts.length === 0
                  ? 'Quando seu personal publicar um treino, ele aparecerá aqui.'
                  : 'Tente alterar a busca ou o filtro selecionado.'}
              </p>

              {activeFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className="mt-6 h-12 w-full rounded-2xl bg-[#ff2a32] text-sm font-black text-white"
                >
                  VER TODOS
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredWorkouts.map((workout) => {
              const completed = isWorkoutCompleted(workout, data.logs);
              const lastCompleted = getWorkoutLastCompleted(workout, data.logs);
              const today = isTodayWorkout(workout);
              const exercises = getWorkoutExercises(workout);
              const days = getWorkoutScheduleDays(workout);
              const duration = getWorkoutDuration(workout);

              return (
                <button
                  key={workout.id}
                  type="button"
                  onClick={() => handleOpenWorkout(workout)}
                  className="w-full overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-4 text-left shadow-[0_18px_50px_rgba(0,0,0,0.32)] transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px]',
                        completed
                          ? 'border border-emerald-400/20 bg-emerald-400/12 text-emerald-400'
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
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff2a32]">
                            {today ? 'Treino de hoje' : completed ? 'Concluído' : 'Treino liberado'}
                          </p>

                          <h3 className="mt-1 truncate text-[17px] font-black tracking-[-0.03em] text-white">
                            {getWorkoutName(workout)}
                          </h3>
                        </div>

                        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-zinc-700" />
                      </div>

                      <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-zinc-400">
                        {getWorkoutObjective(workout)}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold text-zinc-300">
                          <Clock className="h-3.5 w-3.5" />
                          {duration || '--'} min
                        </span>

                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold text-zinc-300">
                          <Target className="h-3.5 w-3.5" />
                          {getWorkoutLevel(workout)}
                        </span>

                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold text-zinc-300">
                          <Dumbbell className="h-3.5 w-3.5" />
                          {exercises.length} exercícios
                        </span>
                      </div>

                      {days.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {days.slice(0, 7).map((day: string) => (
                            <span
                              key={`${workout.id}-${day}`}
                              className={cn(
                                'rounded-full border px-2.5 py-1 text-[9px] font-black',
                                day === getTodayDayKey()
                                  ? 'border-[#ff2a32]/30 bg-[#ff2a32]/15 text-[#ff2a32]'
                                  : 'border-white/10 bg-white/[0.04] text-zinc-500'
                              )}
                            >
                              {DAY_LABELS[day] || String(day).slice(0, 3).toUpperCase()}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-bold text-zinc-500">
                          {completed && lastCompleted
                            ? `Último: ${formatShortDate(
                                lastCompleted.completed_at ||
                                  lastCompleted.created_at ||
                                  lastCompleted.date
                              )}`
                            : pendingCount > 0
                              ? 'Toque para iniciar'
                              : 'Pronto para executar'}
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
              <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
                Pendentes
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-center">
              <p className="text-2xl font-black text-emerald-400">{completedCount}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
                Concluídos
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default WorkoutsPage;