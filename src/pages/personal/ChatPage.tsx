import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import {
  MessageSquare,
  Send,
  Loader2,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

import { useNavigate, useParams } from 'react-router-dom';

// TEMPORÁRIO — diagnóstico do file picker (não commitar).
import {
  diagChatInit,
  diagChatMount,
  diagChatUnmount,
} from '../../utils/diagChat';
import { DiagPanel } from '../../components/chat/DiagPanel';

import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import * as messageService from '../../services/messageService';
import { CHAT_MEDIA_ACCEPT } from '../../services/chatMediaService';
import { useChatMedia } from '../../hooks/useChatMedia';
import type { Message } from '../../types/database';
import type { Conversation } from '../../types/message';
import { timeAgo } from '../../lib/formatters';
import { getPresenceUsers, formatLastSeen } from '../../lib/chatPresence';
import { AvatarWithStatus } from '../../components/chat/AvatarWithStatus';
import { AttachmentButton } from '../../components/chat/AttachmentButton';
import { MediaAttachmentPreview } from '../../components/chat/MediaAttachmentPreview';
import { MessageBubble } from '../../components/chat/MessageBubble';

export function ChatPage() {
  const { trainerProfile } = useAuthStore();

  const navigate = useNavigate();
  const { studentId: routeStudentId } = useParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
  const [conversationOffset, setConversationOffset] = useState(0);

  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [selectedStudentAvatar, setSelectedStudentAvatar] = useState<string | null>(null);

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const {
    selectedFile,
    previewUrl,
    validationError,
    uploading,
    selectFile,
    clear: clearMedia,
    sendMedia,
  } = useChatMedia();

  const [onlineStudents, setOnlineStudents] = useState<Set<string>>(new Set());
  const [studentLastSeen, setStudentLastSeen] = useState<Record<string, string>>({});
  const [studentUnreadCounts, setStudentUnreadCounts] = useState<Record<string, number>>({});

  // Conversa aberta derivada da rota (/personal/chat/:studentId).
  // Viver na rota (não só em useState) faz o estado sobreviver a um reload
  // do WebView/Capacitor — ao reiniciar, o app reabre a conversa do aluno.
  const selectedStudentId = routeStudentId || null;

  // TEMPORÁRIO: refletir mount/unmount + estado logo após o seletor. Não commitar.
  useEffect(() => {
    diagChatInit(undefined);
    const inst = diagChatMount(
      'ChatPage',
      '| route=',
      routeStudentId ?? '(lista)',
      '| caption=',
      JSON.stringify(text)
    );
    return () => diagChatUnmount('ChatPage', inst);
  }, []);

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
      .then(([conversationPage]) => {
        setConversations(conversationPage.conversations);
        setHasMoreConversations(conversationPage.hasMore);
        setConversationOffset(0);
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
            .then((page) => {
              setConversations(page.conversations);
              setHasMoreConversations(page.hasMore);
              setConversationOffset(0);
            })
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

  // Abre/restaura a conversa identificada pela rota (:studentId).
  // Cobre o mount inicial (rota /personal/chat/:id) e a troca via click —
  // inclusive após um reload do WebView/Capacitor, quando o estado local
  // foi perdido mas a rota mantém o aluno.
  useEffect(() => {
    if (!trainerProfile?.id) return;

    if (!routeStudentId) {
      setMessages([]);
      setHasMoreMessages(false);
      return;
    }

    const trainerId = trainerProfile.id;
    const studentId = routeStudentId;
    let cancelled = false;

    (async () => {
      try {
        const { messages: data, hasMore } = await messageService.getMessages(
          trainerId,
          studentId
        );

        if (cancelled) return;

        setMessages(data);
        setHasMoreMessages(hasMore);

        await messageService.markMessagesAsRead(trainerId, studentId);

        if (cancelled) return;

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
        console.error('[ChatPage] load conversation error:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [trainerProfile?.id, routeStudentId]);

  // Nome/avatar da conversa aberta: resolvidos da lista de conversas quando
  // ela é carregada (relevante após reload — não há estado local p/ header).
  useEffect(() => {
    if (!routeStudentId) return;

    const conversation = conversations.find(
      (item) => item.studentId === routeStudentId
    );

    if (conversation) {
      setSelectedStudentName(conversation.studentName);
      setSelectedStudentAvatar(conversation.avatarUrl || null);
    }
  }, [conversations, routeStudentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function openConversation(
    studentId: string,
    studentName: string,
    avatarUrl?: string | null
  ) {
    if (!trainerProfile?.id) return;

    // Estado da conversa aberta passa a viver na ROTA (/personal/chat/:id):
    // fix WebView/Capacitor — um reload não apaga mais a conversa aberta.
    setSelectedStudentName(studentName);
    setSelectedStudentAvatar(avatarUrl || null);
    navigate(`/personal/chat/${studentId}`);
  }

  function goBack() {
    setSelectedStudentName('');
    setSelectedStudentAvatar(null);
    // Volta para a lista de conversas pela rota (estado derivado vira null).
    navigate('/personal/chat');
  }

  async function handleSend() {
    if (!trainerProfile?.id || !selectedStudentId) return;

    // Sprint 13 — ETAPA 2: sem conteúdo textual, envia a mídia selecionada.
    const content = text.trim();

    if (!content && !selectedFile) return;

    const trainerId = trainerProfile.id;
    const studentId = selectedStudentId;

    setSending(true);

    try {
      const msg = selectedFile
        ? await sendMedia({
            trainerId,
            studentId,
            senderRole: 'personal',
            senderId: trainerId,
            content,
          })
        : await messageService.sendMessage({
            trainer_id: trainerId,
            student_id: studentId,
            sender_role: 'personal',
            sender_id: trainerId,
            content,
          });

      // sendMedia retorna null (e define validationError) em caso de falha de upload.
      if (!msg) return;

      setMessages((prev) => {
        if (prev.some((item) => item.id === msg.id)) return prev;
        return [...prev, msg];
      });

      setText('');

      messageService
        .getConversations(trainerId)
        .then((page) => {
          setConversations(page.conversations);
          setHasMoreConversations(page.hasMore);
          setConversationOffset(0);
        })
        .catch(() => {});

      loadStudentUnreadCounts(trainerId);
    } catch (error) {
      console.error('[ChatPage] sendMessage error:', error);
    } finally {
      setSending(false);
    }
  }

  async function loadOlderMessages() {
    if (!trainerProfile?.id || !selectedStudentId || messages.length === 0) return;

    if (loadingOlder) return;

    setLoadingOlder(true);

    const oldest = messages[0];

    try {
      const { messages: older, hasMore } = await messageService.getMessages(
        trainerProfile.id,
        selectedStudentId,
        { before: oldest.created_at }
      );

      setMessages((prev) => {
        const knownIds = new Set(prev.map((item) => item.id));

        return [...older.filter((item) => !knownIds.has(item.id)), ...prev];
      });

      setHasMoreMessages(hasMore);
    } catch (error) {
      console.error('[ChatPage] loadOlderMessages error:', error);
    } finally {
      setLoadingOlder(false);
    }
  }

  async function loadMoreConversations() {
    if (!trainerProfile?.id || loadingMoreConversations) return;

    setLoadingMoreConversations(true);

    try {
      const page = await messageService.getConversations(trainerProfile.id, {
        limit: 500,
        offset: conversationOffset + 500,
      });

      setConversations((prev) => {
        const merged = new Map(prev.map((conversation) => [conversation.studentId, conversation]));

        for (const conversation of page.conversations) {
          if (!merged.has(conversation.studentId)) {
            merged.set(conversation.studentId, conversation);
          }
        }

        return [...merged.values()].sort(
          (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
      });

      setHasMoreConversations(page.hasMore);
      setConversationOffset((offset) => offset + 500);
    } catch (error) {
      console.error('[ChatPage] loadMoreConversations error:', error);
    } finally {
      setLoadingMoreConversations(false);
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

        {/* TEMPORÁRIO: painel de diagnóstico in-app (loading/reload). */}
        <DiagPanel />

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
        {/* TEMPORÁRIO: painel de diagnóstico in-app (conversa aberta). */}
        <DiagPanel />

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
              {hasMoreMessages && (
                <button
                  type="button"
                  onClick={loadOlderMessages}
                  disabled={loadingOlder}
                  className="mx-auto flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 text-[11px] font-bold text-zinc-400 transition-all active:scale-95"
                >
                  {loadingOlder ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5" />
                  )}
                  Carregar mensagens anteriores
                </button>
              )}

              {messages.length === 0 ? (
                <div className="flex h-[60dvh] items-center justify-center">
                  <p className="text-sm text-zinc-500">Nenhuma mensagem ainda</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isOwn={msg.sender_role === 'personal'}
                    avatarSrc={msg.sender_role === 'personal' ? selectedStudentAvatar : trainerProfile?.avatar_url || null}
                    avatarName={msg.sender_role === 'personal' ? selectedStudentName : trainerProfile?.name || 'Personal'}
                    avatarOnline={msg.sender_role === 'personal' ? selectedStudentOnline : undefined}
                    ownAvatarSrc={msg.sender_role === 'personal' ? trainerProfile?.avatar_url || null : selectedStudentAvatar}
                    ownAvatarName={msg.sender_role === 'personal' ? trainerProfile?.name || 'Personal' : selectedStudentName}
                  />
                ))
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="shrink-0 bg-[#050505] pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-2">
              {(selectedFile || validationError) && (
                <div className="mb-2">
                  {selectedFile && (
                    <MediaAttachmentPreview
                      fileName={selectedFile.name}
                      fileSize={selectedFile.size}
                      mime={selectedFile.type}
                      previewUrl={previewUrl}
                      onRemove={clearMedia}
                    />
                  )}

                  {validationError && (
                    <p className="px-1 pb-1 text-xs text-red-400">{validationError}</p>
                  )}
                </div>
              )}

              <div className="flex items-end gap-2">
                <AttachmentButton
                  onFileSelected={selectFile}
                  hasFile={!!selectedFile}
                  onRemoveFile={clearMedia}
                  disabled={sending || uploading}
                  accept={CHAT_MEDIA_ACCEPT}
                />

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
                  disabled={
                    (!text.trim() && !selectedFile) || sending || uploading
                  }
                  className="shrink-0 rounded-full bg-[#ff2a32] p-3 text-white transition-all active:scale-90 disabled:opacity-40"
                >
                  {sending || uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header title="Chat" />

      {/* TEMPORÁRIO: painel de diagnóstico in-app (não commitar na entrega). */}
      <DiagPanel />

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
                        {conv.lastMessageAt ? timeAgo(conv.lastMessageAt) : ''}
                      </span>
                    </div>

                    <p className="mt-0.5 truncate text-[11px] font-medium text-zinc-500">
                      {formatLastSeen(lastSeen)}
                    </p>

                    <p className="mt-1 truncate text-sm text-zinc-400">
                      {conv.lastMessage || 'Sem mensagens ainda'}
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

        {hasMoreConversations && (
          <button
            type="button"
            onClick={loadMoreConversations}
            disabled={loadingMoreConversations}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-xs font-bold text-zinc-400 transition-all active:scale-95"
          >
            {loadingMoreConversations ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Carregar mais conversas
          </button>
        )}
      </div>
    </div>
  );
}

export default ChatPage;