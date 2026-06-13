import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Clock, CheckCircle2, Home, BarChart3 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EmptyState } from '../../components/ui/EmptyState';
import { supabase } from '../../lib/supabase';
import { formatTime, formatDateTime } from '../../lib/formatters';
import type { WorkoutLog } from '../../types/database';

export function WorkoutCompletedPage() {
  const { logId } = useParams<{ logId: string }>();
  const navigate = useNavigate();

  const [log, setLog] = useState<WorkoutLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!logId) return;
    loadLog();
  }, [logId]);

  async function loadLog() {
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('id', logId)
        .single();

      if (error) throw error;
      setLog(data);
    } catch (err) {
      console.error('Load log error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingScreen />;

  if (!log) {
    return (
      <EmptyState
        icon={<Trophy className="w-8 h-8 text-vs-muted" />}
        title="Registro não encontrado"
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

  const exercises = log.exercises_data || [];

  return (
    <div className="min-h-screen bg-vs-dark flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-24 h-24 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mb-6 shadow-lg shadow-yellow-500/20"
        >
          <Trophy className="w-12 h-12 text-white" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-3xl font-bold text-white text-center mb-2"
        >
          Treino Concluído!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-vs-muted text-sm text-center mb-10"
        >
          {exercises.length > 0
            ? `${exercises.length} exercício${exercises.length > 1 ? 's' : ''} realizado${exercises.length > 1 ? 's' : ''}`
            : 'Ótimo trabalho!'}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="w-full max-w-sm space-y-4"
        >
          {log.duration_seconds !== null && log.duration_seconds !== undefined && (
            <Card>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-vs-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-vs-primary" />
                </div>
                <div>
                  <p className="text-xs text-vs-muted">Tempo total</p>
                  <p className="text-2xl font-bold text-white">
                    {formatTime(log.duration_seconds)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {log.completed_at && (
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-vs-muted">Finalizado em</p>
                  <p className="text-sm font-semibold text-white">
                    {formatDateTime(log.completed_at)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {exercises.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-white mb-3">
                Exercícios Concluídos
              </h3>
              <div className="space-y-2">
                {exercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 py-2 border-b border-vs-border last:border-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {ex.exercise_name}
                      </p>
                      <p className="text-xs text-vs-muted">
                        {ex.sets_completed} série{ex.sets_completed > 1 ? 's' : ''}
                        {ex.reps_completed
                          ? ` x ${ex.reps_completed} reps`
                          : ''}
                        {ex.weight_used ? ` — ${ex.weight_used}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="px-6 pb-8 pt-4 space-y-3 max-w-sm mx-auto w-full"
      >
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => navigate('/student/home')}
        >
          <Home className="w-5 h-5" />
          Voltar ao Início
        </Button>

        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => navigate('/student/progress')}
        >
          <BarChart3 className="w-5 h-5" />
          Ver Progresso
        </Button>
      </motion.div>
    </div>
  );
}
