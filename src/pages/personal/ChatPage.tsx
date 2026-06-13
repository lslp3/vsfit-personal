import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Loader2,
  Check,
  CheckCheck,
} from 'lucide-react';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import * as messageService from '../../services/messageService';
import type { Message } from '../../types/database';
import type { Conversation } from '../../types/message';
import { getInitials, cn } from '../../lib/utils';
import { timeAgo } from '../../lib/formatters';

export function ChatPage() {
  const { trainerProfile } = useAuthStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trainerProfile) return;
    setLoading(true);
    messageService
      .getConversations(trainerProfile.id)
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [trainerProfile]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const openConversation = async (studentId: string, studentName: string) => {
    if (!trainerProfile) return;
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
    try {
      const data = await messageService.getMessages(trainerProfile.id, studentId);
      setMessages(data);
      await messageService.markMessagesAsRead(trainerProfile.id, studentId);
      setConversations((prev) =>
        prev.map((c) =>
          c.studentId === studentId ? { ...c, unread: 0 } : c
        )
      );
    } catch {
      //
    }
  };

  const goBack = () => {
    setSelectedStudentId(null);
    setMessages([]);
    if (trainerProfile) {
      messageService
        .getConversations(trainerProfile.id)
        .then(setConversations)
        .catch(() => {});
    }
  };

  const handleSend = async () => {
    if (!trainerProfile || !selectedStudentId || !text.trim()) return;
    setSending(true);
    try {
      const msg = await messageService.sendMessage({
        trainer_id: trainerProfile.id,
        student_id: selectedStudentId,
        sender_role: 'personal',
        sender_id: trainerProfile.id,
        content: text.trim(),
      });
      setMessages((prev) => [...prev, msg]);
      setText('');
    } catch {
      //
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div>
        <Header title="Chat" />
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-vs-muted" />
        </div>
      </div>
    );
  }

  if (selectedStudentId) {
    return (
      <div>
        <Header
          title={selectedStudentName}
          showBack
          right={
            <button
              type="button"
              onClick={goBack}
              className="text-sm text-vs-muted hover:text-white transition-colors"
            >
              Voltar
            </button>
          }
        />

        <div className="page-container flex flex-col h-[calc(100vh-12rem)]">
          <div className="flex-1 overflow-y-auto space-y-3 pb-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-vs-muted">Nenhuma mensagem ainda</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex',
                    msg.sender_role === 'personal' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5',
                      msg.sender_role === 'personal'
                        ? 'bg-vs-primary text-white rounded-br-md'
                        : 'bg-white/10 text-vs-text rounded-bl-md'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div
                      className={cn(
                        'flex items-center gap-1 mt-1',
                        msg.sender_role === 'personal' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <span className="text-[10px] opacity-60">
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {msg.sender_role === 'personal' && (
                        msg.read ? (
                          <CheckCheck className="w-3 h-3 text-blue-300" />
                        ) : (
                          <Check className="w-3 h-3 opacity-60" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-end gap-2 bg-vs-dark-2 border border-vs-border rounded-2xl p-2">
            <textarea
              className="flex-1 bg-transparent text-white placeholder-vs-muted/60 text-sm px-3 py-2 resize-none max-h-24"
              placeholder="Digite sua mensagem..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="p-2.5 rounded-xl bg-vs-primary text-white disabled:opacity-40 active:scale-90 transition-all shrink-0"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Chat" />

      <div className="page-container space-y-2">
        {conversations.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="w-8 h-8 text-vs-muted" />}
            title="Nenhuma conversa"
            description="Quando seus alunos enviarem mensagens, elas aparecerão aqui."
          />
        ) : (
          conversations.map((conv) => (
            <Card
              key={conv.studentId}
              onClick={() => openConversation(conv.studentId, conv.studentName)}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-vs-primary/10 flex items-center justify-center shrink-0">
                  {conv.avatarUrl ? (
                    <img
                      src={conv.avatarUrl}
                      alt={conv.studentName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-vs-primary">
                      {getInitials(conv.studentName)}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white truncate">{conv.studentName}</p>
                    <span className="text-[10px] text-vs-muted shrink-0 ml-2">
                      {timeAgo(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-sm text-vs-muted truncate mt-0.5">{conv.lastMessage}</p>
                </div>

                {conv.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-vs-primary flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-white">{conv.unread}</span>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
