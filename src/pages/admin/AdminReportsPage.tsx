import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { motion } from 'framer-motion';

import {
  Activity,
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Dumbbell,
  GraduationCap,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';

import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';

import {
  formatCurrency,
} from '../../lib/formatters';

import {
  getAdminReportsData,
  type AdminReportDistribution,
  type AdminReportMonth,
  type AdminReportsData,
} from '../../services/adminReportsService';

const emptyData:
AdminReportsData = {
  summary: {
    totalTrainers: 0,
    approvedCref: 0,
    pendingCref: 0,

    totalStudents: 0,
    activeStudents: 0,

    publishedPlans: 0,

    totalWorkoutLogs: 0,
    completedWorkouts: 0,

    activeSubscriptions: 0,
    activePaidSubscriptions: 0,

    approvedPayments: 0,
    confirmedRevenue: 0,
    currentMonthRevenue: 0,

    averageStudentsPerTrainer: 0,
    studentActivationRate: 0,
    workoutCompletionRate: 0,

    newTrainersCurrentMonth: 0,
    newStudentsCurrentMonth: 0,
  },

  months: [],

  planDistribution: [],
  crefDistribution: [],
  studentStatusDistribution: [],

  trainerRanking: [],
};

function escapeCsv(
  value: unknown
) {
  return `"${String(
    value ?? ''
  ).replace(/"/g, '""')}"`;
}

function exportReportsCsv(
  data: AdminReportsData
) {
  const rows: unknown[][] = [
    [
      'Relatório VSFit',
      new Date().toLocaleString(
        'pt-BR'
      ),
    ],

    [],

    [
      'Indicador',
      'Valor',
    ],

    [
      'Personais cadastrados',
      data.summary.totalTrainers,
    ],

    [
      'CREF aprovados',
      data.summary.approvedCref,
    ],

    [
      'CREF pendentes',
      data.summary.pendingCref,
    ],

    [
      'Alunos cadastrados',
      data.summary.totalStudents,
    ],

    [
      'Alunos ativos',
      data.summary.activeStudents,
    ],

    [
      'Planos de treino publicados',
      data.summary.publishedPlans,
    ],

    [
      'Treinos concluídos',
      data.summary.completedWorkouts,
    ],

    [
      'Assinaturas ativas',
      data.summary.activeSubscriptions,
    ],

    [
      'Assinaturas pagas ativas',
      data.summary
        .activePaidSubscriptions,
    ],

    [
      'Pagamentos aprovados',
      data.summary.approvedPayments,
    ],

    [
      'Receita confirmada',
      data.summary
        .confirmedRevenue.toFixed(2),
    ],

    [
      'Receita do mês',
      data.summary
        .currentMonthRevenue.toFixed(2),
    ],

    [],

    [
      'Mês',
      'Novos personais',
      'Novos alunos',
      'Treinos concluídos',
      'Pagamentos aprovados',
      'Receita',
    ],

    ...data.months.map(
      (month) => [
        month.label,
        month.trainers,
        month.students,
        month.completedWorkouts,
        month.approvedPayments,
        month.revenue.toFixed(2),
      ]
    ),

    [],

    [
      'Ranking de personais',
      'Email',
      'Plano',
      'Alunos',
      'Alunos ativos',
      'Treinos publicados',
      'Treinos concluídos',
      'Receita confirmada',
    ],

    ...data.trainerRanking.map(
      (trainer) => [
        trainer.name,
        trainer.email,
        trainer.plan,
        trainer.studentCount,
        trainer.activeStudents,
        trainer.publishedPlans,
        trainer.completedWorkouts,
        trainer.confirmedRevenue
          .toFixed(2),
      ]
    ),
  ];

  const csv = rows
    .map((row) =>
      row
        .map(escapeCsv)
        .join(';')
    )
    .join('\n');

  const blob =
    new Blob(
      [
        '\uFEFF',
        csv,
      ],
      {
        type:
          'text/csv;charset=utf-8;',
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement('a');

  link.href = url;

  link.download =
    `relatorio-vsfit-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

  document.body.appendChild(link);

  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string | number;
  detail?: string;

  icon: typeof Users;
  iconClass: string;
}) {
  return (
    <Card className="p-4">
      <Icon
        className={`h-5 w-5 ${iconClass}`}
      />

      <p className="mt-4 text-xl font-black text-white md:text-2xl">
        {value}
      </p>

      <p className="mt-1 text-xs text-zinc-500">
        {label}
      </p>

      {detail && (
        <p className="mt-2 text-[10px] text-zinc-600">
          {detail}
        </p>
      )}
    </Card>
  );
}

function DistributionRow({
  item,
  total,
  barClass,
}: {
  item:
    AdminReportDistribution;

  total: number;
  barClass: string;
}) {
  const percentage =
    total > 0
      ? (
          item.count /
          total
        ) * 100
      : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-zinc-400">
          {item.label}
        </span>

        <span className="text-xs font-black text-white">
          {item.count}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{
            width: 0,
          }}
          animate={{
            width:
              `${percentage}%`,
          }}
          transition={{
            duration: 0.45,
          }}
          className={`h-full rounded-full ${barClass}`}
        />
      </div>

      <p className="mt-1 text-right text-[9px] text-zinc-600">
        {percentage.toFixed(1)}%
      </p>
    </div>
  );
}

function RegistrationChart({
  months,
}: {
  months: AdminReportMonth[];
}) {
  const maximum =
    Math.max(
      ...months.flatMap(
        (month) => [
          month.trainers,
          month.students,
        ]
      ),
      1
    );

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-white">
            Novos cadastros
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Personais e alunos cadastrados por mês.
          </p>
        </div>

        <TrendingUp className="h-5 w-5 text-[#ff2a32]" />
      </div>

      <div className="mt-4 flex gap-4 text-[10px]">
        <span className="flex items-center gap-2 text-zinc-500">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#ff2a32]" />
          Personais
        </span>

        <span className="flex items-center gap-2 text-zinc-500">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-400" />
          Alunos
        </span>
      </div>

      <div className="mt-6 flex h-56 items-end gap-2 border-b border-white/[0.08]">
        {months.map((month) => {
          const trainerHeight =
            month.trainers > 0
              ? Math.max(
                  (
                    month.trainers /
                    maximum
                  ) * 100,
                  6
                )
              : 0;

          const studentHeight =
            month.students > 0
              ? Math.max(
                  (
                    month.students /
                    maximum
                  ) * 100,
                  6
                )
              : 0;

          return (
            <div
              key={month.key}
              className="flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              <div className="mb-2 text-center">
                <p className="text-[9px] text-zinc-500">
                  {month.trainers}/
                  {month.students}
                </p>
              </div>

              <div className="flex h-[170px] items-end justify-center gap-1">
                <motion.div
                  initial={{
                    height: 0,
                  }}
                  animate={{
                    height:
                      `${trainerHeight}%`,
                  }}
                  className="w-3 rounded-t bg-[#ff2a32]"
                />

                <motion.div
                  initial={{
                    height: 0,
                  }}
                  animate={{
                    height:
                      `${studentHeight}%`,
                  }}
                  className="w-3 rounded-t bg-blue-400"
                />
              </div>

              <p className="py-2 text-center text-[9px] font-bold text-zinc-600">
                {month.label}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function RevenueChart({
  months,
}: {
  months: AdminReportMonth[];
}) {
  const maximum =
    Math.max(
      ...months.map(
        (month) =>
          month.revenue
      ),
      1
    );

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-white">
            Receita confirmada
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Pagamentos aprovados em produção.
          </p>
        </div>

        <CircleDollarSign className="h-5 w-5 text-green-400" />
      </div>

      <div className="mt-6 flex h-56 items-end gap-2 border-b border-white/[0.08]">
        {months.map((month) => {
          const height =
            month.revenue > 0
              ? Math.max(
                  (
                    month.revenue /
                    maximum
                  ) * 100,
                  6
                )
              : 0;

          return (
            <div
              key={month.key}
              className="flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              <div className="mb-2 text-center">
                <p className="text-[9px] font-bold text-zinc-400">
                  {formatCurrency(
                    month.revenue
                  )}
                </p>

                <p className="text-[8px] text-zinc-600">
                  {
                    month.approvedPayments
                  }{' '}
                  pag.
                </p>
              </div>

              <div className="flex h-[170px] items-end justify-center">
                <motion.div
                  initial={{
                    height: 0,
                  }}
                  animate={{
                    height:
                      `${height}%`,
                  }}
                  className="w-8 max-w-full rounded-t bg-green-400"
                />
              </div>

              <p className="py-2 text-center text-[9px] font-bold text-zinc-600">
                {month.label}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function WorkoutChart({
  months,
}: {
  months: AdminReportMonth[];
}) {
  const maximum =
    Math.max(
      ...months.map(
        (month) =>
          month.completedWorkouts
      ),
      1
    );

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-white">
            Treinos concluídos
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Execuções concluídas pelos alunos.
          </p>
        </div>

        <Dumbbell className="h-5 w-5 text-purple-400" />
      </div>

      <div className="mt-6 flex h-56 items-end gap-2 border-b border-white/[0.08]">
        {months.map((month) => {
          const height =
            month.completedWorkouts >
            0
              ? Math.max(
                  (
                    month.completedWorkouts /
                    maximum
                  ) * 100,
                  6
                )
              : 0;

          return (
            <div
              key={month.key}
              className="flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              <p className="mb-2 text-center text-[10px] font-black text-white">
                {
                  month.completedWorkouts
                }
              </p>

              <div className="flex h-[170px] items-end justify-center">
                <motion.div
                  initial={{
                    height: 0,
                  }}
                  animate={{
                    height:
                      `${height}%`,
                  }}
                  className="w-8 max-w-full rounded-t bg-purple-400"
                />
              </div>

              <p className="py-2 text-center text-[9px] font-bold text-zinc-600">
                {month.label}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function AdminReportsPage() {
  const [
    data,
    setData,
  ] = useState<
    AdminReportsData
  >(emptyData);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const loadData =
    useCallback(async (
      refresh = false
    ) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const result =
          await getAdminReportsData();

        setData(result);
      } catch (loadError) {
        console.error(
          '[AdminReportsPage] load:',
          loadError
        );

        setError(
          'Não foi possível carregar os relatórios da plataforma.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const distributionTotals =
    useMemo(() => ({
      plans:
        data.planDistribution.reduce(
          (total, item) =>
            total + item.count,
          0
        ),

      cref:
        data.crefDistribution.reduce(
          (total, item) =>
            total + item.count,
          0
        ),

      students:
        data
          .studentStatusDistribution
          .reduce(
            (total, item) =>
              total + item.count,
            0
          ),
    }), [data]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff2a32]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <motion.div
        initial={{
          opacity: 0,
          y: -10,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-black text-white md:text-3xl">
            Relatórios e análises
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Crescimento, atividade, assinaturas e receita real da plataforma.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              exportReportsCsv(
                data
              )
            }
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-4 text-xs font-black text-white"
          >
            <Download className="h-4 w-4" />

            <span className="hidden sm:inline">
              Exportar
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              void loadData(true)
            }
            disabled={refreshing}
            aria-label="Atualizar relatórios"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-zinc-400 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-5 w-5 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="rounded-[18px] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-white">
            Visão geral
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Indicadores calculados diretamente com os dados cadastrados.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Personais"
            value={
              data.summary
                .totalTrainers
            }
            detail={`${
              data.summary
                .newTrainersCurrentMonth
            } novos neste mês`}
            icon={GraduationCap}
            iconClass="text-[#ff2a32]"
          />

          <MetricCard
            label="Alunos"
            value={
              data.summary
                .totalStudents
            }
            detail={`${
              data.summary
                .newStudentsCurrentMonth
            } novos neste mês`}
            icon={Users}
            iconClass="text-blue-400"
          />

          <MetricCard
            label="Treinos concluídos"
            value={
              data.summary
                .completedWorkouts
            }
            detail={`${
              data.summary
                .totalWorkoutLogs
            } execuções registradas`}
            icon={Dumbbell}
            iconClass="text-purple-400"
          />

          <MetricCard
            label="Receita confirmada"
            value={formatCurrency(
              data.summary
                .confirmedRevenue
            )}
            detail={`${formatCurrency(
              data.summary
                .currentMonthRevenue
            )} neste mês`}
            icon={CircleDollarSign}
            iconClass="text-green-400"
          />

          <MetricCard
            label="Alunos ativos"
            value={
              data.summary
                .activeStudents
            }
            detail={`${data.summary.studentActivationRate.toFixed(
              1
            )}% dos alunos`}
            icon={UserCheck}
            iconClass="text-green-400"
          />

          <MetricCard
            label="Treinos publicados"
            value={
              data.summary
                .publishedPlans
            }
            icon={BarChart3}
            iconClass="text-yellow-400"
          />

          <MetricCard
            label="Assinaturas pagas"
            value={
              data.summary
                .activePaidSubscriptions
            }
            detail={`${
              data.summary
                .activeSubscriptions
            } assinaturas ativas`}
            icon={ShieldCheck}
            iconClass="text-cyan-400"
          />

          <MetricCard
            label="Pagamentos aprovados"
            value={
              data.summary
                .approvedPayments
            }
            icon={CheckCircle2}
            iconClass="text-green-400"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <Activity className="h-5 w-5 text-blue-400" />

          <p className="mt-4 text-2xl font-black text-white">
            {data.summary.studentActivationRate.toFixed(
              1
            )}
            %
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Taxa de alunos ativos
          </p>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={{
                width: 0,
              }}
              animate={{
                width:
                  `${Math.min(
                    data.summary
                      .studentActivationRate,
                    100
                  )}%`,
              }}
              className="h-full rounded-full bg-blue-400"
            />
          </div>
        </Card>

        <Card className="p-5">
          <Dumbbell className="h-5 w-5 text-purple-400" />

          <p className="mt-4 text-2xl font-black text-white">
            {data.summary.workoutCompletionRate.toFixed(
              1
            )}
            %
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Taxa de conclusão dos registros
          </p>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={{
                width: 0,
              }}
              animate={{
                width:
                  `${Math.min(
                    data.summary
                      .workoutCompletionRate,
                    100
                  )}%`,
              }}
              className="h-full rounded-full bg-purple-400"
            />
          </div>
        </Card>

        <Card className="p-5">
          <Users className="h-5 w-5 text-[#ff2a32]" />

          <p className="mt-4 text-2xl font-black text-white">
            {data.summary.averageStudentsPerTrainer.toFixed(
              1
            )}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Média de alunos por personal
          </p>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RegistrationChart
          months={data.months}
        />

        <RevenueChart
          months={data.months}
        />
      </section>

      <section>
        <WorkoutChart
          months={data.months}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-base font-black text-white">
            Distribuição dos planos
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Assinaturas ativas por plano.
          </p>

          <div className="mt-6 space-y-4">
            {data.planDistribution.map(
              (item) => (
                <DistributionRow
                  key={item.key}
                  item={item}
                  total={
                    distributionTotals.plans
                  }
                  barClass={
                    item.key ===
                    'premium'
                      ? 'bg-yellow-400'
                      : item.key ===
                        'pro'
                      ? 'bg-blue-400'
                      : 'bg-zinc-500'
                  }
                />
              )
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-black text-white">
            Situação dos CREFs
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Estado real dos cadastros.
          </p>

          <div className="mt-6 space-y-4">
            {data.crefDistribution.map(
              (item) => (
                <DistributionRow
                  key={item.key}
                  item={item}
                  total={
                    distributionTotals.cref
                  }
                  barClass={
                    item.key ===
                    'approved'
                      ? 'bg-green-400'
                      : item.key ===
                        'pending'
                      ? 'bg-yellow-400'
                      : item.key ===
                        'rejected'
                      ? 'bg-red-400'
                      : 'bg-zinc-500'
                  }
                />
              )
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-black text-white">
            Situação dos alunos
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Ativos, pausados e inativos.
          </p>

          <div className="mt-6 space-y-4">
            {data
              .studentStatusDistribution
              .map((item) => (
                <DistributionRow
                  key={item.key}
                  item={item}
                  total={
                    distributionTotals.students
                  }
                  barClass={
                    item.key ===
                    'active'
                      ? 'bg-green-400'
                      : item.key ===
                        'paused'
                      ? 'bg-yellow-400'
                      : 'bg-zinc-500'
                  }
                />
              ))}
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-white">
            Atividade dos personais
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Ordenado por treinos concluídos, alunos ativos e quantidade de alunos.
          </p>
        </div>

        {data.trainerRanking.length ===
        0 ? (
          <EmptyState
            icon={
              <Award className="h-8 w-8 text-zinc-600" />
            }
            title="Nenhum personal cadastrado"
            description="Os personais aparecerão aqui após o cadastro."
          />
        ) : (
          <div className="space-y-3">
            {data.trainerRanking.map(
              (trainer, index) => (
                <Card
                  key={trainer.id}
                  className="p-4 md:p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff2a32]/15 text-sm font-black text-[#ff2a32]">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">
                            {trainer.name}
                          </p>

                          <p className="mt-1 truncate text-xs text-zinc-500">
                            {trainer.email}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase text-zinc-400">
                            {trainer.plan}
                          </span>

                          <span className="rounded-full border border-green-400/20 bg-green-400/[0.08] px-2.5 py-1 text-[10px] font-black uppercase text-green-300">
                            {
                              trainer.crefStatus
                            }
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4 md:grid-cols-6">
                        <div>
                          <p className="text-[9px] font-black uppercase text-zinc-600">
                            Alunos
                          </p>

                          <p className="mt-1 text-sm font-black text-white">
                            {
                              trainer.studentCount
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase text-zinc-600">
                            Ativos
                          </p>

                          <p className="mt-1 text-sm font-black text-green-300">
                            {
                              trainer.activeStudents
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase text-zinc-600">
                            Planos publicados
                          </p>

                          <p className="mt-1 text-sm font-black text-white">
                            {
                              trainer.publishedPlans
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase text-zinc-600">
                            Treinos concluídos
                          </p>

                          <p className="mt-1 text-sm font-black text-purple-300">
                            {
                              trainer.completedWorkouts
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase text-zinc-600">
                            Pagamentos
                          </p>

                          <p className="mt-1 text-sm font-black text-white">
                            {
                              trainer.approvedPayments
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase text-zinc-600">
                            Receita
                          </p>

                          <p className="mt-1 text-sm font-black text-green-300">
                            {formatCurrency(
                              trainer.confirmedRevenue
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            )}
          </div>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4">
        <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />

        <p className="text-xs leading-relaxed text-zinc-500">
          Todos os gráficos e indicadores desta tela são calculados com registros reais do Supabase. Pagamentos de teste, registros sem confirmação e cobranças entre personal e aluno não entram na receita da plataforma.
        </p>
      </div>
    </div>
  );
}

export default AdminReportsPage;