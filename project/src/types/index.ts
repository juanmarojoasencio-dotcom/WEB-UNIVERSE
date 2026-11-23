export interface Post {
  id: string;
  author_name: string;
  author_faculty: string;
  content: string;
  likes: number;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  category: string;
  faculty: string;
  member_count: number;
  is_joined: boolean;
}

export interface UniEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  category: string;
  attendee_count: number;
  is_attending: boolean;
  image_url?: string | null;
  creator_email?: string | null;
}

export type ChatType = 'private' | 'group';

export interface Chat {
  id: string;
  chat_id: string;
  contact_name: string;
  contact_avatar: string;
  contact_faculty: string;
  last_message: string;
  last_time: string;
  unread: number;
  chat_type: ChatType;
  member_count: number;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_name: string;
  sender_avatar: string;
  content: string;
  is_me: boolean;
  created_at: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

export type AssistantMode = 'academic' | 'official' | 'support';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export type TabKey = 'inicio' | 'grupos' | 'eventos' | 'chats' | 'explorar' | 'asistente' | 'contacto' | 'perfil' | 'panel';
