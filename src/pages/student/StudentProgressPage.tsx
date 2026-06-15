import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Dumbbell,
  Flame,
  Loader2,
  Ruler,
  Scale,
  TrendingUp,
  Trophy,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { formatDate, formatTime } from '../../lib/formatters';
import * as studentService from '../../services/studentService';
import { getWorkoutLogsByStudent } from '../../services/workoutService';

type StudentProgressState = {
  student: any | null;
  logs: any[];
  metrics: any[];
};

function getStudentName(student: any) {
  return student?.name || student?.full_name || 'Aluno';
}

function getFirstName(student: any) {
  const name = getStudentName(student);
  const first = String(name || 'Aluno').trim().split(/\s+/)[0] || 'Aluno';

  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function getStudentInitials(name?: string) {
  const safeName = String(name || 'Aluno').trim();
  const parts = safeName.split(' ').filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return safeName.slice(0, 2).toUpperCase();
}

function getLogDate(log: any) {
  return (
    log?.completed_at ||
    log?.completedAt ||
    log?.date ||
    log?.created_at ||
    log?.createdAt ||
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

function normalizeExercises(value: any) {
  return Array.isArray(value) ? value : [];
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

  let streak = 0;

  for (let index = 0; index < dates.length; index++) {
    const current = new Date(`${dates[index]}T00:00:00`);
    const expected = new Date();

    expected.setHours(0, 0, 0, 0);
    expected.setDate(expected.getDate() - index);

    if (current.toDateString() === expected.toDateString()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function getMetricWeight(metric: any) {
  const value = metric?.weight;

  if (value === null || value === undefined || value === '') return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getLatestMetric(metrics: any[]) {
  return [...metrics].sort((a, b) => {
    const dateA = new Date(a?.date || a?.created_at || '').getTime();
    const dateB = new Date(b?.date || b?.created_at || '').getTime();

    return dateB - dateA;
  })[0];
}

function getPreviousMetric(metrics: any[]) {
  return [...metrics].sort((a, b) => {
    const dateA = new Date(a?.date || a?.created_at || '').getTime();
    const dateB = new Date(b?.date || b?.created_at || '').getTime();

    return dateB - dateA;
  })[1];
}

function formatNumber(value: any, suffix = '') {
  if (value === null || value === undefined || value === '') return '—';

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return '—';

  return `${String(parsed).replace('.', ',')}${suffix}`;
}

export function StudentProgressPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [data, setData] = useState<StudentProgressState>({
    student: null,
    logs: [],
    metrics: [],
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

      const accountResult = await studentService.getStudentAccountByAuthUser(authUser.id);
      let studentData = accountResult?.student || null;

      if (!studentData) {
        studentData = await studentService.getStudentByAuthUser(authUser.id);
      }

      if (!studentData?.id) {
        setError('Perfil do aluno não encontrado.');
        return;
      }

      const [logsResult, metricsResult] = await Promise.allSettled([
        getWorkoutLogsByStudent(studentData.id),
        supabase
          .from('student_metrics')
          .select('*')
          .eq('student_id', studentData.id)
          .order('date', { ascending: true }),
      ]);

      const logs =
        logsResult.status === 'fulfilled' && Array.isArray(logsResult.value)
          ? logsResult.value
          : [];

      const metrics =
        metricsResult.status === 'fulfilled' && Array.isArray(metricsResult.value?.data)
          ? metricsResult.value.data
          : [];

      setData({
        student: studentData,
        logs,
        metrics,
      });
    } catch (err: any) {
      console.error('[StudentProgressPage] loadData error:', err);
      setError(err?.message || 'Erro ao carregar progresso.');
    } finally {
      setLoading(false);
    }
  }

  const completedLogs = useMemo(() => {
    return data.logs
      .filter(isCompletedLog)
      .sort((a, b) => {
        const dateA = new Date(getLogDate(a)).getTime();
        const dateB = new Date(getLogDate(b)).getTime();

        return dateB - dateA;
      });
  }, [data.logs]);

  const totalWorkouts = completedLogs.length;

  const totalTime = useMemo(() => {
    return completedLogs.reduce((sum, log) => sum + Number(log?.duration_seconds || 0), 0);
  }, [completedLogs]);

  const averageTime = totalWorkouts > 0 ? Math.round(totalTime / totalWorkouts) : 0;

  const weekWorkouts = useMemo(() => calculateCompletedThisWeek(completedLogs), [completedLogs]);

  const streak = useMemo(() => calculateStreak(completedLogs), [completedLogs]);

  const latestMetric = useMemo(() => getLatestMetric(data.metrics), [data.metrics]);

  const previousMetric = useMemo(() => getPreviousMetric(data.metrics), [data.metrics]);

  const latestWeight = getMetricWeight(latestMetric);
  const previousWeight = getMetricWeight(previousMetric);

  const weightDiff =
    latestWeight !== null && previousWeight !== null
      ? Number((latestWeight - previousWeight).toFixed(1))
      : null;

  const weightMetrics = useMemo(() => {
    return data.metrics
      .filter((metric) => getMetricWeight(metric) !== null)
      .slice(-6);
  }, [data.metrics]);

  const maxWeight = useMemo(() => {
    const values = weightMetrics
      .map((metric) => getMetricWeight(metric))
      .filter((value): value is number => value !== null);

    return values.length > 0 ? Math.max(...values) : 0;
  }, [weightMetrics]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15 shadow-[0_18px_45px_rgba(255,42,48,0.22)]">
            <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
          </div>

          <div>
            <p className="text-sm font-black text-white">Carregando progresso...</p>
            <p className="mt-1 text-xs text-zinc-500">Buscando sua evolução.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data.student) {
    return (
      <div className="min-h-screen bg-[#050505] px-4 pb-28 pt-8 text-white">
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
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-[#ff2a32]/20 bg-[#ff2a32]/15 text-lg font-black text-[#ff2a32]">
              {getStudentInitials(getStudentName(data.student))}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                Área do aluno
              </p>

              <h1 className="mt-1 text-[25px] font-black uppercase italic tracking-[-0.05em] text-white">
                Progresso
              </h1>

              <p className="mt-1 truncate text-[12px] font-medium text-zinc-500">
                {getFirstName(data.student)}, acompanhe sua evolução.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
              <Dumbbell className="mx-auto mb-2 h-4 w-4 text-[#ff2a32]" />
              <p className="text-lg font-black text-white">{totalWorkouts}</p>
              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                Treinos
              </p>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
              <Clock className="mx-auto mb-2 h-4 w-4 text-blue-400" />
              <p className="text-lg font-black text-white">{formatTime(totalTime)}</p>
              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                Tempo
              </p>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
              <Flame className="mx-auto mb-2 h-4 w-4 text-yellow-400" />
              <p className="text-lg font-black text-white">{streak}</p>
              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                Sequência
              </p>
            </div>
          </div>
        </motion.section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-6 w-6 text-emerald-400" />
            <p className="text-2xl font-black text-white">{weekWorkouts}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
              Esta semana
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4 text-center">
            <TrendingUp className="mx-auto mb-3 h-6 w-6 text-[#ff2a32]" />
            <p className="text-2xl font-black text-white">{formatTime(averageTime)}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
              Média treino
            </p>
          </div>
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                Biometria
              </p>

              <h2 className="mt-1 text-xl font-black text-white">Medidas corporais</h2>
            </div>

            <Ruler className="h-5 w-5 text-[#ff2a32]" />
          </div>

          {latestMetric ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <Scale className="mb-3 h-5 w-5 text-[#ff2a32]" />
                  <p className="text-2xl font-black text-white">
                    {formatNumber(latestMetric.weight, 'kg')}
                  </p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
                    Peso
                  </p>

                  {weightDiff !== null && (
                    <p
                      className={cn(
                        'mt-2 text-[11px] font-black',
                        weightDiff > 0
                          ? 'text-yellow-400'
                          : weightDiff < 0
                            ? 'text-emerald-400'
                            : 'text-zinc-500'
                      )}
                    >
                      {weightDiff > 0 ? '+' : ''}
                      {String(weightDiff).replace('.', ',')}kg
                    </p>
                  )}
                </div>

                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <Activity className="mb-3 h-5 w-5 text-emerald-400" />
                  <p className="text-2xl font-black text-white">
                    {formatNumber(latestMetric.body_fat, '%')}
                  </p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
                    Gordura
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <p className="text-lg font-black text-white">
                    {formatNumber(latestMetric.muscle_mass, 'kg')}
                  </p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
                    Massa muscular
                  </p>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <p className="text-lg font-black text-white">
                    {latestMetric.date ? formatDate(latestMetric.date) : '—'}
                  </p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
                    Última avaliação
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-6 text-center">
              <Scale className="mx-auto h-10 w-10 text-zinc-700" />
              <h3 className="mt-4 text-lg font-black text-white">Sem avaliação ainda</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Quando seu personal registrar suas medidas, elas aparecerão aqui.
              </p>
            </div>
          )}
        </section>

        {weightMetrics.length > 1 && (
          <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                  Evolução
                </p>

                <h2 className="mt-1 text-xl font-black text-white">Peso corporal</h2>
              </div>

              <BarChart3 className="h-5 w-5 text-[#ff2a32]" />
            </div>

            <div className="flex h-36 items-end gap-2">
              {weightMetrics.map((metric, index) => {
                const weight = getMetricWeight(metric) || 0;
                const heightPct = maxWeight > 0 ? Math.max((weight / maxWeight) * 100, 12) : 12;

                return (
                  <div key={metric.id || index} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-[10px] font-black text-zinc-500">
                      {String(weight).replace('.', ',')}kg
                    </span>

                    <div className="relative h-24 w-full overflow-hidden rounded-t-xl bg-white/[0.06]">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.5, delay: index * 0.08 }}
                        className="absolute bottom-0 left-0 right-0 rounded-t-xl bg-[#ff2a32]"
                      />
                    </div>

                    <span className="text-[9px] font-bold text-zinc-600">
                      {metric.date ? formatDate(metric.date).slice(0, 5) : '--'}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                Histórico
              </p>

              <h2 className="mt-1 text-xl font-black text-white">Treinos concluídos</h2>
            </div>

            <Trophy className="h-5 w-5 text-yellow-400" />
          </div>

          {completedLogs.length > 0 ? (
            <div className="space-y-2">
              {completedLogs.slice(0, 10).map((log) => {
                const exercises = normalizeExercises(log.exercises_data);
                const exCount = exercises.length;

                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/20 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff2a32]/10 text-[#ff2a32]">
                        <Dumbbell className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {formatDate(getLogDate(log))}
                        </p>

                        <p className="mt-0.5 text-xs text-zinc-500">
                          {exCount} exercício{exCount === 1 ? '' : 's'}
                          {log.duration_seconds ? ` • ${formatTime(log.duration_seconds)}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      FEITO
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-6 text-center">
              <BarChart3 className="mx-auto h-10 w-10 text-zinc-700" />
              <h3 className="mt-4 text-lg font-black text-white">Sem treinos concluídos</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Finalize um treino para começar seu histórico.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default StudentProgressPage;