import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, X, Coffee, Users as UsersIcon, Target, GraduationCap, Loader2, UserPlus, MessageCircle } from 'lucide-react';
import { fetchDiscoverUsers, US_DEGREES, US_COURSES, type DiscoverUser } from '@/lib/discoverUsers';
import {
  useSession,
  PLAN_TAGS,
  GROUP_TAGS,
} from '@/lib/session';
import { ensurePrivateChat, fetchMyProfile, fetchPeerByEmail, canonicalPrivateChatId } from '@/lib/chatHelpers';

const FACULTIES = ['FCom', 'Reina Mercedes', 'Ramón y Cajal', 'Viapol', 'Cartuja'];
const COURSES = US_COURSES as readonly string[];
const CLASS_GROUPS = ['Grupo 1', 'Grupo 2', 'Grupo 3', 'Grupo 4', 'Grupo A', 'Grupo B', 'Tarde', 'Bilingüe'];
const PERSONALITY_TAGS = [...PLAN_TAGS, ...GROUP_TAGS] as readonly string[];

interface Filters {
  search: string;
  degree: string;
  course: string;
  classGroup: string;
  faculty: string;
  personality: string;
}

const EMPTY_FILTERS: Filters = {
  search: '',
  degree: '',
  course: '',
  classGroup: '',
  faculty: '',
  personality: '',
};

interface ExplorePageProps {
  onStartChat: (chatId: string) => void;
  currentUserEmail: string;
}

export default function ExplorePage({ onStartChat, currentUserEmail }: ExplorePageProps) {
  const { profile, isCreator } = useSession();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const fetched = await fetchDiscoverUsers(currentUserEmail);
    setUsers(fetched);
    setLoading(false);
  }, [currentUserEmail]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const activeFilterCount = useMemo(
    () =>
      [filters.degree, filters.course, filters.classGroup, filters.faculty, filters.personality].filter(
        Boolean,
      ).length,
    [filters],
  );

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return users.filter((user) => {
      if (search && !user.name.toLowerCase().includes(search)) return false;
      if (filters.degree && user.degree !== filters.degree) return false;
      if (filters.course && user.course !== filters.course) return false;
      if (filters.classGroup && user.classGroup !== filters.classGroup) return false;
      if (filters.faculty && user.faculty !== filters.faculty) return false;
      if (filters.personality && user.planTag !== filters.personality && user.groupTag !== filters.personality)
        return false;
      return true;
    });
  }, [filters, users]);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const matchReasons = (user: DiscoverUser): string[] => {
    if (!profile) return [];
    const reasons: string[] = [];
    if (user.degree === profile.degree) reasons.push('Misma carrera');
    if (user.course === profile.course) reasons.push('Mismo curso');
    if (user.classGroup === profile.classGroup) reasons.push('Mismo grupo');
    if (user.planTag === profile.planTag) reasons.push('Plan en común');
    if (user.groupTag === profile.groupTag) reasons.push('Misma personalidad');
    if (user.goalTag === profile.goalTag) reasons.push('Mismo objetivo');
    return reasons;
  };

  const handleChat = async (user: DiscoverUser) => {
    if (startingChat) return;
    setChatError(null);
    setStartingChat(user.id);
    try {
      const myProfile = await fetchMyProfile(currentUserEmail);
      if (!myProfile) {
        setChatError('No se pudo cargar tu perfil. Completa tu perfil e inténtalo de nuevo.');
        setStartingChat(null);
        return;
      }
      const peerProfile = await fetchPeerByEmail(user.email);
      if (!peerProfile) {
        setChatError('No se encontró el perfil del estudiante seleccionado.');
        setStartingChat(null);
        return;
      }
      const chat = await ensurePrivateChat(currentUserEmail, myProfile, user.email, peerProfile);
      if (!chat) {
        setChatError('No se pudo crear la conversación. Inténtalo de nuevo.');
        setStartingChat(null);
        return;
      }
      onStartChat(canonicalPrivateChatId(currentUserEmail, user.email));
    } catch {
      setChatError('Ocurrió un error al iniciar el chat.');
    } finally {
      setStartingChat(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8">
      {/* Search + filter toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-ink-700/30 bg-ink-850/60 px-3 py-2.5">
          <Search className="h-4 w-4 text-ink-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Buscar estudiantes por nombre..."
            className="flex-1 bg-transparent text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
            showFilters || activeFilterCount > 0
              ? 'border-crimson-400/40 bg-crimson-500/10 text-crimson-600'
              : 'border-ink-700/30 bg-ink-850/40 text-ink-300 hover:bg-ink-850'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-crimson-500 px-1.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mt-3 animate-slide-up rounded-2xl border border-ink-700/30 bg-white/70 p-4 backdrop-blur-md sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FilterSelect
              label="Facultad"
              value={filters.faculty}
              onChange={(v) => setFilter('faculty', v)}
              options={FACULTIES}
              placeholder="Todas las facultades"
            />
            <FilterSelect
              label="Carrera / Grado"
              value={filters.degree}
              onChange={(v) => setFilter('degree', v)}
              options={US_DEGREES as readonly string[]}
              placeholder="Todas las carreras"
            />
            <FilterSelect
              label="Curso"
              value={filters.course}
              onChange={(v) => setFilter('course', v)}
              options={COURSES}
              placeholder="Todos los cursos"
            />
            <FilterSelect
              label="Grupo"
              value={filters.classGroup}
              onChange={(v) => setFilter('classGroup', v)}
              options={CLASS_GROUPS}
              placeholder="Todos los grupos"
            />
            <FilterSelect
              label="Personalidad / Plan"
              value={filters.personality}
              onChange={(v) => setFilter('personality', v)}
              options={PERSONALITY_TAGS}
              placeholder="Todas las etiquetas"
              className="sm:col-span-2"
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-200"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-ink-400">
          {loading ? (
            'Cargando estudiantes...'
          ) : (
            <>
              Mostrando <span className="font-semibold text-ink-200">{filtered.length}</span>{' '}
              {filtered.length === 1 ? 'estudiante' : 'estudiantes'}
            </>
          )}
        </p>
      </div>

      {chatError && (
        <div className="mt-3 rounded-xl border border-crimson-400/40 bg-crimson-500/10 px-4 py-3 text-xs font-medium text-crimson-600">
          {chatError}
        </div>
      )}

      {/* User cards */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-crimson-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-700/40 bg-white/50 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-850/60 border border-ink-700/30">
              <UserPlus className="h-8 w-8 text-ink-500" />
            </div>
            <p className="mt-4 text-sm font-medium text-ink-200">Aún no hay más estudiantes en este filtro</p>
            <p className="mt-1 max-w-[280px] text-xs text-ink-400">
              ¡Sé de los primeros en compartir la app en tu facultad! Cuando más compañeros se registren, aparecerán aquí.
            </p>
          </div>
        ) : (
          filtered.map((user) => {
            const reasons = matchReasons(user);
            const isMe = user.email ? user.email === currentUserEmail : false;
            return (
              <div
                key={user.id}
                className="glass-card animate-slide-up rounded-2xl p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-crimson-500 to-gold-500 text-sm font-bold text-white">
                    {user.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-sm font-bold text-ink-100">{user.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400">
                      <GraduationCap className="h-3 w-3 text-crimson-600" />
                      {user.faculty}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Chip>{user.degree}</Chip>
                  <Chip>{user.course}</Chip>
                  <Chip>{user.classGroup}</Chip>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {user.planTag && <Chip icon={<Coffee className="h-3 w-3" />}>{user.planTag}</Chip>}
                  {user.groupTag && <Chip icon={<UsersIcon className="h-3 w-3" />}>{user.groupTag}</Chip>}
                </div>

                {reasons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-ink-800/50 pt-2.5">
                    {reasons.map((reason) => (
                      <span
                        key={reason}
                        className="flex items-center gap-1 rounded-full bg-crimson-500/10 px-2.5 py-1 text-[10px] font-semibold text-crimson-600"
                      >
                        <Target className="h-2.5 w-2.5" />
                        {reason}
                      </span>
                    ))}
                  </div>
                )}

                {!isMe && !isCreator && (
                  <div className="mt-3 border-t border-ink-800/50 pt-3">
                    <button
                      onClick={() => handleChat(user)}
                      disabled={startingChat === user.id}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {startingChat === user.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MessageCircle className="h-3.5 w-3.5" />
                      )}
                      Chatear
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-ink-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-ink-700/30 bg-ink-850/50 px-3 py-2.5 text-sm text-ink-100 focus:outline-none focus:ring-1 focus:ring-crimson-400/40"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function Chip({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-ink-700/30 bg-ink-850/40 px-2.5 py-1 text-[11px] font-medium text-ink-300">
      {icon}
      {children}
    </span>
  );
}


