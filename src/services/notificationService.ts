import { supabase } from '../lib/supabase';
import type { Notification } from '../types/database';

export interface NotificationPage {
  notifications: Notification[];
  hasMore: boolean;
}

const NOTIFICATION_PAGE_SIZE = 50;

export async function getNotifications(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<NotificationPage> {
  const limit = options?.limit ?? NOTIFICATION_PAGE_SIZE;
  const offset = options?.offset ?? 0;

  const [notificationsResult, countResult] = await Promise.all([
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  const { data, error } = notificationsResult;
  const { count, error: countError } = countResult;

  if (error) {
    console.error('[NotificationService] getNotifications error:', error);
    throw error;
  }

  if (countError) {
    console.error('[NotificationService] getNotifications count error:', countError);
    throw countError;
  }

  return {
    notifications: (data || []) as Notification[],
    hasMore: (count ?? 0) > offset + limit,
  };
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('[NotificationService] markNotificationAsRead error:', error);
    throw error;
  }
}

/**
 * Alterna o estado de leitura (usado pelo painel do Personal, que permite
 * "Marcar como lida" / "Marcar como nova").
 */
export async function toggleNotificationRead(
  notificationId: string,
  nextRead: boolean
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: nextRead })
    .eq('id', notificationId);

  if (error) {
    console.error('[NotificationService] toggleNotificationRead error:', error);
    throw error;
  }
}

export async function markNotificationsAsRead(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .in('id', notificationIds);

  if (error) {
    console.error('[NotificationService] markNotificationsAsRead error:', error);
    throw error;
  }
}