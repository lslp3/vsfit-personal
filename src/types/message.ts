export interface Conversation {
  studentId: string;
  studentName: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  avatarUrl: string | null;
}
