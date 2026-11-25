import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface UserStats {
  posts: number;
  likes: number;
  groups: number;
  events: number;
}

const ZERO_STATS: UserStats = { posts: 0, likes: 0, groups: 0, events: 0 };

/**
 * Fetches real-time statistics for the authenticated user from Supabase
 * and keeps them in sync via realtime subscriptions.
 *
 * - posts:     rows in `posts` where author_email = email
 * - likes:     rows in `post_likes` where user_email = email
 * - groups:    rows in `group_members` where user_email = email
 * - events:    rows in `event_attendees` where user_email = email
 *
 * Refetches on any INSERT / DELETE on any of those tables.
 */
export function useUserStats(email: string | null | undefined): UserStats {
  const [stats, setStats] = useState<UserStats>(ZERO_STATS);

  const fetchStats = useCallback(async () => {
    if (!email) {
      setStats(ZERO_STATS);
      return;
    }

    const [postsRes, likesRes, groupsRes, eventsRes] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_email', email),
      supabase.from('post_likes').select('id', { count: 'exact', head: true }).eq('user_email', email),
      supabase.from('group_members').select('id', { count: 'exact', head: true }).eq('user_email', email),
      supabase.from('event_attendees').select('id', { count: 'exact', head: true }).eq('user_email', email),
    ]);

    setStats({
      posts: postsRes.count ?? 0,
      likes: likesRes.count ?? 0,
      groups: groupsRes.count ?? 0,
      events: eventsRes.count ?? 0,
    });
  }, [email]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!email) return;

    const channel = supabase
      .channel('user-stats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_attendees' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [email, fetchStats]);

  return stats;
}
