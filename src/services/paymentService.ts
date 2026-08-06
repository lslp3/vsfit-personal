import { supabase } from '../lib/supabase';
import type { Payment } from '../types/database';
import type { CreatePaymentData } from '../types/payment';
import { pushPaymentApproved } from './pushTrigger';

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

export interface TrainerPaymentSettings {
  id?: string;
  trainer_id: string;
  pix_key: string | null;
  pix_key_type: PixKeyType | string | null;
  pix_owner_name: string | null;
  pix_city: string | null;
  created_at?: string;
  updated_at?: string;
}

type CreatePaymentWithPixData = CreatePaymentData & {
  pix_key?: string | null;
  pix_code?: string | null;
  method?: string | null;
};

/** Retorna "YYYY-MM" a partir de uma data (fallback: mês atual). */
export function monthKey(date?: string | null): string {
  const d = date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) return monthKey(); // fallback se inválido
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Gera o próximo invoice_number sequencial por trainer no mês (FAT-YYYYMM-XXXX). */
async function nextInvoiceNumber(
  trainerId: string,
  refMonth: string
): Promise<string> {
  const prefix = `FAT-${refMonth.replace('-', '')}`;
  let next = 1;

  try {
    const { data, error } = await supabase
      .from('payments')
      .select('invoice_number')
      .eq('trainer_id', trainerId)
      .like('invoice_number', `${prefix}-%`);

    if (!error && Array.isArray(data)) {
      const seqs = (data as { invoice_number: string | null }[])
        .filter((row) => row.invoice_number)
        .map((row) => {
          const num = Number(String(row.invoice_number).replace(`${prefix}-`, ''));
          return Number.isFinite(num) ? num : 0;
        });
      next = (seqs.length ? Math.max(...seqs) : 0) + 1;
    }
  } catch (err) {
    console.error('[PaymentService] generateInvoiceNumber error:', err);
  }

  return `${prefix}-${String(next).padStart(4, '0')}`;
}

function onlyNumbers(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function removeAccents(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function limitText(value: string, max: number) {
  return removeAccents(String(value || ''))
    // Normaliza separadores de espaço não-ASCII (ex.: NBSP U+00A0, em/thin
    // space, etc.) para o espaço ASCII U+0020, para que nunca percam um
    // espaço interno entre palavras ao passarem pelo filtro abaixo.
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .slice(0, max)
    .toUpperCase();
}

function normalizePixKey(pixKey: string, pixKeyType?: string | null) {
  const key = String(pixKey || '').trim();

  if (!key) return '';

  if (pixKeyType === 'cpf' || pixKeyType === 'cnpj') {
    return onlyNumbers(key);
  }

  if (pixKeyType === 'phone') {
    const numbers = onlyNumbers(key);

    if (numbers.startsWith('55')) {
      return `+${numbers}`;
    }

    if (numbers.length === 10 || numbers.length === 11) {
      return `+55${numbers}`;
    }

    return key;
  }

  return key;
}

function emv(id: string, value: string) {
  const cleanValue = String(value || '');
  const size = String(cleanValue.length).padStart(2, '0');

  return `${id}${size}${cleanValue}`;
}

function crc16(payload: string) {
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;

    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generatePixCopyPaste(params: {
  pixKey: string;
  amount: number;
  ownerName: string;
  city?: string | null;
  description?: string | null;
  pixKeyType?: string | null;
}) {
  const pixKey = normalizePixKey(params.pixKey, params.pixKeyType);
  const amount = Number(params.amount || 0);
  const ownerName = limitText(params.ownerName || 'PERSONAL', 25) || 'PERSONAL';
  const city = limitText(params.city || 'UBERLANDIA', 15) || 'UBERLANDIA';

  if (!pixKey) return '';
  if (!amount || amount <= 0) return '';

  const merchantAccountInfo =
    emv('00', 'br.gov.bcb.pix') +
    emv('01', pixKey);

  const txid = 'VSFIT' + Date.now().toString().slice(-10);

  const payloadWithoutCRC =
    emv('00', '01') +
    emv('26', merchantAccountInfo) +
    emv('52', '0000') +
    emv('53', '986') +
    emv('54', amount.toFixed(2)) +
    emv('58', 'BR') +
    emv('59', ownerName) +
    emv('60', city) +
    emv('62', emv('05', txid)) +
    '6304';

  const crc = crc16(payloadWithoutCRC);

  return `${payloadWithoutCRC}${crc}`;
}

export function buildPaymentWhatsAppMessage(params: {
  studentName?: string | null;
  amount: number;
  dueDate?: string | null;
  description?: string | null;
  pixKey?: string | null;
  pixCode?: string | null;
}) {
  const studentName = params.studentName || 'aluno';

  const amount = Number(params.amount || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const dueText = params.dueDate
    ? new Date(params.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')
    : 'sem vencimento definido';

  return `Olá ${studentName}! Tudo bem?

Segue sua cobrança da consultoria:

Valor: ${amount}
Vencimento: ${dueText}
Descrição: ${params.description || 'Mensalidade / consultoria'}

Chave Pix:
${params.pixKey || 'Chave Pix não informada'}

Pix copia e cola:
${String(params.pixCode || '').replace(/\s+/g, '').trim() || 'Pix copia e cola não gerado'}

Após o pagamento, me envie o comprovante por aqui.`;
}

export async function getTrainerPaymentSettings(
  trainerId: string
): Promise<TrainerPaymentSettings | null> {
  try {
    const { data, error } = await supabase
      .from('trainer_payment_settings')
      .select('*')
      .eq('trainer_id', trainerId)
      .maybeSingle();

    if (error) {
      console.error('[PaymentService] getTrainerPaymentSettings error:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('[PaymentService] getTrainerPaymentSettings exception:', error);
    return null;
  }
}

export async function saveTrainerPaymentSettings(
  trainerId: string,
  settings: {
    pix_key: string;
    pix_key_type: string;
    pix_owner_name: string;
    pix_city?: string | null;
  }
): Promise<TrainerPaymentSettings> {
  const payload = {
    trainer_id: trainerId,
    pix_key: settings.pix_key.trim(),
    pix_key_type: settings.pix_key_type,
    pix_owner_name: settings.pix_owner_name.trim(),
    pix_city: settings.pix_city?.trim() || 'UBERLANDIA',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('trainer_payment_settings')
    .upsert(payload, { onConflict: 'trainer_id' })
    .select()
    .single();

  if (error) {
    console.error('[PaymentService] saveTrainerPaymentSettings error:', error);
    throw error;
  }

  return data;
}

export async function getPaymentsByTrainer(trainerId: string): Promise<Payment[]> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PaymentService] getPaymentsByTrainer error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[PaymentService] getPaymentsByTrainer exception:', error);
    throw error;
  }
}

export async function getPaymentsByStudent(studentId: string): Promise<Payment[]> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PaymentService] getPaymentsByStudent error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[PaymentService] getPaymentsByStudent exception:', error);
    throw error;
  }
}

export async function createPayment(trainerId: string, data: CreatePaymentWithPixData) {
  const refMonth = monthKey(data.due_date || undefined);
  const invoiceNumber = await nextInvoiceNumber(trainerId, refMonth);
  // reference_month é do tipo DATE — gravar o primeiro dia do mês (2026-08 -> 2026-08-01)
  const referenceMonth = `${refMonth}-01`;

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      trainer_id: trainerId,
      student_id: data.student_id,
      student_name: data.student_name,
      amount: data.amount,
      due_date: data.due_date || null,
      description: data.description || null,
      notes: data.notes || null,
      method: data.method || 'pix',
      pix_key: data.pix_key || null,
      pix_code: data.pix_code || null,
      status: 'pending',
      // Sprint 15 Fase 4 — Faturas: preenchimento automático
      invoice_number: invoiceNumber,
      issue_date: new Date().toISOString().slice(0, 10),
      reference_month: referenceMonth,
      currency: 'BRL',
    })
    .select()
    .single();

  if (error) {
    console.error('[PaymentService] createPayment error:', error);
    throw error;
  }

  return payment;
}

export async function markPaymentAsPaid(id: string) {
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;

  // Sprint 12 — ETAPA 5: push de pagamento aprovado para o aluno
  // (best-effort; envio centralizado na Edge Function).
  void pushPaymentApproved(id);
}

export async function deletePayment(id: string) {
  const { error } = await supabase.from('payments').delete().eq('id', id);

  if (error) throw error;
}