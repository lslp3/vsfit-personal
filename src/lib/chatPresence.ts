/**
 * Helpers compartilhados de presence para o chat (Personal e Aluno).
 * Consolidado na Sprint 10.1 — antes duplicados em
 * ChatPage.tsx e StudentChatPage.tsx.
 */

import { timeAgo } from './formatters';

export type PresenceUser = {
  type: 'personal' | 'student';
  id: string;
  name: string;
  online_at: string;
};

export function getPresenceUsers(state: Record<string, any[]>): PresenceUser[] {
  const users: PresenceUser[] = [];

  Object.values(state).forEach((presences) => {
    presences.forEach((presence) => {
      if (presence?.type && presence?.id) {
        users.push({
          type: presence.type,
          id: presence.id,
          name: presence.name || '',
          online_at: presence.online_at || new Date().toISOString(),
        });
      }
    });
  });

  return users;
}

export function formatLastSeen(lastSeenAt?: string | null) {
  if (!lastSeenAt) return 'visto por último recentemente';

  return `visto por último ${timeAgo(lastSeenAt)}`;
}
