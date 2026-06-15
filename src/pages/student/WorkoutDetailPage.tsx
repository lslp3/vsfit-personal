import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  Clock,
  Dumbbell,
  Flame,
  Layers,
  Loader2,
  Play,
  Target,
  Timer,
  Trophy,
} from 'lucide-react';

import { getWorkoutPlanById } from '../../services/workoutService';
import { cn } from '../../lib/utils';
import type { WorkoutPlan, WorkoutPlanExercise } from '../../types/database';

interface PlanWithExercises extends WorkoutPlan {
  workout_plan_exercises?: WorkoutPlanExercise[];
}

const DAY_LABELS: Record<string, string> = {
  Sunday: 'DOM',
  Monday: 'SEG',
  Tuesday: 'TER',
  Wednesday: 'QUA',
  Thursday: 'QUI',
  Friday: 'SEX',
  Saturday: 'SAB',
};

const DAY_NAMES: Record<string, string> = {
  Sunday: 'Domingo',
  Monday: 'Segunda-feira',
  Tuesday: 'Terça-feira',
  Wednesday: 'Quarta-feira',
  Thursday: 'Quinta-feira',
  Friday: 'Sexta-feira',
  Saturday: 'Sábado',
  _default: 'Treino',
};

function getTodayDayKey() {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
    new Date().getDay()
  ];
}

function getExerciseName(exercise: any) {
  return exercise?.name || exercise?.exercise_name || exercise?.title || 'Exercício';
}

function getExerciseObservation(exercise: any) {
  return exercise?.observation || exercise?.notes || exercise?.instructions || '';
}

function getExerciseImage(exercise: any) {
  return (
    exercise?.image_url ||
    exercise?.imageUrl ||
    exercise?.thumbnail_url ||
    exercise?.thumbnailUrl ||
    exercise?.gif_url ||
    exercise?.exercise?.image_url ||
    exercise?.exercise?.imageUrl ||
    exercise?.exercise?.thumbnail_url ||
    exercise?.exercise?.thumbnailUrl ||
    exercise?.exercise?.gif_url ||
    ''
  );
}

function getExerciseVideo(exercise: any) {
  return (
    exercise?.video_url ||
    exercise?.videoUrl ||
    exercise?.exercise?.video_url ||
    exercise?.exercise?.videoUrl ||
    ''
  );
}

function getExercises(plan: PlanWithExercises | null) {
  if (!plan?.workout_plan_exercises) return [];

  return [...plan.workout_plan_exercises]
    .filter(Boolean)
    .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));
}

function groupExercises(exercises: WorkoutPlanExercise[]) {
  return exercises.reduce<Record<string, WorkoutPlanExercise[]>>((acc, exercise) => {
    const key = exercise.day_key || '_default';

    if (!acc[key]) acc[key] = [];

    acc[key].push(exercise);

    return acc;
  }, {});
}

function getScheduleDays(grouped: Record<string, WorkoutPlanExercise[]>) {
  return Object.keys(grouped).filter((day) => day !== '_default');
}

export function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<PlanWithExercises | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    loadPlan();
  }, [id]);

  async function loadPlan() {
    setLoading(true);
    setError('');

    try {
      const data = await getWorkoutPlanById(id!);
      setPlan(data as PlanWithExercises);
    } catch (err: any) {
      console.error('[WorkoutDetailPage] loadPlan error:', err);
      setError(err?.message || 'Erro ao carregar treino.');
    } finally {
      setLoading(false);
    }
  }

  const exercises = useMemo(() => getExercises(plan), [plan]);

  const grouped = useMemo(() => groupExercises(exercises), [exercises]);

  const scheduleDays = useMemo(() => getScheduleDays(grouped), [grouped]);

  const todayDayKey = getTodayDayKey();

  const totalSets = exercises.reduce((sum, exercise) => {
    const parsed = Number.parseInt(String(exercise.sets || '0'), 10);

    return sum + (Number.isFinite(parsed) && parsed > 0 ? parsed : 1);
  }, 0);

  const hasDayGroups = Object.keys(grouped).length > 1 || scheduleDays.length > 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15 shadow-[0_18px_45px_rgba(255,42,48,0.22)]">
            <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
          </div>

          <div>
            <p className="text-sm font-black text-white">Carregando treino...</p>
            <p className="mt-1 text-xs text-zinc-500">Preparando os exercícios.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-[#050505] px-4 pb-28 pt-8 text-white">
        <div className="mx-auto max-w-lg rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-300">
            <AlertCircle className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-xl font-black text-white">Treino não encontrado</h1>

          <p className="mt-2 text-sm leading-relaxed text-red-200/80">
            {error || 'Este plano de treino não está disponível.'}
          </p>

          <button
            type="button"
            onClick={() => navigate('/student/workouts')}
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
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-300 transition-all active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-black uppercase tracking-wide text-zinc-400">
            Detalhe
          </span>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-[#ff2a32]/16 via-white/[0.045] to-white/[0.025] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
                Treino Premium
              </p>

              <h1 className="mt-2 text-[28px] font-black uppercase italic leading-none tracking-[-0.06em] text-white">
                {plan.name}
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                {plan.objective || 'Treino personalizado para sua evolução.'}
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#ff2a32] text-white">
              <Dumbbell className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
              <Layers className="mx-auto mb-2 h-4 w-4 text-[#ff2a32]" />
              <p className="truncate text-sm font-black text-white">{plan.level || 'Livre'}</p>
              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                Nível
              </p>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
              <Clock className="mx-auto mb-2 h-4 w-4 text-blue-400" />
              <p className="text-sm font-black text-white">
                {plan.duration_minutes || '--'} min
              </p>
              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                Duração
              </p>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-center">
              <Target className="mx-auto mb-2 h-4 w-4 text-emerald-400" />
              <p className="text-sm font-black text-white">{exercises.length}</p>
              <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                Exercícios
              </p>
            </div>
          </div>
        </motion.section>

        {scheduleDays.length > 0 && (
          <section className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#ff2a32]" />
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
                Dias do treino
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {scheduleDays.map((day) => (
                <span
                  key={day}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[11px] font-black',
                    day === todayDayKey
                      ? 'border-[#ff2a32]/35 bg-[#ff2a32]/15 text-[#ff2a32]'
                      : 'border-white/10 bg-white/[0.05] text-zinc-400'
                  )}
                >
                  {DAY_LABELS[day] || String(day).slice(0, 3).toUpperCase()}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-4 text-center">
            <Flame className="mx-auto mb-2 h-5 w-5 text-[#ff2a32]" />
            <p className="text-2xl font-black text-white">{totalSets}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">
              Séries totais
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-4 text-center">
            <Trophy className="mx-auto mb-2 h-5 w-5 text-yellow-400" />
            <p className="text-2xl font-black text-white">{Object.keys(grouped).length}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">
              Blocos
            </p>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
              Exercícios
            </p>

            <h2 className="mt-1 text-xl font-black text-white">Plano do treino</h2>
          </div>

          {exercises.length === 0 ? (
            <div className="rounded-[30px] border border-white/10 bg-white/[0.035] p-8 text-center">
              <Dumbbell className="mx-auto h-10 w-10 text-zinc-700" />

              <h3 className="mt-4 text-lg font-black text-white">Nenhum exercício</h3>

              <p className="mt-2 text-sm text-zinc-500">
                Este plano ainda não possui exercícios cadastrados.
              </p>
            </div>
          ) : hasDayGroups ? (
            Object.entries(grouped).map(([dayKey, dayExercises]) => (
              <div key={dayKey} className="space-y-3">
                {dayKey !== '_default' && (
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />

                    <span className="rounded-full border border-[#ff2a32]/25 bg-[#ff2a32]/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-wide text-[#ff2a32]">
                      {DAY_NAMES[dayKey] || dayKey}
                    </span>

                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                )}

                {dayExercises.map((exercise, index) => (
                  <ExerciseCard key={exercise.id} exercise={exercise} index={index} />
                ))}
              </div>
            ))
          ) : (
            exercises.map((exercise, index) => (
              <ExerciseCard key={exercise.id} exercise={exercise} index={index} />
            ))
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-[50px] z-40 border-t border-white/10 bg-[#050505]/98 px-4 pb-3 pt-3 backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={() => navigate(`/student/workout-execution/${plan.id}`)}
            disabled={exercises.length === 0}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-[#ff2a32] text-[14px] font-black uppercase tracking-wide text-white transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Play className="h-5 w-5" />
            Iniciar treino
          </button>
        </div>
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
  const observation = getExerciseObservation(exercise);
  const imageUrl = getExerciseImage(exercise);
  const videoUrl = getExerciseVideo(exercise);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_16px_45px_rgba(0,0,0,0.28)]"
    >
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[22px] border border-white/10 bg-black/30">
          {videoUrl ? (
            <video
              src={videoUrl}
              muted
              loop
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={getExerciseName(exercise)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#ff2a32]">
              <Dumbbell className="h-8 w-8" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-black leading-tight text-white">
            {getExerciseName(exercise)}
          </h3>

          <div className="mt-3 flex flex-wrap gap-2">
            {exercise.sets && (
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold text-zinc-300">
                {exercise.sets} séries
              </span>
            )}

            {exercise.reps && (
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold text-zinc-300">
                {exercise.reps} reps
              </span>
            )}

            {exercise.suggested_weight && (
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold text-zinc-300">
                {exercise.suggested_weight}
              </span>
            )}

            {exercise.rest_seconds && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold text-zinc-300">
                <Timer className="h-3.5 w-3.5 text-[#ff2a32]" />
                {exercise.rest_seconds}s
              </span>
            )}
          </div>

          {observation && (
            <p className="mt-3 rounded-2xl border border-white/5 bg-black/20 p-3 text-xs leading-relaxed text-zinc-500">
              {observation}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default WorkoutDetailPage;