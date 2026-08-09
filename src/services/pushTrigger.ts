import { supabase } from '../lib/supabase';
import { PUSH_ROUTES, type PushEventType } from '../types/push';
import type { PushSendOutcome } from '../lib/pushRecipients';

/**
 * Sprint 12 — ETAPA 5: disparos de push a partir de eventos de negócio.
 *
 * ÚNICA via de envio no cliente: todos os módulos (chat, treino, plano,
 * pagamento, sistema) chamam estas funções — a lógica de envio continua
 * 100% centralizada na Edge Function `send-push-notification`
 * (supabase.functions.invoke anexa o JWT do usuário automaticamente).
 *
 * Best-effort: nenhum disparo quebra o fluxo do app.
 */

export interface PushTriggerOptions {
  /** auth uid do DESTINATÁRIO. */
  user: string;
  title: string;
  body: string;
  event_type: PushEventType;
  route: string;
  data?: Record<string, string>;
}

export async function sendPush({
  user,
  title,
  body,
  event_type,
  route,
  data,
}: PushTriggerOptions): Promise<PushSendOutcome> {
  try {
    const { data: result, error } = await supabase.functions.invoke(
      'send-push-notification',
      {
        body: {
          user_id: user,
          title,
          body,
          data: {
            event_type,
            route,
            ...(data ?? {}),
          },
        },
      }
    );

    if (error) {
      console.warn('[PushTrigger] sendPush invoke error:', error);
      return { ok: false, sent: 0, devices: 0, blocked: false };
    }

    // Normalização mínima do contrato da Edge Function: a UI precisa saber
    // quando a resposta indica que NENHUM dispositivo recebeu (devices: 0,
    // blocked por preferência, ou envio sem sucesso) para não afirmar uma
    // entrega que não aconteceu.
    const payload = (result ?? {}) as Partial<PushSendOutcome> & { ok?: unknown };
    const sent = Number(payload.sent ?? 0);
    const devices = Number(payload.devices ?? 0);

    return {
      ok: payload.ok !== false,
      sent: Number.isFinite(sent) && sent > 0 ? sent : 0,
      devices: Number.isFinite(devices) && devices > 0 ? devices : 0,
      blocked: payload.blocked === true,
    };
  } catch (error) {
    console.warn('[PushTrigger] sendPush error:', error);
    return { ok: false, sent: 0, devices: 0, blocked: false };
  }
}

/** auth uid do aluno a partir do id na tabela students. */
async function resolveStudentAuthUserId(studentId: string): Promise<string | null> {
  if (!studentId) return null;

  try {
    const { data } = await supabase
      .from('students')
      .select('auth_user_id')
      .eq('id', studentId)
      .maybeSingle();

    return data?.auth_user_id || null;
  } catch (error) {
    console.warn('[PushTrigger] resolveStudentAuthUserId error:', error);
    return null;
  }
}

/* ────────────────────────── Triggers por evento ────────────────────────── */

/**
 * NEW_MESSAGE — após envio de mensagem no chat (ambos os papéis).
 * `msg` segue a linha inserida em `messages` (Message).
 */
export async function pushNewMessage(msg: {
  trainer_id: string;
  student_id: string;
  sender_role: 'personal' | 'student';
  content: string;
}): Promise<void> {
  try {
    // Destinatário: aluno → personal (trainer_id é auth uid);
    // personal → aluno (auth uid via students).
    const recipient =
      msg.sender_role === 'student'
        ? msg.trainer_id
        : await resolveStudentAuthUserId(msg.student_id);

    if (!recipient) return;

    await sendPush({
      user: recipient,
      title: msg.sender_role === 'student' ? 'Nova mensagem do aluno' : 'Nova mensagem do personal',
      body: msg.content.slice(0, 240),
      event_type: 'NEW_MESSAGE',
      route: PUSH_ROUTES.NEW_MESSAGE,
      data: {
        trainer_id: msg.trainer_id,
        student_id: msg.student_id,
        conversation_id: `${msg.trainer_id}:${msg.student_id}`,
      },
    });
  } catch (error) {
    console.warn('[PushTrigger] pushNewMessage error:', error);
  }
}

/** WORKOUT_COMPLETED — aluno finalizou treino (destinatário: personal). */
export async function pushWorkoutCompleted(opts: {
  user: string;
  title: string;
  body: string;
  trainerId: string;
  studentId: string;
}): Promise<void> {
  await sendPush({
    user: opts.user,
    title: opts.title,
    body: opts.body,
    event_type: 'WORKOUT_COMPLETED',
    route: PUSH_ROUTES.WORKOUT_COMPLETED,
    data: {
      trainer_id: opts.trainerId,
      student_id: opts.studentId,
    },
  });
}

/** PLAN_EXPIRING — plano vencido/próximo do vencimento (destinatário: personal). */
export async function pushPlanExpired(opts: {
  user: string;
  title: string;
  body: string;
  trainerId: string;
  studentId: string;
}): Promise<void> {
  await sendPush({
    user: opts.user,
    title: opts.title,
    body: opts.body,
    event_type: 'PLAN_EXPIRING',
    route: PUSH_ROUTES.PLAN_EXPIRING,
    data: {
      trainer_id: opts.trainerId,
      student_id: opts.studentId,
    },
  });
}

/** PAYMENT_APPROVED — pagamento aprovado (destinatário: aluno). */
export async function pushPaymentApproved(paymentId: string): Promise<void> {
  try {
    const { data: payment } = await supabase
      .from('payments')
      .select('id, trainer_id, student_id, amount')
      .eq('id', paymentId)
      .maybeSingle();

    if (!payment?.student_id || !payment?.trainer_id) return;

    const studentUserId = await resolveStudentAuthUserId(payment.student_id);
    if (!studentUserId) return;

    await sendPush({
      user: studentUserId,
      title: 'Pagamento aprovado',
      body: `Seu pagamento de R$ ${Number(payment.amount).toFixed(2)} foi aprovado.`,
      event_type: 'PAYMENT_APPROVED',
      route: PUSH_ROUTES.PAYMENT_APPROVED,
      data: {
        trainer_id: payment.trainer_id,
        student_id: payment.student_id,
        payment_id: payment.id,
        amount: String(payment.amount),
      },
    });
  } catch (error) {
    console.warn('[PushTrigger] pushPaymentApproved error:', error);
  }
}

/** SYSTEM_NOTIFICATION — notificação administrativa (destinatário: informado). */
export async function pushSystemNotification(opts: {
  user: string;
  title: string;
  body: string;
  type?: string;
}): Promise<PushSendOutcome> {
  return sendPush({
    user: opts.user,
    title: opts.title,
    body: opts.body,
    event_type: 'SYSTEM_NOTIFICATION',
    route: PUSH_ROUTES.SYSTEM_NOTIFICATION,
    data: opts.type ? { notification_type: opts.type } : undefined,
  });
}
