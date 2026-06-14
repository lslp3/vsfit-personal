import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import {
  MessageSquare,
  Send,
  Loader2,
  ArrowLeft,
  Check,
  CheckCheck,
} from 'lucide-react';

import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import * as messageService from '../../services/messageService';
import type { Message } from '../../types/database';
import type { Conversation } from '../../types/message';
import { getInitials, cn } from '../../lib/utils';
import { timeAgo } from '../../lib/formatters';

type PresenceUser = {
  type: 'personal' | 'student';
  id: string;
  name: string;
  online_at: string;
};

function getPresenceUsers(state: Record<string, any[]>): PresenceUser[] {
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

function formatLastSeen(lastSeenAt?: string | null) {
  if (!lastSeenAt) return 'visto por último recentemente';

  return `visto por último ${timeAgo(lastSeenAt)}`;
}

function AvatarWithStatus({
  src,
  name,
  online,
  size = 'md',
  accent = false,
}: {
  src?: string | null;
  name: string;
  online?: boolean;
  size?: 'sm' | 'md';
  accent?: boolean;
}) {
  const avatarSize = size === 'sm' ? 'h-8 w-8' : 'h-12 w-12';
  const dotSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <div className={cn('relative shrink-0 overflow-visible', avatarSize)}>
      <div
        className={cn(
          'h-full w-full overflow-hidden rounded-full border border-white/10',
          accent ? 'bg-[#ff2a32]/10' : 'bg-white/[0.06]'
        )}
      >
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span
            className={cn(
              'flex h-full w-full items-center justify-center font-black',
              size === 'sm' ? 'text-[11px]' : 'text-sm',
              accent ? 'text-[#ff2a32]' : 'text-zinc-300'
            )}
          >
            {getInitials(name)}
          </span>
        )}
      </div>

      <span
        className={cn(
          'absolute -bottom-0.5 -right-0.5 z-20 rounded-full border-[2.5px] border-[#050505]',
          dotSize,
          online ? 'bg-emerald-400' : 'bg-zinc-600'
        )}
      />
    </div>
  );
}

export function ChatPage() {
  const { trainerProfile } = useAuthStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [selectedStudentAvatar, setSelectedStudentAvatar] = useState<string | null>(null);

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [onlineStudents, setOnlineStudents] = useState<Set<string>>(new Set());
  const [studentLastSeen, setStudentLastSeen] = useState<Record<string, string>>({});
  const [studentUnreadCounts, setStudentUnreadCounts] = useState<Record<string, number>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function loadStudentUnreadCounts(trainerId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('student_id')
      .eq('trainer_id', trainerId)
      .eq('sender_role', 'student')
      .eq('read', false);

    if (error) {
      console.warn('[ChatPage] unread count warning:', error);
      return;
    }

    const counts: Record<string, number> = {};

    (data || []).forEach((item: any) => {
      if (!item.student_id) return;

      counts[item.student_id] = (counts[item.student_id] || 0) + 1;
    });

    setStudentUnreadCounts(counts);
  }

  useEffect(() => {
    if (!selectedStudentId) return;

    const scrollY = window.scrollY;

    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalHtmlHeight = document.documentElement.style.height;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyLeft = document.body.style.left;
    const originalBodyRight = document.body.style.right;
    const originalBodyWidth = document.body.style.width;
    const originalBodyHeight = document.body.style.height;

    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.height = originalHtmlHeight;

      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.left = originalBodyLeft;
      document.body.style.right = originalBodyRight;
      document.body.style.width = originalBodyWidth;
      document.body.style.height = originalBodyHeight;

      window.scrollTo(0, scrollY);
    };
  }, [selectedStudentId]);

  useEffect(() => {
    if (!trainerProfile?.id) return;

    const trainerId = trainerProfile.id;

    setLoading(true);

    Promise.all([
      messageService.getConversations(trainerId),
      loadStudentUnreadCounts(trainerId),
    ])
      .then(([conversationData]) => {
        setConversations(conversationData);
      })
      .catch((error) => {
        console.error('[ChatPage] getConversations error:', error);
      })
      .finally(() => setLoading(false));
  }, [trainerProfile?.id]);

  useEffect(() => {
    if (!trainerProfile?.id) return;

    const trainerId = trainerProfile.id;
    const trainerName = trainerProfile.name || 'Personal';
    const trainerAvatarUrl = trainerProfile.avatar_url || null;

    async function updateMyPresence() {
      try {
        await supabase.from('app_presence').upsert(
          {
            user_id: trainerId,
            role: 'personal',
            trainer_id: trainerId,
            student_id: null,
            display_name: trainerName,
            avatar_url: trainerAvatarUrl,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      } catch (error) {
        console.warn('[ChatPage] update presence warning:', error);
      }
    }

    updateMyPresence();

    const timer = window.setInterval(updateMyPresence, 30000);

    return () => {
      window.clearInterval(timer);
      updateMyPresence();
    };
  }, [trainerProfile?.id, trainerProfile?.name, trainerProfile?.avatar_url]);

  useEffect(() => {
    if (!trainerProfile?.id) return;

    const trainerId = trainerProfile.id;
    const trainerName = trainerProfile.name || 'Personal';

    const channel = supabase.channel(`vsfit-chat-presence-${trainerId}`, {
      config: {
        presence: {
          key: `personal:${trainerId}`,
        },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users = getPresenceUsers(state as Record<string, any[]>);

      const studentsOnline = new Set(
        users
          .filter((item) => item.type === 'student')
          .map((item) => item.id)
      );

      setOnlineStudents(studentsOnline);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          type: 'personal',
          id: trainerId,
          name: trainerName,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [trainerProfile?.id, trainerProfile?.name]);

  useEffect(() => {
    if (conversations.length === 0) return;

    async function loadPresenceRows() {
      const studentIds = conversations
        .map((item) => item.studentId)
        .filter((id): id is string => Boolean(id));

      if (studentIds.length === 0) return;

      const { data, error } = await supabase
        .from('app_presence')
        .select('student_id,last_seen_at')
        .eq('role', 'student')
        .in('student_id', studentIds);

      if (error) {
        console.warn('[ChatPage] app_presence warning:', error);
        return;
      }

      const map: Record<string, string> = {};

      (data || []).forEach((item: any) => {
        if (item.student_id && item.last_seen_at) {
          map[item.student_id] = item.last_seen_at;
        }
      });

      setStudentLastSeen(map);
    }

    loadPresenceRows();

    const timer = window.setInterval(loadPresenceRows, 30000);

    return () => window.clearInterval(timer);
  }, [conversations]);

  useEffect(() => {
    if (!trainerProfile?.id) return;

    const trainerId = trainerProfile.id;

    const channel = supabase
      .channel(`vsfit-chat-messages-${trainerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `trainer_id=eq.${trainerId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          if (selectedStudentId && newMessage.student_id === selectedStudentId) {
            setMessages((prev) => {
              if (prev.some((item) => item.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });

            if (newMessage.sender_role === 'student') {
              await messageService.markMessagesAsRead(trainerId, selectedStudentId);

              setStudentUnreadCounts((prev) => ({
                ...prev,
                [selectedStudentId]: 0,
              }));
            }
          }

          messageService
            .getConversations(trainerId)
            .then(setConversations)
            .catch(() => {});

          loadStudentUnreadCounts(trainerId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `trainer_id=eq.${trainerId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;

          setMessages((prev) =>
            prev.map((item) => (item.id === updatedMessage.id ? updatedMessage : item))
          );

          loadStudentUnreadCounts(trainerId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trainerProfile?.id, selectedStudentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function openConversation(
    studentId: string,
    studentName: string,
    avatarUrl?: string | null
  ) {
    if (!trainerProfile?.id) return;

    const trainerId = trainerProfile.id;

    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
    setSelectedStudentAvatar(avatarUrl || null);

    try {
      const data = await messageService.getMessages(trainerId, studentId);

      setMessages(data);

      await messageService.markMessagesAsRead(trainerId, studentId);

      setStudentUnreadCounts((prev) => ({
        ...prev,
        [studentId]: 0,
      }));

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.studentId === studentId
            ? { ...conversation, unread: 0 }
            : conversation
        )
      );
    } catch (error) {
      console.error('[ChatPage] openConversation error:', error);
    }
  }

  function goBack() {
    setSelectedStudentId(null);
    setSelectedStudentName('');
    setSelectedStudentAvatar(null);
    setMessages([]);

    if (trainerProfile?.id) {
      const trainerId = trainerProfile.id;

      messageService
        .getConversations(trainerId)
        .then(setConversations)
        .catch(() => {});

      loadStudentUnreadCounts(trainerId);
    }
  }

  async function handleSend() {
    if (!trainerProfile?.id || !selectedStudentId || !text.trim()) return;

    const trainerId = trainerProfile.id;
    const studentId = selectedStudentId;
    const content = text.trim();

    setSending(true);

    try {
      const msg = await messageService.sendMessage({
        trainer_id: trainerId,
        student_id: studentId,
        sender_role: 'personal',
        sender_id: trainerId,
        content,
      });

      setMessages((prev) => {
        if (prev.some((item) => item.id === msg.id)) return prev;
        return [...prev, msg];
      });

      setText('');

      messageService
        .getConversations(trainerId)
        .then(setConversations)
        .catch(() => {});

      loadStudentUnreadCounts(trainerId);
    } catch (error) {
      console.error('[ChatPage] sendMessage error:', error);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  const selectedStudentOnline = selectedStudentId
    ? onlineStudents.has(selectedStudentId)
    : false;

  const selectedLastSeen = selectedStudentId
    ? studentLastSeen[selectedStudentId]
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <Header title="Chat" />

        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  if (selectedStudentId) {
    return (
      <div
        className="fixed inset-0 z-[99999] flex w-screen flex-col overflow-hidden bg-[#050505] text-white"
        style={{
          height: '100dvh',
          maxHeight: '100dvh',
          minHeight: '100dvh',
          overscrollBehavior: 'none',
        }}
      >
        <div className="shrink-0 border-b border-white/10 bg-[#080808] px-3 py-3">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white active:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <AvatarWithStatus
              src={selectedStudentAvatar}
              name={selectedStudentName}
              online={selectedStudentOnline}
              accent
            />

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-black text-white">
                {selectedStudentName}
              </h2>

              <p className="truncate text-[11px] font-medium text-zinc-500">
                {formatLastSeen(selectedLastSeen)}
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col overflow-hidden px-4">
          <div
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-3 pr-1"
            style={{
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="flex h-[60dvh] items-center justify-center">
                  <p className="text-sm text-zinc-500">Nenhuma mensagem ainda</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isPersonal = msg.sender_role === 'personal';

                  const avatarSrc = isPersonal
                    ? trainerProfile?.avatar_url || null
                    : selectedStudentAvatar;

                  const avatarName = isPersonal
                    ? trainerProfile?.name || 'Personal'
                    : selectedStudentName;

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex items-end gap-2',
                        isPersonal ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {!isPersonal && (
                        <AvatarWithStatus
                          src={avatarSrc}
                          name={avatarName}
                          online={selectedStudentOnline}
                          size="sm"
                          accent
                        />
                      )}

                      <div
                        className={cn(
                          'max-w-[74%] rounded-2xl px-4 py-2.5 shadow-[0_12px_35px_rgba(0,0,0,0.25)]',
                          isPersonal
                            ? 'rounded-br-md bg-[#ff2a32] text-white'
                            : 'rounded-bl-md border border-white/10 bg-white/[0.08] text-white'
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {msg.content}
                        </p>

                        <div
                          className={cn(
                            'mt-1 flex items-center gap-1',
                            isPersonal ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <span className="text-[10px] opacity-60">
                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>

                          {isPersonal &&
                            (msg.read ? (
                              <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-white/60" />
                            ))}
                        </div>
                      </div>

                      {isPersonal && (
                        <AvatarWithStatus
                          src={avatarSrc}
                          name={avatarName}
                          online
                          size="sm"
                        />
                      )}
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="shrink-0 bg-[#050505] pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.045] p-2">
              <textarea
                className="max-h-24 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600"
                placeholder="Mensagem"
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className="shrink-0 rounded-full bg-[#ff2a32] p-3 text-white transition-all active:scale-90 disabled:opacity-40"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header title="Chat" />

      <div className="mx-auto max-w-lg space-y-3 px-4 pb-32 pt-4">
        {conversations.length === 0 ? (
          <EmptyState
            icon={
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
                <MessageSquare className="h-10 w-10 text-zinc-700" />
              </div>
            }
            title="Nenhuma conversa"
            description="Quando seus alunos enviarem mensagens, elas aparecerão aqui."
          />
        ) : (
          conversations.map((conv) => {
            const isStudentOnline = onlineStudents.has(conv.studentId);
            const lastSeen = studentLastSeen[conv.studentId];
            const unreadCount = studentUnreadCounts[conv.studentId] || 0;

            return (
              <Card
                key={conv.studentId}
                onClick={() =>
                  openConversation(conv.studentId, conv.studentName, conv.avatarUrl)
                }
              >
                <div className="flex items-center gap-3">
                  <AvatarWithStatus
                    src={conv.avatarUrl}
                    name={conv.studentName}
                    online={isStudentOnline}
                    accent
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-bold text-white">
                        {conv.studentName}
                      </p>

                      <span className="shrink-0 text-[10px] text-zinc-500">
                        {timeAgo(conv.lastMessageAt)}
                      </span>
                    </div>

                    <p className="mt-0.5 truncate text-[11px] font-medium text-zinc-500">
                      {formatLastSeen(lastSeen)}
                    </p>

                    <p className="mt-1 truncate text-sm text-zinc-400">
                      {conv.lastMessage}
                    </p>
                  </div>

                  {unreadCount > 0 && (
                    <div className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#ff2a32] px-1.5">
                      <span className="text-[10px] font-black text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ChatPage;