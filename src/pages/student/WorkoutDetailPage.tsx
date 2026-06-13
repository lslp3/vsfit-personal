import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Dumbbell,
  Clock,
  Target,
  Layers,
  Timer,
  ChevronLeft,
  Play,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EmptyState } from '../../components/ui/EmptyState';
import { getWorkoutPlanById } from '../../services/workoutService';
import { getWeekdayName } from '../../lib/utils';
import type { WorkoutPlan, WorkoutPlanExercise } from '../../types/database';

interface PlanWithExercises extends WorkoutPlan {
  workout_plan_exercises: WorkoutPlanExercise[];
}

export function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<PlanWithExercises | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadPlan();
  }, [id]);

  async function loadPlan() {
    try {
      const data = await getWorkoutPlanById(id!);
      setPlan(data as PlanWithExercises);
    } catch (err) {
      console.error('Load plan error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingScreen />;

  if (!plan) {
    return (
      <EmptyState
        icon={<Dumbbell className="w-8 h-8 text-vs-muted" />}
        title="Treino não encontrado"
        description="Este plano de treino não está disponível."
        action={
          <Button
            variant="secondary"
            onClick={() => navigate('/student/workouts')}
          >
            Voltar
          </Button>
        }
      />
    );
  }

  const exercises =
    plan.workout_plan_exercises?.sort(
      (a, b) => a.order_index - b.order_index
    ) || [];

  const grouped = exercises.reduce<Record<string, WorkoutPlanExercise[]>>(
    (acc, ex) => {
      const key = ex.day_key || '_default';
      if (!acc[key]) acc[key] = [];
      acc[key].push(ex);
      return acc;
    },
    {}
  );

  const hasDayGroups = Object.keys(grouped).length > 1;

  return (
    <div className="min-h-screen bg-vs-dark">
      <div className="max-w-lg mx-auto">
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-5 h-5 text-vs-muted" />
          </button>
        </div>

        <div className="px-4 space-y-6 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-14 h-14 rounded-2xl bg-vs-primary/15 flex items-center justify-center mb-4">
              <Dumbbell className="w-7 h-7 text-vs-primary" />
            </div>
            <h1 className="text-2xl font-bold text-white">{plan.name}</h1>
            {plan.objective && (
              <p className="text-sm text-vs-muted mt-1">{plan.objective}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-3 gap-3"
          >
            {plan.level && (
              <Card className="text-center" padding={false}>
                <div className="p-3">
                  <Layers className="w-5 h-5 text-vs-primary mx-auto mb-1" />
                  <p className="text-xs text-vs-muted">Nível</p>
                  <p className="text-sm font-semibold text-white">
                    {plan.level}
                  </p>
                </div>
              </Card>
            )}
            {plan.duration_minutes && (
              <Card className="text-center" padding={false}>
                <div className="p-3">
                  <Clock className="w-5 h-5 text-vs-primary mx-auto mb-1" />
                  <p className="text-xs text-vs-muted">Duração</p>
                  <p className="text-sm font-semibold text-white">
                    {plan.duration_minutes} min
                  </p>
                </div>
              </Card>
            )}
            <Card className="text-center" padding={false}>
              <div className="p-3">
                <Target className="w-5 h-5 text-vs-primary mx-auto mb-1" />
                <p className="text-xs text-vs-muted">Exercícios</p>
                <p className="text-sm font-semibold text-white">
                  {exercises.length}
                </p>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <h2 className="text-lg font-bold text-white mb-3">
              Exercícios
            </h2>

            {exercises.length === 0 ? (
              <Card>
                <p className="text-sm text-vs-muted text-center py-4">
                  Nenhum exercício neste plano.
                </p>
              </Card>
            ) : hasDayGroups ? (
              Object.entries(grouped).map(([dayKey, dayExercises]) => (
                <div key={dayKey} className="mb-4 last:mb-0">
                  {dayKey !== '_default' && (
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <div className="h-px flex-1 bg-vs-border" />
                      <span className="text-xs font-medium text-vs-primary uppercase tracking-wider">
                        {getWeekdayName(dayKey)}
                      </span>
                      <div className="h-px flex-1 bg-vs-border" />
                    </div>
                  )}
                  <div className="space-y-2">
                    {dayExercises.map((ex, idx) => (
                      <motion.div
                        key={ex.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: idx * 0.05,
                        }}
                      >
                        <Card>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-vs-primary">
                                {idx + 1}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-white">
                                {ex.name}
                              </h4>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                                {ex.sets && (
                                  <span className="text-xs text-vs-muted">
                                    <span className="text-vs-primary">
                                      {ex.sets}
                                    </span>{' '}
                                    séries
                                  </span>
                                )}
                                {ex.reps && (
                                  <span className="text-xs text-vs-muted">
                                    <span className="text-vs-primary">
                                      {ex.reps}
                                    </span>{' '}
                                    reps
                                  </span>
                                )}
                                {ex.rest_seconds && (
                                  <span className="text-xs text-vs-muted flex items-center gap-1">
                                    <Timer className="w-3 h-3" />
                                    {ex.rest_seconds}s descanso
                                  </span>
                                )}
                              </div>
                              {ex.observation && (
                                <p className="text-xs text-vs-muted/70 mt-1 italic">
                                  {ex.observation}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-2">
                {exercises.map((ex, idx) => (
                  <motion.div
                    key={ex.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <Card>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-vs-primary">
                            {idx + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-white">
                            {ex.name}
                          </h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                            {ex.sets && (
                              <span className="text-xs text-vs-muted">
                                <span className="text-vs-primary">
                                  {ex.sets}
                                </span>{' '}
                                séries
                              </span>
                            )}
                            {ex.reps && (
                              <span className="text-xs text-vs-muted">
                                <span className="text-vs-primary">
                                  {ex.reps}
                                </span>{' '}
                                reps
                              </span>
                            )}
                            {ex.rest_seconds && (
                              <span className="text-xs text-vs-muted flex items-center gap-1">
                                <Timer className="w-3 h-3" />
                                {ex.rest_seconds}s descanso
                              </span>
                            )}
                          </div>
                          {ex.suggested_weight && (
                            <p className="text-xs text-vs-muted mt-1">
                              Carga sugerida:{' '}
                              <span className="text-white">
                                {ex.suggested_weight}
                              </span>
                            </p>
                          )}
                          {ex.observation && (
                            <p className="text-xs text-vs-muted/70 mt-1 italic">
                              {ex.observation}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-vs-dark via-vs-dark to-transparent">
          <div className="max-w-lg mx-auto">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() =>
                navigate(`/student/workout-execution/${plan.id}`)
              }
            >
              <Play className="w-5 h-5" />
              Iniciar Treino
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
