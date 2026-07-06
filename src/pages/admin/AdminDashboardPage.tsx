import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import { motion } from 'framer-motion';

import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  GraduationCap,
  Loader2,
  ReceiptText,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  Webhook,
} from 'lucide-react';

import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';

import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from '../../lib/formatters';

import {
  getAdminDashboardData,
  type AdminDashboardData,
  type AdminDashboardPlanDistribution,
} from '../../services/adminDashboardService';

import type {
  AdminPlanSlug,
} from '../../services/adminSubscriptionService';

const emptyData:
AdminDashboardData = {
  summary: {
    totalTrainers: 0,
    approvedTrainers: 0,
    pendingCref: 0,

    totalStudents: 0,
    activeStudents: 0,

    activeSubscriptions: 0,
    activePaidSubscriptions: 0,

    confirmedRevenue: 0,
    currentMonthRevenue: 0,

    approvedPayments: 0,
  },

  alerts: {
    pendingCref: 0,

    failedWebhooks: 0,
    openCheckouts: 0,

    legacyPaidSubscriptions: 0,

    unknownEnvironmentPayments: 0,

    firstPendingTrainerId: null,
  },

  planDistribution: [],

  monthlyRevenue: [],

  recentTrainers: [],
  recentPayments: [],
};

function getPlanLabel(
  plan: AdminPlanSlug
) {
  if (plan === 'premium') {
    return 'Premium';
  }

  if (plan === 'pro') {
    return 'Pro';
  }

  return 'Free';
}

function getPlanClass(
  plan: AdminPlanSlug
) {
  if (plan === 'premium') {
    return 'border-yellow-400/25 bg-yellow-400/10 text-yellow-300';
  }

  if (plan === 'pro') {
    return 'border-blue-400/25 bg-blue-400/10 text-blue-300';
  }

  return 'border-zinc-400/20 bg-zinc-400/10 text-zinc-400';
}

function getPaymentStatusLabel(
  status: string
) {
  const labels:
    Record<string, string> = {
    approved: 'Aprovado',
    pending: 'Pendente',
    authorized: 'Autorizado',
    in_process: 'Em análise',
    in_mediation: 'Em mediação',
    rejected: 'Rejeitado',
    cancelled: 'Cancelado',
    canceled: 'Cancelado',
    failed: 'Falhou',
    refunded: 'Reembolsado',
    partially_refunded:
      'Reembolso parcial',
    charged_back: 'Contestado',
  };

  return labels[status] ||
    status;
}

function getPaymentStatusClass(
  status: string
) {
  if (status === 'approved') {
    return 'border-green-400/25 bg-green-400/10 text-green-300';
  }

  if (
    [
      'pending',
      'authorized',
      'in_process',
      'in_mediation',
    ].includes(status)
  ) {
    return 'border-yellow-400/25 bg-yellow-400/10 text-yellow-300';
  }

  if (
    [
      'refunded',
      'partially_refunded',
    ].includes(status)
  ) {
    return 'border-blue-400/25 bg-blue-400/10 text-blue-300';
  }

  return 'border-red-400/25 bg-red-400/10 text-red-300';
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

function AlertCard({
  title,
  value,
  description,
  icon: Icon,
  danger = false,
  warning = false,
  onClick,
}: {
  title: string;
  value: number;
  description: string;

  icon: typeof ShieldCheck;

  danger?: boolean;
  warning?: boolean;

  onClick: () => void;
}) {
  const normal =
    value === 0;

  const containerClass =
    normal
      ? 'border-green-400/15 bg-green-400/[0.05]'
      : danger
      ? 'border-red-400/20 bg-red-400/[0.08]'
      : warning
      ? 'border-yellow-400/20 bg-yellow-400/[0.08]'
      : 'border-blue-400/20 bg-blue-400/[0.08]';

  const iconClass =
    normal
      ? 'text-green-400'
      : danger
      ? 'text-red-400'
      : warning
      ? 'text-yellow-400'
      : 'text-blue-400';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[20px] border p-4 text-left transition hover:brightness-110 ${containerClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <Icon
          className={`h-5 w-5 ${iconClass}`}
        />

        <ArrowRight className="h-4 w-4 text-zinc-600" />
      </div>

      <p className="mt-4 text-2xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-xs font-black text-zinc-300">
        {title}
      </p>

      <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
        {normal
          ? 'Nenhuma pendência encontrada.'
          : description}
      </p>
    </button>
  );
}

function PlanDistributionRow({
  item,
  total,
}: {
  item:
    AdminDashboardPlanDistribution;

  total: number;
}) {
  const percentage =
    total > 0
      ? (
          item.count /
          total
        ) * 100
      : 0;

  const barClass =
    item.plan === 'premium'
      ? 'bg-yellow-400'
      : item.plan === 'pro'
      ? 'bg-blue-400'
      : 'bg-zinc-500';

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
            duration: 0.4,
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

export function AdminDashboardPage() {
  const navigate =
    useNavigate();

  const [
    data,
    setData,
  ] = useState<
    AdminDashboardData
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
          await getAdminDashboardData();

        setData(result);
      } catch (loadError) {
        console.error(
          '[AdminDashboardPage] load:',
          loadError
        );

        setError(
          'Não foi possível carregar o painel administrativo.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeSubscriptionTotal =
    useMemo(
      () =>
        data.planDistribution.reduce(
          (total, item) =>
            total + item.count,
          0
        ),
      [data.planDistribution]
    );

  const maximumRevenue =
    Math.max(
      ...data.monthlyRevenue.map(
        (month) =>
          month.revenue
      ),
      1
    );

  const quickActions = [
    {
      label: 'Personais e CREF',
      description:
        'Cadastros e validações',
      path: '/admin/trainers',
      icon: Users,
    },
    {
      label: 'Assinaturas',
      description:
        'Planos e pagamentos',
      path: '/admin/subscriptions',
      icon: CreditCard,
    },
    {
      label: 'Financeiro',
      description:
        'Receita e transações',
      path: '/admin/financial',
      icon: CircleDollarSign,
    },
    {
      label: 'Relatórios',
      description:
        'Métricas da plataforma',
      path: '/admin/reports',
      icon: BarChart3,
    },
  ];

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
            Painel administrativo
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Visão geral da operação, assinaturas e receita da VSFit.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadData(true)
          }
          disabled={refreshing}
          aria-label="Atualizar painel"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-zinc-400 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-5 w-5 ${
              refreshing
                ? 'animate-spin'
                : ''
            }`}
          />
        </button>
      </motion.div>

      {error && (
        <div className="flex items-start gap-3 rounded-[18px] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-white">
            Visão geral
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Indicadores reais cadastrados na plataforma.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <MetricCard
            label="Personais cadastrados"
            value={
              data.summary
                .totalTrainers
            }
            detail={`${
              data.summary
                .approvedTrainers
            } com CREF aprovado`}
            icon={Users}
            iconClass="text-[#ff2a32]"
          />

          <MetricCard
            label="Alunos cadastrados"
            value={
              data.summary
                .totalStudents
            }
            detail={`${
              data.summary
                .activeStudents
            } ativos`}
            icon={GraduationCap}
            iconClass="text-blue-400"
          />

          <MetricCard
            label="CREF pendentes"
            value={
              data.summary.pendingCref
            }
            detail="Aguardando análise"
            icon={ShieldCheck}
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
            icon={CreditCard}
            iconClass="text-purple-400"
          />

          <MetricCard
            label="Receita confirmada"
            value={formatCurrency(
              data.summary
                .confirmedRevenue
            )}
            detail={`${
              data.summary
                .approvedPayments
            } pagamentos aprovados`}
            icon={CircleDollarSign}
            iconClass="text-green-400"
          />

          <MetricCard
            label="Receita deste mês"
            value={formatCurrency(
              data.summary
                .currentMonthRevenue
            )}
            detail="Somente pagamentos aprovados em produção"
            icon={CalendarDays}
            iconClass="text-cyan-400"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-white">
            Alertas operacionais
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Pendências que precisam de acompanhamento administrativo.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AlertCard
            title="CREF pendentes"
            value={
              data.alerts.pendingCref
            }
            description="Existem documentos aguardando aprovação."
            icon={ShieldCheck}
            warning
            onClick={() => {
              if (
                data.alerts
                  .firstPendingTrainerId
              ) {
                navigate(
                  `/admin/trainers/${data.alerts.firstPendingTrainerId}/approve`
                );

                return;
              }

              navigate(
                '/admin/trainers'
              );
            }}
          />

          <AlertCard
            title="Falhas no webhook"
            value={
              data.alerts
                .failedWebhooks
            }
            description="Existem eventos financeiros que falharam."
            icon={Webhook}
            danger
            onClick={() =>
              navigate(
                '/admin/financial'
              )
            }
          />

          <AlertCard
            title="Checkouts em aberto"
            value={
              data.alerts
                .openCheckouts
            }
            description="Existem tentativas de assinatura ainda não concluídas."
            icon={Clock3}
            warning
            onClick={() =>
              navigate(
                '/admin/financial'
              )
            }
          />

          <AlertCard
            title="Assinaturas legadas"
            value={
              data.alerts
                .legacyPaidSubscriptions
            }
            description="Planos pagos sem pagamento confirmado no novo histórico."
            icon={AlertTriangle}
            warning
            onClick={() =>
              navigate(
                '/admin/subscriptions'
              )
            }
          />
        </div>

        {data.alerts
          .unknownEnvironmentPayments >
          0 && (
          <button
            type="button"
            onClick={() =>
              navigate(
                '/admin/financial'
              )
            }
            className="flex w-full items-start justify-between gap-3 rounded-[20px] border border-yellow-400/20 bg-yellow-400/[0.08] p-4 text-left"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />

              <div>
                <p className="text-sm font-black text-yellow-200">
                  Ambiente financeiro não identificado
                </p>

                <p className="mt-1 text-xs text-yellow-100/60">
                  {
                    data.alerts
                      .unknownEnvironmentPayments
                  }{' '}
                  {data.alerts
                    .unknownEnvironmentPayments ===
                  1
                    ? 'transação não possui'
                    : 'transações não possuem'}{' '}
                  identificação de produção ou teste.
                </p>
              </div>
            </div>

            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-yellow-300" />
          </button>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white">
                Receita dos últimos 6 meses
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Somente pagamentos aprovados em produção.
              </p>
            </div>

            <TrendingUp className="h-5 w-5 text-green-400" />
          </div>

          <div className="mt-7 flex h-56 items-end gap-2 border-b border-white/[0.08] px-1">
            {data.monthlyRevenue.map(
              (month) => {
                const percentage =
                  month.revenue > 0
                    ? Math.max(
                        (
                          month.revenue /
                          maximumRevenue
                        ) * 100,
                        5
                      )
                    : 0;

                return (
                  <div
                    key={month.key}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                  >
                    <div className="mb-2 text-center">
                      <p className="text-[9px] font-bold text-zinc-300">
                        {formatCurrency(
                          month.revenue
                        )}
                      </p>

                      <p className="mt-0.5 text-[8px] text-zinc-600">
                        {month.payments}{' '}
                        {month.payments ===
                        1
                          ? 'pag.'
                          : 'pags.'}
                      </p>
                    </div>

                    <motion.div
                      initial={{
                        height: 0,
                      }}
                      animate={{
                        height:
                          `${percentage}%`,
                      }}
                      transition={{
                        duration: 0.45,
                      }}
                      className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-green-500/50 to-green-400"
                    />

                    <p className="mt-2 pb-2 text-[9px] font-bold text-zinc-600">
                      {month.label}
                    </p>
                  </div>
                );
              }
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white">
                Distribuição dos planos
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Assinaturas atualmente ativas.
              </p>
            </div>

            <CreditCard className="h-5 w-5 text-purple-400" />
          </div>

          <div className="mt-6 space-y-5">
            {data.planDistribution.map(
              (item) => (
                <PlanDistributionRow
                  key={item.plan}
                  item={item}
                  total={
                    activeSubscriptionTotal
                  }
                />
              )
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/admin/subscriptions'
              )
            }
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black text-white"
          >
            Ver assinaturas
            <ArrowRight className="h-4 w-4" />
          </button>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white">
                Personais recentes
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Últimos cadastros realizados.
              </p>
            </div>

            <UserCheck className="h-5 w-5 text-[#ff2a32]" />
          </div>

          {data.recentTrainers.length ===
          0 ? (
            <EmptyState
              icon={
                <Users className="h-8 w-8 text-zinc-600" />
              }
              title="Nenhum personal cadastrado"
              description="Os novos cadastros aparecerão aqui."
            />
          ) : (
            <div className="mt-5 space-y-3">
              {data.recentTrainers.map(
                (trainer) => (
                  <button
                    type="button"
                    key={trainer.id}
                    onClick={() =>
                      trainer.crefStatus ===
                      'pending'
                        ? navigate(
                            `/admin/trainers/${trainer.id}/approve`
                          )
                        : navigate(
                            '/admin/trainers'
                          )
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-[16px] border border-white/[0.06] bg-white/[0.025] p-3 text-left transition hover:bg-white/[0.05]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff2a32]/15 text-sm font-black text-[#ff2a32]">
                        {trainer.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {trainer.name}
                        </p>

                        <p className="mt-1 truncate text-xs text-zinc-500">
                          {trainer.email}
                        </p>

                        <p className="mt-1 text-[10px] text-zinc-600">
                          {trainer.studentCount}{' '}
                          {trainer.studentCount ===
                          1
                            ? 'aluno'
                            : 'alunos'}{' '}
                          •{' '}
                          {formatDate(
                            trainer.createdAt
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge
                        status={
                          trainer.crefStatus
                        }
                      />

                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${getPlanClass(
                          trainer.plan
                        )}`}
                      >
                        {getPlanLabel(
                          trainer.plan
                        )}
                      </span>
                    </div>
                  </button>
                )
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              navigate(
                '/admin/trainers'
              )
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black text-white"
          >
            Ver todos os personais
            <ArrowRight className="h-4 w-4" />
          </button>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white">
                Pagamentos recentes
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Últimas transações de produção.
              </p>
            </div>

            <ReceiptText className="h-5 w-5 text-green-400" />
          </div>

          {data.recentPayments.length ===
          0 ? (
            <EmptyState
              icon={
                <ReceiptText className="h-8 w-8 text-zinc-600" />
              }
              title="Nenhum pagamento registrado"
              description="O primeiro pagamento de produção aparecerá após a confirmação do provedor."
            />
          ) : (
            <div className="mt-5 space-y-3">
              {data.recentPayments.map(
                (payment) => (
                  <button
                    type="button"
                    key={payment.id}
                    onClick={() =>
                      navigate(
                        '/admin/financial'
                      )
                    }
                    className="w-full rounded-[16px] border border-white/[0.06] bg-white/[0.025] p-3 text-left transition hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {
                            payment.trainer_name
                          }
                        </p>

                        <p className="mt-1 truncate text-xs text-zinc-500">
                          {
                            payment.trainer_email
                          }
                        </p>
                      </div>

                      <p className="shrink-0 text-sm font-black text-white">
                        {formatCurrency(
                          payment.amount
                        )}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${getPaymentStatusClass(
                          payment.status
                        )}`}
                      >
                        {getPaymentStatusLabel(
                          payment.status
                        )}
                      </span>

                      <span className="text-[10px] text-zinc-600">
                        {formatDateTime(
                          payment.date_approved ||
                          payment.date_created ||
                          payment.created_at
                        )}
                      </span>
                    </div>
                  </button>
                )
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              navigate(
                '/admin/financial'
              )
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black text-white"
          >
            Abrir financeiro
            <ArrowRight className="h-4 w-4" />
          </button>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-white">
            Ações rápidas
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickActions.map(
            (action) => {
              const Icon =
                action.icon;

              return (
                <button
                  key={action.path}
                  type="button"
                  onClick={() =>
                    navigate(
                      action.path
                    )
                  }
                  className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4 text-left transition hover:border-[#ff2a32]/25 hover:bg-white/[0.05]"
                >
                  <Icon className="h-5 w-5 text-[#ff2a32]" />

                  <p className="mt-4 text-sm font-black text-white">
                    {action.label}
                  </p>

                  <p className="mt-1 text-[10px] text-zinc-600">
                    {
                      action.description
                    }
                  </p>
                </button>
              );
            }
          )}
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-[20px] border border-green-400/15 bg-green-400/[0.05] p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />

        <p className="text-xs leading-relaxed text-green-100/65">
          Receita e pagamentos apresentados neste painel são calculados somente com transações aprovadas e identificadas como produção. Cobranças feitas pelos personais aos seus alunos não entram no financeiro da plataforma.
        </p>
      </div>
    </div>
  );
}

export default AdminDashboardPage;