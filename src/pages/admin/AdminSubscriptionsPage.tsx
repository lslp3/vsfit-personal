import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  CircleDollarSign,
  CreditCard,
  Loader2,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldAlert,
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
  getAdminSubscriptionsData,
  isActiveSubscriptionStatus,
  type AdminFinancialSummary,
  type AdminPlanSlug,
  type AdminPlatformPayment,
  type AdminSubscriptionRecord,
  type AdminSubscriptionSummary,
  type AdminWebhookSummary,
} from '../../services/adminSubscriptionService';

import type {
  SubscriptionPlanWithLimits,
} from '../../services/subscriptionService';

type PlanFilter =
  | 'all'
  | AdminPlanSlug;

type StatusFilter =
  | 'all'
  | 'active'
  | 'inactive';

const emptySummary:
AdminSubscriptionSummary = {
  total: 0,
  active: 0,
  free: 0,
  paid: 0,
  withBillingPeriod: 0,
  withConfirmedPayment: 0,
  legacyPaid: 0,
};

const emptyFinancialSummary:
AdminFinancialSummary = {
  totalPayments: 0,
  approvedPayments: 0,
  pendingPayments: 0,
  failedPayments: 0,
  refundedPayments: 0,
  totalConfirmedRevenue: 0,
  currentMonthConfirmedRevenue: 0,
  latestApprovedAt: null,
};

const emptyWebhookSummary:
AdminWebhookSummary = {
  total: 0,
  processed: 0,
  ignored: 0,
  failed: 0,
  latestReceivedAt: null,
  latestStatus: null,
  latestError: null,
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

function getBillingLabel(
  subscription:
    AdminSubscriptionRecord
) {
  if (
    subscription.billing_evidence ===
    'free'
  ) {
    return 'Plano gratuito';
  }

  if (
    subscription.billing_evidence ===
    'confirmed_payment'
  ) {
    return 'Pagamento confirmado';
  }

  if (
    subscription.billing_evidence ===
    'period'
  ) {
    return 'Período registrado';
  }

  if (
    subscription.billing_evidence ===
    'provider_reference'
  ) {
    return 'Referência do provedor';
  }

  return 'Registro legado/manual';
}

function getBillingClass(
  subscription:
    AdminSubscriptionRecord
) {
  if (
    subscription.billing_evidence ===
    'confirmed_payment'
  ) {
    return 'text-green-400';
  }

  if (
    subscription.billing_evidence ===
    'period'
  ) {
    return 'text-blue-400';
  }

  if (
    subscription.billing_evidence ===
    'provider_reference'
  ) {
    return 'text-cyan-400';
  }

  if (
    subscription.billing_evidence ===
    'legacy'
  ) {
    return 'text-yellow-400';
  }

  return 'text-zinc-500';
}

function getPaymentStatusLabel(
  status: string
) {
  const normalized =
    status.toLowerCase();

  const labels:
    Record<string, string> = {
    approved: 'Aprovado',
    pending: 'Pendente',
    in_process: 'Em análise',
    in_mediation: 'Em mediação',
    authorized: 'Autorizado',
    rejected: 'Rejeitado',
    cancelled: 'Cancelado',
    canceled: 'Cancelado',
    refunded: 'Reembolsado',
    partially_refunded:
      'Reembolso parcial',
    charged_back:
      'Contestação',
    failed: 'Falhou',
  };

  return labels[normalized] ||
    status;
}

function getPaymentStatusClass(
  status: string
) {
  const normalized =
    status.toLowerCase();

  if (normalized === 'approved') {
    return 'border-green-400/25 bg-green-400/10 text-green-300';
  }

  if (
    [
      'pending',
      'in_process',
      'in_mediation',
      'authorized',
    ].includes(normalized)
  ) {
    return 'border-yellow-400/25 bg-yellow-400/10 text-yellow-300';
  }

  if (
    [
      'refunded',
      'partially_refunded',
    ].includes(normalized)
  ) {
    return 'border-blue-400/25 bg-blue-400/10 text-blue-300';
  }

  return 'border-red-400/25 bg-red-400/10 text-red-300';
}

function formatStudentLimit(
  limit: number
) {
  if (limit >= 999) {
    return 'Alunos ilimitados';
  }

  if (limit === 1) {
    return 'Até 1 aluno';
  }

  return `Até ${limit} alunos`;
}

function normalizeFeatures(
  value: string[] | string
) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function AdminSubscriptionsPage() {
  const [
    subscriptions,
    setSubscriptions,
  ] = useState<
    AdminSubscriptionRecord[]
  >([]);

  const [
    payments,
    setPayments,
  ] = useState<
    AdminPlatformPayment[]
  >([]);

  const [
    plans,
    setPlans,
  ] = useState<
    SubscriptionPlanWithLimits[]
  >([]);

  const [
    summary,
    setSummary,
  ] = useState<
    AdminSubscriptionSummary
  >(emptySummary);

  const [
    financialSummary,
    setFinancialSummary,
  ] = useState<
    AdminFinancialSummary
  >(emptyFinancialSummary);

  const [
    webhookSummary,
    setWebhookSummary,
  ] = useState<
    AdminWebhookSummary
  >(emptyWebhookSummary);

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
    planFilter,
    setPlanFilter,
  ] = useState<PlanFilter>('all');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>('all');

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
        const data =
          await getAdminSubscriptionsData();

        setSubscriptions(
          data.subscriptions
        );

        setPayments(
          data.payments
        );

        setPlans(
          data.plans
        );

        setSummary(
          data.summary
        );

        setFinancialSummary(
          data.financialSummary
        );

        setWebhookSummary(
          data.webhookSummary
        );
      } catch (loadError) {
        console.error(
          '[AdminSubscriptionsPage] load:',
          loadError
        );

        setError(
          'Não foi possível carregar assinaturas e pagamentos.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredSubscriptions =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return subscriptions.filter(
        (subscription) => {
          const matchesSearch =
            !normalizedSearch ||
            subscription.trainer_name
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            subscription.trainer_email
              .toLowerCase()
              .includes(
                normalizedSearch
              );

          const matchesPlan =
            planFilter === 'all' ||
            subscription.plan ===
              planFilter;

          const active =
            isActiveSubscriptionStatus(
              subscription.status
            );

          const matchesStatus =
            statusFilter === 'all' ||
            (
              statusFilter ===
                'active' &&
              active
            ) ||
            (
              statusFilter ===
                'inactive' &&
              !active
            );

          return (
            matchesSearch &&
            matchesPlan &&
            matchesStatus
          );
        }
      );
    }, [
      subscriptions,
      search,
      planFilter,
      statusFilter,
    ]);

  const planCount =
    useMemo(() => {
      const count = {
        free: 0,
        pro: 0,
        premium: 0,
      };

      for (
        const subscription of
          subscriptions
      ) {
        count[
          subscription.plan
        ] += 1;
      }

      return count;
    }, [subscriptions]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff2a32]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white md:text-3xl">
            Assinaturas
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Assinaturas, pagamentos confirmados e integração Mercado Pago.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadData(true)
          }
          disabled={refreshing}
          aria-label="Atualizar assinaturas"
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
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-[18px] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-white">
            Visão financeira
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Somente pagamentos aprovados pelo provedor entram na receita.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="p-4">
            <CircleDollarSign className="h-5 w-5 text-green-400" />

            <p className="mt-4 text-xl font-black text-white md:text-2xl">
              {formatCurrency(
                financialSummary
                  .totalConfirmedRevenue
              )}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Receita confirmada
            </p>
          </Card>

          <Card className="p-4">
            <CalendarDays className="h-5 w-5 text-blue-400" />

            <p className="mt-4 text-xl font-black text-white md:text-2xl">
              {formatCurrency(
                financialSummary
                  .currentMonthConfirmedRevenue
              )}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Receita do mês
            </p>
          </Card>

          <Card className="p-4">
            <Check className="h-5 w-5 text-green-400" />

            <p className="mt-4 text-2xl font-black text-white">
              {
                financialSummary
                  .approvedPayments
              }
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Pagamentos aprovados
            </p>
          </Card>

          <Card className="p-4">
            <ReceiptText className="h-5 w-5 text-yellow-400" />

            <p className="mt-4 text-2xl font-black text-white">
              {
                financialSummary
                  .pendingPayments
              }
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Pagamentos pendentes
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <Webhook className="mt-0.5 h-5 w-5 shrink-0 text-[#ff2a32]" />

              <div>
                <p className="text-sm font-black text-white">
                  Integração financeira ativa
                </p>

                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Pagamentos novos são consultados diretamente no Mercado Pago e registrados individualmente.
                </p>

                <p className="mt-3 text-xs text-zinc-400">
                  Eventos processados:{' '}
                  <strong className="text-white">
                    {
                      webhookSummary.processed
                    }
                  </strong>
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Último evento:{' '}
                  {formatDateTime(
                    webhookSummary
                      .latestReceivedAt
                  )}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

              <div>
                <p className="text-sm font-black text-white">
                  Histórico financeiro
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  {
                    financialSummary
                      .totalPayments
                  }{' '}
                  {financialSummary
                    .totalPayments === 1
                    ? 'pagamento registrado'
                    : 'pagamentos registrados'}
                </p>

                <p className="mt-2 text-xs text-zinc-500">
                  Rejeitados ou falhos:{' '}
                  <strong className="text-red-300">
                    {
                      financialSummary
                        .failedPayments
                    }
                  </strong>
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Reembolsados:{' '}
                  <strong className="text-blue-300">
                    {
                      financialSummary
                        .refundedPayments
                    }
                  </strong>
                </p>
              </div>
            </div>
          </Card>
        </div>

        {webhookSummary.failed > 0 && (
          <div className="flex items-start gap-3 rounded-[20px] border border-red-500/20 bg-red-500/10 p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />

            <div>
              <p className="text-sm font-black text-red-200">
                Existem eventos com falha
              </p>

              <p className="mt-1 text-xs text-red-200/70">
                {webhookSummary.failed}{' '}
                {webhookSummary.failed === 1
                  ? 'evento falhou'
                  : 'eventos falharam'}{' '}
                durante o processamento.
              </p>

              {webhookSummary.latestError && (
                <p className="mt-2 text-xs text-red-200">
                  {
                    webhookSummary
                      .latestError
                  }
                </p>
              )}
            </div>
          </div>
        )}

        {payments.length === 0 && (
          <div className="flex items-start gap-3 rounded-[20px] border border-green-400/20 bg-green-400/[0.08] p-4">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-300" />

            <div>
              <p className="text-sm font-black text-green-200">
                Sistema financeiro conectado
              </p>

              <p className="mt-1 text-xs leading-relaxed text-green-100/65">
                Ainda não existe pagamento novo registrado após a ativação do histórico. O primeiro pagamento aprovado aparecerá automaticamente nesta tela.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-white">
            Resumo das assinaturas
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label:
                'Registros totais',
              value: summary.total,
              icon: CreditCard,
            },
            {
              label:
                'Assinaturas ativas',
              value: summary.active,
              icon: Check,
            },
            {
              label:
                'Planos pagos',
              value: summary.paid,
              icon: Users,
            },
            {
              label:
                'Com pagamento confirmado',
              value:
                summary.withConfirmedPayment,
              icon: CircleDollarSign,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <Card
                key={item.label}
                className="p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-2xl font-black text-white">
                      {item.value}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {item.label}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#ff2a32]/10 text-[#ff2a32]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {summary.legacyPaid > 0 && (
          <div className="flex items-start gap-3 rounded-[20px] border border-yellow-400/20 bg-yellow-400/[0.08] p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />

            <div>
              <p className="text-sm font-black text-yellow-200">
                Assinaturas antigas
              </p>

              <p className="mt-1 text-xs text-yellow-100/65">
                {summary.legacyPaid}{' '}
                {summary.legacyPaid === 1
                  ? 'assinatura paga não possui'
                  : 'assinaturas pagas não possuem'}{' '}
                pagamento confirmado no novo histórico. Esses registros não entram na receita.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-white">
            Assinaturas dos personais
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            {filteredSubscriptions.length}{' '}
            {filteredSubscriptions.length ===
            1
              ? 'registro encontrado'
              : 'registros encontrados'}
          </p>
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
            placeholder="Buscar personal por nome ou email..."
            className="input-field pl-11"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            {
              value: 'all',
              label: 'Todos',
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

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            {
              value: 'all',
              label:
                'Todos os status',
            },
            {
              value: 'active',
              label: 'Ativas',
            },
            {
              value: 'inactive',
              label: 'Inativas',
            },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                setStatusFilter(
                  item.value as StatusFilter
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

        {filteredSubscriptions.length ===
        0 ? (
          <EmptyState
            icon={
              <CreditCard className="h-8 w-8 text-zinc-600" />
            }
            title="Nenhuma assinatura encontrada"
            description="Altere a busca ou os filtros selecionados."
          />
        ) : (
          <div className="space-y-3">
            {filteredSubscriptions.map(
              (subscription) => (
                <Card
                  key={subscription.id}
                  className="p-4 md:p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ff2a32]/15 text-base font-black text-[#ff2a32]">
                        {subscription
                          .trainer_name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {
                            subscription
                              .trainer_name
                          }
                        </p>

                        <p className="mt-1 truncate text-xs text-zinc-500">
                          {
                            subscription
                              .trainer_email
                          }
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${getPlanClass(
                              subscription.plan
                            )}`}
                          >
                            {getPlanLabel(
                              subscription.plan
                            )}
                          </span>

                          <Badge
                            status={
                              subscription.status
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-left md:text-right">
                      <p
                        className={`text-xs font-black ${getBillingClass(
                          subscription
                        )}`}
                      >
                        {getBillingLabel(
                          subscription
                        )}
                      </p>

                      <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-zinc-600">
                        {
                          subscription
                            .payment_provider ||
                          'Sem provedor'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-white/[0.07] pt-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">
                        Limite
                      </p>

                      <p className="mt-1 text-xs font-bold text-zinc-300">
                        {formatStudentLimit(
                          subscription
                            .student_limit
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">
                        Início do período
                      </p>

                      <p className="mt-1 text-xs font-bold text-zinc-300">
                        {formatDate(
                          subscription
                            .current_period_start
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">
                        Final do período
                      </p>

                      <p className="mt-1 text-xs font-bold text-zinc-300">
                        {formatDate(
                          subscription
                            .current_period_end
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">
                        Receita confirmada
                      </p>

                      <p className="mt-1 text-xs font-bold text-green-300">
                        {formatCurrency(
                          subscription
                            .confirmed_revenue
                        )}
                      </p>
                    </div>
                  </div>

                  {subscription
                    .confirmed_payment_count >
                    0 && (
                    <div className="mt-4 rounded-[16px] border border-green-400/15 bg-green-400/[0.06] p-3">
                      <p className="text-xs font-bold text-green-300">
                        {
                          subscription
                            .confirmed_payment_count
                        }{' '}
                        {subscription
                          .confirmed_payment_count ===
                        1
                          ? 'pagamento confirmado'
                          : 'pagamentos confirmados'}
                      </p>

                      <p className="mt-1 text-[11px] text-green-200/60">
                        Último pagamento:{' '}
                        {formatDateTime(
                          subscription
                            .last_confirmed_payment_at
                        )}
                      </p>
                    </div>
                  )}
                </Card>
              )
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-white">
            Histórico de pagamentos
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Registros recebidos e confirmados pelo webhook.
          </p>
        </div>

        {payments.length === 0 ? (
          <EmptyState
            icon={
              <ReceiptText className="h-8 w-8 text-zinc-600" />
            }
            title="Nenhum pagamento registrado"
            description="O primeiro pagamento novo aparecerá automaticamente após a confirmação do Mercado Pago."
          />
        ) : (
          <div className="space-y-3">
            {payments.map(
              (payment) => (
                <Card
                  key={payment.id}
                  className="p-4"
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
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-lg font-black text-white">
                        {formatCurrency(
                          payment.amount
                        )}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {formatDateTime(
                          payment.date_approved ||
                          payment.date_created ||
                          payment.created_at
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-white/[0.07] pt-4 sm:grid-cols-3">
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
                        {payment
                          .payment_method_id ||
                          payment
                            .payment_type_id ||
                          '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">
                        ID do pagamento
                      </p>

                      <p className="mt-1 break-all text-xs text-zinc-300">
                        {
                          payment
                            .provider_payment_id
                        }
                      </p>
                    </div>
                  </div>
                </Card>
              )
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-white">
            Catálogo de planos
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Preços e limites cadastrados na plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const slug =
              plan.slug as AdminPlanSlug;

            const features =
              normalizeFeatures(
                plan.features
              );

            return (
              <Card
                key={
                  plan.id ||
                  plan.slug
                }
                className="p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-white">
                      {plan.name}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {plan.description}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${getPlanClass(
                      slug
                    )}`}
                  >
                    {planCount[slug] ||
                      0}{' '}
                    ativos
                  </span>
                </div>

                <p className="mt-5 text-3xl font-black text-white">
                  {Number(
                    plan.price_monthly
                  ) === 0
                    ? 'Grátis'
                    : formatCurrency(
                        Number(
                          plan.price_monthly
                        )
                      )}
                </p>

                {Number(
                  plan.price_monthly
                ) > 0 && (
                  <p className="mt-1 text-xs text-zinc-600">
                    por mês
                  </p>
                )}

                <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
                  <Users className="h-4 w-4" />

                  {formatStudentLimit(
                    Number(
                      plan.student_limit
                    )
                  )}
                </div>

                {features.length > 0 && (
                  <ul className="mt-5 space-y-2">
                    {features.map(
                      (
                        feature,
                        index
                      ) => (
                        <li
                          key={`${feature}-${index}`}
                          className="flex items-start gap-2 text-xs text-zinc-500"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />

                          {feature}
                        </li>
                      )
                    )}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default AdminSubscriptionsPage;