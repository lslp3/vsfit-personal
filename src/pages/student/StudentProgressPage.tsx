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
  Image as ImageIcon,
  Loader2,
  RefreshCcw,
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
  photos: any[];
};

const TEXT = {
  areaAluno: '\u00c1rea do aluno',
  progresso: 'Progresso',
  acompanheEvolucao: 'acompanhe sua evolu\u00e7\u00e3o.',

  carregandoProgresso: 'Carregando progresso...',
  buscandoEvolucao: 'Buscando sua evolu\u00e7\u00e3o.',

  naoFoiPossivelCarregar: 'N\u00e3o foi poss\u00edvel carregar',
  perfilNaoEncontrado: 'Perfil do aluno n\u00e3o encontrado.',
  sessaoNaoEncontrada:
    'Sess\u00e3o do aluno n\u00e3o encontrada. Fa\u00e7a login novamente.',
  erroCarregarProgresso: 'Erro ao carregar progresso.',
  tentarNovamente: 'TENTAR NOVAMENTE',

  treinos: 'Treinos',
  tempo: 'Tempo',
  sequencia: 'Sequ\u00eancia',
  estaSemana: 'Esta semana',
  mediaTreino: 'M\u00e9dia treino',

  biometria: 'Biometria',
  medidasCorporais: 'Medidas corporais',
  peso: 'Peso',
  gordura: 'Gordura',
  altura: 'Altura',
  massaMuscular: 'Massa muscular',
  ultimaAvaliacao: '\u00daltima avalia\u00e7\u00e3o',

  semAvaliacao: 'Sem avalia\u00e7\u00e3o ainda',
  semAvaliacaoDescricao:
    'Quando seu personal registrar suas medidas, elas aparecer\u00e3o aqui.',

  evolucao: 'Evolu\u00e7\u00e3o',
  pesoCorporal: 'Peso corporal',
  graficoPreparacao: 'Gr\u00e1fico em prepara\u00e7\u00e3o',
  graficoDescricao:
    'O gr\u00e1fico aparece quando existirem pelo menos duas avalia\u00e7\u00f5es corporais.',

  fotos: 'Fotos',
  evolucaoVisual: 'Evolu\u00e7\u00e3o visual',
  semFotos: 'Sem fotos ainda',
  semFotosDescricao:
    'Quando seu personal registrar fotos de evolu\u00e7\u00e3o, elas aparecer\u00e3o aqui.',
  semData: 'Sem data',

  historico: 'Hist\u00f3rico',
  treinosConcluidos: 'Treinos conclu\u00eddos',
  treinoConcluido: 'Treino conclu\u00eddo',
  semTreinos: 'Sem treinos conclu\u00eddos',
  semTreinosDescricao:
    'Finalize um treino para come\u00e7ar seu hist\u00f3rico.',
  feito: 'FEITO',
};

const DAY_NAMES: Record<string, string> = {
  dom: 'Domingo',
  seg: 'Segunda-feira',
  ter: 'Terça-feira',
  qua: 'Quarta-feira',
  qui: 'Quinta-feira',
  sex: 'Sexta-feira',
  sab: 'Sábado',
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

function getDateValue(item: any) {
  return (
    item?.date ||
    item?.completed_at ||
    item?.completedAt ||
    item?.created_at ||
    item?.createdAt ||
    ''
  );
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

function safeDate(value: any) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isFinite(date.getTime()) ? date : null;
}

function sortByDateDesc(items: any[]) {
  return [...items].sort((a, b) => {
    const dateA = safeDate(getDateValue(a))?.getTime() || 0;
    const dateB = safeDate(getDateValue(b))?.getTime() || 0;

    return dateB - dateA;
  });
}

function sortByDateAsc(items: any[]) {
  return [...items].sort((a, b) => {
    const dateA = safeDate(getDateValue(a))?.getTime() || 0;
    const dateB = safeDate(getDateValue(b))?.getTime() || 0;

    return dateA - dateB;
  });
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
    const date = safeDate(getLogDate(log));

    return Boolean(date && date >= start);
  }).length;
}

function calculateStreak(logs: any[]) {
  const uniqueDates = [
    ...new Set(
      logs
        .map((log) => {
          const date = safeDate(getLogDate(log));

          if (!date) return '';

          return date.toISOString().slice(0, 10);
        })
        .filter(Boolean)
    ),
  ].sort();

  if (uniqueDates.length === 0) return 0;

  let streak = 1;

  for (let index = uniqueDates.length - 1; index > 0; index--) {
    const current = new Date(`${uniqueDates[index]}T00:00:00`);
    const previous = new Date(`${uniqueDates[index - 1]}T00:00:00`);

    const diffDays = Math.round(
      (current.getTime() - previous.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function parseNumber(value: any) {
  if (value === null || value === undefined || value === '') return null;

  const parsed = Number(String(value).replace(',', '.'));

  return Number.isFinite(parsed) ? parsed : null;
}

function getMetricWeight(metric: any) {
  return parseNumber(metric?.weight || metric?.peso);
}

function getMetricHeight(metric: any) {
  return parseNumber(metric?.height || metric?.altura);
}

function getMetricBodyFat(metric: any) {
  return parseNumber(
    metric?.body_fat ||
      metric?.bodyFat ||
      metric?.gordura
  );
}

function getMetricMuscleMass(metric: any) {
  return parseNumber(
    metric?.muscle_mass ||
      metric?.muscleMass ||
      metric?.massa_muscular ||
      metric?.lean_mass
  );
}

function getLatestMetric(metrics: any[]) {
  return sortByDateDesc(metrics)[0] || null;
}

function getPreviousMetric(metrics: any[]) {
  return sortByDateDesc(metrics)[1] || null;
}

function formatNumber(value: any, suffix = '') {
  const parsed = parseNumber(value);

  if (parsed === null) return '--';

  return `${parsed.toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
  })}${suffix}`;
}

function formatHeight(value: any) {
  const parsed = parseNumber(value);

  if (parsed === null) return '--';

  const heightInCm =
    parsed > 0 && parsed <= 3 ? parsed * 100 : parsed;

  return `${heightInCm.toLocaleString('pt-BR', {
    maximumFractionDigits: 0,
  })}cm`;
}

function getWorkoutTitle(log: any) {
  return (
    log?.workout_name ||
    log?.workoutName ||
    log?.plan_name ||
    log?.planName ||
    log?.workout_plan?.name ||
    log?.workout_plan?.title ||
    TEXT.treinoConcluido
  );
}

function getWorkoutDayName(log: any): string {
  const exercises = normalizeExercises(log?.exercises_data);
  const dayKey = exercises[0]?.day_key;
  if (dayKey && DAY_NAMES[dayKey]) {
    return DAY_NAMES[dayKey];
  }
  return getWorkoutTitle(log);
}

function getPhotoUrl(photo: any) {
  return String(
    photo?.photo_url ||
      photo?.photoUrl ||
      photo?.image_url ||
      photo?.imageUrl ||
      photo?.url ||
      ''
  );
}

function getPhotoType(photo: any) {
  const type = String(
    photo?.position ||
      photo?.photo_type ||
      photo?.photoType ||
      photo?.type ||
      photo?.category ||
      TEXT.evolucao
  );

  const normalized = type.toLowerCase();

  if (
    normalized.includes('front') ||
    normalized.includes('frente')
  ) {
    return 'Frente';
  }

  if (
    normalized.includes('side') ||
    normalized.includes('lateral') ||
    normalized.includes('lado')
  ) {
    return 'Lateral';
  }

  if (
    normalized.includes('back') ||
    normalized.includes('costas')
  ) {
    return 'Costas';
  }

  return type.charAt(0).toUpperCase() + type.slice(1);
}

function getExerciseText(count: number) {
  return `${count} exerc\u00edcio${count === 1 ? '' : 's'}`;
}

async function loadStudentMetrics(studentId: string) {
  const attempts = [
    () =>
      supabase
        .from('student_metrics')
        .select('*')
        .eq('student_id', studentId),

    () =>
      supabase
        .from('biometric_history')
        .select('*')
        .eq('student_id', studentId),

    () =>
      supabase
        .from('biometric_history')
        .select('*')
        .eq('studentid', studentId),
  ];

  for (const attempt of attempts) {
    try {
      const { data, error } = await attempt();

      if (!error && Array.isArray(data)) {
        return sortByDateAsc(data);
      }
    } catch (error) {
      console.warn(
        '[StudentProgressPage] metrics attempt error:',
        error
      );
    }
  }

  return [];
}

async function loadProgressPhotos(studentId: string) {
  try {
    const { data, error } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn(
        '[StudentProgressPage] progress_photos error:',
        error
      );

      return [];
    }

    return sortByDateDesc(data || []).filter((photo) =>
      Boolean(getPhotoUrl(photo))
    );
  } catch (error) {
    console.warn(
      '[StudentProgressPage] progress_photos exception:',
      error
    );

    return [];
  }
}

export function StudentProgressPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState<StudentProgressState>({
    student: null,
    logs: [],
    metrics: [],
    photos: [],
  });

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      const authUser = authData.user;

      if (!authUser?.id) {
        setError(TEXT.sessaoNaoEncontrada);
        return;
      }

      const accountResult =
        await studentService.getStudentAccountByAuthUser(
          authUser.id
        );

      let studentData = accountResult?.student || null;

      if (!studentData) {
        studentData =
          await studentService.getStudentByAuthUser(
            authUser.id
          );
      }

      if (!studentData?.id) {
        setError(TEXT.perfilNaoEncontrado);
        return;
      }

      const [logsResult, metricsResult, photosResult] =
        await Promise.allSettled([
          getWorkoutLogsByStudent(studentData.id),
          loadStudentMetrics(studentData.id),
          loadProgressPhotos(studentData.id),
        ]);

      const logs =
        logsResult.status === 'fulfilled' &&
        Array.isArray(logsResult.value)
          ? logsResult.value
          : [];

      const metrics =
        metricsResult.status === 'fulfilled' &&
        Array.isArray(metricsResult.value)
          ? metricsResult.value
          : [];

      const photos =
        photosResult.status === 'fulfilled' &&
        Array.isArray(photosResult.value)
          ? photosResult.value
          : [];

      setData({
        student: studentData,
        logs,
        metrics,
        photos,
      });
    } catch (loadError: any) {
      console.error(
        '[StudentProgressPage] loadData error:',
        loadError
      );

      setError(
        loadError?.message || TEXT.erroCarregarProgresso
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
  }

  const completedLogs = useMemo(() => {
    return data.logs
      .filter(isCompletedLog)
      .sort((a, b) => {
        const dateA =
          safeDate(getLogDate(a))?.getTime() || 0;

        const dateB =
          safeDate(getLogDate(b))?.getTime() || 0;

        return dateB - dateA;
      });
  }, [data.logs]);

  const totalWorkouts = completedLogs.length;

  const totalTime = useMemo(() => {
    return completedLogs.reduce(
      (sum, log) =>
        sum + Number(log?.duration_seconds || 0),
      0
    );
  }, [completedLogs]);

  const averageTime =
    totalWorkouts > 0
      ? Math.round(totalTime / totalWorkouts)
      : 0;

  const weekWorkouts = useMemo(
    () => calculateCompletedThisWeek(completedLogs),
    [completedLogs]
  );

  const streak = useMemo(
    () => calculateStreak(completedLogs),
    [completedLogs]
  );

  const latestMetric = useMemo(
    () => getLatestMetric(data.metrics),
    [data.metrics]
  );

  const previousMetric = useMemo(
    () => getPreviousMetric(data.metrics),
    [data.metrics]
  );

  const latestWeight = getMetricWeight(latestMetric);
  const previousWeight = getMetricWeight(previousMetric);

  const latestHeight = getMetricHeight(latestMetric);
  const latestBodyFat = getMetricBodyFat(latestMetric);
  const previousBodyFat = getMetricBodyFat(previousMetric);
  const latestMuscleMass =
    getMetricMuscleMass(latestMetric);

  const weightDiff =
    latestWeight !== null && previousWeight !== null
      ? Number(
          (latestWeight - previousWeight).toFixed(1)
        )
      : null;

  const bodyFatDiff =
    latestBodyFat !== null && previousBodyFat !== null
      ? Number(
          (latestBodyFat - previousBodyFat).toFixed(1)
        )
      : null;

  const weightMetrics = useMemo(() => {
    return sortByDateAsc(data.metrics)
      .filter(
        (metric) => getMetricWeight(metric) !== null
      )
      .slice(-6);
  }, [data.metrics]);

  const maxWeight = useMemo(() => {
    const values = weightMetrics
      .map((metric) => getMetricWeight(metric))
      .filter(
        (value): value is number => value !== null
      );

    return values.length > 0 ? Math.max(...values) : 0;
  }, [weightMetrics]);

  const minWeight = useMemo(() => {
    const values = weightMetrics
      .map((metric) => getMetricWeight(metric))
      .filter(
        (value): value is number => value !== null
      );

    return values.length > 0 ? Math.min(...values) : 0;
  }, [weightMetrics]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15 shadow-[0_18px_45px_rgba(255,42,48,0.22)]">
            <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
          </div>

          <div>
            <p className="text-sm font-black text-white">
              {TEXT.carregandoProgresso}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              {TEXT.buscandoEvolucao}
            </p>
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

          <h1 className="mt-5 text-xl font-black text-white">
            {TEXT.naoFoiPossivelCarregar}
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-red-200/80">
            {error || TEXT.perfilNaoEncontrado}
          </p>

          <button
            type="button"
            onClick={loadData}
            className="mt-6 h-12 w-full rounded-2xl bg-[#ff2a32] text-sm font-black text-white"
          >
            {TEXT.tentarNovamente}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 pb-4 pt-4 text-white">
      <div className="mx-auto max-w-lg space-y-4">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
        >
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#ff2a32]/20 to-transparent" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-[#ff2a32]/20 bg-[#ff2a32]/15 text-lg font-black text-[#ff2a32]">
              {getStudentInitials(
                getStudentName(data.student)
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                {TEXT.areaAluno}
              </p>

              <h1 className="mt-1 text-[20px] font-black uppercase italic tracking-[-0.05em] text-white">
                {TEXT.progresso}
              </h1>

              <p className="mt-1 truncate text-[12px] font-medium text-zinc-500">
                {getFirstName(data.student)},{' '}
                {TEXT.acompanheEvolucao}
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white active:scale-95 disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#ff2a32]" />
              ) : (
                <RefreshCcw className="h-5 w-5 text-[#ff2a32]" />
              )}
            </button>
          </div>

          <div className="relative mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
              <Dumbbell className="mx-auto mb-2 h-4 w-4 text-[#ff2a32]" />

              <p className="text-lg font-black text-white">
                {totalWorkouts}
              </p>

              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                {TEXT.treinos}
              </p>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
              <Clock className="mx-auto mb-2 h-4 w-4 text-blue-400" />

              <p className="text-lg font-black text-white">
                {formatTime(totalTime)}
              </p>

              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                {TEXT.tempo}
              </p>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
              <Flame className="mx-auto mb-2 h-4 w-4 text-yellow-400" />

              <p className="text-lg font-black text-white">
                {streak}
              </p>

              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                {TEXT.sequencia}
              </p>
            </div>
          </div>
        </motion.section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-6 w-6 text-emerald-400" />

            <p className="text-xl font-black text-white">
              {weekWorkouts}
            </p>

            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
              {TEXT.estaSemana}
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4 text-center">
            <TrendingUp className="mx-auto mb-3 h-6 w-6 text-[#ff2a32]" />

            <p className="text-xl font-black text-white">
              {formatTime(averageTime)}
            </p>

            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
              {TEXT.mediaTreino}
            </p>
          </div>
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                {TEXT.biometria}
              </p>

              <h2 className="mt-1 text-lg font-black text-white">
                {TEXT.medidasCorporais}
              </h2>
            </div>

            <Ruler className="h-5 w-5 text-[#ff2a32]" />
          </div>

          {latestMetric ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <Scale className="mb-3 h-5 w-5 text-[#ff2a32]" />

                  <p className="text-xl font-black text-white">
                    {formatNumber(latestWeight, 'kg')}
                  </p>

                  <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
                    {TEXT.peso}
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

                  <p className="text-xl font-black text-white">
                    {formatNumber(latestBodyFat, '%')}
                  </p>

                  <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
                    {TEXT.gordura}
                  </p>

                  {bodyFatDiff !== null && (
                    <p
                      className={cn(
                        'mt-2 text-[11px] font-black',
                        bodyFatDiff > 0
                          ? 'text-yellow-400'
                          : bodyFatDiff < 0
                            ? 'text-emerald-400'
                            : 'text-zinc-500'
                      )}
                    >
                      {bodyFatDiff > 0 ? '+' : ''}
                      {String(bodyFatDiff).replace('.', ',')}%
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <p className="text-base font-black text-white">
                    {formatHeight(latestHeight)}
                  </p>

                  <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
                    {TEXT.altura}
                  </p>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <p className="text-base font-black text-white">
                    {formatNumber(latestMuscleMass, 'kg')}
                  </p>

                  <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
                    {TEXT.massaMuscular}
                  </p>
                </div>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <p className="text-base font-black text-white">
                  {getDateValue(latestMetric)
                    ? formatDate(
                        getDateValue(latestMetric)
                      )
                    : '--'}
                </p>

                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
                  {TEXT.ultimaAvaliacao}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-center">
              <Scale className="mx-auto h-10 w-10 text-zinc-700" />

              <h3 className="mt-4 text-lg font-black text-white">
                {TEXT.semAvaliacao}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {TEXT.semAvaliacaoDescricao}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                {TEXT.evolucao}
              </p>

              <h2 className="mt-1 text-lg font-black text-white">
                {TEXT.pesoCorporal}
              </h2>
            </div>

            <BarChart3 className="h-5 w-5 text-[#ff2a32]" />
          </div>

          {weightMetrics.length > 1 ? (
            <div className="flex h-40 items-end gap-2">
              {weightMetrics.map((metric, index) => {
                const weight =
                  getMetricWeight(metric) || 0;

                const range = Math.max(
                  maxWeight - minWeight,
                  1
                );

                const heightPct = Math.max(
                  ((weight - minWeight) / range) * 74 + 18,
                  18
                );

                return (
                  <div
                    key={metric.id || index}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <span className="text-[10px] font-black text-zinc-500">
                      {String(weight).replace('.', ',')}kg
                    </span>

                    <div className="relative h-24 w-full overflow-hidden rounded-t-xl bg-white/[0.06]">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{
                          height: `${heightPct}%`,
                        }}
                        transition={{
                          duration: 0.5,
                          delay: index * 0.08,
                        }}
                        className="absolute bottom-0 left-0 right-0 rounded-t-xl bg-[#ff2a32]"
                      />
                    </div>

                    <span className="text-[9px] font-bold text-zinc-600">
                      {getDateValue(metric)
                        ? formatDate(
                            getDateValue(metric)
                          ).slice(0, 5)
                        : '--'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-center">
              <BarChart3 className="mx-auto h-10 w-10 text-zinc-700" />

              <h3 className="mt-4 text-base font-black text-white">
                {TEXT.graficoPreparacao}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {TEXT.graficoDescricao}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                {TEXT.fotos}
              </p>

              <h2 className="mt-1 text-lg font-black text-white">
                {TEXT.evolucaoVisual}
              </h2>
            </div>

            <ImageIcon className="h-5 w-5 text-[#ff2a32]" />
          </div>

          {data.photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {data.photos
                .slice(0, 6)
                .map((photo, index) => (
                  <div
                    key={photo.id || index}
                    className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20"
                  >
                    <div className="aspect-[3/4] overflow-hidden bg-black">
                      <img
                        src={getPhotoUrl(photo)}
                        alt={getPhotoType(photo)}
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div className="p-3">
                      <p className="text-[12px] font-black text-white">
                        {getPhotoType(photo)}
                      </p>

                      <p className="mt-1 text-[10px] font-bold text-zinc-600">
                        {getDateValue(photo)
                          ? formatDate(
                              getDateValue(photo)
                            )
                          : TEXT.semData}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-center">
              <ImageIcon className="mx-auto h-10 w-10 text-zinc-700" />

              <h3 className="mt-4 text-base font-black text-white">
                {TEXT.semFotos}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {TEXT.semFotosDescricao}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                {TEXT.historico}
              </p>

              <h2 className="mt-1 text-lg font-black text-white">
                {TEXT.treinosConcluidos}
              </h2>
            </div>

            <Trophy className="h-5 w-5 text-yellow-400" />
          </div>

          {completedLogs.length > 0 ? (
            <div className="space-y-2">
              {completedLogs
                .slice(0, 10)
                .map((log, index) => {
                  const exercises =
                    normalizeExercises(
                      log.exercises_data
                    );

                  const exerciseCount =
                    exercises.length;

                  return (
                    <div
                      key={log.id || index}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/20 p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff2a32]/10 text-[#ff2a32]">
                          <Dumbbell className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">
                            {getWorkoutDayName(log)}
                          </p>

                          <p className="mt-0.5 text-xs text-zinc-500">
                            {getLogDate(log)
                              ? formatDate(
                                  getLogDate(log)
                                )
                              : TEXT.semData}

                            {exerciseCount > 0
                              ? ` • ${getExerciseText(
                                  exerciseCount
                                )}`
                              : ''}

                            {log.duration_seconds
                              ? ` • ${formatTime(
                                  log.duration_seconds
                                )}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {TEXT.feito}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-center">
              <BarChart3 className="mx-auto h-10 w-10 text-zinc-700" />

              <h3 className="mt-4 text-base font-black text-white">
                {TEXT.semTreinos}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {TEXT.semTreinosDescricao}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default StudentProgressPage;