import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Dumbbell,
  Clock,
  Target,
  Layers,
  CheckCircle2,
  ListTodo,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import {
  getWorkoutPlansByStudent,
  getWorkoutLogsByStudent,
} from '../../services/workoutService';
import { cn } from '../../lib/utils';
import { formatDate } from '../../lib/formatters';
import type { WorkoutPlan, WorkoutLog } from '../../types/database';

type FilterType = 'all' | 'today' | 'completed';

export function StudentWorkoutsPage() {
  const navigate = useNavigate();
  const { user, student: storeStudent, studentAccount, isLoading } = useAuthStore();

  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const studentId = storeStudent?.id || studentAccount?.student_id;

  useEffect(() => {
    if (!user || !studentId) return;
    loadData();
  }, [user, studentId]);

  async function loadData() {
    try {
      const [plansData, logsData] = await Promise.all([
        getWorkoutPlansByStudent(studentId!),
        getWorkoutLogsByStudent(studentId!),
      ]);

      setPlans(plansData.filter((p) => p.status === 'published'));
      setLogs(logsData);
    } catch (err) {
      console.error('Workouts load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || isLoading || !studentId) return <LoadingScreen />;

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'today', label: 'Hoje' },
    { key: 'completed', label: 'Concluídos' },
  ];

  const filteredPlans = plans.filter(() => {
    if (filter === 'all') return true;
    if (filter === 'today') return true;
    return true;
  });

  const completedPlanIds = new Set(
    logs
      .filter((l) => l.status === 'completed' && l.workout_plan_id)
      .map((l) => l.workout_plan_id!)
  );

  return (
    <div className="page-container space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-white">Meus Treinos</h1>
        <p className="text-sm text-vs-muted mt-0.5">
          {filter === 'all' && `${filteredPlans.length} planos disponíveis`}
          {filter === 'today' && 'Treinos para hoje'}
          {filter === 'completed' && `${logs.length} treinos realizados`}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex gap-2 overflow-x-auto hide-scrollbar pb-1"
      >
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'chip whitespace-nowrap transition-all',
              filter === f.key && 'chip-active'
            )}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {filter === 'completed' ? (
        logs.length === 0 ? (
          <EmptyState
            icon={<ListTodo className="w-8 h-8 text-vs-muted" />}
            title="Nenhum treino concluído"
            description="Complete seu primeiro treino para vê-lo aqui."
          />
        ) : (
          <div className="space-y-3">
            {logs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {formatDate(log.completed_at || log.created_at)}
                        </p>
                        <p className="text-xs text-vs-muted">
                          {log.duration_seconds
                            ? `${Math.floor(log.duration_seconds / 60)} min de treino`
                            : 'Treino realizado'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-green-400 font-medium">
                      {log.exercises_data?.length || 0} exercícios
                    </span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )
      ) : filteredPlans.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="w-8 h-8 text-vs-muted" />}
          title="Nenhum plano de treino"
          description="Seu personal trainer ainda não publicou nenhum treino para você."
        />
      ) : (
        <div className="space-y-3">
          {filteredPlans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card
                className="cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() =>
                  navigate(`/student/workout-detail/${plan.id}`)
                }
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-vs-primary/10 flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-vs-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {plan.name}
                      </h3>
                      {plan.objective && (
                        <p className="text-xs text-vs-muted">
                          {plan.objective}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                      completedPlanIds.has(plan.id)
                        ? 'text-green-400 border-green-500/30 bg-green-500/10'
                        : 'text-vs-primary border-vs-primary/30 bg-vs-primary/10'
                    )}
                  >
                    {completedPlanIds.has(plan.id) ? 'Concluído' : 'Ativo'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-vs-muted">
                  {plan.level && (
                    <div className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{plan.level}</span>
                    </div>
                  )}
                  {plan.duration_minutes && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{plan.duration_minutes} min</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" />
                    <span>{plan.objective || 'Geral'}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
