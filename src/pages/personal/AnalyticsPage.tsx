/**
 * AnalyticsPage — tela de Analytics do Personal (Sprint 14, Fase 3).
 *
 * Consome exclusivamente a camada de analytics existente:
 *  - useTrainerAnalytics (fetch + buildTrainerAnalytics);
 *  - AnalyticsSummary (tipos);
 *  - componentes puros de src/components/dashboard/.
 *
 * Nenhum cálculo de analytics é duplicado aqui: a página apenas mapeia o
 * AnalyticsSummary para as props dos componentes.
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
} from 'lucide-react';
import { useState } from 'react';

import { useTrainerAnalytics } from '../../hooks/useTrainerAnalytics';
import { Header } from '../../components/ui/Header';
import { EmptyState } from '../../components/ui/EmptyState';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { RevenueChart } from '../../components/dashboard/RevenueChart';
import { WorkoutTrendChart } from '../../components/dashboard/WorkoutTrendChart';
import { StudentStatusChart } from '../../components/dashboard/StudentStatusChart';
import { AdherenceChart } from '../../components/dashboard/AdherenceChart';
import { VolumeProgressChart } from '../../components/dashboard/VolumeProgressChart';
import { RiskStudentsCard } from '../../components/dashboard/RiskStudentsCard';
import { formatCurrency } from '../../lib/formatters';
import type { AnalyticsSummary } from '../../types/analytics';

function formatVolume(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

function revenueTrend(summary: AnalyticsSummary): {
  trend: 'positive' | 'negative' | 'neutral';
  label: string;
} {
  const { revenueCurrentMonth, revenuePreviousMonth } = summary;

  if (revenuePreviousMonth <= 0) {
    if (revenueCurrentMonth > 0) return { trend: 'positive', label: 'vs mês anterior' };
    return { trend: 'neutral', label: 'Sem variação' };
  }

  const delta = ((revenueCurrentMonth - revenuePreviousMonth) / revenuePreviousMonth) * 100;
  const formatted = `${Math.abs(delta) >= 1 ? Math.round(Math.abs(delta)) : Math.abs(delta).toFixed(1)}%`;

  if (delta > 0) return { trend: 'positive', label: `+${formatted} vs mês anterior` };
  if (delta < 0) return { trend: 'negative', label: `−${formatted} vs mês anterior` };
  return { trend: 'neutral', label: 'Estável vs mês anterior' };
}

export function AnalyticsPage() {
  const { summary, loading, error, refresh } = useTrainerAnalytics();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    refresh();
    // Pequena pausa visual; o hook dispara a busca em seguida.
    setTimeout(() => setRefreshing(false), 600);
  }

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
        <Header title="Analytics" showBack />
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
        <Header title="Analytics" showBack />
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

  const revenue = revenueTrend(summary);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header
        title="Analytics"
        showBack
        right={
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Atualizar analytics"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-300 transition-all active:scale-90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="mx-auto max-w-lg space-y-5 px-4 pb-32 pt-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            title="Alunos ativos"
            value={summary.activeStudents}
            description={`${summary.pausedStudents} pausados · ${summary.inactiveStudents} inativos`}
            trend={summary.newStudentsPeriod > 0 ? 'positive' : 'neutral'}
            trendLabel={`${summary.newStudentsPeriod} novos no período`}
            icon={Users}
          />

          <MetricCard
            title="Receita do mês"
            value={formatCurrency(summary.revenueCurrentMonth)}
            trend={revenue.trend}
            trendLabel={revenue.label}
            icon={DollarSign}
          />

          <MetricCard
            title="Treinos concluídos"
            value={summary.completedWorkouts}
            description={`${summary.completionRate}% de conclusão`}
            trend={summary.completedWorkouts > 0 ? 'positive' : 'neutral'}
            trendLabel={`${summary.totalWorkouts} no total`}
            icon={Dumbbell}
          />

          <MetricCard
            title="Frequência semanal"
            value={summary.weeklyFrequency.toFixed(1)}
            description={`${summary.averageWorkoutsPerStudent.toFixed(1)} treinos/aluno`}
            trend="neutral"
            icon={Timer}
          />

          <MetricCard
            title="Novos alunos"
            value={summary.newStudentsPeriod}
            description="Nos últimos 30 dias"
            trend={summary.newStudentsPeriod > 0 ? 'positive' : 'neutral'}
            icon={UserPlus}
          />

          <MetricCard
            title="Volume total"
            value={`${formatVolume(summary.totalVolume)} kg`}
            description={`${formatVolume(summary.averageVolumePerWorkout)} kg/treino médio`}
            trend={summary.totalVolume > 0 ? 'positive' : 'neutral'}
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

        {/* Séries: receita + treinos */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RevenueChart data={summary.monthlyRevenueSeries} />
          <WorkoutTrendChart data={summary.workoutSeries} />
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
            average={summary.weeklyFrequency}
            ranking={summary.topActiveStudents}
          />
        </div>

        {/* Volume */}
        <VolumeProgressChart data={summary.volumeTrend} />

        {/* Alunos em risco */}
        <RiskStudentsCard students={summary.studentsAtRisk} />
      </div>
    </div>
  );
}

export default AnalyticsPage;
