import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Dumbbell,
  Scale,
  Ruler,
  Activity,
  Flame,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { getWorkoutLogsByStudent } from '../../services/workoutService';
import { supabase } from '../../lib/supabase';
import { formatDate, formatTime } from '../../lib/formatters';
import type { WorkoutLog, StudentMetrics } from '../../types/database';

export function StudentProgressPage() {
  const { user, student: storeStudent, studentAccount, isLoading } = useAuthStore();

  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [metrics, setMetrics] = useState<StudentMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  const studentId = storeStudent?.id || studentAccount?.student_id;

  useEffect(() => {
    if (!user || !studentId) return;
    loadData();
  }, [user, studentId]);

  async function loadData() {
    try {
      const [logsData, metricsData] = await Promise.all([
        getWorkoutLogsByStudent(studentId!),
        supabase
          .from('student_metrics')
          .select('*')
          .eq('student_id', studentId!)
          .order('date', { ascending: true }),
      ]);

      setLogs(logsData);
      setMetrics((metricsData.data as StudentMetrics[]) || []);
    } catch (err) {
      console.error('Progress load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || isLoading || !studentId) return <LoadingScreen />;

  const completedLogs = logs.filter((l) => l.status === 'completed');
  const totalWorkouts = completedLogs.length;
  const totalTime = completedLogs.reduce(
    (acc, l) => acc + (l.duration_seconds || 0),
    0
  );
  const avgDuration =
    totalWorkouts > 0 ? Math.round(totalTime / totalWorkouts) : 0;

  const weightMetrics = metrics.filter((m) => m.weight !== null);
  const maxWeight = weightMetrics.length > 0
    ? Math.max(...weightMetrics.map((m) => m.weight!))
    : 0;

  return (
    <div className="page-container space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-white">Meu Progresso</h1>
        <p className="text-sm text-vs-muted mt-0.5">
          Acompanhe sua evolução
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        <Card className="text-center" padding={false}>
          <div className="p-3">
            <div className="w-8 h-8 rounded-lg bg-vs-primary/10 flex items-center justify-center mx-auto mb-1.5">
              <Dumbbell className="w-4 h-4 text-vs-primary" />
            </div>
            <p className="text-lg font-bold text-white">{totalWorkouts}</p>
            <p className="text-[10px] text-vs-muted">Treinos</p>
          </div>
        </Card>

        <Card className="text-center" padding={false}>
          <div className="p-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-1.5">
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-lg font-bold text-white">
              {formatTime(totalTime)}
            </p>
            <p className="text-[10px] text-vs-muted">Total</p>
          </div>
        </Card>

        <Card className="text-center" padding={false}>
          <div className="p-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center mx-auto mb-1.5">
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-lg font-bold text-white">
              {formatTime(avgDuration)}
            </p>
            <p className="text-[10px] text-vs-muted">Média</p>
          </div>
        </Card>
      </motion.div>

      {weightMetrics.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Scale className="w-4 h-4 text-vs-primary" />
              <h2 className="text-sm font-semibold text-white">
                Evolução do Peso
              </h2>
            </div>

            <div className="flex items-end gap-2 h-32">
              {weightMetrics.map((m, i) => {
                const heightPct =
                  maxWeight > 0 ? (m.weight! / maxWeight) * 100 : 0;
                return (
                  <div
                    key={m.id}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-[10px] text-vs-muted">
                      {m.weight}kg
                    </span>
                    <div className="w-full bg-white/5 rounded-t-lg overflow-hidden relative">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-vs-primary to-vs-primary/60 rounded-t-lg"
                        style={{ height: `${heightPct}%` }}
                      />
                      <div style={{ paddingBottom: '100%' }} />
                    </div>
                    <span className="text-[9px] text-vs-muted/60">
                      {formatDate(m.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {metrics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Ruler className="w-4 h-4 text-vs-primary" />
              <h2 className="text-sm font-semibold text-white">
                Medidas Corporais
              </h2>
            </div>

            <div className="space-y-3">
              {metrics
                .slice()
                .reverse()
                .slice(0, 5)
                .map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between py-2 border-b border-vs-border last:border-0"
                  >
                    <span className="text-xs text-vs-muted">
                      {formatDate(m.date)}
                    </span>
                    <div className="flex gap-4 text-xs">
                      {m.weight !== null && (
                        <span className="text-white">
                          {m.weight} kg
                        </span>
                      )}
                      {m.body_fat !== null && (
                        <span className="text-vs-muted">
                          {m.body_fat}% BF
                        </span>
                      )}
                      {m.muscle_mass !== null && (
                        <span className="text-vs-muted">
                          {m.muscle_mass} kg MM
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </motion.div>
      )}

      {completedLogs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-vs-primary" />
              <h2 className="text-sm font-semibold text-white">
                Histórico de Treinos
              </h2>
            </div>

            <div className="space-y-2">
              {completedLogs.slice(0, 10).map((log) => {
                const exCount = log.exercises_data?.length || 0;
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between py-2 border-b border-vs-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-vs-primary/10 flex items-center justify-center">
                        <Dumbbell className="w-3.5 h-3.5 text-vs-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-white">
                          {formatDate(log.completed_at || log.created_at)}
                        </p>
                        <p className="text-xs text-vs-muted">
                          {exCount} exercício{exCount !== 1 ? 's' : ''}
                          {log.duration_seconds
                            ? ` • ${formatTime(log.duration_seconds)}`
                            : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <span className="text-xs text-orange-400 font-medium">
                        {exCount > 0 ? `${exCount}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {totalWorkouts === 0 && metrics.length === 0 && (
        <EmptyState
          icon={<BarChart3 className="w-8 h-8 text-vs-muted" />}
          title="Nenhum progresso registrado ainda"
          description="Seu personal ainda não adicionou avaliações ou medidas."
        />
      )}
    </div>
  );
}
