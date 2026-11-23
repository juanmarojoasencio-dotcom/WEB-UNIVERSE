import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Check, Loader2, Search, Plus, X, BookOpen, PartyPopper, MessagesSquare, MapPin, Dumbbell, Shapes } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session';
import type { Group } from '@/types';

const CATEGORIES = ['Todos', 'Apuntes y estudio', 'Planes y ocio', 'Charlas y debates', 'Quedadas', 'Deporte', 'Otros'];

const CATEGORY_ICONS: Record<string, typeof Users> = {
  'Apuntes y estudio': BookOpen,
  'Planes y ocio': PartyPopper,
  'Charlas y debates': MessagesSquare,
  Quedadas: MapPin,
  Deporte: Dumbbell,
  Otros: Shapes,
};

const CATEGORY_COLORS: Record<string, string> = {
  'Apuntes y estudio': 'from-sky-400/20 to-sky-500/5 text-sky-600',
  'Planes y ocio': 'from-gold-400/20 to-gold-500/5 text-gold-700',
  'Charlas y debates': 'from-crimson-400/20 to-crimson-500/5 text-crimson-600',
  Quedadas: 'from-emerald-400/20 to-emerald-500/5 text-emerald-600',
  Deporte: 'from-emerald-400/20 to-emerald-500/5 text-emerald-600',
  Otros: 'from-ink-600/20 to-ink-700/5 text-ink-300',
};

const inputClass =
  'w-full rounded-xl border border-ink-700/30 bg-ink-850/50 px-4 py-3 text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none focus:border-crimson-400/40';
const labelClass = 'mb-1.5 block text-xs font-medium text-ink-300';

export default function GroupsPage() {
  const { session, isCreator } = useSession();
  const myEmail = session?.email ?? '';

  const [groups, setGroups] = useState<Group[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('Todos');
  const [search, setSearch] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [gName, setGName] = useState('');
  const [gCategory, setGCategory] = useState(CATEGORIES[1]);
  const [gDescription, setGDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching groups:', error);
    } else if (data) {
      setGroups(data as Group[]);
    }
    setLoading(false);
  }, []);

  const fetchMembership = useCallback(async () => {
    if (!myEmail) return;
    const { data } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_email', myEmail);
    if (data) {
      setJoinedIds(new Set(data.map((r) => r.group_id)));
    }
  }, [myEmail]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    fetchMembership();
  }, [fetchMembership]);

  const handleToggleJoin = async (group: Group) => {
    if (!myEmail) return;
    const joined = joinedIds.has(group.id);
    if (joined) {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', group.id)
        .eq('user_email', myEmail);
      if (error) return;
      const newCount = Math.max(0, group.member_count - 1);
      await supabase.from('groups').update({ member_count: newCount }).eq('id', group.id);
      setJoinedIds((prev) => {
        const next = new Set(prev);
        next.delete(group.id);
        return next;
      });
      setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, member_count: newCount } : g)));
    } else {
      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_email: myEmail });
      if (error) return;
      const newCount = group.member_count + 1;
      await supabase.from('groups').update({ member_count: newCount }).eq('id', group.id);
      setJoinedIds((prev) => new Set(prev).add(group.id));
      setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, member_count: newCount } : g)));
    }
  };

  const handleCreateGroup = async () => {
    if (!gName.trim() || !gDescription.trim() || creating) return;
    setCreating(true);
    setCreateError(null);
    const { data, error } = await supabase
      .from('groups')
      .insert({
        name: gName.trim(),
        description: gDescription.trim(),
        category: gCategory,
        faculty: 'Universidad de Sevilla',
        member_count: 1,
        is_joined: true,
        creator_email: myEmail || null,
      })
      .select('id');
    if (error || !data || data.length === 0) {
      setCreating(false);
      setCreateError('No se pudo crear el grupo. Inténtalo de nuevo.');
      return;
    }
    const groupId = data[0].id as string;
    if (myEmail) {
      await supabase.from('group_members').insert({ group_id: groupId, user_email: myEmail });
    }
    setCreating(false);
    setShowCreate(false);
    setGName(''); setGDescription('');
    fetchGroups();
    fetchMembership();
  };

  const filtered = groups.filter((g) => {
    const matchCat = category === 'Todos' || g.category === category;
    const matchSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 lg:px-8">
      {/* Search + filters + create */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-xl bg-ink-850/60 px-4 py-3 border border-ink-700/40">
          <Search className="h-4 w-4 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar grupos, comunidades..."
            className="flex-1 bg-transparent text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none"
          />
          <button
            onClick={() => setShowCreate(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Crear grupo
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                category === cat
                  ? 'bg-crimson-500 text-white shadow-lg shadow-crimson-500/20'
                  : 'bg-white/60 text-ink-400 border border-ink-700/40 hover:bg-ink-850 hover:text-ink-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-crimson-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-700 py-12 text-center">
          <p className="text-sm text-ink-400">
            {groups.length === 0
              ? isCreator
                ? 'Aún no hay grupos. Los estudiantes podrán crearlos desde aquí.'
                : 'Aún no hay comunidades. ¡Crea el primer grupo para tu facultad!'
              : 'No se encontraron grupos con esos filtros.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((group, idx) => {
            const CatIcon = CATEGORY_ICONS[group.category] || Shapes;
            const catColor = CATEGORY_COLORS[group.category] || CATEGORY_COLORS.Otros;
            const joined = joinedIds.has(group.id);
            return (
              <div
                key={group.id}
                className="glass-card group rounded-2xl p-5 transition-all hover:border-crimson-400/30 animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${catColor}`}>
                    <CatIcon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-base font-bold text-ink-100 truncate">{group.name}</h3>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-crimson-500/80">{group.category}</span>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-ink-400 line-clamp-2">{group.description}</p>

                <div className="mt-4 flex items-center justify-between border-t border-ink-800/50 pt-4">
                  <div className="flex items-center gap-1.5 text-xs text-ink-400">
                    <Users className="h-3.5 w-3.5 text-crimson-500/70" />
                    <span className="font-medium text-ink-200">{group.member_count}</span> miembros
                  </div>
                  <button
                    onClick={() => handleToggleJoin(group)}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                      joined
                        ? 'bg-emerald-400/10 text-emerald-600 border border-emerald-400/30 hover:bg-emerald-400/20'
                        : 'bg-crimson-500 text-white shadow-lg shadow-crimson-500/20 hover:bg-crimson-400'
                    }`}
                  >
                    {joined ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Unido
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" /> Unirse
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create group modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-2xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setShowCreate(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-200"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-display text-lg font-bold text-ink-100">Crear grupo</h3>
            <p className="mt-1 text-sm text-ink-400">
              Tu grupo aparecerá en comunidades y quedarás unido como primer miembro.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className={labelClass}>Nombre del grupo</label>
                <input className={inputClass} value={gName} onChange={(e) => setGName(e.target.value)} placeholder="Ej. Estudio Derecho 1º" autoFocus />
              </div>
              <div>
                <label className={labelClass}>Categoría / Finalidad</label>
                <select className={inputClass} value={gCategory} onChange={(e) => setGCategory(e.target.value)}>
                  {CATEGORIES.filter((c) => c !== 'Todos').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Descripción breve</label>
                <textarea className={`${inputClass} min-h-[80px] resize-y`} value={gDescription} onChange={(e) => setGDescription(e.target.value)} placeholder="De qué va el grupo, a quién va dirigido..." />
              </div>

              {createError && (
                <p className="text-xs text-crimson-600">{createError}</p>
              )}

              <button
                onClick={handleCreateGroup}
                disabled={!gName.trim() || !gDescription.trim() || creating}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Crear grupo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
