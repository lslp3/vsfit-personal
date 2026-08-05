/**
 * useTrainerAnalytics — hook único de analytics do Personal (Sprint 14).
 *
 * Responsabilidades:
 *  - buscar os dados necessários (students, payments, workout_logs);
 *  - chamar analyticsService.buildTrainerAnalytics;
 *  - expor { summary, loading, error, refresh() }.
 *
 * As páginas NÃO devem duplicar fetch nem cálculos de analytics depois
 * deste hook — DashboardPage/ReportsPage/ProgressPage podem consumi-lo
 * sem alterar comportamento visual.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import * as studentService from '../services/studentService';
import * as paymentService from '../services/paymentService';
import * as workoutService from '../services/workoutService';
import { buildTrainerAnalytics } from '../services/analyticsService';
import type {
  AnalyticsSummary,
  TrainerAnalyticsOptions,
  TrainerAnalyticsResult,
} from '../types/analytics';

export function useTrainerAnalytics(
  options?: TrainerAnalyticsOptions
): TrainerAnalyticsResult {
  const { trainerProfile } = useAuthStore();

  // Opções estáveis: o effect depende apenas do trainerId + tick de refresh.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [, setRefreshTick] = useState(0);

  const trainerId = trainerProfile?.id ?? null;

  useEffect(() => {
    if (!trainerId) {
      setSummary(null);
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

        const built = buildTrainerAnalytics(
          { students, payments, logs },
          optionsRef.current
        );

        setSummary(built);
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

  const refresh = useCallback(() => setRefreshTick((tick) => tick + 1), []);

  return { summary, loading, error, refresh };
}