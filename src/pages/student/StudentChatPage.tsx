import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronUp,
  Loader2,
  MessageSquare,
  Send,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import * as studentService from '../../services/studentService';
import { getMessages, sendMessage } from '../../services/messageService';
import { CHAT_MEDIA_ACCEPT } from '../../services/chatMediaService';
import { useChatMedia } from '../../hooks/useChatMedia';
import { getPresenceUsers, formatLastSeen } from '../../lib/chatPresence';
import {
  getStudentName,
  getTrainerName,
  getStudentAvatarUrl,
  getTrainerAvatarUrl,
} from '../../lib/studentIdentity';
import { AvatarWithStatus } from '../../components/chat/AvatarWithStatus';
import { AttachmentButton } from '../../components/chat/AttachmentButton';
import { MediaAttachmentPreview } from '../../components/chat/MediaAttachmentPreview';

export function StudentChatPage() {
  const navigate = useNavigate();

  const [authUserId, setAuthUserId] = useState('');
  const [student, setStudent] = useState<any | null>(null);
  const [trainer, setTrainer] = useState<any | null>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const {
    selectedFile,
    previewUrl,
    validationError,
    uploading,
    selectFile,
    clear: clearMedia,
    sendMedia,
  } = useChatMedia();

  const [trainerOnline, setTrainerOnline] = useState(false);
  const [trainerLastSeen, setTrainerLastSeen] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const studentId = student?.id || '';
  const studentName = getStudentName(student);
  const studentAvatarUrl = getStudentAvatarUrl(student);
  const trainerName = trainer ? getTrainerName(trainer) : 'Personal';
  const trainerAvatarUrl = getTrainerAvatarUrl(trainer);

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/student/home');
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
    loadData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!trainer?.id || !studentId || !authUserId) return;

    const trainerId = trainer.id;
    const currentUserId = authUserId;

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
      } catch (presenceError) {
        console.warn('[StudentChatPage] update presence warning:', presenceError);
      }
    }

    updateMyPresence();

    const timer = window.setInterval(updateMyPresence, 30000);

    return () => {
      window.clearInterval(timer);
      updateMyPresence();
    };
  }, [trainer?.id, studentId, authUserId, studentName, studentAvatarUrl]);

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
      try {
        const { data, error: presenceError } = await supabase
          .from('app_presence')
          .select('last_seen_at')
          .eq('role', 'personal')
          .eq('trainer_id', trainerId)
          .maybeSingle();

        if (presenceError) {
          console.warn('[StudentChatPage] trainer presence warning:', presenceError);
          return;
        }

        setTrainerLastSeen(data?.last_seen_at || null);
      } catch (presenceError) {
        console.warn('[StudentChatPage] trainer presence exception:', presenceError);
      }
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
          const newMsg = payload.new as any;

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
          const updatedMsg = payload.new as any;

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
      const { error: readError } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('trainer_id', trainerId)
        .eq('student_id', currentStudentId)
        .eq('sender_role', 'personal')
        .eq('read', false);

      if (readError) {
        console.warn('[StudentChatPage] mark personal messages read warning:', readError);
      }
    } catch (readError) {
      console.warn('[StudentChatPage] mark personal messages read exception:', readError);
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      const authUser = authData.user;

      if (!authUser?.id) {
        setError('Sessão do aluno não encontrada. Faça login novamente.');
        return;
      }

      setAuthUserId(authUser.id);

      // ═══════════════════════════════════════════════════════════════════════
      // FLUXO EXPLÍCITO — 2 etapas, sem depender de FK join do Supabase
      // Etapa 1: students pelo auth_user_id
      // Etapa 2: trainer_profiles pelo trainer_id
      // ═══════════════════════════════════════════════════════════════════════

      // ── Etapa 1: buscar aluno ────────────────────────────────────────────────

      let { data: studentFromDb } = await supabase
        .from('students')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      // ── Fallback via student_accounts ────────────────────────────────────────
      if (!studentFromDb?.id) {
        const accountResult = await studentService.getStudentAccountByAuthUser(authUser.id);
        studentFromDb = accountResult?.student || null;

        if (!studentFromDb?.id) {
          studentFromDb = await studentService.getStudentByAuthUser(authUser.id);
        }

      }

      if (!studentFromDb?.id) {
        setError('Perfil do aluno não encontrado.');
        return;
      }

      setStudent(studentFromDb);

      // ── Etapa 2: buscar personal pelo trainer_id ────────────────────────────
      const trainerId = studentFromDb?.trainer_id || null;

      let trainerData: any = null;

      if (trainerId) {
        const { data: tp, error: tpErr } = await supabase
          .from('trainer_profiles')
          .select('*')
          .eq('id', trainerId)
          .maybeSingle();

        if (tpErr) {
          // Não throw — deixa o catch tratar erro de RLS
        }

        trainerData = tp || null;
      } else {
        // Fallback: tenta workout_plans

        const { data: plans } = await supabase
          .from('workout_plans')
          .select('trainer_id')
          .eq('student_id', studentFromDb.id)
          .limit(1);

        if (plans && plans.length > 0) {
          const altTrainerId = plans[0].trainer_id;

          const { data: tp } = await supabase
            .from('trainer_profiles')
            .select('*')
            .eq('id', altTrainerId)
            .maybeSingle();

          trainerData = tp || null;
        }
      }

      if (!trainerData) {
        setTrainer(null);
        setMessages([]);
        setError('Personal não encontrado para este aluno.');
        return;
      }

      // ── Carrega mensagens ──────────────────────────────────────────────────
      const [{ messages: msgs, hasMore }] = await Promise.all([
        getMessages(trainerData.id, studentFromDb.id),
      ]);

      setTrainer(trainerData);
      setMessages(Array.isArray(msgs) ? msgs : []);
      setHasMoreMessages(Boolean(hasMore));

      await markTrainerMessagesAsRead(trainerData.id, studentFromDb.id);
    } catch (loadError: any) {
      console.error('[StudentChatPage] loadData error:', loadError);
      setError(loadError?.message || 'Erro ao carregar chat.');
    } finally {
      setLoading(false);
    }
  }

  async function loadOlderMessages() {
    if (!trainer || !studentId || messages.length === 0 || loadingOlder) return;

    setLoadingOlder(true);

    const oldest = messages[0];

    try {
      const { messages: older, hasMore } = await getMessages(trainer.id, studentId, {
        before: oldest.created_at,
      });

      setMessages((prev) => {
        const knownIds = new Set(prev.map((item) => item.id));

        return [...older.filter((item) => !knownIds.has(item.id)), ...prev];
      });

      setHasMoreMessages(hasMore);
    } catch (loadError: any) {
      console.error('[StudentChatPage] loadOlderMessages error:', loadError);
    } finally {
      setLoadingOlder(false);
    }
  }

  async function handleSend() {
    const text = newMessage.trim();

    // Sprint 13 — ETAPA 2: sem conteúdo textual, envia a mídia selecionada.
    if ((!text && !selectedFile) || !studentId || !authUserId || !trainer || sending) return;

    setSending(true);

    try {
      const msg = selectedFile
        ? await sendMedia({
            trainerId: trainer.id,
            studentId,
            senderRole: 'student',
            senderId: authUserId,
            content: text,
          })
        : await sendMessage({
            trainer_id: trainer.id,
            student_id: studentId,
            sender_role: 'student',
            sender_id: authUserId,
            content: text,
          });

      // sendMedia retorna null (e define validationError) em caso de falha de upload.
      if (!msg) return;

      setMessages((prev) => {
        if (prev.some((item) => item.id === msg.id)) return prev;
        return [...prev, msg];
      });

      setNewMessage('');
    } catch (sendError) {
      console.error('[StudentChatPage] send error:', sendError);
      alert('Erro ao enviar mensagem.');
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

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#050505] px-4 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15">
            <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
          </div>

          <div>
            <p className="text-sm font-black text-white">Carregando chat...</p>
            <p className="mt-1 text-xs text-zinc-500">Buscando mensagens.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !trainer) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#050505] px-4 text-white">
        <div className="w-full max-w-sm rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-300" />

          <h1 className="mt-4 text-xl font-black text-white">Chat indisponível</h1>

          <p className="mt-2 text-sm leading-relaxed text-red-100/80">
            {error || 'Não foi possível carregar seu personal.'}
          </p>

          <button
            type="button"
            onClick={loadData}
            className="mt-6 h-12 w-full rounded-2xl bg-[#ff2a32] text-sm font-black text-white"
          >
            TENTAR NOVAMENTE
          </button>
        </div>
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
            src={trainerAvatarUrl}
            name={trainerName}
            online={trainerOnline}
            accent
          />

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-black text-white">
              {trainerName}
            </h2>

            <p
              className={cn(
                'truncate text-[11px] font-medium',
                trainerOnline ? 'text-emerald-400' : 'text-zinc-500'
              )}
            >
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
              <div className="flex h-[60dvh] flex-col items-center justify-center text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.03]">
                  <MessageSquare className="h-7 w-7 text-zinc-700" />
                </div>

                <p className="text-sm font-bold text-zinc-500">
                  Nenhuma mensagem ainda.
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  Envie uma mensagem para seu personal.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isStudent = msg.sender_role === 'student';

                const avatarSrc = isStudent ? studentAvatarUrl : trainerAvatarUrl;
                const avatarName = isStudent ? studentName : trainerName;

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
                disabled={
                  (!newMessage.trim() && !selectedFile) || sending || uploading
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ff2a32] text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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

export default StudentChatPage;