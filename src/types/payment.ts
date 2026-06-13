export interface CreatePaymentData {
  student_id: string;
  student_name: string;
  amount: number;
  due_date?: string;
  description?: string;
  method?: string;
}

export interface PaymentSummary {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  cancellationRate: number;
}
