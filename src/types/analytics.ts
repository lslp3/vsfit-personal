/**
 * Tipos da camada de Analytics do Personal (Sprint 14 — Fase 1).
 *
 * Modelo 100% em nível de tipo (erasableSyntaxOnly): sem enums, apenas
 * unions de strings. Apenas leitura de dados existentes — nenhum contrato
 * novo com o banco é introduzido aqui.
 */
import type { Payment, Student, WorkoutLog } from './database';

export type RiskLevel = 'high' | 'medium' | 'low';

/** Ponto de uma série mensal de receita (gráfico de barras/linha). */
export interface RevenuePoint {
  month: string;
  value: number;
}

/** Ponto de uma série mensal de treinos concluídos. */
export interface WorkoutTrendPoint {
  month: string;
  workouts: number;
}

/** Aluno por nº de treinos concluídos (ranking "mais ativos"). */
export interface TopActiveStudent {
  id: string;
  name: string;
  count: number;
}

/** Frequência semanal média por aluno (alimenta o AdherenceChart). */
export interface StudentAdherenceDatum {
  studentName: string;
  weeklyAverage: number;
}

/** Ponto da evolução de volume (kg) por treino (alimenta o VolumeProgressChart). */
export interface VolumeTrendPoint {
  date: string;
  value: number;
}

/**
 * Aluno em risco de evasão. Regra inicial (Fase 1):
 * - sem treino concluído há >= `riskInactiveDays` (padrão 7), OU
 * - com pagamento atrasado ('overdue').
 */
export interface StudentRisk {
  studentId: string;
  studentName: string;
  reasons: string[];
  /** Data ISO (yyyy-mm-dd) do último treino concluído, ou null. */
  lastWorkout: string | null;
  /** Status do último pagamento do aluno (ex.: 'paid' | 'pending' | 'overdue'), ou null. */
  paymentStatus: string | null;
  riskLevel: RiskLevel;
}

/**
 * Resumo consolidado de analytics do Personal.
 *
 * Campo mínimo exigido pela Sprint 14 + campos auxiliares que a camada
 * já deriva (financeiro, volume, intensidade) para servir a fase de
 * gráficos sem novo fetch.
 */
export interface AnalyticsSummary {
  // Alunos
  totalStudents: number;
  activeStudents: number;
  pausedStudents: number;
  inactiveStudents: number;
  newStudentsPeriod: number;

  // Treinos (workout_logs)
  totalWorkouts: number;
  completedWorkouts: number;
  /** 0-100 */
  completionRate: number;
  averageWorkoutsPerStudent: number;
  /** Média de treinos concluídos por semana (sobre o intervalo com dados). */
  weeklyFrequency: number;
  averageWorkoutDurationSeconds: number;
  totalSets: number;
  averageSetsPerWorkout: number;

  // Financeiro
  revenueCurrentMonth: number;
  revenuePreviousMonth: number;
  /** 12 pontos (Jan..Dez) do ano atual, em BRL. */
  monthlyRevenueSeries: RevenuePoint[];
  /** Receita recorrente mensal estimada (recebido no mês atual). */
  mrr: number;
  /** Ticket médio dos pagamentos pagos (BRL). */
  averageTicket: number;
  overduePaymentsCount: number;
  overdueAmount: number;
  /** Pagamentos 'pending' com vencimento em até `upcomingDueDays` dias. */
  upcomingPaymentsCount: number;
  upcomingAmount: number;

  // Volume / força
  totalVolume: number;
  averageVolumePerWorkout: number;
  /** Melhor 1RM (Epley) entre todos os exercícios/fichas do período, ou null. */
  best1RM: number | null;
  topExerciseByVolume: { name: string; volume: number } | null;

  // Séries / top / risco
  /** 12 pontos (Jan..Dez) do ano atual. */
  workoutSeries: WorkoutTrendPoint[];
  topActiveStudents: TopActiveStudent[];
  studentsAtRisk: StudentRisk[];

  // Derivadas para gráficos (Fase 3)
  /** Frequência semanal média por aluno (alimenta AdherenceChart). */
  studentAdherence: StudentAdherenceDatum[];
  /** Evolução de volume (kg) por treino (alimenta VolumeProgressChart). */
  volumeTrend: VolumeTrendPoint[];
}

/** Dados crus (já carregados) que alimentam o builder puro de analytics. */
export interface TrainerAnalyticsInput {
  students: Student[];
  payments: Payment[];
  logs: WorkoutLog[];
}

/**
 * Opções configuráveis da camada de analytics. `now` é injetável para
 * tornar os cálculos testáveis (determinismo temporal).
 */
export interface TrainerAnalyticsOptions {
  /** Janela (dias) p/ "novos alunos no período". Padrão 30. */
  periodDays?: number;
  /** Dias sem treino concluído que caracterizam risco. Padrão 7. */
  riskInactiveDays?: number;
  /** Dias à frente p/ considerar pagamento "próximo do vencimento". Padrão 7. */
  upcomingDueDays?: number;
  /** Referência temporal. Padrão `new Date()`. */
  now?: Date;
}

/** Synchronous face do `useTrainerAnalytics`. */
export interface TrainerAnalyticsResult {
  summary: AnalyticsSummary | null;
  loading: boolean;
  error: string;
  refresh: () => void;
}