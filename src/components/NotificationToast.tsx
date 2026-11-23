import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LiveNotification {
  id: string;
  brand: string | null;
  title: string;
  message: string;
  image_url: string | null;
}

export function useLiveNotifications(onNew?: (n: LiveNotification) => void) {
  const latestRef = useRef<LiveNotification | null>(null);
  const cbRef = useRef(onNew);
  cbRef.current = onNew;

  useEffect(() => {
    const channel = supabase
      .channel('live-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const row = payload.new as LiveNotification;
          latestRef.current = row;
          cbRef.current?.(row);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

export function NotificationToast({
  notification,
  onClose,
}: {
  notification: LiveNotification;
  onClose: () => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm animate-slide-up">
      <div className="glass rounded-2xl border border-crimson-400/30 p-4 shadow-2xl shadow-crimson-500/10">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-crimson-500/10 to-gold-500/10">
            {notification.image_url ? (
              <img src={notification.image_url} alt={notification.brand ?? notification.title} className="h-full w-full object-cover" />
            ) : (
              <Bell className="h-4 w-4 text-crimson-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-ink-100">
              {notification.brand ?? notification.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-400">
              {notification.message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
