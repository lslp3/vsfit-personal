import { useEffect, useState, useRef, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Loader2,
  Check,
  CheckCheck,
  ArrowLeft,
} from 'lucide-react';

import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { getTrainerProfile } from '../../services/trainerService';
import { getMessages, sendMessage } from '../../services/messageService';
import { cn, getInitials } from '../../lib/utils';
import { timeAgo } from '../../lib/formatters';
import type { Message, TrainerProfile } from '../../types/database';

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

function getStudentAvatarUrl(student: any) {
  return (
    student?.avatar_url ||
    student?.photo_url ||
    student?.profile_photo_url ||
    student?.image_url ||
    null
  );
}

function AvatarWithStatus({
  src,
  name,
  online,
  size = 'md',
  accent = false,
  showStatus = true,
}: {
  src?: string | null;
  name: string;
  online?: boolean;
  size?: 'sm' | 'md';
  accent?: boolean;
  showStatus?: boolean;
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

      {showStatus && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 z-20 rounded-full border-[2.5px] border-[#050505]',
            dotSize,
            online ? 'bg-emerald-400' : 'bg-zinc-600'
          )}
        />
      )}
    </div>
  );
}

export function StudentChatPage() {
  const navigate = useNavigate();
  const { user, student: storeStudent, studentAccount, isLoading } = useAuthStore();

  const [trainer, setTrainer] = useState<TrainerProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [trainerOnline, setTrainerOnline] = useState(false);
  const [trainerLastSeen, setTrainerLastSeen] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const studentId = storeStudent?.id || studentAccount?.student_id;
  const studentName = storeStudent?.name || studentAccount?.email || 'Aluno';
  const studentAvatarUrl = getStudentAvatarUrl(storeStudent);

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/student/dashboard');
  }

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!user?.id || !studentId) return;

    loadData();
  }, [user?.id, studentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!trainer?.id || !studentId || !user?.id) return;

    const trainerId = trainer.id;
    const currentUserId = user.id;

    async function updateMyPresence() {
      try {
        await supabase.from('app_presence').upsert(
          {
            user_id: currentUserId,
            role: 'student',
            trainer_id: trainerId,
            student_id: studentId,
            display_name: studentName,
            avatar_url: studentAvatarUrl,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      } catch (error) {
        console.warn('[StudentChatPage] update presence warning:', error);
      }
    }

    updateMyPresence();

    const timer = window.setInterval(updateMyPresence, 30000);

    return () => {
      window.clearInterval(timer);
      updateMyPresence();
    };
  }, [trainer?.id, studentId, user?.id, studentName, studentAvatarUrl]);

  useEffect(() => {
    if (!trainer?.id || !studentId) return;

    const trainerId = trainer.id;

    const channel = supabase.channel(`vsfit-chat-presence-${trainerId}`, {
      config: {
        presence: {
          key: `student:${studentId}`,
        },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users = getPresenceUsers(state as Record<string, any[]>);

      const isTrainerOnline = users.some(
        (item) => item.type === 'personal' && item.id === trainerId
      );

      setTrainerOnline(isTrainerOnline);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          type: 'student',
          id: studentId,
          name: studentName,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [trainer?.id, studentId, studentName]);

  useEffect(() => {
    if (!trainer?.id) return;

    const trainerId = trainer.id;

    async function loadTrainerPresence() {
      const { data, error } = await supabase
        .from('app_presence')
        .select('last_seen_at')
        .eq('role', 'personal')
        .eq('trainer_id', trainerId)
        .maybeSingle();

      if (error) {
        console.warn('[StudentChatPage] trainer presence warning:', error);
        return;
      }

      setTrainerLastSeen(data?.last_seen_at || null);
    }

    loadTrainerPresence();

    const timer = window.setInterval(loadTrainerPresence, 30000);

    return () => window.clearInterval(timer);
  }, [trainer?.id]);

  useEffect(() => {
    if (!trainer?.id || !studentId) return;

    const trainerId = trainer.id;

    const channel = supabase
      .channel(`vsfit-student-chat-messages-${trainerId}-${studentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `student_id=eq.${studentId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          if (newMsg.trainer_id !== trainerId) return;

          setMessages((prev) => {
            if (prev.some((item) => item.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          if (newMsg.sender_role === 'personal') {
            await markTrainerMessagesAsRead(trainerId, studentId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `student_id=eq.${studentId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as Message;

          if (updatedMsg.trainer_id !== trainerId) return;

          setMessages((prev) =>
            prev.map((item) => (item.id === updatedMsg.id ? updatedMsg : item))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trainer?.id, studentId]);

  async function markTrainerMessagesAsRead(trainerId: string, currentStudentId: string) {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('trainer_id', trainerId)
        .eq('student_id', currentStudentId)
        .eq('sender_role', 'personal')
        .eq('read', false);

      if (error) {
        console.warn('[StudentChatPage] mark personal messages read warning:', error);
      }
    } catch (error) {
      console.warn('[StudentChatPage] mark personal messages read exception:', error);
    }
  }

  async function loadData() {
    if (!studentId) return;

    setLoading(true);

    try {
      let trainerId = storeStudent?.trainer_id || null;

      if (!trainerId) {
        const { data: studentData } = await supabase
          .from('students')
          .select('trainer_id')
          .eq('id', studentId)
          .maybeSingle();

        trainerId = studentData?.trainer_id || null;
      }

      if (!trainerId) {
        const { data: plans } = await supabase
          .from('workout_plans')
          .select('trainer_id')
          .eq('student_id', studentId)
          .limit(1);

        if (plans && plans.length > 0) {
          trainerId = plans[0].trainer_id;
        }
      }

      if (!trainerId) {
        setTrainer(null);
        setMessages([]);
        return;
      }

      const [trainerData, msgs] = await Promise.all([
        getTrainerProfile(trainerId),
        getMessages(trainerId, studentId),
      ]);

      setTrainer(trainerData);
      setMessages(msgs);

      await markTrainerMessagesAsRead(trainerId, studentId);
    } catch (err) {
      console.error('[StudentChatPage] loadData error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const text = newMessage.trim();

    if (!text || !studentId || !user || !trainer || sending) return;

    setSending(true);

    try {
      const msg = await sendMessage({
        trainer_id: trainer.id,
        student_id: studentId,
        sender_role: 'student',
        sender_id: user.id,
        content: text,
      });

      setMessages((prev) => {
        if (prev.some((item) => item.id === msg.id)) return prev;
        return [...prev, msg];
      });

      setNewMessage('');
    } catch (err) {
      console.error('[StudentChatPage] send error:', err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  if (loading || isLoading || !studentId) return <LoadingScreen />;

  if (!trainer) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#050505] px-4 text-white">
        <EmptyState
          icon={
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
              <MessageSquare className="h-10 w-10 text-zinc-700" />
            </div>
          }
          title="Chat não disponível"
          description="Não foi possível carregar suas mensagens."
        />
      </div>
    );
  }

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
            onClick={handleBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white active:bg-white/10"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <AvatarWithStatus
            src={trainer.avatar_url || null}
            name={trainer.name || 'Personal'}
            online={trainerOnline}
            accent
          />

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-black text-white">
              {trainer.name}
            </h2>

            <p className="truncate text-[11px] font-medium text-zinc-500">
              {trainerOnline ? 'online agora' : formatLastSeen(trainerLastSeen)}
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
              <div className="flex h-[60dvh] flex-col items-center justify-center text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.03]">
                  <MessageSquare className="h-7 w-7 text-zinc-700" />
                </div>

                <p className="text-sm font-bold text-zinc-500">
                  Nenhuma mensagem ainda.
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  Envie uma mensagem para seu personal trainer.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isStudent = msg.sender_role === 'student';

                const avatarSrc = isStudent
                  ? studentAvatarUrl
                  : trainer.avatar_url || null;

                const avatarName = isStudent
                  ? studentName
                  : trainer.name || 'Personal';

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'flex items-end gap-2',
                      isStudent ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {!isStudent && (
                      <AvatarWithStatus
                        src={avatarSrc}
                        name={avatarName}
                        online={trainerOnline}
                        size="sm"
                        accent
                      />
                    )}

                    <div
                      className={cn(
                        'max-w-[74%] rounded-2xl px-4 py-2.5 shadow-[0_12px_35px_rgba(0,0,0,0.25)]',
                        isStudent
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
                          isStudent ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <span className="text-[10px] opacity-60">
                          {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        {isStudent &&
                          (msg.read ? (
                            <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-white/60" />
                          ))}
                      </div>
                    </div>

                    {isStudent && (
                      <AvatarWithStatus
                        src={avatarSrc}
                        name={avatarName}
                        online
                        size="sm"
                        showStatus={false}
                      />
                    )}
                  </motion.div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="shrink-0 bg-[#050505] pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.045] p-2">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mensagem"
              rows={1}
              className="max-h-24 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ff2a32] text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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

export default StudentChatPage;