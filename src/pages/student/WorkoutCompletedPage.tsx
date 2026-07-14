import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Dumbbell,
  Flame,
  Home,
  Loader2,
  Share2,
  Trophy,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { formatTime, formatDateTime } from '../../lib/formatters';
import type { WorkoutLog } from '../../types/database';

function normalizeExercises(value: any) {
  return Array.isArray(value) ? value : [];
}

export function WorkoutCompletedPage() {
  const params = useParams<{ id?: string; logId?: string }>();
  const navigate = useNavigate();

  const logId = params.id || params.logId || '';

  const [log, setLog] = useState<WorkoutLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!logId) {
      setError('ID do treino concluído não encontrado.');
      setLoading(false);
      return;
    }

    loadLog();
  }, [logId]);

  async function loadLog() {
    setLoading(true);
    setError('');

    try {
      const { data, error: logError } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('id', logId)
        .maybeSingle();

      if (logError) throw logError;

      if (!data) {
        setError('Registro do treino não encontrado.');
        setLog(null);
        return;
      }

      setLog(data);
    } catch (err: any) {
      console.error('[WorkoutCompletedPage] loadLog error:', err);
      setError(err?.message || 'Erro ao carregar resumo do treino.');
      setLog(null);
    } finally {
      setLoading(false);
    }
  }

  const exercises = useMemo(() => normalizeExercises((log as any)?.exercises_data), [log]);

  const totalSets = useMemo(() => {
    return exercises.reduce((sum: number, exercise: any) => {
      const parsed = Number(exercise?.sets_completed || 0);

      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);
  }, [exercises]);

  function handleShareSummary() {
    if (!log) return;

    const text = [
      'Treino concluído no VSFit Personal!',
      log.duration_seconds ? `Tempo total: ${formatTime(log.duration_seconds)}` : '',
      exercises.length ? `Exercícios: ${exercises.length}` : '',
      totalSets ? `Séries concluídas: ${totalSets}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-[#ff2a32]/25 bg-[#ff2a32]/15">
            <Loader2 className="h-8 w-8 animate-spin text-[#ff2a32]" />
          </div>

          <p className="text-[13px] font-black text-white">Carregando resumo...</p>
        </div>
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="min-h-screen bg-[#050505] px-4 pb-24 pt-8 text-white">
        <div className="mx-auto max-w-lg rounded-[24px] border border-red-500/20 bg-red-500/10 p-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-300">
            <AlertCircle className="h-7 w-7" />
          </div>

          <h1 className="mt-3 text-lg font-black text-white">Registro não encontrado</h1>

          <p className="mt-1.5 text-[13px] leading-relaxed text-red-200/80">
            {error || 'Não encontramos o resumo desse treino.'}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={loadLog}
              className="h-11 rounded-2xl border border-white/10 bg-white/[0.06] text-[13px] font-black text-white"
            >
              TENTAR
            </button>

            <button
              type="button"
              onClick={() => navigate('/student/home')}
              className="h-11 rounded-2xl bg-[#ff2a32] text-[13px] font-black text-white"
            >
              INÍCIO
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 pb-10 pt-4 text-white">
      <div className="mx-auto max-w-lg">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[24px] border border-yellow-400/20 bg-gradient-to-br from-yellow-500/18 via-white/[0.045] to-white/[0.025] p-4 text-center shadow-[0_30px_100px_rgba(0,0,0,0.55)]"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-[0_24px_70px_rgba(251,191,36,0.3)]"
          >
            <Trophy className="h-10 w-10" />
          </motion.div>

          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">
            Parabéns
          </p>

          <h1 className="mt-1.5 text-[22px] font-black uppercase italic leading-none tracking-[-0.07em] text-white">
            Treino concluído!
          </h1>

          <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
            Você finalizou seu treino com sucesso. Continue firme na sua evolução.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-[18px] border border-white/10 bg-black/20 p-2.5 text-center">
              <Clock className="mx-auto mb-1.5 h-4 w-4 text-[#ff2a32]" />

              <p className="text-[13px] font-black text-white">
                {log.duration_seconds ? formatTime(log.duration_seconds) : '--'}
              </p>

              <p className="text-[8px] font-black uppercase tracking-wide text-zinc-600">
                Tempo
              </p>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-black/20 p-2.5 text-center">
              <Dumbbell className="mx-auto mb-1.5 h-4 w-4 text-emerald-400" />

              <p className="text-[13px] font-black text-white">{exercises.length}</p>

              <p className="text-[8px] font-black uppercase tracking-wide text-zinc-600">
                Exerc.
              </p>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-black/20 p-2.5 text-center">
              <Flame className="mx-auto mb-1.5 h-4 w-4 text-yellow-400" />

              <p className="text-[13px] font-black text-white">{totalSets}</p>

              <p className="text-[8px] font-black uppercase tracking-wide text-zinc-600">
                Séries
              </p>
            </div>
          </div>
        </motion.section>

        <section className="mt-3 rounded-[22px] border border-white/10 bg-white/[0.035] p-3.5">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/12 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Finalizado em
              </p>

              <p className="text-[13px] font-black text-white">
                {log.completed_at ? formatDateTime(log.completed_at) : 'Agora'}
              </p>
            </div>
          </div>

          {exercises.length > 0 ? (
            <div className="space-y-1.5">
              {exercises.map((exercise: any, index: number) => (
                <div
                  key={`${exercise.exercise_name || 'exercise'}-${index}`}
                  className="flex items-center gap-2.5 rounded-2xl border border-white/5 bg-black/20 p-2.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-black text-white">
                      {exercise.exercise_name || 'Exercício'}
                    </p>

                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      {exercise.sets_completed || 0} série
                      {Number(exercise.sets_completed || 0) === 1 ? '' : 's'}
                      {exercise.reps_completed ? ` • ${exercise.reps_completed} reps` : ''}
                      {exercise.weight_used ? ` • ${exercise.weight_used}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-white/5 bg-black/20 p-3.5 text-center text-[13px] text-zinc-500">
              Exercícios não registrados nesse resumo.
            </p>
          )}
        </section>

        <section className="mt-3 rounded-[22px] border border-white/10 bg-white/[0.035] p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">
                Próximo passo
              </p>

              <h2 className="mt-1 text-base font-black text-white">Continue evoluindo</h2>
            </div>

            <CalendarDays className="h-4 w-4 text-[#ff2a32]" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/student/home')}
              className="flex h-11 items-center justify-center gap-2 rounded-[18px] bg-[#ff2a32] text-[12px] font-black uppercase tracking-wide text-white shadow-[0_18px_45px_rgba(255,42,48,0.34)] active:scale-[0.98]"
            >
              <Home className="h-4 w-4" />
              Início
            </button>

            <button
              type="button"
              onClick={() => navigate('/student/progress')}
              className="flex h-11 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.06] text-[12px] font-black uppercase tracking-wide text-white active:scale-[0.98]"
            >
              <BarChart3 className="h-4 w-4" />
              Progresso
            </button>
          </div>

          <button
            type="button"
            onClick={handleShareSummary}
            className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] text-[12px] font-black uppercase tracking-wide text-zinc-300 active:scale-[0.98]"
          >
            <Share2 className="h-4 w-4" />
            {copied ? 'Resumo copiado' : 'Copiar resumo'}
          </button>
        </section>
      </div>
    </div>
  );
}

export default WorkoutCompletedPage;