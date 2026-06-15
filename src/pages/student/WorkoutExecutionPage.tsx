import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Dumbbell,
  Flame,
  Loader2,
  SkipForward,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import * as studentService from '../../services/studentService';
import { getWorkoutPlanById, saveWorkoutLog } from '../../services/workoutService';
import { formatTime } from '../../lib/formatters';
import type { WorkoutPlan, WorkoutPlanExercise } from '../../types/database';

interface CompletedExercise {
  exerciseName: string;
  setsCompleted: number;
  repsCompleted: string;
  weightUsed: string;
}

interface PlanWithExercises extends WorkoutPlan {
  workout_plan_exercises?: WorkoutPlanExercise[];
}

type RestTarget =
  | { type: 'next-set' }
  | { type: 'next-exercise' }
  | { type: 'finish' }
  | null;

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
    exercise?.exercise?.image_url ||
    exercise?.exercise?.imageUrl ||
    exercise?.exercise?.thumbnail_url ||
    exercise?.exercise?.thumbnailUrl ||
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

function getExerciseSets(exercise: any) {
  const parsed = Number.parseInt(String(exercise?.sets || '1'), 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getExercises(plan: PlanWithExercises | null) {
  if (!plan?.workout_plan_exercises) return [];

  return [...plan.workout_plan_exercises]
    .filter(Boolean)
    .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));
}

function getNextExerciseName(exercises: WorkoutPlanExercise[], currentIndex: number) {
  const nextExercise = exercises[currentIndex + 1];

  return nextExercise ? getExerciseName(nextExercise) : 'Finalizar treino';
}

export function WorkoutExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<PlanWithExercises | null>(null);
  const [student, setStudent] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);

  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const [restTarget, setRestTarget] = useState<RestTarget>(null);

  const [isCompleted, setIsCompleted] = useState(false);
  const [startedAt] = useState(new Date().toISOString());
  const [completedExercises, setCompletedExercises] = useState<CompletedExercise[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!id) return;

    loadData();
  }, [id]);

  useEffect(() => {
    if (isCompleted) return;

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isCompleted, startedAt]);

  useEffect(() => {
    if (!isResting) return;

    if (restTimeLeft <= 0) {
      finishRest();
      return;
    }

    const timeout = setTimeout(() => {
      setRestTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [isResting, restTimeLeft]);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      const authUser = authData.user;

      if (!authUser?.id) {
        setError('Sessão do aluno não encontrada.');
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

      const planData = (await getWorkoutPlanById(id!)) as PlanWithExercises;

      setStudent(studentData);
      setPlan(planData);
    } catch (err: any) {
      console.error('[WorkoutExecutionPage] loadData error:', err);
      setError(err?.message || 'Erro ao carregar execução do treino.');
    } finally {
      setLoading(false);
    }
  }

  const exercises = useMemo(() => getExercises(plan), [plan]);

  const currentExercise = exercises[currentExerciseIndex];
  const safeTotalSets = getExerciseSets(currentExercise);

  const progressPercent =
    exercises.length > 0
      ? ((currentExerciseIndex + (currentSet - 1) / safeTotalSets) / exercises.length) * 100
      : 0;

  function startRest(target: RestTarget, seconds: number) {
    if (seconds <= 0 || !target) {
      finishAction(target);
      return;
    }

    setRestTarget(target);
    setRestTotal(seconds);
    setRestTimeLeft(seconds);
    setIsResting(true);
  }

  function finishRest() {
    const target = restTarget;

    setIsResting(false);
    setRestTimeLeft(0);
    setRestTotal(0);
    setRestTarget(null);

    finishAction(target);
  }

  function finishAction(target: RestTarget) {
    if (!target) return;

    if (target.type === 'next-set') {
      setCurrentSet((prev) => prev + 1);
      return;
    }

    if (target.type === 'next-exercise') {
      setCurrentExerciseIndex((prev) => prev + 1);
      setCurrentSet(1);
      return;
    }

    if (target.type === 'finish') {
      setIsCompleted(true);
    }
  }

  function handleSkipRest() {
    finishRest();
  }

  function handleCompleteSet() {
    if (!currentExercise) return;

    const restSeconds = Number(currentExercise.rest_seconds || 0);

    if (currentSet < safeTotalSets) {
      startRest({ type: 'next-set' }, restSeconds);
      return;
    }

    const completedRecord: CompletedExercise = {
      exerciseName: getExerciseName(currentExercise),
      setsCompleted: safeTotalSets,
      repsCompleted: currentExercise.reps || '',
      weightUsed: currentExercise.suggested_weight || '',
    };

    setCompletedExercises((prev) => [...prev, completedRecord]);

    const nextIndex = currentExerciseIndex + 1;

    if (nextIndex >= exercises.length) {
      setIsCompleted(true);
      return;
    }

    startRest({ type: 'next-exercise' }, restSeconds);
  }

  async function handleSave() {
    if (!student || !plan) return;

    setSaving(true);

    try {
      const totalSeconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);

      const logData = {
        student_id: student.id,
        trainer_id: student.trainer_id,
        workout_plan_id: plan.id,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_seconds: totalSeconds,
        status: 'completed',
        exercises_data: completedExercises.map((exercise) => ({
          exercise_name: exercise.exerciseName,
          sets_completed: exercise.setsCompleted,
          reps_completed: exercise.repsCompleted,
          weight_used: exercise.weightUsed,
        })),
      };

      const log = await saveWorkoutLog(logData);

      navigate(`/student/workout-completed/${log.id}`, { replace: true });
    } catch (err: any) {
      console.error('[WorkoutExecutionPage] save error:', err);
      setError(err?.message || 'Erro ao salvar treino.');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15">
            <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
          </div>

          <p className="text-sm font-black text-white">Preparando treino...</p>
        </div>
      </div>
    );
  }

  if (error || !plan || !student || exercises.length === 0) {
    return (
      <div className="min-h-screen bg-[#050505] px-4 pb-28 pt-8 text-white">
        <div className="mx-auto max-w-lg rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-300">
            <AlertCircle className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-xl font-black text-white">Não foi possível iniciar</h1>

          <p className="mt-2 text-sm leading-relaxed text-red-200/80">
            {error || 'Este treino não possui exercícios.'}
          </p>

          <button
            type="button"
            onClick={() => navigate('/student/workouts')}
            className="mt-6 h-12 w-full rounded-2xl bg-[#ff2a32] text-sm font-black text-white"
          >
            VOLTAR
          </button>
        </div>
      </div>
    );
  }

  const exerciseVideo = getExerciseVideo(currentExercise);
  const exerciseImage = getExerciseImage(currentExercise);
  const observation = getExerciseObservation(currentExercise);

  const restProgress = restTotal > 0 ? ((restTotal - restTimeLeft) / restTotal) * 100 : 0;

  const isLastSet = currentSet >= safeTotalSets;
  const isLastExercise = currentExerciseIndex + 1 >= exercises.length;

  const buttonLabel = !isLastSet
    ? 'Concluir série e descansar'
    : isLastExercise
      ? 'Finalizar treino'
      : 'Concluir exercício e descansar';

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <AnimatePresence mode="wait">
        {isCompleted ? (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-screen flex-col justify-center px-5 py-10"
          >
            <div className="mx-auto w-full max-w-lg">
              <div className="rounded-[38px] border border-yellow-400/20 bg-gradient-to-br from-yellow-500/18 via-white/[0.045] to-white/[0.025] p-7 text-center shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                  className="mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-[0_22px_60px_rgba(251,191,36,0.28)]"
                >
                  <Trophy className="h-12 w-12" />
                </motion.div>

                <h1 className="mt-6 text-[30px] font-black uppercase italic leading-none tracking-[-0.06em] text-white">
                  Treino concluído!
                </h1>

                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  Você concluiu {completedExercises.length} exercício
                  {completedExercises.length === 1 ? '' : 's'} com sucesso.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <Clock className="mx-auto mb-2 h-5 w-5 text-[#ff2a32]" />
                    <p className="text-xl font-black text-white">
                      {formatTime(elapsedSeconds)}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">
                      Tempo
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-emerald-400" />
                    <p className="text-xl font-black text-white">
                      {completedExercises.length}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">
                      Exercícios
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="mt-7 flex h-[58px] w-full items-center justify-center gap-2 rounded-[22px] bg-[#ff2a32] text-[14px] font-black uppercase tracking-wide text-white active:scale-[0.98] disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                  Salvar treino
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/student/home')}
                  className="mt-3 h-12 w-full rounded-[20px] border border-white/10 bg-white/[0.05] text-[13px] font-black text-zinc-300"
                >
                  Voltar ao início
                </button>
              </div>
            </div>
          </motion.div>
        ) : isResting ? (
          <motion.div
            key="rest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-screen flex-col justify-center px-5 py-10"
          >
            <div className="mx-auto w-full max-w-lg text-center">
              <div className="rounded-[38px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
                  Descanso
                </p>

                <h1 className="mt-2 text-[30px] font-black uppercase italic tracking-[-0.06em] text-white">
                  Respira
                </h1>

                <div className="relative mx-auto my-8 h-52 w-52">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 180 180">
                    <circle
                      cx="90"
                      cy="90"
                      r="78"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="10"
                    />

                    <motion.circle
                      cx="90"
                      cy="90"
                      r="78"
                      fill="none"
                      stroke="#ff2a32"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 78}
                      animate={{
                        strokeDashoffset: 2 * Math.PI * 78 * (1 - restProgress / 100),
                      }}
                      transition={{ duration: 0.5, ease: 'linear' }}
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Timer className="mb-2 h-8 w-8 text-[#ff2a32]" />

                    <span className="text-6xl font-black tabular-nums text-white">
                      {restTimeLeft}
                    </span>

                    <span className="mt-1 text-xs font-black uppercase tracking-widest text-zinc-500">
                      segundos
                    </span>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    {restTarget?.type === 'next-set' ? 'Próxima série' : 'Próximo exercício'}
                  </p>

                  <p className="mt-2 text-lg font-black text-white">
                    {restTarget?.type === 'next-set'
                      ? `${getExerciseName(currentExercise)} • Série ${currentSet + 1}/${safeTotalSets}`
                      : getNextExerciseName(exercises, currentExerciseIndex)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSkipRest}
                  className="mt-6 flex h-[54px] w-full items-center justify-center gap-2 rounded-[20px] border border-white/10 bg-white/[0.06] text-[13px] font-black uppercase tracking-wide text-white"
                >
                  <SkipForward className="h-4 w-4" />
                  Pular descanso
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="execution"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen px-4 pb-[72px] pt-5"
          >
            <div className="mx-auto max-w-lg">
              <div className="mb-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-300"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-black text-zinc-400">
                  {formatTime(elapsedSeconds)}
                </div>
              </div>

              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-wide text-zinc-500">
                  <span>
                    Exercício {currentExerciseIndex + 1} de {exercises.length}
                  </span>

                  <span>{Math.round(progressPercent)}%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full bg-[#ff2a32]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <section className="overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.045] shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
                <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-black/40">
                  {exerciseVideo ? (
                    <video
                      src={exerciseVideo}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : exerciseImage ? (
                    <img
                      src={exerciseImage}
                      alt={getExerciseName(currentExercise)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center">
                      <div className="flex h-24 w-24 items-center justify-center rounded-[32px] bg-[#ff2a32]/15 text-[#ff2a32]">
                        <Dumbbell className="h-12 w-12" />
                      </div>

                      <p className="mt-4 text-xs font-bold text-zinc-600">
                        Demonstração não disponível
                      </p>
                    </div>
                  )}

                  <div className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur">
                    Série {currentSet}/{safeTotalSets}
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
                    Exercício atual
                  </p>

                  <h1 className="mt-2 text-[26px] font-black uppercase italic leading-none tracking-[-0.06em] text-white">
                    {getExerciseName(currentExercise)}
                  </h1>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-center">
                      <Zap className="mx-auto mb-2 h-5 w-5 text-[#ff2a32]" />
                      <p className="text-2xl font-black text-white">
                        {currentExercise.reps || '—'}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">
                        Repetições
                      </p>
                    </div>

                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-center">
                      <Flame className="mx-auto mb-2 h-5 w-5 text-yellow-400" />
                      <p className="text-2xl font-black text-white">
                        {currentExercise.suggested_weight || '—'}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">
                        Carga
                      </p>
                    </div>
                  </div>

                  {observation && (
                    <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-4">
                      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">
                        Observação
                      </p>

                      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                        {observation}
                      </p>
                    </div>
                  )}

                  {currentExercise.rest_seconds && currentExercise.rest_seconds > 0 && (
                    <div className="mt-4 flex items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-bold text-zinc-400">
                      <Timer className="h-4 w-4 text-[#ff2a32]" />
                      {currentExercise.rest_seconds}s de descanso após concluir
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleCompleteSet}
                    className="mt-5 flex h-[58px] w-full items-center justify-center gap-2 rounded-[22px] bg-[#ff2a32] px-4 text-center text-[13px] font-black uppercase tracking-wide text-white transition-all active:scale-[0.98]"
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span>{buttonLabel}</span>
                  </button>
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WorkoutExecutionPage;