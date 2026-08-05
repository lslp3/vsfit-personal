/**
 * AnalyticsPreviewDev — página TEMPORÁRIA de validação visual da Fase 2.
 *
 * Renderiza todos os componentes de src/components/dashboard com dados
 * mockados, cobrindo: valores normais, zerados, altos, listas vazias e
 * labels longos. NÃO é rota de produção; NÃO faz fetch; NÃO acessa
 * Supabase. Usado apenas no ambiente de desenvolvimento/validação.
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
} from 'lucide-react';

import { MetricCard } from '../components/dashboard/MetricCard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { WorkoutTrendChart } from '../components/dashboard/WorkoutTrendChart';
import { StudentStatusChart } from '../components/dashboard/StudentStatusChart';
import { AdherenceChart } from '../components/dashboard/AdherenceChart';
import { RiskStudentsCard } from '../components/dashboard/RiskStudentsCard';
import { VolumeProgressChart } from '../components/dashboard/VolumeProgressChart';

import {
  mRevenue,
  mRevenueHigh,
  mRevenueZero,
  mWorkouts,
  mWorkoutsHigh,
  mVolume,
  mVolumeEmpty,
  mAdherence,
  mAdherenceEmpty,
  mRisk,
  mRiskEmpty,
  mAdherenceAverage,
} from './mockAnalytics';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-2 mb-2 text-xs font-black uppercase tracking-widest text-vs-muted">
      {children}
    </h2>
  );
}

/**
 * Componente de preview de toda a camada visual de analytics da Fase 2.
 * Importar e montar em qualquer lugar para inspeção visual em dev.
 */
export function AnalyticsPreviewDev() {
  return (
    <div className="min-h-screen bg-vs-dark p-4 text-vs-text">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div>
          <h1 className="text-xl font-black text-white">Preview Analytics — Fase 2</h1>
          <p className="text-xs text-vs-muted">
            Valores normais · zerados · altos · vazios · labels longos
          </p>
        </div>

        {/* KPIs */}
        <section>
          <SectionTitle>MetricCard — KPIs</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              title="Alunos ativos"
              value="32"
              description="+12% este mês"
              trend="positive"
              trendLabel="+12%"
              icon={Users}
            />
            <MetricCard
              title="Treinos concluídos"
              value="148"
              description="Média 2.4/sem"
              trend="positive"
              trendLabel="+8 treinos"
              icon={Dumbbell}
            />
            <MetricCard
              title="Receita mensal"
              value="R$ 5.420"
              trend="negative"
              trendLabel="−6% vs mês anterior"
              icon={DollarSign}
            />
            <MetricCard
              title="Novos alunos"
              value="0"
              description="Nenhum no período"
              trend="neutral"
              icon={UserPlus}
            />
            <MetricCard
              title="Volume total"
              value="123.450"
              description="kg no período"
              trend="positive"
              trendLabel="+1.2t"
              icon={BarChart3}
            />
            <MetricCard
              title="Frequência semanal média do grupo de alunos ativos"
              value="2.4"
              trend="neutral"
              icon={Timer}
            />
            <MetricCard
              title="Pagamentos atrasados"
              value="0"
              description="Nenhum pendente"
              trend="neutral"
              icon={Wallet}
            />
            <MetricCard
              title="Faturamento anual recorrente total estimado"
              value="R$ 98.765"
              trend="positive"
              trendLabel="+18%"
              icon={AlertTriangle}
            />
          </div>
        </section>

        {/* Gráficos de série */}
        <section>
          <SectionTitle>Gráficos de série</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <RevenueChart data={mRevenue} />
            <WorkoutTrendChart data={mWorkouts} />
            <RevenueChart data={mRevenueHigh} />
            <WorkoutTrendChart data={mWorkoutsHigh} />
            <RevenueChart data={mRevenueZero} />
          </div>
        </section>

        {/* Donut de status */}
        <section>
          <SectionTitle>StudentStatusChart — donut</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StudentStatusChart active={22} inactive={6} paused={4} />
            <StudentStatusChart active={0} inactive={0} paused={0} />
          </div>
        </section>

        {/* Adesão */}
        <section>
          <SectionTitle>AdherenceChart — frequência (labels longos + vazio)</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdherenceChart data={mAdherence} average={mAdherenceAverage} />
            <AdherenceChart data={mAdherenceEmpty} average={0} />
          </div>
        </section>

        {/* Volume */}
        <section>
          <SectionTitle>VolumeProgressChart — evolução de volume</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <VolumeProgressChart data={mVolume} />
            <VolumeProgressChart data={mVolumeEmpty} />
          </div>
        </section>

        {/* Risco */}
        <section>
          <SectionTitle>RiskStudentsCard — atenção (labels longos + vazio)</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <RiskStudentsCard students={mRisk} />
            <RiskStudentsCard students={mRiskEmpty} />
          </div>
        </section>
      </div>
    </div>
  );
}

export default AnalyticsPreviewDev;