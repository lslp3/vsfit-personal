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

const MESSAGE_COLUMNS =
  'id, trainer_id, student_id, sender_role, sender_id, content, read, created_at';

export async function getMessages(
  trainerId: string,
  studentId: string,
  options?: { limit?: number; before?: string | null }
): Promise<MessagePage> {
  const limit = options?.limit ?? DEFAULT_MESSAGE_PAGE_SIZE;

  let query = supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
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
}) {
  const { data: msg, error } = await supabase
    .from('messages')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return msg;
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
      .select(`id, student_id, content, created_at, read, students(name, avatar_url)`)
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
    if (!conversations[msg.student_id]) {
      conversations[msg.student_id] = {
        studentId: msg.student_id,
        studentName: (msg as any).students?.name || 'Aluno',
        lastMessage: msg.content,
        lastMessageAt: msg.created_at,
        unread: msg.read ? 0 : 1,
        avatarUrl: (msg as any).students?.avatar_url || null,
      };
    } else if (!msg.read) {
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

export async function getStudentConversations(
  studentId: string,
  trainerId: string,
  options?: { limit?: number; before?: string | null }
): Promise<MessagePage> {
  return getMessages(trainerId, studentId, options);
}

export async function markMessagesAsRead(trainerId: string, studentId: string) {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('trainer_id', trainerId)
      .eq('student_id', studentId)
      .eq('read', false);
    if (error) {
      console.error('[MessageService] markMessagesAsRead error:', error);
    }
  } catch (error) {
    console.error('[MessageService] markMessagesAsRead exception:', error);
  }
}
