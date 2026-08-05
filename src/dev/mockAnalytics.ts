/**
 * Dados mockados (dev-only) para validação visual da Fase 2.
 * Cobre: valores normais, zerados, altos, listas vazias e labels longos.
 * NÃO usado em produção — apenas em AnalyticsPreviewDev.
 */
import type { RevenuePoint, WorkoutTrendPoint, StudentRisk } from '../types/analytics';
import type { AdherenceDatum } from '../components/dashboard';
import type { VolumePoint } from '../components/dashboard';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const mRevenue: RevenuePoint[] = [
  { month: 'Jan', value: 3200 },
  { month: 'Fev', value: 4100 },
  { month: 'Mar', value: 2500 },
  { month: 'Abr', value: 0 },
  { month: 'Mai', value: 5200 },
  { month: 'Jun', value: 4800 },
  { month: 'Jul', value: 0 },
  { month: 'Ago', value: 6100 },
  { month: 'Set', value: 5400 },
  { month: 'Out', value: 7200 },
  { month: 'Nov', value: 6900 },
  { month: 'Dez', value: 8300 },
];

export const mRevenueZero: RevenuePoint[] = MONTHS.map((month) => ({ month, value: 0 }));

export const mRevenueHigh: RevenuePoint[] = MONTHS.map((month, i) => ({
  month,
  value: 45000 + i * 12000,
}));

export const mWorkouts: WorkoutTrendPoint[] = [
  { month: 'Jan', workouts: 22 },
  { month: 'Fev', workouts: 18 },
  { month: 'Mar', workouts: 0 },
  { month: 'Abr', workouts: 31 },
  { month: 'Mai', workouts: 27 },
  { month: 'Jun', workouts: 25 },
  { month: 'Jul', workouts: 0 },
  { month: 'Ago', workouts: 34 },
  { month: 'Set', workouts: 29 },
  { month: 'Out', workouts: 38 },
  { month: 'Nov', workouts: 33 },
  { month: 'Dez', workouts: 40 },
];

export const mWorkoutsHigh: WorkoutTrendPoint[] = MONTHS.map((month, i) => ({
  month,
  workouts: 90 + i * 15,
}));

export const mVolume: VolumePoint[] = [
  { date: '2026-05-04', value: 3200 },
  { date: '2026-05-09', value: 3450 },
  { date: '2026-05-14', value: 0 },
  { date: '2026-05-20', value: 3900 },
  { date: '2026-05-26', value: 4100 },
  { date: '2026-06-02', value: 4480 },
  { date: '2026-06-09', value: 4200 },
  { date: '2026-06-16', value: 5100 },
  { date: '2026-06-23', value: 5400 },
  { date: '2026-06-30', value: 0 },
  { date: '2026-07-07', value: 5800 },
];

export const mVolumeEmpty: VolumePoint[] = [];

export const mAdherence: AdherenceDatum[] = [
  { studentName: 'Ana Maria Oliveira Santos', weeklyAverage: 3.2 },
  { studentName: 'João Carlos Pereira Lima', weeklyAverage: 1.5 },
  { studentName: 'Mariane Ferreira da Silva', weeklyAverage: 2.8 },
  { studentName: 'Pedro Augusto de Almeida', weeklyAverage: 0 },
  { studentName: 'Beatriz', weeklyAverage: 4.0 },
];

export const mAdherenceEmpty: AdherenceDatum[] = [];

export const mRisk: StudentRisk[] = [
  {
    studentId: 's1',
    studentName: 'João Carlos Pereira Lima',
    reasons: ['Sem treino concluído há 7 dias ou mais', 'Pagamento atrasado'],
    lastWorkout: '2026-07-25T14:00:00.000Z',
    paymentStatus: 'overdue',
    riskLevel: 'high',
  },
  {
    studentId: 's2',
    studentName: 'Pedro Augusto de Almeida Silva',
    reasons: ['Sem treino concluído há 7 dias ou mais'],
    lastWorkout: null,
    paymentStatus: 'pending',
    riskLevel: 'medium',
  },
  {
    studentId: 's3',
    studentName: 'Mariane',
    reasons: ['Pagamento atrasado'],
    lastWorkout: '2026-08-01T09:30:00.000Z',
    paymentStatus: 'overdue',
    riskLevel: 'high',
  },
];

export const mRiskEmpty: StudentRisk[] = [];

/** Média semanal do grupo usada como linha de referência do AdherenceChart. */
export const mAdherenceAverage = 2.3;