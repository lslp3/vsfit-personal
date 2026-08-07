/**
 * AnalyticsPage — painel analítico do Personal (Sprint 14, Fase 4).
 *
 * Consome exclusivamente a camada de analytics:
 *  - useTrainerAnalytics (fetch + buildTrainerAnalytics) com período ativo;
 *  - AnalyticsSummary / KpiTrend / AnalyticsInsight (tipos);
 *  - componentes puros de src/components/dashboard/.
 *
 * Nenhum cálculo de analytics é duplicado aqui: a página apenas mapeia o
 * AnalyticsSummary para as props dos componentes. Toda regra de negócio
 * (janelas, tendências, insights) vive em analyticsService/useTrainerAnalytics.
 */
import {
  Users,
  Dumbbell,
  DollarSign,
  UserPlus,
  AlertTriangle,
  Wallet,
  Timer,
  BarChart3,
  RefreshCw,
  CalendarRange,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { useTrainerAnalytics } from '../../hooks/useTrainerAnalytics';
import { usePersonalPageHeader } from '../../lib/personalPageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { RevenueChart } from '../../components/dashboard/RevenueChart';
import { WorkoutTrendChart } from '../../components/dashboard/WorkoutTrendChart';
import { StudentStatusChart } from '../../components/dashboard/StudentStatusChart';
import { AdherenceChart } from '../../components/dashboard/AdherenceChart';
import { VolumeProgressChart } from '../../components/dashboard/VolumeProgressChart';
import { RiskStudentsCard } from '../../components/dashboard/RiskStudentsCard';
import { InsightsCard } from '../../components/dashboard/InsightsCard';
import { formatCurrency } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import type {
  AnalyticsPeriod,
  AnalyticsSummary,
  KpiTrend,
  TrainerAnalyticsOptions,
} from '../../types/analytics';

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'year', label: 'Ano' },
  { value: 'custom', label: 'Personalizado' },
];

function formatVolume(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

/** Converte KpiTrend (camada analytics) em trend/label do MetricCard. */
function toMetricTrend(trend: KpiTrend): {
  trend: 'positive' | 'negative' | 'neutral';
  label: string;
} {
  if (trend.percent === null) {
    if (trend.direction === 'up') return { trend: 'positive', label: 'Sem base anterior' };
    if (trend.direction === 'down') return { trend: 'negative', label: 'Sem base anterior' };
    return { trend: 'neutral', label: 'Sem variação' };
  }
  if (trend.direction === 'up') return { trend: 'positive', label: `${trend.label} vs período anterior` };
  if (trend.direction === 'down') return { trend: 'negative', label: `${trend.label} vs período anterior` };
  return { trend: 'neutral', label: `${trend.label} vs período anterior` };
}

function summaryKpis(summary: AnalyticsSummary) {
  return {
    revenue: toMetricTrend(summary.revenueTrend),
    workouts: toMetricTrend(summary.workoutTrend),
    frequency: toMetricTrend(summary.frequencyTrend),
    newStudents: toMetricTrend(summary.newStudentsTrend),
    volume: toMetricTrend(summary.volumeTrendKpi),
  };
}

export function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Período customizado: o usuário escolhe datas inclusivas; a camada espera
  // `end` exclusivo, então o dia seguinte é enviado.
  const options = useMemo<TrainerAnalyticsOptions>(() => {
    if (period !== 'custom') return { period };
    if (customStart && customEnd) {
      const endExclusive = new Date(`${customEnd}T23:59:59`);
      endExclusive.setDate(endExclusive.getDate() + 1);
      return {
        period: 'custom',
        customRange: {
          start: customStart,
          end: endExclusive.toISOString().slice(0, 10),
        },
      };
    }
    // Intervalo incompleto: mantém a janela padrão até o usuário aplicar.
    return { period: '30d' };
  }, [period, customStart, customEnd]);

  const { summary, loading, error, refresh } = useTrainerAnalytics(options);

  async function handleRefresh() {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 600);
  }

  // Header único = global do PersonalShell. Integra back + ação de refresh.
  usePersonalPageHeader({
    title: 'Analytics',
    back: true,
    right: (
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        aria-label="Atualizar analytics"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-300 transition-all active:scale-90 disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
      </button>
    ),
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#ff2a32] border-t-transparent" />
          <p className="text-sm font-medium text-zinc-500">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto max-w-lg px-4 pb-32 pt-5">
          <EmptyState
            title="Não foi possível carregar"
            description={error}
            action={
              <button
                type="button"
                onClick={handleRefresh}
                className="max-w-[220px] rounded-2xl bg-[#ff2a32] px-5 py-3 text-sm font-black text-white"
              >
                Tentar novamente
              </button>
            }
          />
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto max-w-lg px-4 pb-32 pt-5">
          <EmptyState
            icon={<BarChart3 className="h-8 w-8 text-zinc-700" />}
            title="Sem dados de analytics"
            description="Conecte alunos, cobranças e treinos para visualizar o painel analítico."
          />
        </div>
      </div>
    );
  }

  const kpis = summaryKpis(summary);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-lg space-y-5 px-4 pb-32 pt-5">
        {/* Filtro global de período */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CalendarRange className="h-4 w-4 shrink-0 text-vs-muted" />
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95',
                period === option.value
                  ? 'border-vs-primary bg-vs-primary text-white'
                  : 'border-white/10 bg-white/[0.06] text-zinc-300'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Intervalo personalizado */}
        {period === 'custom' && (
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <label className="flex-1">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-vs-muted">
                De
              </span>
              <input
                type="date"
                value={customStart}
                max={customEnd || undefined}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-vs-primary"
              />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-vs-muted">
                Até
              </span>
              <input
                type="date"
                value={customEnd}
                min={customStart || undefined}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-vs-primary"
              />
            </label>
          </div>
        )}

        {/* KPIs com tendência (período atual x anterior) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            title="Alunos ativos"
            value={summary.activeStudents}
            description={`${summary.pausedStudents} pausados · ${summary.inactiveStudents} inativos`}
            trend={kpis.newStudents.trend}
            trendLabel={`${summary.newStudentsInPeriod} novos no período`}
            icon={Users}
          />

          <MetricCard
            title="Receita no período"
            value={formatCurrency(summary.revenueInPeriod)}
            description={`Anterior: ${formatCurrency(summary.previousRevenueInPeriod)}`}
            trend={kpis.revenue.trend}
            trendLabel={kpis.revenue.label}
            icon={DollarSign}
          />

          <MetricCard
            title="Treinos concluídos"
            value={summary.workoutsInPeriod}
            description={`Anterior: ${summary.previousWorkoutsInPeriod}`}
            trend={kpis.workouts.trend}
            trendLabel={kpis.workouts.label}
            icon={Dumbbell}
          />

          <MetricCard
            title="Frequência semanal"
            value={summary.weeklyFrequencyInPeriod.toFixed(1)}
            description={`Anterior: ${summary.previousWeeklyFrequencyInPeriod.toFixed(1)}/semana`}
            trend={kpis.frequency.trend}
            trendLabel={kpis.frequency.label}
            icon={Timer}
          />

          <MetricCard
            title="Novos alunos"
            value={summary.newStudentsInPeriod}
            description={`Anterior: ${summary.previousNewStudentsInPeriod}`}
            trend={kpis.newStudents.trend}
            trendLabel={kpis.newStudents.label}
            icon={UserPlus}
          />

          <MetricCard
            title="Volume total"
            value={`${formatVolume(summary.totalVolume)} kg`}
            description={`${formatVolume(summary.averageVolumePerWorkout)} kg/treino médio`}
            trend={kpis.volume.trend}
            trendLabel={kpis.volume.label}
            icon={BarChart3}
          />

          <MetricCard
            title="Pagamentos atrasados"
            value={summary.overduePaymentsCount}
            description={formatCurrency(summary.overdueAmount)}
            trend={summary.overduePaymentsCount > 0 ? 'negative' : 'neutral'}
            trendLabel={
              summary.overduePaymentsCount > 0 ? 'Exigem atenção' : 'Tudo em dia'
            }
            icon={Wallet}
          />

          <MetricCard
            title="Alunos em risco"
            value={summary.studentsAtRisk.length}
            description="Sem treinar ou com pagamento atrasado"
            trend={summary.studentsAtRisk.length > 0 ? 'negative' : 'neutral'}
            icon={AlertTriangle}
          />
        </div>

        {/* Séries por período: receita + treinos */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RevenueChart
            data={summary.revenueSeries}
            title="Receita"
            subtitle={summary.periodLabel}
          />
          <WorkoutTrendChart
            data={summary.workoutSeriesByPeriod}
            title="Treinos concluídos"
            subtitle={summary.periodLabel}
          />
        </div>

        {/* Distribuição + aderência */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StudentStatusChart
            active={summary.activeStudents}
            paused={summary.pausedStudents}
            inactive={summary.inactiveStudents}
          />

          <AdherenceChart
            data={summary.studentAdherence}
            average={summary.weeklyFrequencyInPeriod}
            ranking={summary.topActiveStudents}
          />
        </div>

        {/* Volume */}
        <VolumeProgressChart data={summary.volumeTrend} />

        {/* Insights (Fase 4) */}
        <InsightsCard insights={summary.insights} periodLabel={summary.periodLabel} />

        {/* Alunos em risco */}
        <RiskStudentsCard students={summary.studentsAtRisk} />
      </div>
    </div>
  );
}

export default AnalyticsPage;
