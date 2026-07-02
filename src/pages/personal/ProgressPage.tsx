import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  Camera,
  Crown,
  Droplets,
  Dumbbell,
  ImagePlus,
  Info,
  Loader2,
  Lock,
  Percent,
  Ruler,
  Scale,
  Trash2,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Header } from '../../components/ui/Header';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { useStudentStore } from '../../store/studentStore';
import * as workoutService from '../../services/workoutService';
import * as subscriptionService from '../../services/subscriptionService';
import * as progressService from '../../services/progressService';
import { getPlanLimits, getFinancialLevel } from '../../lib/planLimits';
import type { WorkoutLog } from '../../types/database';
import { formatDate, timeAgo } from '../../lib/formatters';

interface StudentStats {
  studentId: string;
  studentName: string;
  totalWorkouts: number;
  completedWorkouts: number;
  lastWorkout: string | null;
  latestWeight: number | null;
  previousWeight: number | null;
  latestBodyFat: number | null;
  latestMuscleMass: number | null;
  latestWaterIntake: number | null;
  latestMetricDate: string | null;
  photosCount: number;
}

const monthLabels = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const photoPositionOptions: Array<{
  value: progressService.ProgressPhotoPosition;
  label: string;
}> = [
  { value: 'front', label: 'Frente' },
  { value: 'side', label: 'Lateral' },
  { value: 'back', label: 'Costas' },
];

function getDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function getTimestamp(value?: string | null) {
  return getDate(value)?.getTime() || 0;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function isCurrentMonth(value?: string | null) {
  const date = getDate(value);

  if (!date) return false;

  const now = new Date();

  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function isCurrentYear(value?: string | null) {
  const date = getDate(value);

  if (!date) return false;

  return date.getFullYear() === new Date().getFullYear();
}

function getMonthIndex(value?: string | null) {
  const date = getDate(value);

  if (!date) return -1;

  return date.getMonth();
}

function formatNumber(value?: number | null, suffix = '') {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return '--';
  }

  return `${Number(value).toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
  })}${suffix}`;
}

function weightDiff(current?: number | null, previous?: number | null) {
  if (current === null || current === undefined) return null;
  if (previous === null || previous === undefined) return null;

  return Number((current - previous).toFixed(1));
}

function getPhotoPositionLabel(position?: string | null) {
  const normalized = String(position || '').toLowerCase();

  if (normalized === 'front' || normalized === 'frente') {
    return 'Frente';
  }

  if (
    normalized === 'side' ||
    normalized === 'lateral' ||
    normalized === 'lado'
  ) {
    return 'Lateral';
  }

  if (normalized === 'back' || normalized === 'costas') {
    return 'Costas';
  }

  return position || 'Evolução';
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== 'string') {
        reject(new Error('Não foi possível ler a imagem.'));
        return;
      }

      resolve(result);
    };

    reader.onerror = () => {
      reject(new Error('Erro ao carregar a imagem.'));
    };

    reader.readAsDataURL(file);
  });
}

export function ProgressPage() {
  const { trainerProfile } = useAuthStore();
  const { students, fetchStudents } = useStudentStore();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [metrics, setMetrics] = useState<
    progressService.StudentMetricRecord[]
  >([]);
  const [photos, setPhotos] = useState<
    progressService.ProgressPhotoRecord[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planModalMessage, setPlanModalMessage] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [isPro, setIsPro] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedPhotoPosition, setSelectedPhotoPosition] =
    useState<progressService.ProgressPhotoPosition>('front');
  const [photoDate, setPhotoDate] = useState(getTodayDate());
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoReading, setPhotoReading] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoDeletingId, setPhotoDeletingId] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [photoSuccess, setPhotoSuccess] = useState('');

  useEffect(() => {
    if (!trainerProfile?.id) return;

    void fetchStudents(trainerProfile.id);
    void loadData();
  }, [trainerProfile?.id, fetchStudents]);

  useEffect(() => {
    if (students.length === 0) {
      setSelectedStudentId('');
      return;
    }

    const selectedStillExists = students.some(
      (student: any) => student.id === selectedStudentId
    );

    if (!selectedStillExists) {
      const firstActiveStudent =
        students.find((student: any) => student.status === 'active') ||
        students[0];

      setSelectedStudentId(firstActiveStudent?.id || '');
    }
  }, [students, selectedStudentId]);

  useEffect(() => {
    setPhotoPreview('');
    setPhotoError('');
    setPhotoSuccess('');
  }, [selectedStudentId, selectedPhotoPosition, photoDate]);

  async function loadData() {
    if (!trainerProfile?.id) return;

    setLoading(true);
    setShowPlanModal(false);

    try {
      const currentPlanSlug =
        await subscriptionService.getCurrentPlanSlug(trainerProfile.id);

      const planLimits = getPlanLimits(currentPlanSlug);
      const level = getFinancialLevel(currentPlanSlug);

      const premiumAccess =
        currentPlanSlug === 'premium' || planLimits.advancedProgress;

      const proAccess =
        currentPlanSlug === 'pro' ||
        currentPlanSlug === 'premium' ||
        level === 'basic' ||
        premiumAccess;

      setIsPremium(premiumAccess);
      setIsPro(proAccess);

      if (!proAccess && !premiumAccess) {
        setPlanModalMessage(
          'Progresso e biometria estão bloqueados no plano Free. Assine o plano Pro ou Premium para acompanhar a evolução dos alunos.'
        );

        setShowPlanModal(true);
        return;
      }

      const [logsData, metricsData, photosData] = await Promise.all([
        workoutService
          .getWorkoutLogsByTrainer(trainerProfile.id)
          .catch(() => []),

        progressService
          .getStudentMetricsByTrainer(trainerProfile.id)
          .catch(() => []),

        premiumAccess
          ? progressService
              .getProgressPhotosByTrainer(trainerProfile.id)
              .catch(() => [])
          : Promise.resolve([]),
      ]);

      setLogs(logsData || []);
      setMetrics(metricsData || []);
      setPhotos(photosData || []);
    } catch (error) {
      console.error('[ProgressPage] loadData error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    event.target.value = '';

    setPhotoError('');
    setPhotoSuccess('');

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Selecione um arquivo de imagem válido.');
      return;
    }

    const maxFileSize = 8 * 1024 * 1024;

    if (file.size > maxFileSize) {
      setPhotoError('A imagem deve ter no máximo 8 MB.');
      return;
    }

    setPhotoReading(true);

    try {
      const dataUrl = await readFileAsDataUrl(file);

      setPhotoPreview(dataUrl);
    } catch (error: any) {
      console.error('[ProgressPage] read photo error:', error);
      setPhotoError(error?.message || 'Não foi possível carregar a foto.');
    } finally {
      setPhotoReading(false);
    }
  }

  async function handleSavePhoto() {
    setPhotoError('');
    setPhotoSuccess('');

    if (!isPremium) {
      setPhotoError('O envio de fotos está disponível no plano Premium.');
      return;
    }

    if (!selectedStudentId) {
      setPhotoError('Selecione um aluno.');
      return;
    }

    if (!photoPreview) {
      setPhotoError('Selecione uma foto antes de salvar.');
      return;
    }

    if (!photoDate) {
      setPhotoError('Informe a data da foto.');
      return;
    }

    setPhotoSaving(true);

    try {
      const savedPhoto = await progressService.saveProgressPhoto({
        studentId: selectedStudentId,
        photoUrl: photoPreview,
        position: selectedPhotoPosition,
        date: photoDate,
      });

      setPhotos((currentPhotos) => [
        savedPhoto,
        ...currentPhotos.filter(
          (photo) =>
            !(
              photo.student_id === savedPhoto.student_id &&
              photo.position === savedPhoto.position &&
              photo.date === savedPhoto.date
            )
        ),
      ]);

      setPhotoPreview('');

      setPhotoSuccess(
        `Foto de ${getPhotoPositionLabel(
          selectedPhotoPosition
        ).toLowerCase()} salva com sucesso.`
      );
    } catch (error: any) {
      console.error('[ProgressPage] save photo error:', error);

      setPhotoError(
        error?.message || 'Não foi possível salvar a foto de evolução.'
      );
    } finally {
      setPhotoSaving(false);
    }
  }

  async function handleDeletePhoto(
    photo: progressService.ProgressPhotoRecord
  ) {
    const confirmed = window.confirm(
      `Deseja excluir esta foto de ${getPhotoPositionLabel(
        photo.position
      ).toLowerCase()}?`
    );

    if (!confirmed) return;

    setPhotoError('');
    setPhotoSuccess('');
    setPhotoDeletingId(photo.id);

    try {
      await progressService.deleteProgressPhoto(photo.id);

      setPhotos((currentPhotos) =>
        currentPhotos.filter((item) => item.id !== photo.id)
      );

      setPhotoSuccess('Foto removida com sucesso.');
    } catch (error: any) {
      console.error('[ProgressPage] delete photo error:', error);

      setPhotoError(
        error?.message || 'Não foi possível remover a foto.'
      );
    } finally {
      setPhotoDeletingId(null);
    }
  }

  const selectedStudent = useMemo(() => {
    return (
      students.find((student: any) => student.id === selectedStudentId) ||
      null
    );
  }, [students, selectedStudentId]);

  const selectedStudentPhotos = useMemo(() => {
    return photos
      .filter((photo) => photo.student_id === selectedStudentId)
      .sort((photoA, photoB) => {
        const dateA = photoA.date || photoA.created_at;
        const dateB = photoB.date || photoB.created_at;

        return getTimestamp(dateB) - getTimestamp(dateA);
      });
  }, [photos, selectedStudentId]);

  const activeStudents = students.filter(
    (student: any) => student.status === 'active'
  ).length;

  const completedWorkouts = logs.filter(
    (log) => log.status === 'completed' || Boolean(log.completed_at)
  );

  const totalWorkouts = logs.length;
  const totalCompletedWorkouts = completedWorkouts.length;

  const completionRate =
    totalWorkouts > 0
      ? Math.round((totalCompletedWorkouts / totalWorkouts) * 100)
      : 0;

  const uniqueStudentsWithLogs = new Set(
    logs.map((log) => log.student_id).filter(Boolean)
  ).size;

  const metricsThisMonth = metrics.filter((metric) =>
    isCurrentMonth(metric.date || metric.created_at)
  ).length;

  const photosThisMonth = photos.filter((photo) =>
    isCurrentMonth(photo.date || photo.created_at)
  ).length;

  const latestMetricsByStudent = new Map<
    string,
    progressService.StudentMetricRecord[]
  >();

  metrics.forEach((metric) => {
    if (!latestMetricsByStudent.has(metric.student_id)) {
      latestMetricsByStudent.set(metric.student_id, []);
    }

    latestMetricsByStudent.get(metric.student_id)?.push(metric);
  });

  latestMetricsByStudent.forEach((studentMetrics) => {
    studentMetrics.sort((metricA, metricB) => {
      const dateA = metricA.date || metricA.created_at;
      const dateB = metricB.date || metricB.created_at;

      return getTimestamp(dateB) - getTimestamp(dateA);
    });
  });

  const photosByStudent = new Map<string, number>();

  photos.forEach((photo) => {
    const current = photosByStudent.get(photo.student_id) || 0;

    photosByStudent.set(photo.student_id, current + 1);
  });

  const studentStats: StudentStats[] = students
    .map((student: any) => {
      const studentLogs = logs
        .filter((log) => log.student_id === student.id)
        .sort((logA, logB) => {
          const dateA = logA.completed_at || logA.created_at;
          const dateB = logB.completed_at || logB.created_at;

          return getTimestamp(dateB) - getTimestamp(dateA);
        });

      const studentCompletedLogs = studentLogs.filter(
        (log) =>
          log.status === 'completed' || Boolean(log.completed_at)
      );

      const studentMetrics =
        latestMetricsByStudent.get(student.id) || [];

      const latestMetric = studentMetrics[0] || null;
      const previousMetric = studentMetrics[1] || null;

      return {
        studentId: student.id,
        studentName: student.name,
        totalWorkouts: studentLogs.length,
        completedWorkouts: studentCompletedLogs.length,
        lastWorkout:
          studentLogs[0]?.completed_at ||
          studentLogs[0]?.created_at ||
          null,
        latestWeight: latestMetric?.weight ?? null,
        previousWeight: previousMetric?.weight ?? null,
        latestBodyFat: latestMetric?.body_fat ?? null,
        latestMuscleMass: latestMetric?.muscle_mass ?? null,
        latestWaterIntake: latestMetric?.water_intake ?? null,
        latestMetricDate:
          latestMetric?.date || latestMetric?.created_at || null,
        photosCount: photosByStudent.get(student.id) || 0,
      };
    })
    .filter(
      (student) =>
        student.totalWorkouts > 0 ||
        student.latestWeight !== null ||
        student.latestBodyFat !== null ||
        student.latestMuscleMass !== null ||
        student.photosCount > 0
    )
    .sort((studentA, studentB) => {
      const scoreA =
        studentA.completedWorkouts +
        (studentA.latestWeight !== null ? 2 : 0) +
        studentA.photosCount;

      const scoreB =
        studentB.completedWorkouts +
        (studentB.latestWeight !== null ? 2 : 0) +
        studentB.photosCount;

      return scoreB - scoreA;
    });

  const workoutsByMonth = monthLabels.map((month, index) => ({
    month,
    value: completedWorkouts.filter((log) => {
      const dateValue = log.completed_at || log.created_at;

      return (
        isCurrentYear(dateValue) &&
        getMonthIndex(dateValue) === index
      );
    }).length,
  }));

  const metricsByMonth = monthLabels.map((month, index) => ({
    month,
    value: metrics.filter((metric) => {
      const dateValue = metric.date || metric.created_at;

      return (
        isCurrentYear(dateValue) &&
        getMonthIndex(dateValue) === index
      );
    }).length,
  }));

  const maxWorkoutsByMonth = Math.max(
    ...workoutsByMonth.map((item) => item.value),
    1
  );

  const maxMetricsByMonth = Math.max(
    ...metricsByMonth.map((item) => item.value),
    1
  );

  const topStudents = [...studentStats].slice(0, 5);

  const validWeightMetrics = metrics.filter(
    (metric) =>
      metric.weight !== null &&
      metric.weight !== undefined &&
      Number.isFinite(Number(metric.weight))
  );

  const safeAverageWeight =
    validWeightMetrics.length > 0
      ? validWeightMetrics.reduce(
          (sum, metric) => sum + Number(metric.weight),
          0
        ) / validWeightMetrics.length
      : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#ff2a32]" />

          <p className="text-sm font-medium text-zinc-400">
            Carregando progresso...
          </p>
        </div>
      </div>
    );
  }

  if (showPlanModal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
        <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#080808] p-8 text-center shadow-[0_24px_90px_rgba(0,0,0,0.85)]">
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-yellow-500/20 to-transparent" />

          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-yellow-500/15 text-yellow-400">
            <Info className="h-10 w-10" />
          </div>

          <h2 className="relative text-xl font-black uppercase italic tracking-tight text-white">
            Acesso bloqueado
          </h2>

          <p className="relative mt-2 text-[13px] leading-relaxed text-zinc-400">
            {planModalMessage}
          </p>

          <div className="relative mt-8 flex gap-3">
            <button
              type="button"
              onClick={() => setShowPlanModal(false)}
              className="flex-1 rounded-[18px] border border-white/10 bg-white/[0.06] px-4 py-4 text-[13px] font-black text-white"
            >
              FECHAR
            </button>

            <button
              type="button"
              onClick={() => {
                setShowPlanModal(false);
                navigate('/personal/subscription');
              }}
              className="flex-1 rounded-[18px] bg-[#ff2a32] px-4 py-4 text-[13px] font-black text-white"
            >
              VER PLANOS
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasAnyData =
    students.length > 0 ||
    logs.length > 0 ||
    metrics.length > 0 ||
    photos.length > 0;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header title="Progresso" showBack />

      <div className="mx-auto max-w-lg space-y-5 px-4 pb-32 pt-5">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.55)]">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#ff2a32]/20 to-transparent" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                Progresso & biometria
              </p>

              <h1 className="mt-1 text-2xl font-black uppercase italic tracking-tight text-white">
                Evolução dos alunos
              </h1>

              <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">
                Acompanhe treinos, medidas corporais, biometria e
                evolução visual.
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white">
              {isPremium ? (
                <Crown className="h-5 w-5 text-yellow-400" />
              ) : (
                <Activity className="h-5 w-5 text-[#ff2a32]" />
              )}
            </div>
          </div>
        </div>

        <div
          id="photo-progress-manager"
          className="rounded-[30px] border border-white/10 bg-white/[0.045] p-5"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                Evolução visual
              </p>

              <h2 className="mt-1 text-xl font-black text-white">
                Fotos do aluno
              </h2>

              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                Registre fotos de frente, lateral e costas.
              </p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff2a32]/10 text-[#ff2a32]">
              <Camera className="h-5 w-5" />
            </div>
          </div>

          {!isPremium ? (
            <div className="rounded-[24px] border border-yellow-500/20 bg-yellow-500/10 p-5 text-center">
              <Lock className="mx-auto h-8 w-8 text-yellow-400" />

              <h3 className="mt-3 text-base font-black text-white">
                Recurso Premium
              </h3>

              <p className="mt-2 text-[12px] leading-relaxed text-yellow-100/70">
                O envio e o histórico de fotos de evolução estão
                disponíveis no plano Premium.
              </p>

              <button
                type="button"
                onClick={() => navigate('/personal/subscription')}
                className="mt-5 h-12 w-full rounded-2xl bg-yellow-500 text-[12px] font-black text-black"
              >
                VER PLANO PREMIUM
              </button>
            </div>
          ) : students.length === 0 ? (
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-center">
              <Users className="mx-auto h-9 w-9 text-zinc-700" />

              <p className="mt-3 text-sm font-black text-white">
                Nenhum aluno cadastrado
              </p>

              <p className="mt-1 text-[11px] text-zinc-500">
                Cadastre um aluno para adicionar fotos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
                  Aluno
                </label>

                <select
                  value={selectedStudentId}
                  onChange={(event) =>
                    setSelectedStudentId(event.target.value)
                  }
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#101010] px-4 text-[13px] font-bold text-white outline-none"
                >
                  {students.map((student: any) => (
                    <option
                      key={student.id}
                      value={student.id}
                      className="bg-[#101010]"
                    >
                      {student.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
                  Posição
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {photoPositionOptions.map((option) => {
                    const selected =
                      selectedPhotoPosition === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setSelectedPhotoPosition(option.value)
                        }
                        className={
                          selected
                            ? 'h-11 rounded-2xl border border-[#ff2a32] bg-[#ff2a32] text-[11px] font-black text-white'
                            : 'h-11 rounded-2xl border border-white/10 bg-black/20 text-[11px] font-black text-zinc-400'
                        }
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-wide text-zinc-500">
                  Data da foto
                </label>

                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    type="date"
                    value={photoDate}
                    onChange={(event) =>
                      setPhotoDate(event.target.value)
                    }
                    className="h-12 w-full rounded-2xl border border-white/10 bg-[#101010] pl-11 pr-4 text-[13px] font-bold text-white outline-none"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-[26px] border border-dashed border-white/15 bg-black/20">
                {photoPreview ? (
                  <div>
                    <div className="flex aspect-[3/4] max-h-[420px] items-center justify-center bg-black">
                      <img
                        src={photoPreview}
                        alt="Prévia da evolução"
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div className="border-t border-white/10 p-3 text-center">
                      <p className="text-[11px] font-black text-white">
                        Prévia —{' '}
                        {getPhotoPositionLabel(
                          selectedPhotoPosition
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="progress-photo-file"
                    className="flex min-h-48 cursor-pointer flex-col items-center justify-center p-6 text-center"
                  >
                    {photoReading ? (
                      <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
                    ) : (
                      <ImagePlus className="h-10 w-10 text-zinc-700" />
                    )}

                    <p className="mt-4 text-sm font-black text-white">
                      Selecionar foto
                    </p>

                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                      JPG, PNG ou WEBP com até 8 MB
                    </p>
                  </label>
                )}

                <input
                  id="progress-photo-file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />
              </div>

              {photoPreview && (
                <label
                  htmlFor="progress-photo-file"
                  className="flex h-11 cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-[11px] font-black text-white"
                >
                  TROCAR IMAGEM
                </label>
              )}

              {photoError && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3">
                  <p className="text-[11px] font-bold text-red-300">
                    {photoError}
                  </p>
                </div>
              )}

              {photoSuccess && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <p className="text-[11px] font-bold text-emerald-300">
                    {photoSuccess}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={
                  photoSaving ||
                  photoReading ||
                  !photoPreview ||
                  !selectedStudentId
                }
                className="flex h-13 min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#ff2a32] px-4 py-4 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {photoSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    SALVANDO...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    SALVAR FOTO
                  </>
                )}
              </button>

              <div className="border-t border-white/10 pt-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
                      Histórico
                    </p>

                    <h3 className="text-base font-black text-white">
                      {selectedStudent?.name || 'Aluno'}
                    </h3>
                  </div>

                  <span className="rounded-full bg-[#ff2a32]/10 px-3 py-1 text-[10px] font-black text-[#ff2a32]">
                    {selectedStudentPhotos.length}{' '}
                    {selectedStudentPhotos.length === 1
                      ? 'FOTO'
                      : 'FOTOS'}
                  </span>
                </div>

                {selectedStudentPhotos.length === 0 ? (
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-5 text-center">
                    <Camera className="mx-auto h-8 w-8 text-zinc-700" />

                    <p className="mt-3 text-[12px] font-black text-white">
                      Nenhuma foto registrada
                    </p>

                    <p className="mt-1 text-[11px] text-zinc-500">
                      A primeira foto aparecerá aqui.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedStudentPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="overflow-hidden rounded-[22px] border border-white/10 bg-black/20"
                      >
                        <div className="flex aspect-[3/4] items-center justify-center overflow-hidden bg-black">
                          <img
                            src={photo.photo_url}
                            alt={getPhotoPositionLabel(
                              photo.position
                            )}
                            className="h-full w-full object-contain"
                          />
                        </div>

                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-black text-white">
                                {getPhotoPositionLabel(
                                  photo.position
                                )}
                              </p>

                              <p className="mt-1 text-[10px] font-bold text-zinc-600">
                                {photo.date
                                  ? formatDate(photo.date)
                                  : 'Sem data'}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeletePhoto(photo)
                              }
                              disabled={
                                photoDeletingId === photo.id
                              }
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 disabled:opacity-50"
                            >
                              {photoDeletingId === photo.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {!hasAnyData ? (
          <EmptyState
            icon={
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
                <BarChart3 className="h-10 w-10 text-zinc-700" />
              </div>
            }
            title="Nenhum dado ainda"
            description="Os dados aparecerão aqui conforme os alunos concluírem treinos e registrarem medidas."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff2a32]/10">
                  <Dumbbell className="h-5 w-5 text-[#ff2a32]" />
                </div>

                <p className="text-2xl font-black text-white">
                  {totalCompletedWorkouts}
                </p>

                <p className="mt-1 text-[11px] font-bold text-zinc-500">
                  Treinos concluídos
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                  <Users className="h-5 w-5 text-green-400" />
                </div>

                <p className="text-2xl font-black text-white">
                  {activeStudents}
                </p>

                <p className="mt-1 text-[11px] font-bold text-zinc-500">
                  Alunos ativos
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>

                <p className="text-2xl font-black text-white">
                  {completionRate}%
                </p>

                <p className="mt-1 text-[11px] font-bold text-zinc-500">
                  Taxa conclusão
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                  <BarChart3 className="h-5 w-5 text-purple-400" />
                </div>

                <p className="text-2xl font-black text-white">
                  {uniqueStudentsWithLogs}
                </p>

                <p className="mt-1 text-[11px] font-bold text-zinc-500">
                  Com treinos
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4 text-center">
                <Scale className="mx-auto mb-2 h-5 w-5 text-[#ff2a32]" />

                <p className="text-xl font-black text-white">
                  {formatNumber(safeAverageWeight, 'kg')}
                </p>

                <p className="mt-1 text-[10px] font-bold uppercase text-zinc-500">
                  Peso médio
                </p>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4 text-center">
                <Ruler className="mx-auto mb-2 h-5 w-5 text-yellow-400" />

                <p className="text-xl font-black text-white">
                  {metricsThisMonth}
                </p>

                <p className="mt-1 text-[10px] font-bold uppercase text-zinc-500">
                  Medidas mês
                </p>
              </div>

              <div className="relative rounded-[22px] border border-white/10 bg-white/[0.045] p-4 text-center">
                {!isPremium && (
                  <div className="absolute right-2 top-2">
                    <Lock className="h-3.5 w-3.5 text-zinc-500" />
                  </div>
                )}

                <Camera className="mx-auto mb-2 h-5 w-5 text-emerald-400" />

                <p className="text-xl font-black text-white">
                  {isPremium ? photosThisMonth : '--'}
                </p>

                <p className="mt-1 text-[10px] font-bold uppercase text-zinc-500">
                  Fotos mês
                </p>
              </div>
            </div>

            {!isPremium && isPro && (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                <p className="text-[12px] font-bold leading-relaxed text-yellow-200">
                  Plano Pro: você tem acesso ao progresso básico.
                  Fotos, comparativos avançados e ranking premium
                  ficam liberados no Premium.
                </p>
              </div>
            )}

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Frequência
                  </p>

                  <h2 className="text-lg font-black text-white">
                    Treinos por mês
                  </h2>
                </div>

                <Dumbbell className="h-5 w-5 text-[#ff2a32]" />
              </div>

              <div className="flex h-32 items-end gap-1.5">
                {workoutsByMonth.map((item) => (
                  <div
                    key={item.month}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-[#ff2a32] to-orange-400"
                      style={{
                        height: `${
                          (item.value / maxWorkoutsByMonth) * 100
                        }%`,
                        minHeight: item.value > 0 ? '6px' : '2px',
                      }}
                    />

                    <span className="text-[9px] font-bold text-zinc-600">
                      {item.month}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {isPremium && (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      Biometria
                    </p>

                    <h2 className="text-lg font-black text-white">
                      Medidas registradas
                    </h2>
                  </div>

                  <Scale className="h-5 w-5 text-yellow-400" />
                </div>

                <div className="flex h-32 items-end gap-1.5">
                  {metricsByMonth.map((item) => (
                    <div
                      key={item.month}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <div
                        className="w-full rounded-md bg-gradient-to-t from-yellow-600 to-yellow-300"
                        style={{
                          height: `${
                            (item.value / maxMetricsByMonth) * 100
                          }%`,
                          minHeight: item.value > 0 ? '6px' : '2px',
                        }}
                      />

                      <span className="text-[9px] font-bold text-zinc-600">
                        {item.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff2a32]/10">
                  <Trophy className="h-5 w-5 text-[#ff2a32]" />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Alunos
                  </p>

                  <h2 className="text-lg font-black text-white">
                    Progresso por aluno
                  </h2>
                </div>
              </div>

              {topStudents.length === 0 ? (
                <p className="rounded-2xl border border-white/5 bg-black/20 p-4 text-[12px] font-bold text-zinc-500">
                  Ainda não há registros suficientes para montar a
                  evolução por aluno.
                </p>
              ) : (
                <div className="space-y-3">
                  {topStudents.map((stat) => {
                    const diff = weightDiff(
                      stat.latestWeight,
                      stat.previousWeight
                    );

                    const progressPercent =
                      stat.totalWorkouts > 0
                        ? (stat.completedWorkouts /
                            stat.totalWorkouts) *
                          100
                        : 0;

                    return (
                      <div
                        key={stat.studentId}
                        className="rounded-[22px] border border-white/5 bg-black/20 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white">
                              {stat.studentName}
                            </p>

                            <p className="mt-1 text-[11px] font-bold text-zinc-500">
                              {stat.completedWorkouts}/
                              {stat.totalWorkouts} treinos concluídos
                              {stat.lastWorkout
                                ? ` • Último: ${timeAgo(
                                    stat.lastWorkout
                                  )}`
                                : ''}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-lg font-black text-white">
                              {stat.completedWorkouts}
                            </p>

                            <p className="text-[10px] font-bold uppercase text-zinc-500">
                              treinos
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#ff2a32] to-orange-400"
                            style={{
                              width: `${Math.min(
                                progressPercent,
                                100
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-3">
                            <Scale className="mb-1 h-4 w-4 text-[#ff2a32]" />

                            <p className="text-[13px] font-black text-white">
                              {formatNumber(
                                stat.latestWeight,
                                'kg'
                              )}
                            </p>

                            <p className="text-[9px] font-bold uppercase text-zinc-500">
                              Peso
                            </p>

                            {diff !== null && (
                              <p
                                className={
                                  diff >= 0
                                    ? 'mt-1 text-[10px] font-bold text-green-400'
                                    : 'mt-1 text-[10px] font-bold text-red-400'
                                }
                              >
                                {diff > 0 ? '+' : ''}
                                {diff}kg
                              </p>
                            )}
                          </div>

                          <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-3">
                            <Percent className="mb-1 h-4 w-4 text-yellow-400" />

                            <p className="text-[13px] font-black text-white">
                              {formatNumber(
                                stat.latestBodyFat,
                                '%'
                              )}
                            </p>

                            <p className="text-[9px] font-bold uppercase text-zinc-500">
                              Gordura
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (!isPremium) {
                                navigate('/personal/subscription');
                                return;
                              }

                              setSelectedStudentId(stat.studentId);

                              window.setTimeout(() => {
                                document
                                  .getElementById(
                                    'photo-progress-manager'
                                  )
                                  ?.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'start',
                                  });
                              }, 100);
                            }}
                            className="rounded-2xl border border-white/5 bg-white/[0.035] p-3 text-left"
                          >
                            {isPremium ? (
                              <>
                                <Camera className="mb-1 h-4 w-4 text-emerald-400" />

                                <p className="text-[13px] font-black text-white">
                                  {stat.photosCount}
                                </p>

                                <p className="text-[9px] font-bold uppercase text-zinc-500">
                                  Fotos
                                </p>
                              </>
                            ) : (
                              <>
                                <Lock className="mb-1 h-4 w-4 text-zinc-500" />

                                <p className="text-[13px] font-black text-white">
                                  Premium
                                </p>

                                <p className="text-[9px] font-bold uppercase text-zinc-500">
                                  Fotos
                                </p>
                              </>
                            )}
                          </button>
                        </div>

                        {isPremium && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-3">
                              <Activity className="mb-1 h-4 w-4 text-purple-400" />

                              <p className="text-[13px] font-black text-white">
                                {formatNumber(
                                  stat.latestMuscleMass,
                                  'kg'
                                )}
                              </p>

                              <p className="text-[9px] font-bold uppercase text-zinc-500">
                                Massa muscular
                              </p>
                            </div>

                            <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-3">
                              <Droplets className="mb-1 h-4 w-4 text-blue-400" />

                              <p className="text-[13px] font-black text-white">
                                {formatNumber(
                                  stat.latestWaterIntake,
                                  'L'
                                )}
                              </p>

                              <p className="text-[9px] font-bold uppercase text-zinc-500">
                                Água
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ProgressPage;