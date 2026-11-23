import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Send, Search, ArrowLeft, Loader2, MessageCircle, MoreVertical, Pencil, Trash2,
  Check, X, Users, UserCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Chat, Message, ChatType } from '@/types';

const AUTO_REPLIES = [
  '¡Sí, claro! Cuento con ello 👍',
  'Jajaja qué buena idea',
  '¿Quedamos en la facultad entonces?',
  'Voy a revisarlo y te cuento',
  'Genial, apúntame',
  'No te preocupes, lo entiendo',
  '¿A qué hora quedamos?',
  'Perfecto, allí nos vemos',
  'Mándame un DM con los detalles',
  'Estoy de acuerdo contigo',
];

type ChatTab = 'private' | 'group';

const SENDER_COLOR_PALETTE = [
  'from-crimson-500 to-crimson-700',
  'from-gold-500 to-gold-700',
  'from-emerald-500 to-emerald-700',
  'from-blue-500 to-blue-700',
  'from-rose-500 to-rose-700',
  'from-teal-500 to-teal-700',
  'from-indigo-500 to-indigo-700',
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

interface ChatsPageProps {
  onNavigateGroups?: () => void;
  onNavigateExplore?: () => void;
  initialChat?: {
    chatId: string;
    contactName: string;
    contactAvatar: string;
    contactFaculty: string;
  };
  onChatOpened?: () => void;
}

export default function ChatsPage({ onNavigateGroups, onNavigateExplore, initialChat, onChatOpened }: ChatsPageProps) {
  const [activeTab, setActiveTab] = useState<ChatTab>('private');
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(true);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [openMessageMenu, setOpenMessageMenu] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchChats = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('chats').select('*');
    if (error) {
      console.error('Error fetching chats:', error);
    } else if (data) {
      setChats(data as Chat[]);
    }
    setLoading(false);
  }, []);

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

  useEffect(() => {
    if (!initialChat) return;
    setActiveTab('private');
    const ensureAndOpen = async () => {
      const { data: existing } = await supabase
        .from('chats')
        .select('chat_id')
        .eq('chat_id', initialChat.chatId)
        .maybeSingle();
      if (!existing) {
        await supabase.from('chats').insert({
          chat_id: initialChat.chatId,
          contact_name: initialChat.contactName,
          contact_avatar: initialChat.contactAvatar,
          contact_faculty: initialChat.contactFaculty,
          last_message: 'Inicia la conversación',
          last_time: 'Ahora',
          unread: 0,
          chat_type: 'private',
          member_count: 2,
        });
      }
      await fetchChats();
      setActiveChatId(initialChat.chatId);
      onChatOpened?.();
    };
    ensureAndOpen();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChat]);

  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId);
    }
  }, [activeChatId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (activeChatId) {
      inputRef.current?.focus();
    }
  }, [activeChatId]);

  const privateChats = chats.filter((c) => (c.chat_type ?? 'private') === 'private');
  const groupChats = chats.filter((c) => c.chat_type === 'group');
  const privateUnread = privateChats.reduce((sum, c) => sum + (c.unread || 0), 0);
  const groupUnread = groupChats.reduce((sum, c) => sum + (c.unread || 0), 0);

  const currentList = activeTab === 'private' ? privateChats : groupChats;
  const filteredChats = currentList.filter((c) =>
    c.contact_name.toLowerCase().includes(search.toLowerCase()),
  );

  const activeChat = chats.find((c) => c.chat_id === activeChatId);
  const isGroupChat = activeChat?.chat_type === 'group';

  const handleSend = async () => {
    if (!input.trim() || !activeChatId) return;
    const content = input.trim();
    setInput('');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: activeChatId,
        sender_name: 'Tú',
        sender_avatar: 'TÚ',
        content,
        is_me: true,
      })
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => [...prev, data as Message]);
    }

    const activeChatLocal = chats.find((c) => c.chat_id === activeChatId);
    if (activeChatLocal) {
      await supabase
        .from('chats')
        .update({ last_message: content, last_time: 'Ahora', unread: 0 })
        .eq('id', activeChatLocal.id);
    }

    setIsTyping(true);
    setTimeout(async () => {
      setIsTyping(false);
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      const chat = chats.find((c) => c.chat_id === activeChatId);
      const senderName = isGroupChat
        ? pickGroupSender(chat?.contact_name ?? '')
        : chat?.contact_name || 'Usuario';
      const senderAvatar = senderName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
      const { data: replyData } = await supabase
        .from('messages')
        .insert({
          chat_id: activeChatId,
          sender_name: senderName,
          sender_avatar: senderAvatar,
          content: reply,
          is_me: false,
        })
        .select()
        .single();
      if (replyData) {
        setMessages((prev) => [...prev, replyData as Message]);
        if (chat) {
          await supabase
            .from('chats')
            .update({ last_message: `${senderName.split(' ')[0]}: ${reply}`, last_time: 'Ahora' })
            .eq('id', chat.id);
        }
      }
    }, 1800 + Math.random() * 1200);
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
      .eq('is_me', true);

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
      .eq('is_me', true);

    if (error) {
      console.error('Error deleting message:', error);
      return;
    }

    const remainingMessages = messages.filter((item) => item.id !== message.id);
    setMessages(remainingMessages);
    setDeletingMessageId(null);
    setOpenMessageMenu(null);

    if (activeChat && remainingMessages.length > 0 && remainingMessages[remainingMessages.length - 1].id === message.id) {
      const lastMessage = remainingMessages[remainingMessages.length - 1];
      await supabase
        .from('chats')
        .update({ last_message: lastMessage.content })
        .eq('id', activeChat.id);
      setChats((prev) => prev.map((chat) => (
        chat.id === activeChat.id ? { ...chat, last_message: lastMessage.content } : chat
      )));
    }
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
                <p className="mt-4 text-sm font-medium text-ink-200">Aún no tienes chats privados</p>
                <p className="mt-1 max-w-[220px] text-xs text-ink-400">
                  Explora estudiantes de tu facultad o intereses para iniciar tu primera conversación
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
                onClick={() => setActiveChatId(chat.chat_id)}
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
                    {chat.unread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-crimson-500 px-1.5 text-[10px] font-bold text-white">
                        {chat.unread}
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
                <p className="flex items-center gap-1 text-[10px] text-ink-400">
                  <Users className="h-3 w-3" />
                  {activeChat.member_count} participantes · {activeChat.contact_faculty}
                </p>
              ) : (
                <p className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  En línea · {activeChat.contact_faculty}
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
            ) : (
              <div className="mx-auto max-w-2xl space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.is_me ? 'justify-end' : 'justify-start'} animate-slide-up`}
                  >
                    {!msg.is_me && (
                      <div className={`mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getSenderColor(msg.sender_name)} text-[10px] font-bold text-white`}>
                        {msg.sender_avatar}
                      </div>
                    )}
                    <div className={`relative flex max-w-[75%] items-start gap-1 ${msg.is_me ? 'flex-row-reverse' : ''}`}>
                      {msg.is_me && editingMessageId !== msg.id && (
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
                            onClick={() => msg.is_me && setOpenMessageMenu(openMessageMenu === msg.id ? null : msg.id)}
                            className={`block text-left ${msg.is_me ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            {isGroupChat && !msg.is_me && (
                              <p className="mb-0.5 px-1 text-[10px] font-semibold text-ink-300">{msg.sender_name}</p>
                            )}
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm ${
                                msg.is_me
                                  ? 'bg-gradient-to-br from-crimson-500 to-crimson-600 text-white rounded-br-sm shadow-lg shadow-crimson-500/10'
                                  : 'bg-ink-800/60 text-ink-200 rounded-bl-sm border border-ink-700/30'
                              }`}
                            >
                              {msg.content}
                            </div>
                          </button>
                        )}
                        {openMessageMenu === msg.id && msg.is_me && editingMessageId !== msg.id && (
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
                ))}
                {isTyping && (
                  <div className="flex justify-start animate-slide-up">
                    <div className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ink-300 to-ink-500 text-[10px] font-bold text-white">
                      ...
                    </div>
                    <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-ink-800/60 px-4 py-3 border border-ink-700/30">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-ink-500 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-ink-500 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-ink-500" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-ink-800 bg-white/60 p-4 backdrop-blur-xl">
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

const GROUP_SENDER_NAMES = ['Compañero A', 'Compañero B', 'Compañero C', 'Compañero D', 'Compañero E'];
function pickGroupSender(_chatName: string): string {
  return GROUP_SENDER_NAMES[Math.floor(Math.random() * GROUP_SENDER_NAMES.length)];
}
