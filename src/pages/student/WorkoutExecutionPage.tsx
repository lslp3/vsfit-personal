import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell,
  CheckCircle2,
  Trophy,
  Clock,
  Timer,
  Loader2,
  Zap,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EmptyState } from '../../components/ui/EmptyState';
import { getWorkoutPlanById, saveWorkoutLog } from '../../services/workoutService';
import { useAuthStore } from '../../store/authStore';
import { formatTime } from '../../lib/formatters';
import type { WorkoutPlan, WorkoutPlanExercise } from '../../types/database';

interface CompletedExercise {
  exerciseName: string;
  setsCompleted: number;
  repsCompleted: string;
  weightUsed: string;
}

interface PlanWithExercises extends WorkoutPlan {
  workout_plan_exercises: WorkoutPlanExercise[];
}

export function WorkoutExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, student: storeStudent, studentAccount, isLoading } = useAuthStore();

  const [plan, setPlan] = useState<PlanWithExercises | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [startedAt] = useState(new Date().toISOString());
  const [completedExercises, setCompletedExercises] = useState<CompletedExercise[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const exercisesRef = useRef<WorkoutPlanExercise[]>([]);

  const studentId = storeStudent?.id || studentAccount?.student_id;

  useEffect(() => {
    if (!id || !user || !studentId) return;
    loadPlan();
  }, [id, user, studentId]);

  useEffect(() => {
    if (!isCompleted && !isResting) {
      const interval = setInterval(() => {
        setElapsedSeconds(
          Math.floor(
            (Date.now() - new Date(startedAt).getTime()) / 1000
          )
        );
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isCompleted, isResting, startedAt]);

  useEffect(() => {
    if (!isResting) return;

    const interval = setInterval(() => {
      setRestTimeLeft((prev) => {
        if (prev <= 1) {
          setIsResting(false);
          const exercises = exercisesRef.current;
          const nextIdx = currentExerciseIndex + 1;
          if (nextIdx < exercises.length) {
            setCurrentExerciseIndex(nextIdx);
            setCurrentSet(1);
          } else {
            setIsCompleted(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isResting, currentExerciseIndex]);

  async function loadPlan() {
    try {
      const planData = await getWorkoutPlanById(id!);
      setPlan(planData as PlanWithExercises);

      const exercises = (
        (planData as PlanWithExercises).workout_plan_exercises || []
      ).sort((a: WorkoutPlanExercise, b: WorkoutPlanExercise) => a.order_index - b.order_index);
      exercisesRef.current = exercises;
    } catch (err) {
      console.error('Execution load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || isLoading || !studentId) return <LoadingScreen />;

  if (!plan || !storeStudent) {
    return (
      <EmptyState
        icon={<Dumbbell className="w-8 h-8 text-vs-muted" />}
        title="Treino não encontrado"
        action={
          <Button
            variant="secondary"
            onClick={() => navigate('/student/home')}
          >
            Voltar ao Início
          </Button>
        }
      />
    );
  }

  const exercises = (plan.workout_plan_exercises || [])
    .filter(Boolean)
    .sort((a, b) => a.order_index - b.order_index);

  if (exercises.length === 0) {
    return (
      <EmptyState
        icon={<Dumbbell className="w-8 h-8 text-vs-muted" />}
        title="Nenhum exercício"
        description="Este plano não possui exercícios."
        action={
          <Button
            variant="secondary"
            onClick={() => navigate('/student/home')}
          >
            Voltar
          </Button>
        }
      />
    );
  }

  const currentExercise = exercises[currentExerciseIndex];
  const totalSets = parseInt(currentExercise?.sets || '1', 10);
  const safeTotalSets = isNaN(totalSets) || totalSets < 1 ? 1 : totalSets;

  function handleCompleteSet() {
    if (currentSet < safeTotalSets) {
      setCurrentSet((prev) => prev + 1);
    } else {
      const newCompleted = [
        ...completedExercises,
        {
          exerciseName: currentExercise.name,
          setsCompleted: safeTotalSets,
          repsCompleted: currentExercise.reps || '',
          weightUsed: currentExercise.suggested_weight || '',
        },
      ];
      setCompletedExercises(newCompleted);

      const nextIdx = currentExerciseIndex + 1;

      if (nextIdx < exercises.length) {
        const restSec = currentExercise.rest_seconds || 0;
        if (restSec > 0) {
          setCurrentSet(1);
          setRestTimeLeft(restSec);
          setIsResting(true);
        } else {
          setCurrentExerciseIndex(nextIdx);
          setCurrentSet(1);
        }
      } else {
        setIsCompleted(true);
      }
    }
  }

  function handleRestComplete() {
    setIsResting(false);
    setRestTimeLeft(0);
    const nextIdx = currentExerciseIndex + 1;
    if (nextIdx < exercises.length) {
      setCurrentExerciseIndex(nextIdx);
      setCurrentSet(1);
    } else {
      setIsCompleted(true);
    }
  }

  async function handleSave() {
    if (!storeStudent || !plan) return;
    setSaving(true);
    try {
      const totalSeconds = Math.floor(
        (Date.now() - new Date(startedAt).getTime()) / 1000
      );

      const logData = {
        student_id: storeStudent.id,
        trainer_id: storeStudent.trainer_id,
        workout_plan_id: plan.id,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_seconds: totalSeconds,
        status: 'completed',
        exercises_data: completedExercises.map((ex) => ({
          exercise_name: ex.exerciseName,
          sets_completed: ex.setsCompleted,
          reps_completed: ex.repsCompleted,
          weight_used: ex.weightUsed,
        })),
      };

      const log = await saveWorkoutLog(logData);
      navigate(`/student/workout-completed/${log.id}`, { replace: true });
    } catch (err) {
      console.error('Save error:', err);
      setSaving(false);
    }
  }

  const progressPercent =
    ((currentExerciseIndex + (currentSet - 1) / safeTotalSets) /
      exercises.length) *
    100;

  return (
    <div className="min-h-screen bg-vs-dark">
      <AnimatePresence mode="wait">
        {isCompleted ? (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="min-h-screen flex flex-col items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mb-6 shadow-lg shadow-yellow-500/20"
            >
              <Trophy className="w-10 h-10 text-white" />
            </motion.div>

            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Treino Concluído!
            </h2>

            <p className="text-vs-muted text-sm text-center mb-8">
              {completedExercises.length > 0
                ? `${completedExercises.length} exercícios realizados`
                : 'Ótimo trabalho!'}
            </p>

            <Card className="w-full mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-vs-primary" />
                <span className="text-sm text-vs-muted">Tempo total</span>
              </div>
              <p className="text-3xl font-bold text-white">
                {formatTime(elapsedSeconds)}
              </p>
            </Card>

            <Card className="w-full mb-8">
              <h3 className="text-sm font-semibold text-white mb-3">
                Exercícios Concluídos
              </h3>
              <div className="space-y-2">
                {completedExercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 py-2 border-b border-vs-border last:border-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {ex.exerciseName}
                      </p>
                      <p className="text-xs text-vs-muted">
                        {ex.setsCompleted} série{ex.setsCompleted > 1 ? 's' : ''}
                        {ex.repsCompleted ? ` x ${ex.repsCompleted} reps` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="w-full space-y-3 max-w-sm">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleSave}
                loading={saving}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                Salvar Treino
              </Button>

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => navigate('/student/home')}
              >
                Voltar ao Início
              </Button>
            </div>
          </motion.div>
        ) : isResting ? (
          <motion.div
            key="rest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen flex flex-col items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="relative w-40 h-40 mx-auto mb-8">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="#ff2a32"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 70}
                    initial={{
                      strokeDashoffset: 0,
                    }}
                    animate={{
                      strokeDashoffset:
                        2 * Math.PI * 70 * (1 - restTimeLeft / (currentExercise.rest_seconds || 60)),
                    }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Timer className="w-8 h-8 text-vs-primary mb-1" />
                  <span className="text-5xl font-bold text-white tabular-nums">
                    {restTimeLeft}
                  </span>
                  <span className="text-sm text-vs-muted mt-1">descanso</span>
                </div>
              </div>

              <p className="text-sm text-vs-muted mb-1">Próximo exercício</p>
              <p className="text-lg font-semibold text-white">
                {currentExerciseIndex + 1 < exercises.length
                  ? exercises[currentExerciseIndex + 1].name
                  : 'Finalizar treino'}
              </p>

              <button
                onClick={handleRestComplete}
                className="mt-8 text-xs text-vs-muted/50 underline underline-offset-2 active:text-vs-muted transition-colors"
              >
                Pular descanso
              </button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="execution"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col"
          >
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-vs-muted">
                  Exercício {currentExerciseIndex + 1} de {exercises.length}
                </span>
                <span className="text-xs text-vs-muted">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-vs-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
              <motion.div
                key={`${currentExerciseIndex}-${currentSet}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-center w-full"
              >
                <div className="w-20 h-20 rounded-2xl bg-vs-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Dumbbell className="w-10 h-10 text-vs-primary" />
                </div>

                <h1 className="text-2xl font-bold text-white mb-1">
                  {currentExercise.name}
                </h1>

                <div className="flex items-center justify-center gap-2 mb-6">
                  <Zap className="w-4 h-4 text-vs-primary" />
                  <span className="text-sm text-vs-muted">
                    Série {currentSet} de {safeTotalSets}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-6">
                  <Card className="text-center" padding={false}>
                    <div className="p-4">
                      <p className="text-xs text-vs-muted mb-0.5">Repetições</p>
                      <p className="text-xl font-bold text-white">
                        {currentExercise.reps || '—'}
                      </p>
                    </div>
                  </Card>

                  <Card className="text-center" padding={false}>
                    <div className="p-4">
                      <p className="text-xs text-vs-muted mb-0.5">Carga</p>
                      <p className="text-xl font-bold text-white">
                        {currentExercise.suggested_weight || '—'}
                      </p>
                    </div>
                  </Card>
                </div>

                {currentExercise.observation && (
                  <Card className="max-w-xs mx-auto mb-6">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-vs-primary mt-1.5 shrink-0" />
                      <p className="text-xs text-vs-muted text-left">
                        {currentExercise.observation}
                      </p>
                    </div>
                  </Card>
                )}

                {currentExercise.rest_seconds && currentExercise.rest_seconds > 0 && (
                  <div className="flex items-center justify-center gap-1.5 mb-6 text-xs text-vs-muted">
                    <Timer className="w-3.5 h-3.5" />
                    <span>
                      {currentExercise.rest_seconds}s de descanso após
                      concluir
                    </span>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full max-w-xs mx-auto !py-5 text-lg"
                  onClick={handleCompleteSet}
                >
                  {currentSet < safeTotalSets ? (
                    <>
                      <CheckCircle2 className="w-6 h-6" />
                      Concluir Série
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-6 h-6" />
                      {currentExerciseIndex + 1 < exercises.length
                        ? 'Última Série'
                        : 'Finalizar Treino'}
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
