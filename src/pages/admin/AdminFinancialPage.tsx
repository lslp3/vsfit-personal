import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { motion } from 'framer-motion';

import {
  Activity,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  Loader2,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  WalletCards,
  Webhook,
  XCircle,
} from 'lucide-react';

import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';

import {
  formatCurrency,
  formatDateTime,
} from '../../lib/formatters';

import {
  getAdminFinancialData,
  type AdminFinancialData,
  type AdminFinancialEnvironment,
  type AdminFinancialPayment,
} from '../../services/adminFinancialService';

import type {
  AdminPlanSlug,
} from '../../services/adminSubscriptionService';

type PaymentStatusFilter =
  | 'all'
  | 'approved'
  | 'pending'
  | 'failed'
  | 'refunded';

type EnvironmentFilter =
  | 'all'
  | AdminFinancialEnvironment;

type PeriodFilter =
  | '30d'
  | '90d'
  | 'year'
  | 'all';

type PlanFilter =
  | 'all'
  | AdminPlanSlug;

const emptyData:
AdminFinancialData = {
  payments: [],

  summary: {
    totalConfirmedRevenue: 0,
    currentMonthRevenue: 0,
    previousMonthRevenue: 0,
    monthlyVariationPercent: null,

    averageTicket: 0,

    totalTransactions: 0,
    productionTransactions: 0,
    approvedProductionPayments: 0,
    pendingProductionPayments: 0,
    failedProductionPayments: 0,
    refundedProductionPayments: 0,

    testTransactions: 0,
    unknownEnvironmentTransactions: 0,

    latestApprovedAt: null,
  },

  monthlyRevenue: [],

  integration: {
    activePaidSubscriptions: 0,

    checkoutAttempts: 0,
    checkoutCompleted: 0,
    checkoutOpen: 0,
    checkoutFailed: 0,

    webhookProcessed: 0,
    webhookIgnored: 0,
    webhookFailed: 0,

    latestWebhookAt: null,
    latestWebhookStatus: null,
    latestWebhookError: null,
  },
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
    charged_back: 'Contestado',
    refunded: 'Reembolsado',
    partially_refunded:
      'Reembolso parcial',
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

function getEnvironmentLabel(
  environment:
    AdminFinancialEnvironment
) {
  if (environment === 'production') {
    return 'Produção';
  }

  if (environment === 'test') {
    return 'Teste';
  }

  return 'Não identificado';
}

function getEnvironmentClass(
  environment:
    AdminFinancialEnvironment
) {
  if (environment === 'production') {
    return 'border-green-400/20 bg-green-400/[0.08] text-green-300';
  }

  if (environment === 'test') {
    return 'border-purple-400/20 bg-purple-400/[0.08] text-purple-300';
  }

  return 'border-zinc-400/20 bg-zinc-400/[0.08] text-zinc-400';
}

function getPaymentDate(
  payment: AdminFinancialPayment
) {
  return (
    payment.date_approved ||
    payment.date_updated ||
    payment.date_created ||
    payment.created_at
  );
}

function matchesStatusFilter(
  status: string,
  filter: PaymentStatusFilter
) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'approved') {
    return status === 'approved';
  }

  if (filter === 'pending') {
    return [
      'pending',
      'authorized',
      'in_process',
      'in_mediation',
    ].includes(status);
  }

  if (filter === 'refunded') {
    return [
      'refunded',
      'partially_refunded',
    ].includes(status);
  }

  return [
    'rejected',
    'cancelled',
    'canceled',
    'failed',
    'charged_back',
  ].includes(status);
}

function matchesPeriodFilter(
  payment: AdminFinancialPayment,
  filter: PeriodFilter
) {
  if (filter === 'all') {
    return true;
  }

  const paymentDate =
    getPaymentDate(payment);

  if (!paymentDate) {
    return false;
  }

  const date =
    new Date(paymentDate);

  if (
    Number.isNaN(date.getTime())
  ) {
    return false;
  }

  const now = new Date();

  if (filter === 'year') {
    return (
      date.getFullYear() ===
      now.getFullYear()
    );
  }

  const days =
    filter === '30d'
      ? 30
      : 90;

  const limit =
    new Date(now);

  limit.setDate(
    limit.getDate() - days
  );

  return date >= limit;
}

function escapeCsv(
  value: unknown
) {
  return `"${String(
    value ?? ''
  ).replace(/"/g, '""')}"`;
}

function exportPaymentsCsv(
  payments: AdminFinancialPayment[]
) {
  const header = [
    'Data',
    'Personal',
    'Email',
    'Plano',
    'Status',
    'Ambiente',
    'Valor',
    'Moeda',
    'Provedor',
    'Método',
    'ID do pagamento',
  ];

  const rows =
    payments.map((payment) => [
      getPaymentDate(payment)
        ? new Date(
            getPaymentDate(payment)!
          ).toLocaleString('pt-BR')
        : '',

      payment.trainer_name,
      payment.trainer_email,

      getPlanLabel(
        payment.plan_slug
      ),

      getPaymentStatusLabel(
        payment.status
      ),

      getEnvironmentLabel(
        payment.environment
      ),

      payment.amount.toFixed(2),
      payment.currency,
      payment.provider,

      payment.payment_method_id ||
        payment.payment_type_id ||
        '',

      payment.provider_payment_id,
    ]);

  const csv = [
    header,
    ...rows,
  ]
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
    `financeiro-vsfit-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

  document.body.appendChild(link);

  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export function AdminFinancialPage() {
  const [
    data,
    setData,
  ] = useState<
    AdminFinancialData
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

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    PaymentStatusFilter
  >('all');

  const [
    environmentFilter,
    setEnvironmentFilter,
  ] = useState<
    EnvironmentFilter
  >('all');

  const [
    periodFilter,
    setPeriodFilter,
  ] = useState<
    PeriodFilter
  >('90d');

  const [
    planFilter,
    setPlanFilter,
  ] = useState<
    PlanFilter
  >('all');

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
          await getAdminFinancialData();

        setData(result);
      } catch (loadError) {
        console.error(
          '[AdminFinancialPage] load:',
          loadError
        );

        setError(
          'Não foi possível carregar os dados financeiros da plataforma.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredPayments =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return data.payments.filter(
        (payment) => {
          const matchesSearch =
            !normalizedSearch ||
            payment.trainer_name
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            payment.trainer_email
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            payment.provider_payment_id
              .toLowerCase()
              .includes(
                normalizedSearch
              );

          const matchesEnvironment =
            environmentFilter ===
              'all' ||
            payment.environment ===
              environmentFilter;

          const matchesPlan =
            planFilter === 'all' ||
            payment.plan_slug ===
              planFilter;

          return (
            matchesSearch &&
            matchesEnvironment &&
            matchesPlan &&
            matchesStatusFilter(
              payment.status,
              statusFilter
            ) &&
            matchesPeriodFilter(
              payment,
              periodFilter
            )
          );
        }
      );
    }, [
      data.payments,
      search,
      environmentFilter,
      planFilter,
      statusFilter,
      periodFilter,
    ]);

  const maximumRevenue =
    Math.max(
      ...data.monthlyRevenue.map(
        (item) => item.revenue
      ),
      1
    );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff2a32]" />
      </div>
    );
  }

  const variation =
    data.summary
      .monthlyVariationPercent;

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
            Financeiro da plataforma
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Receita real das assinaturas VSFit, pagamentos e integração financeira.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadData(true)
          }
          disabled={refreshing}
          aria-label="Atualizar financeiro"
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
            Receita confirmada
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Somente pagamentos aprovados em produção entram nos valores abaixo.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="p-4">
            <CircleDollarSign className="h-5 w-5 text-green-400" />

            <p className="mt-4 text-xl font-black text-white md:text-2xl">
              {formatCurrency(
                data.summary
                  .totalConfirmedRevenue
              )}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Receita total
            </p>
          </Card>

          <Card className="p-4">
            <CalendarDays className="h-5 w-5 text-blue-400" />

            <p className="mt-4 text-xl font-black text-white md:text-2xl">
              {formatCurrency(
                data.summary
                  .currentMonthRevenue
              )}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Receita deste mês
            </p>

            <div className="mt-2 flex items-center gap-1 text-[10px]">
              {variation === null ? (
                <span className="text-zinc-600">
                  Sem base no mês anterior
                </span>
              ) : variation >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-400" />

                  <span className="text-green-400">
                    {variation.toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-400" />

                  <span className="text-red-400">
                    {Math.abs(
                      variation
                    ).toFixed(1)}%
                  </span>
                </>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <Check className="h-5 w-5 text-green-400" />

            <p className="mt-4 text-2xl font-black text-white">
              {
                data.summary
                  .approvedProductionPayments
              }
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Pagamentos aprovados
            </p>
          </Card>

          <Card className="p-4">
            <WalletCards className="h-5 w-5 text-purple-400" />

            <p className="mt-4 text-xl font-black text-white md:text-2xl">
              {formatCurrency(
                data.summary.averageTicket
              )}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Ticket médio
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: 'Pendentes',
              value:
                data.summary
                  .pendingProductionPayments,
              icon: Clock3,
              iconClass:
                'text-yellow-400',
            },
            {
              label:
                'Rejeitados ou falhos',
              value:
                data.summary
                  .failedProductionPayments,
              icon: XCircle,
              iconClass:
                'text-red-400',
            },
            {
              label: 'Reembolsados',
              value:
                data.summary
                  .refundedProductionPayments,
              icon: RotateCcw,
              iconClass:
                'text-blue-400',
            },
            {
              label:
                'Transações de teste',
              value:
                data.summary
                  .testTransactions,
              icon: Activity,
              iconClass:
                'text-purple-400',
            },
          ].map((item) => {
            const Icon =
              item.icon;

            return (
              <Card
                key={item.label}
                className="p-4"
              >
                <Icon
                  className={`h-5 w-5 ${item.iconClass}`}
                />

                <p className="mt-3 text-xl font-black text-white">
                  {item.value}
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  {item.label}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white">
                Receita dos últimos 6 meses
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Pagamentos aprovados em produção.
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
                      <p className="text-[10px] font-bold text-zinc-300">
                        {month.revenue > 0
                          ? formatCurrency(
                              month.revenue
                            )
                          : 'R$ 0'}
                      </p>

                      <p className="mt-0.5 text-[9px] text-zinc-600">
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
                        duration: 0.5,
                      }}
                      className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-[#ff2a32]/60 to-[#ff2a32]"
                    />

                    <p className="mt-2 pb-2 text-[10px] font-bold text-zinc-500">
                      {month.label}
                    </p>
                  </div>
                );
              }
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-green-400/10 text-green-400">
                <Webhook className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-black text-white">
                  Webhook Mercado Pago
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  {
                    data.integration
                      .webhookProcessed
                  }{' '}
                  processados
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  {
                    data.integration
                      .webhookFailed
                  }{' '}
                  com falha
                </p>

                <p className="mt-3 text-[11px] text-zinc-600">
                  Último evento:{' '}
                  {formatDateTime(
                    data.integration
                      .latestWebhookAt
                  )}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-blue-400/10 text-blue-400">
                <CreditCard className="h-5 w-5" />
              </div>

              <div className="w-full">
                <p className="text-sm font-black text-white">
                  Checkouts
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-lg font-black text-white">
                      {
                        data.integration
                          .checkoutAttempts
                      }
                    </p>

                    <p className="text-[10px] text-zinc-600">
                      Tentativas
                    </p>
                  </div>

                  <div>
                    <p className="text-lg font-black text-green-300">
                      {
                        data.integration
                          .checkoutCompleted
                      }
                    </p>

                    <p className="text-[10px] text-zinc-600">
                      Concluídos
                    </p>
                  </div>

                  <div>
                    <p className="text-lg font-black text-yellow-300">
                      {
                        data.integration
                          .checkoutOpen
                      }
                    </p>

                    <p className="text-[10px] text-zinc-600">
                      Em aberto
                    </p>
                  </div>

                  <div>
                    <p className="text-lg font-black text-red-300">
                      {
                        data.integration
                          .checkoutFailed
                      }
                    </p>

                    <p className="text-[10px] text-zinc-600">
                      Falharam
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-green-400" />

              <div>
                <p className="text-sm font-black text-white">
                  Assinaturas pagas ativas
                </p>

                <p className="mt-1 text-xl font-black text-white">
                  {
                    data.integration
                      .activePaidSubscriptions
                  }
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {data.integration.webhookFailed >
        0 && (
        <div className="flex items-start gap-3 rounded-[20px] border border-red-500/20 bg-red-500/10 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />

          <div>
            <p className="text-sm font-black text-red-200">
              Existem eventos financeiros com falha
            </p>

            <p className="mt-1 text-xs text-red-200/70">
              Verifique os logs da função mercadopago-webhook.
            </p>

            {data.integration
              .latestWebhookError && (
              <p className="mt-2 text-xs text-red-200">
                {
                  data.integration
                    .latestWebhookError
                }
              </p>
            )}
          </div>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-white">
              Histórico financeiro
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              {filteredPayments.length}{' '}
              {filteredPayments.length ===
              1
                ? 'transação encontrada'
                : 'transações encontradas'}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              exportPaymentsCsv(
                filteredPayments
              )
            }
            disabled={
              filteredPayments.length ===
              0
            }
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Buscar por personal, email ou ID do pagamento..."
            className="input-field pl-11"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            {
              value: '30d',
              label: '30 dias',
            },
            {
              value: '90d',
              label: '90 dias',
            },
            {
              value: 'year',
              label: 'Este ano',
            },
            {
              value: 'all',
              label: 'Todo período',
            },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                setPeriodFilter(
                  item.value as PeriodFilter
                )
              }
              className={`chip shrink-0 ${
                periodFilter ===
                item.value
                  ? 'chip-active'
                  : ''
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            {
              value: 'all',
              label: 'Todos os status',
            },
            {
              value: 'approved',
              label: 'Aprovados',
            },
            {
              value: 'pending',
              label: 'Pendentes',
            },
            {
              value: 'failed',
              label: 'Falhos',
            },
            {
              value: 'refunded',
              label: 'Reembolsados',
            },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                setStatusFilter(
                  item.value as PaymentStatusFilter
                )
              }
              className={`chip shrink-0 ${
                statusFilter ===
                item.value
                  ? 'chip-active'
                  : ''
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            {
              value: 'all',
              label: 'Todos os ambientes',
            },
            {
              value: 'production',
              label: 'Produção',
            },
            {
              value: 'test',
              label: 'Teste',
            },
            {
              value: 'unknown',
              label: 'Não identificado',
            },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                setEnvironmentFilter(
                  item.value as EnvironmentFilter
                )
              }
              className={`chip shrink-0 ${
                environmentFilter ===
                item.value
                  ? 'chip-active'
                  : ''
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            {
              value: 'all',
              label: 'Todos os planos',
            },
            {
              value: 'free',
              label: 'Free',
            },
            {
              value: 'pro',
              label: 'Pro',
            },
            {
              value: 'premium',
              label: 'Premium',
            },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                setPlanFilter(
                  item.value as PlanFilter
                )
              }
              className={`chip shrink-0 ${
                planFilter ===
                item.value
                  ? 'chip-active'
                  : ''
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {filteredPayments.length ===
        0 ? (
          <EmptyState
            icon={
              <ReceiptText className="h-8 w-8 text-zinc-600" />
            }
            title="Nenhuma transação encontrada"
            description={
              data.payments.length === 0
                ? 'O primeiro pagamento novo aparecerá automaticamente após a confirmação do Mercado Pago.'
                : 'Altere a busca ou os filtros selecionados.'
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredPayments.map(
              (payment) => (
                <Card
                  key={payment.id}
                  className="p-4 md:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${getPlanClass(
                            payment.plan_slug
                          )}`}
                        >
                          {getPlanLabel(
                            payment.plan_slug
                          )}
                        </span>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${getPaymentStatusClass(
                            payment.status
                          )}`}
                        >
                          {getPaymentStatusLabel(
                            payment.status
                          )}
                        </span>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${getEnvironmentClass(
                            payment.environment
                          )}`}
                        >
                          {getEnvironmentLabel(
                            payment.environment
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-xl font-black text-white">
                        {formatCurrency(
                          payment.amount
                        )}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {formatDateTime(
                          getPaymentDate(
                            payment
                          )
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-white/[0.07] pt-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">
                        Provedor
                      </p>

                      <p className="mt-1 text-xs text-zinc-300">
                        {payment.provider}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">
                        Método
                      </p>

                      <p className="mt-1 text-xs text-zinc-300">
                        {payment.payment_method_id ||
                          payment.payment_type_id ||
                          '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">
                        ID do pagamento
                      </p>

                      <p className="mt-1 break-all text-xs text-zinc-300">
                        {
                          payment.provider_payment_id
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">
                        Detalhe do status
                      </p>

                      <p className="mt-1 text-xs text-zinc-300">
                        {payment.status_detail ||
                          '—'}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminFinancialPage;