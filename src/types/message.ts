export interface SendMessageData {
  studentId: string;
  content: string;
  type?: string;
}

export interface Conversation {
  studentId: string;
  studentName: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  avatarUrl: string | null;
}
