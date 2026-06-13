import { supabase } from '../lib/supabase';
import type { Message } from '../types/database';

export async function getMessages(trainerId: string, studentId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('trainer_id', trainerId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[MessageService] getMessages error:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('[MessageService] getMessages exception:', error);
    return [];
  }
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

export async function getConversations(trainerId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*, students(name, avatar_url)')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[MessageService] getConversations error:', error);
      return [];
    }

    const conversations: Record<string, any> = {};
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

    return Object.values(conversations).sort(
      (a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  } catch (error) {
    console.error('[MessageService] getConversations exception:', error);
    return [];
  }
}

export async function getStudentConversations(studentId: string, trainerId: string): Promise<Message[]> {
  return getMessages(trainerId, studentId);
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
