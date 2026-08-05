import { supabase } from './supabase';

/**
 * Camada reutilizável de helpers financeiros do Admin (Sprint 15 — Fase 1).
 *
 * Centraliza lógica que existia duplicada em:
 *  - adminFinancialService.ts
 *  - adminSubscriptionService.ts
 *  - adminDashboardService.ts
 *  - adminReportsService.ts
 *
 * Regra da Fase 1: refatoração interna SEM alterar regras de negócio.
 * As implementações abaixo reproduzem exatamente o comportamento anterior.
 */

export type AdminPlanSlug =
  | 'free'
  | 'pro'
  | 'premium';

export type AdminFinancialEnvironment =
  | 'production'
  | 'test'
  | 'unknown';

export const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export function normalizePlan(
  value: unknown
): AdminPlanSlug {
  const normalized = String(
    value || 'free'
  )
    .trim()
    .toLowerCase();

  if (normalized === 'premium') {
    return 'premium';
  }

  if (normalized === 'pro') {
    return 'pro';
  }

  return 'free';
}

export function normalizeStatus(
  value: unknown
): string {
  return String(value || 'pending')
    .trim()
    .toLowerCase();
}

export function getPaymentEnvironment(
  liveMode: boolean | null
): AdminFinancialEnvironment {
  if (liveMode === true) {
    return 'production';
  }

  if (liveMode === false) {
    return 'test';
  }

  return 'unknown';
}

export function isApprovedStatus(
  status: string | null | undefined
): boolean {
  return (
    String(status || '')
      .trim()
      .toLowerCase() === 'approved'
  );
}

export function isPendingStatus(
  status: string | null | undefined
): boolean {
  return [
    'pending',
    'in_process',
    'in_mediation',
    'authorized',
  ].includes(
    String(status || '')
      .trim()
      .toLowerCase()
  );
}

export function isFailedStatus(
  status: string | null | undefined
): boolean {
  return [
    'rejected',
    'cancelled',
    'canceled',
    'failed',
    'charged_back',
  ].includes(
    String(status || '')
      .trim()
      .toLowerCase()
  );
}

export function isRefundedStatus(
  status: string | null | undefined
): boolean {
  return [
    'refunded',
    'partially_refunded',
  ].includes(
    String(status || '')
      .trim()
      .toLowerCase()
  );
}

export function isActiveSubscriptionStatus(
  status: string | null | undefined
): boolean {
  return [
    'active',
    'trialing',
    'authorized',
  ].includes(
    String(status || '')
      .trim()
      .toLowerCase()
  );
}

export function isSameMonth(
  value: string | null,
  reference: Date
): boolean {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return false;
  }

  return (
    date.getFullYear() ===
      reference.getFullYear() &&
    date.getMonth() ===
      reference.getMonth()
  );
}

export function getValidDate(
  value: string | null
): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  return date;
}

export function isCurrentMonth(
  value: string | null
): boolean {
  const date = getValidDate(value);

  if (!date) {
    return false;
  }

  const now = new Date();

  return (
    date.getFullYear() ===
      now.getFullYear() &&
    date.getMonth() ===
      now.getMonth()
  );
}

export function getTimestamp(
  value: string | null
): number {
  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

export function getMonthKey(
  date: Date
): string {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, '0')}`;
}

export function getPaymentDate(
  payment: {
    date_approved?: string | null;
    date_updated?: string | null;
    date_created?: string | null;
    created_at?: string | null;
  }
): string | null {
  return (
    payment.date_approved ||
    payment.date_updated ||
    payment.date_created ||
    payment.created_at ||
    null
  );
}

/**
 * Paginação de 1000 linhas por lote.
 * `ascending` é intencionalmente parametrizável: o Dashboard ordena desc
 * e os Reports ordenam asc — comportamento preservado por chamador.
 */
export async function fetchAllRows(
  table: string,
  columns: string,
  orderColumn: string = 'created_at',
  ascending: boolean = false,
  logLabel: string = 'Admin'
) {
  const pageSize = 1000;

  const rows: any[] = [];

  let from = 0;

  while (true) {
    const {
      data,
      error,
    } = await supabase
      .from(table)
      .select(columns)
      .order(orderColumn, {
        ascending,
      })
      .range(
        from,
        from + pageSize - 1
      );

    if (error) {
      console.error(
        `[${logLabel}] ${table}:`,
        error
      );

      throw error;
    }

    const page =
      data || [];

    rows.push(...page);

    if (
      page.length < pageSize
    ) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

export function getPlanLabel(
  plan: AdminPlanSlug
): string {
  if (plan === 'premium') {
    return 'Premium';
  }

  if (plan === 'pro') {
    return 'Pro';
  }

  return 'Free';
}

export function getPlanClass(
  plan: AdminPlanSlug
): string {
  if (plan === 'premium') {
    return 'border-yellow-400/25 bg-yellow-400/10 text-yellow-300';
  }

  if (plan === 'pro') {
    return 'border-blue-400/25 bg-blue-400/10 text-blue-300';
  }

  return 'border-zinc-400/20 bg-zinc-400/10 text-zinc-400';
}
