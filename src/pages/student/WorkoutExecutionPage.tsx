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
  Loader2,
  Timer,
  Trophy,
} from 'lucide-react';

import { useWorkoutExecution } from '../../hooks/useWorkoutExecution';
import {
  getDropSetConfig,
  getStudentName,
  normalizeDayKey,
} from '../../utils/workoutPlan';
import { DropSetPanel } from '../../components/workout-execution/DropSetPanel';
import { MetricCard } from '../../components/workout-execution/MetricCard';
import { SummaryCard } from '../../components/workout-execution/SummaryCard';
import { TechniqueBadge } from '../../components/workout-execution/TechniqueBadge';

const DAY_NAMES: Record<string, string> = {
  dom: 'Domingo',
  seg: 'Segunda-feira',
  ter: 'Terça-feira',
  qua: 'Quarta-feira',
  qui: 'Quinta-feira',
  sex: 'Sexta-feira',
  sab: 'Sábado',
};

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds
  ).padStart(2, '0')}`;
}

export function WorkoutExecutionPage() {
  const { id } =
    useParams<{ id: string }>();

  const [searchParams] =
    useSearchParams();

  const navigate = useNavigate();

  const selectedDayKey =
    normalizeDayKey(
      searchParams.get('day')
    );

  const {
    student,
    plan,
    loading,
    saving,
    error,
    currentExerciseIndex,
    currentSet,
    isResting,
    restTimeLeft,
    restDuration,
    restTitle,
    isCompleted,
    completedExercises,
    elapsedSeconds,
    exercises,
    currentExercise,
    nextExercise,
    currentGroup,
    safeTotalSets,
    exerciseName,
    exerciseReps,
    exerciseWeight,
    handleCompleteSet,
    finishRest,
    handleSave,
  } = useWorkoutExecution({
    id,
    dayKey: selectedDayKey,
  });

  const dropConfig =
    currentExercise
      ? getDropSetConfig(
          currentExercise
        )
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

  if (
    error &&
    !plan
  ) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#050505] px-5 pt-[env(safe-area-inset-top,0px)] text-white">
        <div className="w-full max-w-sm rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-300" />

          <h1 className="mt-5 text-xl font-black">
            Não foi possível iniciar
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
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-[#050505] pt-[env(safe-area-inset-top,0px)] text-white">
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
            className="flex min-h-screen items-center px-4 py-4"
          >
            <div className="mx-auto w-full max-w-lg">
              <section className="rounded-[32px] border border-yellow-400/20 bg-yellow-400/10 p-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[28px] bg-gradient-to-br from-yellow-400 to-orange-500">
                  <Trophy className="h-10 w-10" />
                </div>

                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.25em] text-yellow-300">
                  Finalizado
                </p>

                <h1 className="mt-1.5 text-xl font-black uppercase italic">
                  Treino concluído
                </h1>

                <p className="mt-2 text-sm text-zinc-400">
                  Parabéns,{' '}
                  {getStudentName(
                    student
                  )}
                  .
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2">
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
                    label="Exercícios"
                  />

                  <SummaryCard
                    icon={Flame}
                    value={`${completedPercent}%`}
                    label="Feito"
                  />
                </div>
              </section>

              <section className="mt-4 rounded-[28px] border border-white/10 bg-white/[0.035] p-3">
                <p className="mb-3 text-[10px] font-black uppercase text-[#ff2a32]">
                  Exercícios concluídos
                </p>

                <div className="max-h-52 space-y-1.5 overflow-y-auto">
                  {completedExercises.map(
                    (exercise) => (
                      <div
                        key={
                          exercise.exerciseId
                        }
                        className="flex items-center gap-2.5 rounded-2xl bg-black/20 p-2.5"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />

                        <div>
                          <p className="text-xs font-black">
                            {
                              exercise.exerciseName
                            }
                          </p>

                          <p className="text-[10px] text-zinc-500">
                            {
                              exercise.setsCompleted
                            }{' '}
                            séries ×{' '}
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
                 className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-[#ff2a32] text-sm font-black uppercase disabled:opacity-60"
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
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            className="flex min-h-screen items-center px-4"
          >
            <div className="mx-auto w-full max-w-lg rounded-[32px] border border-[#ff2a32]/20 bg-[#ff2a32]/10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ff2a32]">
                Descanso
              </p>

              <h1 className="mt-1.5 text-lg font-black uppercase">
                {restTitle}
              </h1>

              <div className="my-4">
                <Timer className="mx-auto h-8 w-8 text-[#ff2a32]" />

                <p className="mt-2 text-6xl font-black">
                  {restTimeLeft}
                </p>

                <p className="text-xs text-zinc-500">
                  segundos
                </p>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
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
                 className="mt-5 flex h-12 w-full items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.06] text-sm font-black uppercase"
               >
                Pular descanso
              </button>
            </div>
          </motion.main>
        ) : (
          <motion.main
            key="execution"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            className="mx-auto flex w-full max-w-lg flex-col px-4 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-4"
          >
            <header>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate(-1)
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <div className="min-w-0 flex-1 text-center">
                  <p className="truncate text-[10px] font-black uppercase text-[#ff2a32]">
                    {plan.name}
                  </p>

                  <p className="text-[11px] text-zinc-500">
                    {DAY_NAMES[
                      selectedDayKey
                    ] ||
                      selectedDayKey}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[11px] font-black">
                  {formatDuration(
                    elapsedSeconds
                  )}
                </div>
              </div>

              <div className="mt-3 flex justify-between text-[11px]">
                <span className="text-zinc-500">
                  Exercício{' '}
                  {currentExerciseIndex +
                    1}{' '}
                  de{' '}
                  {exercises.length}
                </span>

                <span className="font-black text-[#ff2a32]">
                  {Math.round(
                    progressPercent
                  )}
                  %
                </span>
              </div>

              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full bg-[#ff2a32]"
                  animate={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
            </header>

            <section className="flex flex-1 flex-col pt-2 pb-4">
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
                className="rounded-[32px] border border-white/10 bg-white/[0.04] p-3"
              >
                <div className="h-[200px] overflow-hidden rounded-[24px] border border-white/10 bg-black/30">
                  {currentExercise.video_url ? (
                    <video
                      src={
                        currentExercise.video_url
                      }
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="h-full w-full object-contain"
                    />
                  ) : currentExercise.image_url ? (
                    <img
                      src={
                        currentExercise.image_url
                      }
                      alt={exerciseName}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Dumbbell className="h-10 w-10 text-[#ff2a32]" />
                    </div>
                  )}
                </div>

                <div className="mt-3 text-center">
                  <TechniqueBadge
                    technique={
                      currentExercise.technique_type ||
                      'normal'
                    }
                    group={
                      currentGroup
                    }
                    groupOrder={
                      currentExercise.group_order
                    }
                  />

                  <h1 className="mt-2 text-xl font-black">
                    {exerciseName}
                  </h1>

                  <p className="mt-1.5 text-[11px] font-black uppercase text-[#ff2a32]">
                    Série {currentSet}{' '}
                    de{' '}
                    {safeTotalSets}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <MetricCard
                      label="Repetições"
                      value={
                        exerciseReps
                      }
                    />

                    <MetricCard
                      label="Carga"
                      value={
                        exerciseWeight
                      }
                    />
                  </div>

                  {currentExercise.technique_type ===
                    'drop_set' && (
                    <DropSetPanel
                      config={
                        dropConfig
                      }
                    />
                  )}

                  {currentGroup?.group_type ===
                    'bi_set' && (
                    <div className="mt-3 rounded-[20px] border border-purple-400/20 bg-purple-400/[0.07] p-3 text-left">
                      <p className="text-[10px] font-black uppercase text-purple-300">
                        Bi-set
                      </p>

                      <p className="mt-1 text-xs text-zinc-300">
                        Exercício{' '}
                        {currentExercise.group_order ||
                          1}{' '}
                        de 2.
                        {currentExercise.group_order ===
                        1
                          ? ' O próximo exercício será iniciado sem descanso.'
                          : ` Depois dele, descanse ${
                              currentGroup.rest_after_seconds ||
                              0
                            } segundos.`}
                      </p>
                    </div>
                  )}

                  {observation && (
                    <div className="mt-3 rounded-[20px] border border-white/10 bg-black/20 p-3 text-left">
                      <p className="text-[10px] font-black uppercase text-[#ff2a32]">
                        Observação
                      </p>

                      <p className="mt-1 text-xs text-zinc-400">
                        {
                          observation
                        }
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </section>

             <button
               type="button"
               onClick={
                 handleCompleteSet
               }
               style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 16px)' }}
               className="fixed inset-x-0 z-40 mx-4 flex h-14 items-center justify-center gap-3 rounded-[24px] bg-[#ff2a32] text-sm font-black uppercase"
             >
              <CheckCircle2 className="h-6 w-6" />

              {currentSet <
              safeTotalSets
                ? 'Concluir série'
                : nextExercise
                  ? 'Próximo exercício'
                  : 'Finalizar treino'}

              <ChevronRight className="h-5 w-5" />
            </button>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WorkoutExecutionPage;
