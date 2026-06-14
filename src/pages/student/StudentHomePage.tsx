import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Apple,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Loader2,
  MessageCircle,
  Play,
  Sparkles,
  Target,
  Trophy,
  User,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import * as studentService from '../../services/studentService';
import * as workoutService from '../../services/workoutService';

type StudentHomeState = {
  student: any | null;
  trainer: any | null;
  workouts: any[];
  workoutLogs: any[];
  nutritionPlans: any[];
  unreadMessages: number;
};

function getStudentInitials(name?: string) {
  const safeName = String(name || 'Aluno').trim();
  const parts = safeName.split(' ').filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return safeName.slice(0, 2).toUpperCase();
}

function getStudentAvatarUrl(student: any) {
  return (
    student?.avatar_url ||
    student?.photo_url ||
    student?.profile_photo_url ||
    student?.image_url ||
    student?.avatar ||
    ''
  );
}

function getStudentName(student: any) {
  return student?.name || student?.full_name || 'Aluno';
}

function getFirstName(student: any) {
  const rawName = getStudentName(student);
  const firstName = String(rawName || 'Aluno').trim().split(/\s+/)[0] || 'Aluno';

  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

function getTrainerName(trainer: any) {
  return trainer?.name || trainer?.full_name || 'Personal';
}

function getWorkoutName(workout: any) {
  return workout?.name || workout?.title || workout?.plan_name || 'Treino personalizado';
}

function getWorkoutObjective(workout: any) {
  return workout?.objective || workout?.goal || workout?.focus || 'Treino do dia';
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

function isPublishedWorkout(workout: any) {
  const status = String(workout?.status || '').toLowerCase();

  return status !== 'draft' && status !== 'rascunho' && status !== 'archived';
}

function getLogDate(log: any) {
  return (
    log?.date ||
    log?.completed_at ||
    log?.completedAt ||
    log?.created_at ||
    log?.createdAt ||
    ''
  );
}

function calculateCompletedThisWeek(logs: any[]) {
  const now = new Date();
  const start = new Date(now);

  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);

  return logs.filter((log) => {
    const raw = getLogDate(log);
    const date = new Date(raw);

    return Number.isFinite(date.getTime()) && date >= start;
  }).length;
}

function calculateStreak(logs: any[]) {
  const dates = [
    ...new Set(
      logs
        .map((log) => {
          const raw = getLogDate(log);

          if (!raw) return '';

          const date = new Date(raw);

          if (!Number.isFinite(date.getTime())) {
            return String(raw).slice(0, 10);
          }

          return date.toISOString().slice(0, 10);
        })
        .filter(Boolean)
    ),
  ]
    .sort()
    .reverse();

  let count = 0;

  for (let index = 0; index < dates.length; index++) {
    const current = new Date(`${dates[index]}T00:00:00`);
    const expected = new Date();

    expected.setHours(0, 0, 0, 0);
    expected.setDate(expected.getDate() - index);

    if (current.toDateString() === expected.toDateString()) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

function formatShortDate(value?: string | null) {
  if (!value) return 'Hoje';

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return 'Hoje';

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

function getNutritionTitle(plan: any) {
  const objective = String(plan?.objective || '').trim();

  if (objective) return objective;

  const name = String(plan?.name || '').trim();

  const cleanedName = name
    .replace(/^plano alimentar\s*[-–—]?\s*/i, '')
    .replace(/^nutrição\s*[-–—]?\s*/i, '')
    .trim();

  return cleanedName || 'Disponível';
}

export function StudentHomePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [data, setData] = useState<StudentHomeState>({
    student: null,
    trainer: null,
    workouts: [],
    workoutLogs: [],
    nutritionPlans: [],
    unreadMessages: 0,
  });

  useEffect(() => {
    loadHome();
  }, []);

  async function loadHome() {
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

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
        setError('Perfil do aluno não encontrado. Faça login novamente.');
        return;
      }

      const trainerId = studentData.trainer_id || null;

      const [
        trainerResponse,
        workoutsResponse,
        logsResponse,
        nutritionResponse,
        unreadResponse,
      ] = await Promise.allSettled([
        trainerId
          ? supabase.from('trainer_profiles').select('*').eq('id', trainerId).maybeSingle()
          : Promise.resolve({ data: null, error: null }),

        workoutService.getWorkoutPlansByStudent(studentData.id),

        supabase
          .from('workout_logs')
          .select('*')
          .eq('student_id', studentData.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('nutrition_plans')
          .select('*')
          .or(`student_id.eq.${studentData.id},studentid.eq.${studentData.id}`)
          .eq('status', 'published')
          .order('created_at', { ascending: false }),

        trainerId
          ? supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('trainer_id', trainerId)
              .eq('student_id', studentData.id)
              .eq('sender_role', 'personal')
              .eq('read', false)
          : Promise.resolve({ count: 0, error: null }),
      ]);

      const trainer =
        trainerResponse.status === 'fulfilled' ? trainerResponse.value?.data || null : null;

      const workouts =
        workoutsResponse.status === 'fulfilled' && Array.isArray(workoutsResponse.value)
          ? workoutsResponse.value.filter(isPublishedWorkout)
          : [];

      const workoutLogs =
        logsResponse.status === 'fulfilled' && Array.isArray(logsResponse.value?.data)
          ? logsResponse.value.data
          : [];

      const nutritionPlans =
        nutritionResponse.status === 'fulfilled' && Array.isArray(nutritionResponse.value?.data)
          ? nutritionResponse.value.data
          : [];

      const unreadMessages =
        unreadResponse.status === 'fulfilled'
          ? Number((unreadResponse.value as any)?.count || 0)
          : 0;

      setData({
        student: studentData,
        trainer,
        workouts,
        workoutLogs,
        nutritionPlans,
        unreadMessages,
      });
    } catch (err: any) {
      console.error('[StudentHomePage] loadHome error:', err);
      setError(err?.message || 'Erro ao carregar a Home do aluno.');
    } finally {
      setLoading(false);
    }
  }

  const mainWorkout = useMemo(() => {
    return [...data.workouts].sort(
      (a, b) => getWorkoutUpdatedTime(b) - getWorkoutUpdatedTime(a)
    )[0];
  }, [data.workouts]);

  const latestNutrition = useMemo(() => {
    return data.nutritionPlans[0] || null;
  }, [data.nutritionPlans]);

  const completedThisWeek = useMemo(() => {
    return calculateCompletedThisWeek(data.workoutLogs);
  }, [data.workoutLogs]);

  const streak = useMemo(() => {
    return calculateStreak(data.workoutLogs);
  }, [data.workoutLogs]);

  function handleStartWorkout() {
    if (mainWorkout?.id) {
      navigate(`/student/workout-detail/${mainWorkout.id}`);
      return;
    }

    navigate('/student/workouts');
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15 shadow-[0_18px_45px_rgba(255,42,48,0.22)]">
            <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
          </div>

          <div>
            <p className="text-sm font-black text-white">Carregando sua Home...</p>
            <p className="mt-1 text-xs text-zinc-500">Buscando seus treinos e progresso.</p>
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

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={loadHome}
              className="h-12 rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-black text-white"
            >
              TENTAR
            </button>

            <button
              type="button"
              onClick={() => navigate('/auth/student-login')}
              className="h-12 rounded-2xl bg-[#ff2a32] text-sm font-black text-white"
            >
              LOGIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  const avatarUrl = getStudentAvatarUrl(data.student);

  return (
    <div className="min-h-screen bg-[#050505] px-4 pb-32 pt-6 text-white">
      <div className="mx-auto max-w-lg space-y-5">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-[#ff2a32]/20 bg-[#ff2a32]/15 text-lg font-black text-[#ff2a32]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={getStudentName(data.student)}
                  className="h-full w-full object-cover"
                />
              ) : (
                getStudentInitials(getStudentName(data.student))
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                VSFit Aluno
              </p>

              <h1 className="mt-1 truncate text-[24px] font-black tracking-[-0.04em] text-white">
                Olá, {getFirstName(data.student)}
              </h1>

              <p className="mt-1 truncate text-[12px] font-medium text-zinc-500">
                Personal: {getTrainerName(data.trainer)}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
              <Flame className="mx-auto mb-2 h-4 w-4 text-[#ff2a32]" />
              <p className="text-lg font-black text-white">{streak}</p>
              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                Sequência
              </p>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-4 w-4 text-emerald-400" />
              <p className="text-lg font-black text-white">{completedThisWeek}</p>
              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                Semana
              </p>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
              <Trophy className="mx-auto mb-2 h-4 w-4 text-yellow-400" />
              <p className="text-lg font-black text-white">{data.workoutLogs.length}</p>
              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                Total
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#ff2a32]/18 via-white/[0.045] to-white/[0.025] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                Treino principal
              </p>

              <h2 className="mt-1 text-[22px] font-black tracking-[-0.04em] text-white">
                {mainWorkout ? getWorkoutName(mainWorkout) : 'Nenhum treino liberado'}
              </h2>
            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-[#ff2a32] text-white shadow-[0_14px_35px_rgba(255,42,48,0.35)]">
              <Dumbbell className="h-7 w-7" />
            </div>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            {mainWorkout
              ? getWorkoutObjective(mainWorkout)
              : 'Quando seu personal publicar um treino, ele aparecerá aqui.'}
          </p>

          {mainWorkout && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold text-zinc-300">
                <Clock className="h-3.5 w-3.5" />
                {getWorkoutDuration(mainWorkout) || '--'} min
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold text-zinc-300">
                <Target className="h-3.5 w-3.5" />
                {mainWorkout?.level || mainWorkout?.difficulty || 'Seu nível'}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleStartWorkout}
            className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-[#ff2a32] text-[13px] font-black text-white shadow-[0_18px_45px_rgba(255,42,48,0.32)] transition-all active:scale-[0.98]"
          >
            {mainWorkout ? (
              <>
                <Play className="h-4 w-4" />
                COMEÇAR TREINO
              </>
            ) : (
              <>
                <Dumbbell className="h-4 w-4" />
                VER TREINOS
              </>
            )}
          </button>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate('/student/workouts')}
            className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4 text-left transition-all active:scale-[0.98]"
          >
            <Dumbbell className="mb-4 h-6 w-6 text-[#ff2a32]" />
            <p className="text-sm font-black text-white">Treinos</p>
            <p className="mt-1 text-xs text-zinc-500">{data.workouts.length} liberado(s)</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/student/progress')}
            className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4 text-left transition-all active:scale-[0.98]"
          >
            <BarChart3 className="mb-4 h-6 w-6 text-emerald-400" />
            <p className="text-sm font-black text-white">Progresso</p>
            <p className="mt-1 text-xs text-zinc-500">Acompanhar evolução</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/student/chat')}
            className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4 text-left transition-all active:scale-[0.98]"
          >
            <div className="mb-4 flex items-center justify-between">
              <MessageCircle className="h-6 w-6 text-blue-400" />

              {data.unreadMessages > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#ff2a32] px-2 text-[10px] font-black text-white">
                  {data.unreadMessages}
                </span>
              )}
            </div>

            <p className="text-sm font-black text-white">Chat</p>
            <p className="mt-1 text-xs text-zinc-500">Falar com personal</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/student/profile')}
            className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4 text-left transition-all active:scale-[0.98]"
          >
            <User className="mb-4 h-6 w-6 text-zinc-300" />
            <p className="text-sm font-black text-white">Perfil</p>
            <p className="mt-1 text-xs text-zinc-500">Dados e conta</p>
          </button>
        </div>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                  latestNutrition
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-white/[0.05] text-zinc-500'
                )}
              >
                <Apple className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400">
                  Plano alimentar
                </p>

                <p className="mt-1 truncate text-sm font-black text-white">
                  {latestNutrition ? getNutritionTitle(latestNutrition) : 'Nenhum plano publicado'}
                </p>

                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {latestNutrition
                    ? `Atualizado em ${formatShortDate(
                        latestNutrition.updated_at || latestNutrition.created_at
                      )}`
                    : 'Assim que publicar, aparecerá aqui'}
                </p>
              </div>
            </div>

            <ChevronRight className="h-5 w-5 shrink-0 text-zinc-700" />
          </div>
        </section>

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

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 p-3">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-[#ff2a32]" />
                <span className="text-sm font-bold text-zinc-300">Treinos publicados</span>
              </div>

              <span className="text-sm font-black text-white">{data.workouts.length}</span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 p-3">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-emerald-400" />
                <span className="text-sm font-bold text-zinc-300">Concluídos</span>
              </div>

              <span className="text-sm font-black text-white">{data.workoutLogs.length}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default StudentHomePage;