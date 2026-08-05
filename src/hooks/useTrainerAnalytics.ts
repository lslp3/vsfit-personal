/**
 * useTrainerAnalytics — hook único de analytics do Personal (Sprint 14).
 *
 * Responsabilidades:
 *  - buscar os dados necessários (students, payments, workout_logs);
 *  - chamar analyticsService.buildTrainerAnalytics com o período ativo;
 *  - expor { summary, loading, error, refresh() }.
 *
 * O fetch (effect) roda apenas quando o trainer muda ou via `refresh()`.
 * O build (useMemo) recalcula quando o período (`options`) muda, sem refetch —
 * assim trocar o filtro do painel é instantâneo.
 *
 * As páginas NÃO devem duplicar fetch nem cálculos de analytics depois
 * deste hook — DashboardPage/ReportsPage/ProgressPage podem consumi-lo
 * sem alterar comportamento visual.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import * as studentService from '../services/studentService';
import * as paymentService from '../services/paymentService';
import * as workoutService from '../services/workoutService';
import { buildTrainerAnalytics } from '../services/analyticsService';
import type {
  AnalyticsSummary,
  TrainerAnalyticsInput,
  TrainerAnalyticsOptions,
  TrainerAnalyticsResult,
} from '../types/analytics';

export function useTrainerAnalytics(
  options?: TrainerAnalyticsOptions
): TrainerAnalyticsResult {
  const { trainerProfile } = useAuthStore();

  const [raw, setRaw] = useState<TrainerAnalyticsInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [, setRefreshTick] = useState(0);

  const trainerId = trainerProfile?.id ?? null;

  // Fetch: só muda quando o trainer muda ou o usuário pede refresh.
  useEffect(() => {
    if (!trainerId) {
      setRaw(null);
      setLoading(false);
      return;
    }

    let active = true;

    setLoading(true);
    setError('');

    (async () => {
      try {
        const [students, payments, logs] = await Promise.all([
          studentService.getStudentsByTrainer(trainerId),
          paymentService.getPaymentsByTrainer(trainerId),
          workoutService.getWorkoutLogsByTrainer(trainerId),
        ]);

        if (!active) return;

        setRaw({ students, payments, logs });
      } catch (err) {
        console.error('[useTrainerAnalytics] load error:', err);
        if (active) setError('Erro ao carregar analytics.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [trainerId, setRefreshTick]);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Build: recalculado quando os dados OU o período (`options`) mudam.
  const summary = useMemo<AnalyticsSummary | null>(() => {
    if (!raw) return null;
    return buildTrainerAnalytics(raw, optionsRef.current);
  }, [raw, options]);

  const refresh = useCallback(() => setRefreshTick((tick) => tick + 1), []);

  return { summary, loading, error, refresh };
}