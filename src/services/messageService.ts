import { supabase } from '../lib/supabase';
import type { Message } from '../types/database';
import type { Conversation } from '../types/message';

export interface MessagePage {
  messages: Message[];
  hasMore: boolean;
}

export interface ConversationPage {
  conversations: Conversation[];
  hasMore: boolean;
}

const DEFAULT_MESSAGE_PAGE_SIZE = 200;
const DEFAULT_CONVERSATION_SCAN_LIMIT = 500;

export async function getMessages(
  trainerId: string,
  studentId: string,
  options?: { limit?: number; before?: string | null }
): Promise<MessagePage> {
  const limit = options?.limit ?? DEFAULT_MESSAGE_PAGE_SIZE;

  let query = supabase
    .from('messages')
    // SELECT * (adaptável): a tabela `messages` não é versionada no repo
    // (criada fora dos migrations) e a lista fixa de colunas fazia o
    // INSERT...RETURNING falhar com HTTP 400 (coluna inexistente), revertendo
    // o INSERT — mensagem nunca criada. Sprint 10.1 hotfix.
    .select()
    .eq('trainer_id', trainerId)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options?.before) {
    query = query.lt('created_at', options.before);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[MessageService] getMessages error:', error);
    throw error;
  }

  const rows = data || [];
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);

  // Retorna na ordem ascendente para exibição no chat
  return {
    messages: page.slice().reverse() as Message[],
    hasMore,
  };
}

export async function sendMessage(data: {
  trainer_id: string;
  student_id: string;
  sender_role: 'personal' | 'student';
  sender_id: string;
  content: string;
  /** Campos opcionais da estrutura real (preparados; envio de mídia na 10.2). */
  type?: string;
  media_url?: string | null;
  payload?: unknown | null;
  event?: string | null;
  extension?: string | null;
  binary_payload?: unknown | null;
  private?: boolean | null;
}) {
  const { data: msg, error } = await supabase
    .from('messages')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return msg as Message;
}

export async function getConversations(
  trainerId: string,
  options?: { limit?: number; offset?: number }
): Promise<ConversationPage> {
  const limit = options?.limit ?? DEFAULT_CONVERSATION_SCAN_LIMIT;
  const offset = options?.offset ?? 0;

  const [messagesResult, countResult] = await Promise.all([
    supabase
      .from('messages')
      .select(`id, student_id, sender_role, content, created_at, read, students(name, avatar_url)`)
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('trainer_id', trainerId),
  ]);

  const { data, error } = messagesResult;
  const { count, error: countError } = countResult;

  if (error) {
    console.error('[MessageService] getConversations error:', error);
    throw error;
  }

  if (countError) {
    console.error('[MessageService] getConversations count error:', countError);
    throw countError;
  }

  const conversations: Record<string, Conversation> = {};

  for (const msg of data || []) {
    // Unread do treinador = mensagens do ALUNO ainda não lidas.
    // Mensagens enviadas pelo próprio treinador (sender_role='personal')
    // nunca contam como não lidas na lista de conversas.
    const isStudentMessage = msg.sender_role === 'student';
    const isUnreadForTrainer = isStudentMessage && !msg.read;

    if (!conversations[msg.student_id]) {
      conversations[msg.student_id] = {
        studentId: msg.student_id,
        studentName: (msg as any).students?.name || 'Aluno',
        lastMessage: msg.content,
        lastMessageAt: msg.created_at,
        unread: isUnreadForTrainer ? 1 : 0,
        avatarUrl: (msg as any).students?.avatar_url || null,
      };
    } else if (isUnreadForTrainer) {
      conversations[msg.student_id].unread += 1;
    }
  }

  return {
    conversations: Object.values(conversations).sort(
      (a: Conversation, b: Conversation) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    ),
    hasMore: (count ?? 0) > offset + limit,
  };
}

export async function markMessagesAsRead(trainerId: string, studentId: string) {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('trainer_id', trainerId)
      .eq('student_id', studentId)
      // Apenas mensagens do aluno são marcadas como lidas pelo treinador.
      // Sem este filtro, as próprias mensagens do treinador (read=false no
      // insert) eram marcadas como lidas ao abrir o chat, quebrando o
      // indicador "lida" (CheckCheck azul) das mensagens enviadas.
      .eq('sender_role', 'student')
      .eq('read', false);
    if (error) {
      console.error('[MessageService] markMessagesAsRead error:', error);
    }
  } catch (error) {
    console.error('[MessageService] markMessagesAsRead exception:', error);
  }
}

/**
 * Marca uma mensagem específica como lida (usado pela central de
 * notificações do aluno para itens de tipo 'message').
 */
export async function markMessageAsRead(messageId: string) {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', messageId)
      .eq('read', false);
    if (error) {
      console.error('[MessageService] markMessageAsRead error:', error);
    }
  } catch (error) {
    console.error('[MessageService] markMessageAsRead exception:', error);
  }
}

/**
 * Marca várias mensagens como lidas por id (marcar todas na central de
 * notificações do aluno).
 */
export async function markMessagesAsReadByIds(messageIds: string[]) {
  if (messageIds.length === 0) return;

  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .in('id', messageIds)
      .eq('read', false);
    if (error) {
      console.error('[MessageService] markMessagesAsReadByIds error:', error);
    }
  } catch (error) {
    console.error('[MessageService] markMessagesAsReadByIds exception:', error);
  }
}
