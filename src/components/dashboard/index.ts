/**
 * Camada de componentes de Dashboard/Analytics (Sprint 14 — Fase 2).
 *
 * Todos os componentes são puros: recebem dados por props e NÃO buscam
 * dados nem acessam o Supabase. Consumo: `useTrainerAnalytics` (a futura
 * AnalyticsPage irá mapear o `AnalyticsSummary` para as props de cada um).
 */
export { MetricCard } from './MetricCard';
export type { MetricCardProps, MetricTrendType } from './MetricCard';

export { RevenueChart } from './RevenueChart';
export type { RevenueChartProps } from './RevenueChart';

export { WorkoutTrendChart } from './WorkoutTrendChart';
export type { WorkoutTrendChartProps } from './WorkoutTrendChart';

export { StudentStatusChart } from './StudentStatusChart';
export type { StudentStatusChartProps } from './StudentStatusChart';

export { AdherenceChart } from './AdherenceChart';
export type { AdherenceChartProps, AdherenceDatum } from './AdherenceChart';

export { RiskStudentsCard } from './RiskStudentsCard';
export type { RiskStudentsCardProps } from './RiskStudentsCard';

export { VolumeProgressChart } from './VolumeProgressChart';
export type { VolumePoint, VolumeProgressChartProps } from './VolumeProgressChart';

export { InsightsCard } from './InsightsCard';
export type { InsightsCardProps } from './InsightsCard';