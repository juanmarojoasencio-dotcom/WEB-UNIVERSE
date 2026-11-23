import { useState, useEffect, useCallback } from 'react';
import { Bell, X, CheckCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  link: string | null;
  brand: string | null;
  image_url: string | null;
  created_at: string;
}

const READ_STORAGE_KEY = 'uniVerse.readNotifications';

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveReadIds(ids: Set<string>): void {
  localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...ids]));
}

interface NotificationsPanelProps {
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export default function NotificationsPanel({ onClose, onUnreadChange }: NotificationsPanelProps) {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());
  const [selected, setSelected] = useState<NotificationRow | null>(null);

  const loadNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      console.error('Error fetching notifications:', error);
    } else if (data) {
      setItems(data as NotificationRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const channel = supabase
      .channel('notifications-panel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => {
          loadNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications]);

  const unreadCount = items.filter((i) => !readIds.has(i.id)).length;

  useEffect(() => {
    onUnreadChange?.(unreadCount);
  }, [unreadCount, onUnreadChange]);

  const markAllRead = () => {
    const all = new Set(items.map((i) => i.id));
    setReadIds(all);
    saveReadIds(all);
  };

  const openNotification = (n: NotificationRow) => {
    if (!readIds.has(n.id)) {
      const next = new Set(readIds);
      next.add(n.id);
      setReadIds(next);
      saveReadIds(next);
    }
    setSelected(n);
  };

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute right-0 top-12 z-40 w-[360px] max-w-[calc(100vw-2rem)] origin-top-right animate-slide-up">
        <div className="glass rounded-2xl shadow-2xl shadow-ink-100/20 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-crimson-600" />
              <h3 className="font-display text-sm font-bold text-ink-100">Notificaciones</h3>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-crimson-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-200"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-crimson-500" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-ink-400">No tienes notificaciones nuevas</p>
              </div>
            ) : (
              items.map((n) => {
                const isUnread = !readIds.has(n.id);
                return (
                  <button
                    key={n.id}
                    onClick={() => openNotification(n)}
                    className={`flex w-full items-start gap-3 border-b border-ink-800/50 px-4 py-3.5 text-left transition-colors hover:bg-ink-850/40 last:border-b-0 ${
                      isUnread ? 'bg-crimson-500/5' : ''
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-crimson-500/10 to-gold-500/10">
                      {n.image_url ? (
                        <img src={n.image_url} alt={n.brand ?? n.title} className="h-full w-full object-cover" />
                      ) : (
                        <Bell className="h-4 w-4 text-crimson-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-ink-100 truncate">{n.brand ?? n.title}</span>
                        <span className="text-[10px] text-ink-400 shrink-0">
                          {new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink-400 line-clamp-2">{n.message}</p>
                      {isUnread && (
                        <span className="mt-2 flex h-2 w-2 rounded-full bg-crimson-500" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-ink-800 bg-ink-900/40 px-4 py-2.5">
            <p className="text-center text-[10px] text-ink-400">
              Comunicados del equipo de Uni verse
            </p>
          </div>
        </div>
      </div>

      {/* Notification detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-2xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-200"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-crimson-500/10 to-gold-500/10">
              {selected.image_url ? (
                <img src={selected.image_url} alt={selected.brand ?? selected.title} className="h-full w-full object-cover" />
              ) : (
                <Bell className="h-6 w-6 text-crimson-600" />
              )}
            </div>

            <h3 className="mt-4 font-display text-lg font-bold text-ink-100">{selected.brand ?? selected.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-400">{selected.message}</p>

            {selected.link && (
              <a
                href={selected.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500"
              >
                Abrir enlace
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
