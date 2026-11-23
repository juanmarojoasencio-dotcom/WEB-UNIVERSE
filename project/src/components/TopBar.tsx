import { useState, useEffect, useCallback } from 'react';
import { Menu, Search, Bell, LogOut } from 'lucide-react';
import NotificationsPanel from '@/components/NotificationsPanel';
import { supabase } from '@/lib/supabase';

interface TopBarProps {
  title: string;
  subtitle: string;
  onMenuClick: () => void;
  onProfileClick: () => void;
  onSignOut: () => void;
  isCreator?: boolean;
}

export default function TopBar({ title, subtitle, onMenuClick, onProfileClick, onSignOut, isCreator = false }: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true });
    if (!error && count !== null) {
      setUnreadCount(count);
    }
  }, []);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    const channel = supabase
      .channel('notifications-bell')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          refreshUnread();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshUnread]);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-ink-800 bg-white/80 px-4 py-4 backdrop-blur-xl lg:px-8">
      <button
        onClick={onMenuClick}
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-850 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-200 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink-100 lg:text-2xl">
          {title}
        </h2>
        <p className="text-sm text-ink-400">{subtitle}</p>
      </div>

      <div className="hidden items-center gap-2 rounded-xl bg-ink-850/60 border border-ink-700/30 px-3 py-2.5 md:flex">
        <Search className="h-4 w-4 text-ink-400" />
        <input
          type="text"
          placeholder="Buscar en Uni verse..."
          className="w-40 bg-transparent text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none lg:w-56"
        />
      </div>

      <div className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-ink-850/60 border border-ink-700/30 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-200"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-crimson-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </button>
        {showNotifications && (
          <NotificationsPanel
            onClose={() => setShowNotifications(false)}
            onUnreadChange={setUnreadCount}
          />
        )}
      </div>

      <button
        onClick={onSignOut}
        aria-label="Cerrar sesión"
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-850/60 border border-ink-700/30 text-ink-400 transition-colors hover:bg-crimson-500/10 hover:text-crimson-600"
      >
        <LogOut className="h-5 w-5" />
      </button>

      <button
        onClick={onProfileClick}
        className={`flex h-10 items-center justify-center rounded-full bg-gradient-to-br from-crimson-500 to-crimson-700 text-sm font-bold text-white shadow-lg shadow-crimson-500/20 transition-transform hover:scale-105 ${
          isCreator ? 'w-auto gap-1.5 px-4' : 'w-10'
        }`}
      >
        TÚ
        {isCreator && (
          <span className="rounded-full bg-gold-400/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gold-700">
            Creador
          </span>
        )}
      </button>
    </header>
  );
}
