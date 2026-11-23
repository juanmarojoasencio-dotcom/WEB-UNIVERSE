import { useState, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Send, MapPin, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/types';

const FACULTIES = ['Todos', 'FCom', 'Reina Mercedes', 'Ramón y Cajal', 'Viapol', 'Cartuja'];

const FACULTY_COLORS: Record<string, string> = {
  FCom: 'bg-sky-400/10 text-sky-600 border-sky-400/30',
  'Reina Mercedes': 'bg-emerald-400/10 text-emerald-600 border-emerald-400/30',
  'Ramón y Cajal': 'bg-crimson-400/10 text-crimson-600 border-crimson-400/30',
  Viapol: 'bg-violet-400/10 text-violet-600 border-violet-400/30',
  Cartuja: 'bg-gold-400/10 text-gold-700 border-gold-400/30',
  General: 'bg-ink-700/20 text-ink-400 border-ink-600/30',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todos');
  const [newPost, setNewPost] = useState('');
  const [postFaculty, setPostFaculty] = useState('FCom');
  const [authorName, setAuthorName] = useState('Tú');
  const [posting, setPosting] = useState(false);
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentsByPost, setCommentsByPost] = useState<Record<string, string[]>>({});

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching posts:', error);
    } else if (data) {
      setPosts(data as Post[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_name: authorName.trim() || 'Anónimo',
        author_faculty: postFaculty,
        content: newPost.trim(),
        likes: 0,
      })
      .select()
      .single();
    if (!error && data) {
      setPosts((prev) => [data as Post, ...prev]);
      setNewPost('');
    }
    setPosting(false);
  };

  const handleLike = async (post: Post) => {
    const { error } = await supabase
      .from('posts')
      .update({ likes: post.likes + 1 })
      .eq('id', post.id);
    if (!error) {
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likes: p.likes + 1 } : p))
      );
    }
  };

  const handleShare = (post: Post) => {
    const shareText = `"${post.content}" — ${post.author_name} en Uni verse`;
    if (navigator.share) {
      navigator.share({ title: 'Uni verse', text: shareText }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareText).catch(() => {});
    }
  };

  const handleComment = (postId: string) => {
    if (!commentText.trim()) return;
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), commentText.trim()],
    }));
    setCommentText('');
    setCommentingOn(null);
  };

  const filteredPosts =
    filter === 'Todos'
      ? posts
      : posts.filter((p) => p.author_faculty === filter);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 lg:px-8">
      {/* Post composer */}
      <div className="glass-card rounded-2xl p-5 animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-crimson-500 to-crimson-700 text-sm font-bold text-white shadow-lg shadow-crimson-500/20">
            TÚ
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Tu nombre"
              className="mb-2 w-full rounded-lg bg-ink-850/50 border border-ink-700/30 px-3 py-1.5 text-sm text-ink-200 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-crimson-400/40"
            />
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="¿Qué cuentas sobre la vida universitaria en Sevilla?"
              rows={3}
              className="w-full resize-none rounded-xl bg-ink-850/40 border border-ink-700/30 px-4 py-3 text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-crimson-400/40"
            />
            <div className="mt-3 flex items-center justify-between">
              <select
                value={postFaculty}
                onChange={(e) => setPostFaculty(e.target.value)}
                className="rounded-lg border border-ink-700 bg-ink-850/60 px-3 py-1.5 text-xs text-ink-200 focus:outline-none focus:ring-1 focus:ring-crimson-400/40"
              >
                {FACULTIES.slice(1).map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <button
                onClick={handlePost}
                disabled={!newPost.trim() || posting}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Publicar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Faculty filters */}
      <div className="flex flex-wrap gap-2">
        {FACULTIES.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all ${
              filter === f
                ? 'bg-crimson-500 text-white shadow-lg shadow-crimson-500/20'
                : 'bg-white/60 text-ink-400 border border-ink-700/40 hover:bg-ink-850 hover:text-ink-200'
            }`}
          >
            {f !== 'Todos' && <MapPin className="h-3 w-3" />}
            {f}
          </button>
        ))}
      </div>

      {/* Posts feed */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-crimson-500" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-700 py-12 text-center">
          <p className="text-sm text-ink-400">No hay publicaciones para este filtro todavía.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post, idx) => {
            const facultyColor = FACULTY_COLORS[post.author_faculty] || FACULTY_COLORS.General;
            const postComments = commentsByPost[post.id] || [];
            return (
              <article
                key={post.id}
                className="glass-card rounded-2xl p-5 animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-crimson-500 to-gold-500 text-sm font-bold text-white">
                    {getInitials(post.author_name)}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink-100">{post.author_name}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${facultyColor}`}>
                        {post.author_faculty}
                      </span>
                      <span className="text-xs text-ink-400">· {timeAgo(post.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-200">{post.content}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1 border-t border-ink-800 pt-3">
                  <button
                    onClick={() => handleLike(post)}
                    className="group flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-ink-400 transition-all hover:bg-crimson-400/10 hover:text-crimson-500"
                  >
                    <Heart className="h-4 w-4 transition-transform group-hover:scale-110" />
                    {post.likes}
                  </button>
                  <button
                    onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)}
                    className="group flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-ink-400 transition-all hover:bg-sky-400/10 hover:text-sky-500"
                  >
                    <MessageCircle className="h-4 w-4 transition-transform group-hover:scale-110" />
                    {postComments.length}
                  </button>
                  <button
                    onClick={() => handleShare(post)}
                    className="group flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-ink-400 transition-all hover:bg-gold-400/10 hover:text-gold-600"
                  >
                    <Share2 className="h-4 w-4 transition-transform group-hover:scale-110" />
                    Compartir
                  </button>
                </div>

                {commentingOn === post.id && (
                  <div className="mt-3 animate-slide-up">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                        placeholder="Escribe un comentario..."
                        className="flex-1 rounded-lg bg-ink-850/50 border border-ink-700/30 px-3 py-2 text-xs text-ink-200 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-crimson-400/40"
                      />
                      <button
                        onClick={() => handleComment(post.id)}
                        disabled={!commentText.trim()}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-crimson-500 text-white transition-colors hover:bg-crimson-400 disabled:opacity-40"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {postComments.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-ink-800/50 pt-3">
                    {postComments.map((c, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-crimson-500 to-gold-500 text-[10px] font-bold text-white">
                          TÚ
                        </div>
                        <div className="rounded-lg bg-ink-850/60 px-3 py-2 border border-ink-700/20">
                          <span className="text-xs font-medium text-ink-200">Tú</span>
                          <p className="text-xs text-ink-400">{c}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <div className="pb-4 text-center">
        <p className="text-xs text-ink-500">
          <Plus className="mb-1 inline h-3 w-3" /> Has llegado al final del muro
        </p>
      </div>
    </div>
  );
}
