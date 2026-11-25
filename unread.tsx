import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export interface ChatUnread {
  chat_id: string;
  unread: number;
}

interface UnreadContextValue {
  /** total unread messages across all chats */
  total: number;
  /** unread count per chat_id */
  byChat: Record<string, number>;
  /** mark a chat as read (updates DB + local state) */
  markRead: (chatId: string) => void;
}

const UnreadContext = createContext<UnreadContextValue | null>(null);

export function useUnread(): UnreadContextValue {
  const ctx = useContext(UnreadContext);
  if (!ctx) throw new Error('useUnread debe usarse dentro de UnreadProvider');
  return ctx;
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/**
 * Global unread message counter.
 *
 * Sources of truth:
 * - `chat_members.last_read_at` per (user, chat) — persistent read state.
 * - `messages` rows — counted where created_at > last_read_at and sender != me.
 *
 * Realtime: subscribes to INSERT on `messages` and recalculates instantly.
 * `markRead(chatId)` updates `last_read_at` in the DB and zeroes the local count.
 */
export function UnreadProvider({ email, children }: { email: string; children: React.ReactNode }) {
  const [byChat, setByChat] = useState<Record<string, number>>({});

  const recalcAll = useCallback(async () => {
    if (!email) return;
    // my read markers
    const { data: memberships } = await supabase
      .from('chat_members')
      .select('chat_id, last_read_at')
      .eq('user_email', email);

    // my own chat rows (private chats) — ensure private chats have a member row
    const { data: myChats } = await supabase
      .from('chats')
      .select('chat_id, contact_name')
      .eq('user_email', email);

    const mine = (myChats ?? []) as { chat_id: string; contact_name: string }[];
    const memberMap = new Map<string, string>(
      ((memberships ?? []) as { chat_id: string; last_read_at: string }[]).map((m) => [m.chat_id, m.last_read_at]),
    );

    // Backfill chat_members rows for private chats (group joins create theirs)
    const missing = mine.filter((c) => !memberMap.has(c.chat_id));
    if (missing.length > 0) {
      const { data: inserted } = await supabase
        .from('chat_members')
        .insert(missing.map((c) => ({ chat_id: c.chat_id, user_email: email })))
        .select('chat_id, last_read_at');
      (inserted ?? []).forEach((m) => memberMap.set(m.chat_id, m.last_read_at));
    }

    const chatIds = [...memberMap.keys()];
    if (chatIds.length === 0) {
      setByChat({});
      return;
    }

    const { data: msgs } = await supabase
      .from('messages')
      .select('chat_id, sender_email, created_at')
      .in('chat_id', chatIds)
      .neq('sender_email', email);

    const counts: Record<string, number> = {};
    (msgs ?? []).forEach((m) => {
      const lastRead = memberMap.get(m.chat_id);
      if (!lastRead) return;
      if (new Date(m.created_at) > new Date(lastRead)) {
        counts[m.chat_id] = (counts[m.chat_id] ?? 0) + 1;
      }
    });
    setByChat(counts);
  }, [email]);

  useEffect(() => {
    recalcAll();
  }, [recalcAll]);

  // Realtime: any new message recalculates my unread counts instantly
  useEffect(() => {
    if (!email) return;
    const channel = supabase
      .channel('unread-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        recalcAll();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [email, recalcAll]);

  const markRead = useCallback((chatId: string) => {
    const now = new Date().toISOString();
    setByChat((prev) => (prev[chatId] ? { ...prev, [chatId]: 0 } : prev));
    supabase
      .from('chat_members')
      .update({ last_read_at: now })
      .eq('chat_id', chatId)
      .eq('user_email', email)
      .then(() => {
        // also zero the legacy chats.unread column so old paths stay consistent
        supabase
          .from('chats')
          .update({ unread: 0 })
          .eq('chat_id', chatId)
          .eq('user_email', email);
      });
  }, [email]);

  const total = useMemo(() => Object.values(byChat).reduce((sum, n) => sum + n, 0), [byChat]);

  return (
    <UnreadContext.Provider value={{ total, byChat, markRead }}>
      {children}
    </UnreadContext.Provider>
  );
}
