/**
 * Sprint 12 — Push Notifications (domínio desacoplado).
 *
 * Padronização de eventos e payload. Para adicionar um novo evento futuro,
 * basta acrescentar o tipo em PushEventType e (opcionalmente) o mapeamento
 * em PUSH_ROUTES — sem refatorar o restante do domínio.
 */

export type PushEventType =
  | 'NEW_MESSAGE'
  | 'WORKOUT_COMPLETED'
  | 'PAYMENT_APPROVED'
  | 'PLAN_EXPIRING'
  | 'SYSTEM_NOTIFICATION'
  | // Preparado para uso futuro (não disparado ainda).
  'STUDENT_CREATED';

/**
 * Payload estruturado de push — contém informação suficiente para abrir
 * exatamente a tela correta ao tocar na notificação. Apenas os campos
 * necessários para cada evento devem ser preenchidos.
 */
export interface PushPayload {
  event_type: PushEventType;
  route: string;
  trainer_id?: string;
  student_id?: string;
  conversation_id?: string;
  notification_id?: string;
}

/** Mensagem que a Edge Function enviará ao FCM. */
export interface PushMessage {
  title: string;
  body: string;
  data: PushPayload;
}

/**
 * Rota de destino por tipo de evento. A Edge Function usa este mapa (no
 * servidor) para montar o `route`; o app usa o mesmo `route` no deep-link.
 */
export const PUSH_ROUTES: Record<PushEventType, string> = {
  NEW_MESSAGE: '/chat',
  WORKOUT_COMPLETED: '/notifications',
  PAYMENT_APPROVED: '/notifications',
  PLAN_EXPIRING: '/notifications',
  SYSTEM_NOTIFICATION: '/notifications',
  STUDENT_CREATED: '/students',
};
