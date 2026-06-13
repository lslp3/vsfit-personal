import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, User, Dumbbell } from 'lucide-react';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { getTrainerProfile } from '../../services/trainerService';
import {
  getMessages,
  sendMessage,
  markMessagesAsRead,
} from '../../services/messageService';
import { cn } from '../../lib/utils';
import { timeAgo } from '../../lib/formatters';
import type { Message, TrainerProfile } from '../../types/database';

export function StudentChatPage() {
  const { user, student: storeStudent, studentAccount, isLoading } = useAuthStore();

  const [trainer, setTrainer] = useState<TrainerProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const studentId = storeStudent?.id || studentAccount?.student_id;

  useEffect(() => {
    if (!user || !studentId) return;
    loadData();
  }, [user, studentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadData() {
    try {
      const trainerId = storeStudent?.trainer_id || (messages.length > 0 ? messages[0].trainer_id : null);

      if (!trainerId) {
        // Se não tem trainer_id no store, busca o primeiro treino para tentar descobrir
        const { data: plans } = await supabase
          .from('workout_plans')
          .select('trainer_id')
          .eq('student_id', studentId!)
          .limit(1);
        
        if (plans && plans.length > 0) {
          const tid = plans[0].trainer_id;
          const [trainerData, msgs] = await Promise.all([
            getTrainerProfile(tid),
            getMessages(tid, studentId!),
          ]);
          setTrainer(trainerData);
          setMessages(msgs);
          await markMessagesAsRead(tid, studentId!);
          return;
        }
      }

      if (trainerId) {
        const [trainerData, msgs] = await Promise.all([
          getTrainerProfile(trainerId),
          getMessages(trainerId, studentId!),
        ]);

        setTrainer(trainerData);
        setMessages(msgs);

        await markMessagesAsRead(trainerId, studentId!);
      }
    } catch (err) {
      console.error('Chat load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const text = newMessage.trim();
    if (!text || !studentId || !user || !trainer || sending) return;

    setSending(true);
    try {
      await sendMessage({
        trainer_id: trainer.id,
        student_id: studentId,
        sender_role: 'student',
        sender_id: user.id,
        content: text,
      });

      setNewMessage('');

      const msgs = await getMessages(trainer.id, studentId);
      setMessages(msgs);
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (loading || isLoading || !studentId) return <LoadingScreen />;

  if (!storeStudent || !trainer) {
    return (
      <EmptyState
        icon={<MessageSquare className="w-8 h-8 text-vs-muted" />}
        title="Chat não disponível"
        description="Não foi possível carregar suas mensagens."
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-lg mx-auto">
      <div className="px-4 pt-4 pb-3 border-b border-vs-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-vs-primary/10 flex items-center justify-center">
            {trainer.avatar_url ? (
              <img
                src={trainer.avatar_url}
                alt={trainer.name}
                className="w-full h-full rounded-xl object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-vs-primary" />
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{trainer.name}</h2>
            <p className="text-[10px] text-vs-muted">Personal Trainer</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 hide-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-vs-muted" />
            </div>
            <p className="text-sm text-vs-muted">
              Nenhuma mensagem ainda.
            </p>
            <p className="text-xs text-vs-muted/60 mt-1">
              Envie uma mensagem para seu personal trainer.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isStudent = msg.sender_role === 'student';
            const showAvatar =
              i === 0 ||
              messages[i - 1].sender_role !== msg.sender_role;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'flex gap-2',
                  isStudent ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                {showAvatar ? (
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1',
                      isStudent
                        ? 'bg-vs-primary/10'
                        : 'bg-white/5'
                    )}
                  >
                    {isStudent ? (
                      <User className="w-3.5 h-3.5 text-vs-primary" />
                    ) : (
                      <Dumbbell className="w-3.5 h-3.5 text-vs-muted" />
                    )}
                  </div>
                ) : (
                  <div className="w-7 shrink-0" />
                )}

                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5',
                    isStudent
                      ? 'bg-vs-primary text-white rounded-tr-md'
                      : 'bg-white/5 text-vs-text rounded-tl-md'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <p
                    className={cn(
                      'text-[10px] mt-1',
                      isStudent ? 'text-white/60' : 'text-vs-muted'
                    )}
                  >
                    {timeAgo(msg.created_at)}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-3 border-t border-vs-border bg-vs-dark">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            rows={1}
            className="flex-1 input-field !py-3 !px-4 resize-none max-h-24"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="w-11 h-11 rounded-xl bg-vs-primary text-white flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[10px] text-vs-muted/60 mt-1.5">
          Pressione Enter para enviar
        </p>
      </div>
    </div>
  );
}
