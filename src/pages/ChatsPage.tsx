import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Send, Search, ArrowLeft, Loader2, MessageCircle, MoreVertical, Pencil, Trash2,
  Check, X, Users, UserCircle, Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Chat, Message } from '@/types';
import { useSession } from '@/lib/session';
import { useUnread } from '@/lib/unread';

type ChatTab = 'private' | 'group';

const SENDER_COLOR_PALETTE = [
  'from-crimson-500 to-crimson-700',
  'from-gold-500 to-gold-700',
  'from-emerald-500 to-emerald-700',
  'from-blue-500 to-blue-700',
  'from-rose-500 to-rose-700',
  'from-teal-500 to-teal-700',
];

const colorCache: Record<string, string> = {};

const getSenderColor = (name: string): string => {
  if (!colorCache[name]) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
    colorCache[name] = SENDER_COLOR_PALETTE[Math.abs(hash) % SENDER_COLOR_PALETTE.length];
  }
  return colorCache[name];
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  } catch {
    return '';
  }
}

interface ChatsPageProps {
  onNavigateGroups?: () => void;
  onNavigateExplore?: () => void;
  initialChatId?: string;
  onChatOpened?: () => void;
}

export default function ChatsPage({ onNavigateGroups, onNavigateExplore, initialChatId, onChatOpened }: ChatsPageProps) {
  const { session, profile } = useSession();
  const myEmail = session?.email ?? '';
  const myName = profile?.fullName ?? 'Tú';
  const { byChat: unreadByChat, markRead } = useUnread();

  const [activeTab, setActiveTab] = useState<ChatTab>('private');
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(true);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [openMessageMenu, setOpenMessageMenu] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchChats = useCallback(async () => {
    if (!myEmail) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .or(`user_email.eq.${myEmail},peer_email.eq.${myEmail}`);
    if (error) {
      console.error('Error fetching chats:', error);
    } else if (data) {
      const mine = (data as Chat[]).filter((c) => c.user_email === myEmail);
      setChats(mine);
    }
    setLoading(false);
  }, [myEmail]);

  const fetchMessages = useCallback(async (chatId: string) => {
    setMsgLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching messages:', error);
    } else if (data) {
      setMessages(data as Message[]);
    }
    setMsgLoading(false);
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Realtime subscription for chats
  useEffect(() => {
    if (!myEmail) return;
    const channel = supabase
      .channel('chats_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, (payload) => {
        const row = payload.new as Record<string, unknown> | null;
        if (!row) return;
        const rowUserEmail = String(row.user_email ?? '');
        if (rowUserEmail === myEmail) {
          fetchChats();
        }
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [myEmail, fetchChats]);

  // Handle initialChatId from Explore "Chatear" or Communities "Abrir chat"
  useEffect(() => {
    if (!initialChatId) return;
    setActiveTab(initialChatId.startsWith('grp_') ? 'group' : 'private');
    const open = async () => {
      await fetchChats();
      setActiveChatId(initialChatId);
      markRead(initialChatId);
      onChatOpened?.();
    };
    open();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChatId]);

  // Fetch messages when active chat changes
  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId);
    } else {
      setMessages([]);
    }
  }, [activeChatId, fetchMessages]);

  // Realtime subscription for messages of the active chat
  useEffect(() => {
    if (!activeChatId) return;
    const channel = supabase
      .channel(`messages_${activeChatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${activeChatId}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${activeChatId}` }, (payload) => {
        const updated = payload.new as Message;
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `chat_id=eq.${activeChatId}` }, (payload) => {
        const oldId = (payload.old as Record<string, unknown>)?.id;
        if (!oldId) return;
        setMessages((prev) => prev.filter((m) => m.id !== oldId));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // While a chat is open, incoming messages count as read immediately
  useEffect(() => {
    if (activeChatId && messages.length > 0) {
      markRead(activeChatId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, messages.length]);

  useEffect(() => {
    if (activeChatId) {
      inputRef.current?.focus();
    }
  }, [activeChatId]);

  const privateChats = chats.filter((c) => (c.chat_type ?? 'private') === 'private');
  const groupChats = chats.filter((c) => c.chat_type === 'group');
  const chatUnread = (c: Chat): number => unreadByChat[c.chat_id] ?? 0;
  const privateUnread = privateChats.reduce((sum, c) => sum + chatUnread(c), 0);
  const groupUnread = groupChats.reduce((sum, c) => sum + chatUnread(c), 0);

  const currentList = activeTab === 'private' ? privateChats : groupChats;
  const filteredChats = currentList.filter((c) =>
    c.contact_name.toLowerCase().includes(search.toLowerCase()),
  );

  const activeChat = chats.find((c) => c.chat_id === activeChatId);
  const isGroupChat = activeChat?.chat_type === 'group';

  const isMyMessage = (msg: Message): boolean => {
    if (msg.sender_email) return msg.sender_email === myEmail;
    return msg.is_me;
  };

  const handleSend = async () => {
    if (!input.trim() || !activeChatId) return;
    const content = input.trim();
    setInput('');
    setSendError(null);

    const myAvatar = profile?.fullName
      ? profile.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
      : 'YO';

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: activeChatId,
        sender_name: myName,
        sender_avatar: myAvatar,
        sender_email: myEmail,
        content,
        is_me: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      setSendError('No se pudo enviar el mensaje. Inténtalo de nuevo.');
      setInput(content);
      return;
    }

    if (data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === (data as Message).id)) return prev;
        return [...prev, data as Message];
      });
    }

    const now = new Date().toISOString();
    const timeLabel = formatTime(now);
    await supabase
      .from('chats')
      .update({ last_message: content, last_time: timeLabel })
      .eq('chat_id', activeChatId)
      .eq('user_email', myEmail);

    const activeChatLocal = chats.find((c) => c.chat_id === activeChatId);
    if (activeChatLocal && activeChatLocal.peer_email && !isGroupChat) {
      await supabase
        .from('chats')
        .update({ last_message: content, last_time: timeLabel, unread: (activeChatLocal.unread || 0) + 1 })
        .eq('chat_id', activeChatId)
        .eq('user_email', activeChatLocal.peer_email);
    } else if (isGroupChat) {
      await supabase
        .from('chats')
        .update({ last_message: content, last_time: timeLabel })
        .eq('chat_id', activeChatId)
        .neq('user_email', myEmail);
    }
  };

  const startEditing = (message: Message) => {
    setOpenMessageMenu(null);
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const saveEditedMessage = async (messageId: string) => {
    const content = editContent.trim();
    if (!content) return;

    const { error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', messageId)
      .eq('sender_email', myEmail);

    if (error) {
      console.error('Error updating message:', error);
      return;
    }

    setMessages((prev) => prev.map((message) => (
      message.id === messageId ? { ...message, content } : message
    )));
    cancelEditing();
  };

  const deleteMessage = async (message: Message) => {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', message.id)
      .eq('sender_email', myEmail);

    if (error) {
      console.error('Error deleting message:', error);
      return;
    }

    setMessages((prev) => prev.filter((item) => item.id !== message.id));
    setDeletingMessageId(null);
    setOpenMessageMenu(null);
  };

  return (
    <div className="flex h-[calc(100vh-73px)]">
      {/* Chat list */}
      <div
        className={`flex flex-col border-r border-ink-800 bg-white/50 ${
          activeChatId ? 'hidden w-full md:flex md:w-[320px]' : 'w-full md:w-[320px]'
        }`}
      >
        {/* Tabs */}
        <div className="flex gap-1 border-b border-ink-800 p-3">
          <TabButton
            active={activeTab === 'private'}
            onClick={() => { setActiveTab('private'); setActiveChatId(null); }}
            icon={<UserCircle className="h-4 w-4" />}
            label="Privados"
            unread={privateUnread}
          />
          <TabButton
            active={activeTab === 'group'}
            onClick={() => { setActiveTab('group'); setActiveChatId(null); }}
            icon={<Users className="h-4 w-4" />}
            label="Grupos"
            unread={groupUnread}
          />
        </div>

        {/* Search */}
        <div className="border-b border-ink-800 p-4">
          <div className="flex items-center gap-2 rounded-xl bg-ink-850/60 px-3 py-2.5 border border-ink-700/40">
            <Search className="h-4 w-4 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'private' ? 'Buscar conversaciones...' : 'Buscar grupos...'}
              className="flex-1 bg-transparent text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-crimson-500" />
            </div>
          ) : filteredChats.length === 0 ? (
            activeTab === 'group' ? (
              <EmptyGroups onNavigateGroups={onNavigateGroups} />
            ) : (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-850/60 border border-ink-700/30">
                  <MessageCircle className="h-8 w-8 text-ink-500" />
                </div>
                <p className="mt-4 text-sm font-medium text-ink-200">No tienes chats privados todavía</p>
                <p className="mt-1 max-w-[240px] text-xs text-ink-400">
                  Entra en Explorar y pulsa «Chatear» con cualquier estudiante para iniciar una conversación
                </p>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); onNavigateExplore?.(); }}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500"
                >
                  <Search className="h-4 w-4" />
                  Explorar estudiantes
                </a>
              </div>
            )
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  setActiveChatId(chat.chat_id);
                  markRead(chat.chat_id);
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activeChatId === chat.chat_id
                    ? 'bg-crimson-500/5 border-l-2 border-crimson-500'
                    : 'hover:bg-ink-850/40 border-l-2 border-transparent'
                }`}
              >
                <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                  chat.chat_type === 'group'
                    ? 'bg-gradient-to-br from-ink-200 to-ink-400'
                    : 'bg-gradient-to-br from-crimson-500 to-gold-500'
                }`}>
                  {chat.contact_avatar}
                  {chat.chat_type !== 'group' && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-100 truncate">
                      {chat.contact_name}
                    </span>
                    <span className="text-[10px] text-ink-400 shrink-0">{chat.last_time}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-ink-400 truncate">{chat.last_message}</span>
                    {chatUnread(chat) > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-crimson-500 px-1.5 text-[10px] font-bold text-white">
                        {chatUnread(chat)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-ink-500">
                    {chat.chat_type === 'group'
                      ? `${chat.member_count} miembros · ${chat.contact_faculty}`
                      : chat.contact_faculty}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat window */}
      {activeChatId && activeChat ? (
        <div className="flex flex-1 flex-col bg-white/30">
          {/* Chat header */}
          <div className="flex items-center gap-3 border-b border-ink-800 bg-white/60 px-4 py-3 backdrop-blur-xl">
            <button
              onClick={() => setActiveChatId(null)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-850 md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white ${
              isGroupChat
                ? 'bg-gradient-to-br from-ink-200 to-ink-400'
                : 'bg-gradient-to-br from-crimson-500 to-gold-500'
            }`}>
              {activeChat.contact_avatar}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-ink-100">{activeChat.contact_name}</h3>
              {isGroupChat ? (
                <button
                  onClick={() => setShowMembers(true)}
                  className="flex items-center gap-1 rounded-lg px-1 py-0.5 text-[10px] text-ink-400 transition-colors hover:bg-ink-850/40 hover:text-crimson-600"
                >
                  <Users className="h-3 w-3" />
                  {activeChat.member_count} participantes · ver integrantes
                </button>
              ) : (
                <p className="flex items-center gap-1 text-[10px] text-ink-400">
                  <GraduationCapSmall className="h-3 w-3 text-crimson-600" />
                  {activeChat.contact_faculty}
                </p>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6">
            {msgLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-crimson-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-850/40 border border-ink-700/30">
                  <Sparkles className="h-6 w-6 text-crimson-500/60" />
                </div>
                <p className="mt-3 text-sm font-medium text-ink-300">Envía el primer mensaje para romper el hielo</p>
                <p className="mt-1 max-w-[220px] text-xs text-ink-400">
                  Escribe algo abajo y pulsa enviar para empezar a hablar con {activeChat.contact_name}
                </p>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-3">
                {messages.map((msg) => {
                  const mine = isMyMessage(msg);
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-slide-up`}
                    >
                      {!mine && (
                        <div className={`mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getSenderColor(msg.sender_name)} text-[10px] font-bold text-white`}>
                          {msg.sender_avatar}
                        </div>
                      )}
                      <div className={`relative flex max-w-[75%] items-start gap-1 ${mine ? 'flex-row-reverse' : ''}`}>
                        {mine && editingMessageId !== msg.id && (
                          <button
                            onClick={() => setOpenMessageMenu(openMessageMenu === msg.id ? null : msg.id)}
                            className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-400 opacity-0 transition-all hover:bg-ink-850 hover:text-ink-200 group-hover:opacity-100 focus:opacity-100"
                            aria-label="Opciones del mensaje"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        )}
                        <div className="relative">
                          {editingMessageId === msg.id ? (
                            <div className="min-w-[220px] rounded-2xl rounded-br-sm border border-crimson-400/40 bg-white p-2 shadow-lg">
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    saveEditedMessage(msg.id);
                                  }
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                                autoFocus
                                rows={2}
                                className="w-full resize-none bg-transparent px-2 py-1 text-sm text-ink-200 focus:outline-none"
                              />
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={cancelEditing}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-850 hover:text-ink-200"
                                  aria-label="Cancelar edición"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => saveEditedMessage(msg.id)}
                                  disabled={!editContent.trim()}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-crimson-500 text-white hover:bg-crimson-400 disabled:opacity-40"
                                  aria-label="Guardar edición"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => mine && setOpenMessageMenu(openMessageMenu === msg.id ? null : msg.id)}
                              className={`block text-left ${mine ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                              {isGroupChat && !mine && (
                                <p className="mb-0.5 px-1 text-[10px] font-semibold text-ink-300">{msg.sender_name}</p>
                              )}
                              <div
                                className={`rounded-2xl px-4 py-2.5 text-sm ${
                                  mine
                                    ? 'bg-gradient-to-br from-crimson-500 to-crimson-600 text-white rounded-br-sm shadow-lg shadow-crimson-500/10'
                                    : 'bg-ink-800/60 text-ink-200 rounded-bl-sm border border-ink-700/30'
                                }`}
                              >
                                {msg.content}
                              </div>
                              <p className={`mt-0.5 px-1 text-[9px] text-ink-400 ${mine ? 'text-right' : ''}`}>
                                {formatTime(msg.created_at)}
                              </p>
                            </button>
                          )}
                          {openMessageMenu === msg.id && mine && editingMessageId !== msg.id && (
                            <div className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-xl border border-ink-700/40 bg-white p-1 shadow-xl">
                              <button
                                onClick={() => startEditing(msg)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-ink-300 transition-colors hover:bg-ink-850 hover:text-ink-100"
                              >
                                <Pencil className="h-3.5 w-3.5 text-crimson-600" />
                                Editar
                              </button>
                              <button
                                onClick={() => { setOpenMessageMenu(null); setDeletingMessageId(msg.id); }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-crimson-600 transition-colors hover:bg-crimson-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Eliminar
                              </button>
                            </div>
                          )}
                          {deletingMessageId === msg.id && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-ink-700/40 bg-white p-3 shadow-xl">
                              <p className="text-xs font-medium text-ink-200">¿Eliminar este mensaje?</p>
                              <p className="mt-1 text-[10px] text-ink-400">Esta acción no se puede deshacer.</p>
                              <div className="mt-3 flex justify-end gap-2">
                                <button
                                  onClick={() => setDeletingMessageId(null)}
                                  className="rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-ink-400 hover:bg-ink-850"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => deleteMessage(msg)}
                                  className="rounded-lg bg-crimson-500 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-crimson-400"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-ink-800 bg-white/60 p-4 backdrop-blur-xl">
            {sendError && (
              <p className="mb-2 text-center text-[11px] font-medium text-crimson-600">{sendError}</p>
            )}
            <div className="mx-auto flex max-w-2xl items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isGroupChat ? 'Escribe al grupo...' : 'Escribe un mensaje...'}
                className="flex-1 rounded-xl bg-ink-850/60 border border-ink-700/30 px-4 py-3 text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-crimson-400/40"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-crimson-500 to-crimson-600 text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden flex-1 flex-col items-center justify-center text-center md:flex">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-ink-850/60 border border-ink-700/30">
            <MessageCircle className="h-10 w-10 text-ink-500" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold text-ink-200">Selecciona un chat</h3>
          <p className="mt-1 text-sm text-ink-400">Elige una conversación para empezar a hablar</p>
        </div>
      )}

      {showMembers && activeChat && (
        <GroupMembersModal
          chatId={activeChat.chat_id}
          groupName={activeChat.contact_name}
          onClose={() => setShowMembers(false)}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  unread,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  unread: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
        active
          ? 'bg-crimson-500 text-white shadow-lg shadow-crimson-500/20'
          : 'text-ink-400 hover:text-ink-200'
      }`}
    >
      {icon}
      <span>{label}</span>
      {unread > 0 && (
        <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
          active ? 'bg-white/25 text-white' : 'bg-crimson-500 text-white'
        }`}>
          {unread}
        </span>
      )}
    </button>
  );
}

function EmptyGroups({ onNavigateGroups }: { onNavigateGroups?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-850/60 border border-ink-700/30">
        <Users className="h-8 w-8 text-ink-500" />
      </div>
      <p className="mt-4 text-sm font-medium text-ink-200">Aún no te has unido a ningún grupo</p>
      <p className="mt-1 text-xs text-ink-400">
        Explora las comunidades disponibles y únete para empezar a chatear
      </p>
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); onNavigateGroups?.(); }}
        className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500"
      >
        <Users className="h-4 w-4" />
        Explorar comunidades
      </a>
    </div>
  );
}

function GraduationCapSmall({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

export interface GroupMemberInfo {
  email: string;
  name: string;
  initials: string;
  degree: string;
  course: string;
  isCreator: boolean;
}

export function GroupMembersModal({
  chatId,
  groupName,
  onClose,
}: {
  chatId: string;
  groupName: string;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<GroupMemberInfo[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: memberRows } = await supabase
        .from('chat_members')
        .select('user_email')
        .eq('chat_id', chatId);

      const emails = [...new Set((memberRows ?? []).map((m) => m.user_email))];
      if (emails.length === 0) {
        if (!cancelled) setMembers([]);
        return;
      }

      const { data: profileRows } = await supabase
        .from('profiles')
        .select('email, full_name, degree, course')
        .in('email', emails);

      const profileMap = new Map(
        (profileRows ?? []).map((p) => [String(p.email), p as Record<string, string>]),
      );

      // Resolve creator from the group row (grp_<uuid> chat ids)
      let creatorEmail: string | null = null;
      if (chatId.startsWith('grp_')) {
        const { data: group } = await supabase
          .from('groups')
          .select('creator_email')
          .eq('id', chatId.replace('grp_', ''))
          .maybeSingle();
        creatorEmail = group?.creator_email ?? null;
      }

      const list: GroupMemberInfo[] = emails.map((email) => {
        const p = profileMap.get(email);
        const name = String(p?.full_name ?? email.split('@')[0]);
        return {
          email,
          name,
          initials: getInitialsFromName(name),
          degree: String(p?.degree ?? '—'),
          course: String(p?.course ?? '—'),
          isCreator: creatorEmail === email,
        };
      });
      list.sort((a, b) => Number(b.isCreator) - Number(a.isCreator) || a.name.localeCompare(b.name));
      if (!cancelled) setMembers(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[80vh] w-full max-w-md animate-slide-up overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-200"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="font-display text-lg font-bold text-ink-100">Integrantes</h3>
        <p className="mt-0.5 text-sm text-ink-400">{groupName}</p>

        <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto scrollbar-thin pr-1">
          {members === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-crimson-500" />
            </div>
          ) : members.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-400">No hay integrantes registrados todavía.</p>
          ) : (
            members.map((m) => (
              <div key={m.email} className="flex items-center gap-3 rounded-xl border border-ink-700/30 bg-ink-850/30 px-3 py-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-crimson-500 to-gold-500 text-xs font-bold text-white">
                  {m.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink-100">{m.name}</p>
                    {m.isCreator && (
                      <span className="shrink-0 rounded-full bg-gold-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gold-700">
                        Creador
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-ink-400">{m.degree} · {m.course}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function getInitialsFromName(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
