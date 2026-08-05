import type { Payment } from '../types/database';

/**
 * Regra financeira por aluno — camada pura (sem React/DOM).
 *
 * Sprint 15 Fase 3 (Cobrança completa): resumo de cobrança individual do
 * aluno, derivado SEMPRE dos dados reais da tabela `payments`.
 *
 * Regras de negócio (não alterar sem autorização):
 * - Inadimplência é DERIVADA por due_date + status atual — NUNCA depende de
 *   payments.status = 'overdue' (esse status nunca é persistido no app).
 * - "Valor pendente" = soma de todas as cobranças com status 'pending'
 *   (inclui vencidas e a vencer).
 * - "Dias em atraso" = maior atraso entre as cobranças pending com
 *   due_date anterior à data de referência.
 * - "Próximo vencimento" = menor due_date futura (>= referência) entre as
 *   cobranças pending; null se nenhuma.
 * - "Último pagamento" = cobrança 'paid' com paid_at mais recente.
 */

export type StudentBillingStatus =
  | 'em_dia'
  | 'inadimplente'
  | 'sem_cobrancas';

export interface StudentBillingSummary {
  status: StudentBillingStatus;
  /** Soma de todas as cobranças pending (vencidas + a vencer). */
  pendingAmount: number;
  /** Soma apenas das cobranças pending já vencidas. */
  overdueAmount: number;
  /** Maior atraso em dias entre as cobranças vencidas (null se em dia). */
  overdueDays: number | null;
  /** Menor due_date futura entre cobranças pending (null se nenhuma). */
  nextDueDate: string | null;
  /** Valor do pagamento 'paid' mais recente (null se nunca pagou). */
  lastPaymentAmount: number | null;
  /** paid_at do pagamento mais recente (null se nunca pagou). */
  lastPaymentDate: string | null;
  /** Soma de todas as cobranças 'paid'. */
  totalPaid: number;
  totalPayments: number;
}

/** Normaliza "YYYY-MM-DD" ou ISO 8601 para "YYYY-MM-DD" (data local). */
export function normalizeDateKey(value: string | null | undefined): string | null {
  if (!value) return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) return match[1] + '-' + match[2] + '-' + match[3];

  return null;
}

/** Data de referência como "YYYY-MM-DD" (local). */
export function todayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return year + '-' + month + '-' + day;
}

/** Dias entre uma data-chave e a referência (positivo = passado). */
export function daysSinceKey(
  dateKey: string,
  referenceKey: string
): number {
  const target = new Date(dateKey + 'T00:00:00');
  const reference = new Date(referenceKey + 'T00:00:00');

  return Math.floor(
    (reference.getTime() - target.getTime()) / 86_400_000
  );
}

export function buildStudentBillingSummary(
  payments: Payment[],
  reference: Date = new Date()
): StudentBillingSummary {
  const referenceKey = todayKey(reference);

  const pendingPayments = payments.filter(
    (payment) => payment.status === 'pending'
  );

  const paidPayments = payments.filter(
    (payment) => payment.status === 'paid'
  );

  const overduePayments = pendingPayments.filter((payment) => {
    const dueKey = normalizeDateKey(payment.due_date);

    return dueKey !== null && dueKey < referenceKey;
  });

  const pendingAmount = pendingPayments.reduce(
    (total, payment) => total + payment.amount,
    0
  );

  const overdueAmount = overduePayments.reduce(
    (total, payment) => total + payment.amount,
    0
  );

  const overdueDays =
    overduePayments.length > 0
      ? Math.max(
          1,
          ...overduePayments.map((payment) => {
            const dueKey = normalizeDateKey(payment.due_date);

            return dueKey
              ? daysSinceKey(dueKey, referenceKey)
              : 0;
          })
        )
      : null;

  const nextDueKeys = pendingPayments
    .map((payment) => normalizeDateKey(payment.due_date))
    .filter(
      (key): key is string => key !== null && key >= referenceKey
    )
    .sort();

  const nextDueDate = nextDueKeys[0] ?? null;

  const lastPayment =
    paidPayments
      .filter((payment) => payment.paid_at)
      .sort(
        (first, second) =>
          (second.paid_at as string).localeCompare(
            first.paid_at as string
          )
      )[0] ?? null;

  const totalPaid = paidPayments.reduce(
    (total, payment) => total + payment.amount,
    0
  );

  let status: StudentBillingStatus = 'em_dia';

  if (payments.length === 0) {
    status = 'sem_cobrancas';
  } else if (overduePayments.length > 0) {
    status = 'inadimplente';
  }

  return {
    status,
    pendingAmount,
    overdueAmount,
    overdueDays,
    nextDueDate,
    lastPaymentAmount: lastPayment?.amount ?? null,
    lastPaymentDate: lastPayment?.paid_at ?? null,
    totalPaid,
    totalPayments: payments.length,
  };
}

/**
 * Cobrança individual identificada como vencida (status financeiro derivado).
 */
export interface OverduePayment {
  payment: Payment;
  /** Dias de atraso desde o vencimento (>= 1). */
  daysOverdue: number;
}

/**
 * Filtra as cobrançs vencidas de forma DERIVADA (due_date no passado +
 * status 'pending'). NUNCA depende de payment.status = 'overdue'.
 * Ordena da mais antiga para a mais recente.
 */
export function getOverduePayments(
  payments: Payment[],
  reference: Date = new Date()
): OverduePayment[] {
  const referenceKey = todayKey(reference);

  return payments
    .filter((payment) => payment.status === 'pending')
    .map((payment) => {
      const dueKey = normalizeDateKey(payment.due_date);

      return { payment, dueKey };
    })
    .filter(
      (entry) => entry.dueKey !== null && entry.dueKey < referenceKey
    )
    .map(
      (entry) =>
        ({
          payment: entry.payment,
          daysOverdue: daysSinceKey(
            entry.dueKey as string,
            referenceKey
          ),
        } as OverduePayment)
    )
    .sort(
      (first, second) =>
        second.daysOverdue - first.daysOverdue
    );
}

/**
 * Agregação por aluno das cobranças vencidas. Cada entrada representa um
 * aluno inadimplente com: dias de atraso (maior atraso entre as cobranças),
 * valor pendente (soma das vencidas) e a lista de cobranças vencidas.
 */
export interface OverdueStudent {
  studentId: string;
  studentName: string;
  daysOverdue: number;
  overdueAmount: number;
  payments: OverduePayment[];
}

export function getOverdueStudents(
  payments: Payment[],
  reference: Date = new Date()
): OverdueStudent[] {
  const overdue = getOverduePayments(payments, reference);
  const byStudent = new Map<string, OverdueStudent>();

  for (const entry of overdue) {
    const studentId = entry.payment.student_id || 'unknown';

    const existing = byStudent.get(studentId);

    if (!existing) {
      byStudent.set(studentId, {
        studentId,
        studentName: entry.payment.student_name || 'Aluno',
        daysOverdue: entry.daysOverdue,
        overdueAmount: entry.payment.amount,
        payments: [entry],
      });
    } else {
      existing.payments.push(entry);
      existing.overdueAmount += entry.payment.amount;
      existing.daysOverdue = Math.max(
        existing.daysOverdue,
        entry.daysOverdue
      );
    }
  }

  return Array.from(byStudent.values()).sort(
    (first, second) => second.daysOverdue - first.daysOverdue
  );
}
