import { useState } from 'react';
import {
  User, Mail, GraduationCap, MapPin, Calendar, Bell, Lock, Globe,
  Camera, Save, Check, Loader2, Heart, MessageCircle, Users, CalendarDays,
  Settings, Shield, LogOut, Pencil, X, Coffee, Target,
} from 'lucide-react';
import { useSession, US_DEGREES, US_COURSES, US_CLASS_GROUPS, PLAN_TAGS, GROUP_TAGS, GOAL_TAGS, type UserProfile } from '@/lib/session';
import { useUserStats } from '@/lib/useUserStats';

type ProfileSection = 'datos' | 'ajustes' | 'privacidad';

interface ProfileExtras {
  bio: string;
  location: string;
  avatar: string;
}

const FACULTIES = ['FCom', 'Reina Mercedes', 'Ramón y Cajal', 'Viapol', 'Cartuja'];

export default function ProfilePage() {
  const { session, profile, signOut, updateProfile } = useSession();
  const userStats = useUserStats(session?.email);
  const [section, setSection] = useState<ProfileSection>('datos');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const STATS = [
    { label: 'Publicaciones', value: userStats.posts, icon: MessageCircle },
    { label: 'Me gusta dados', value: userStats.likes, icon: Heart },
    { label: 'Grupos activos', value: userStats.groups, icon: Users },
    { label: 'Eventos confirmados', value: userStats.events, icon: CalendarDays },
  ];

  const [draft, setDraft] = useState<UserProfile | null>(profile);
  const [extras, setExtras] = useState<ProfileExtras>({
    bio: 'Estudiante en la Universidad de Sevilla. Conectando con gente y descubriendo planes por el campus.',
    location: 'Sevilla',
    avatar: computeAvatar(profile?.fullName ?? ''),
  });

  const [settings, setSettings] = useState({
    notifPosts: true,
    notifEvents: true,
    notifMessages: true,
    notifAds: true,
    darkMode: false,
    language: 'Español',
  });

  const [privacy, setPrivacy] = useState({
    profileVisible: 'Público',
    showFaculty: true,
    showEmail: false,
    allowMessages: 'Todos',
  });

  const current = draft ?? profile;
  if (!current) return null;

  const handleSave = () => {
    if (!draft) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setEditing(false);
      setSaved(true);
      updateProfile(draft);
      setTimeout(() => setSaved(false), 3000);
    }, 800);
  };

  const handleAvatarChange = () => {
    setExtras((prev) => ({
      ...prev,
      avatar: computeAvatar(draft?.fullName ?? '') || 'TU',
    }));
  };

  const updateDraft = (patch: Partial<UserProfile>) => {
    setDraft((prev) => ({ ...(prev ?? profile), ...patch } as UserProfile));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 lg:px-8">
      {/* Cover + avatar header */}
      <div className="relative overflow-hidden rounded-3xl border border-ink-800 animate-slide-up">
        <div className="h-32 bg-gradient-to-br from-crimson-600 via-crimson-500 to-gold-500 lg:h-40" />
        <div className="absolute -bottom-12 left-6 lg:left-8">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-crimson-500 to-crimson-700 text-2xl font-bold text-white shadow-xl lg:h-28 lg:w-28">
              {extras.avatar}
            </div>
            <button
              onClick={handleAvatarChange}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-ink-700/30 text-ink-400 shadow-md transition-colors hover:text-crimson-600"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-3">
          {!editing && section === 'datos' && (
            <button
              onClick={() => {
                setDraft(profile);
                setEditing(true);
              }}
              className="flex items-center gap-2 rounded-xl border border-ink-700/40 bg-white/60 px-4 py-2 text-sm font-medium text-ink-300 transition-all hover:bg-ink-850 hover:text-ink-100"
            >
              <Pencil className="h-4 w-4" />
              Editar perfil
            </button>
          )}
          {editing && (
            <>
              <button
                onClick={() => {
                  setEditing(false);
                  setDraft(profile);
                }}
                className="flex items-center gap-2 rounded-xl border border-ink-700/40 bg-white/60 px-4 py-2 text-sm font-medium text-ink-400 transition-all hover:bg-ink-850"
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Name + bio below avatar */}
      <div className="px-2 animate-slide-up" style={{ animationDelay: '50ms' }}>
        <h1 className="font-display text-2xl font-bold text-ink-100">{current.fullName}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-400">
          <span className="flex items-center gap-1">
            <GraduationCap className="h-4 w-4 text-crimson-600" />
            {current.degree} · {current.course}
          </span>
          <span className="text-ink-600">·</span>
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4 text-crimson-600" />
            {current.classGroup}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-300">{extras.bio}</p>
        {saved && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-600 animate-bounce-in">
            <Check className="h-4 w-4" />
            Perfil actualizado correctamente.
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 animate-slide-up" style={{ animationDelay: '80ms' }}>
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-card rounded-2xl p-4 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-crimson-500/10">
                <Icon className="h-5 w-5 text-crimson-600" />
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-ink-100">{stat.value}</p>
              <p className="text-[11px] text-ink-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 rounded-xl border border-ink-700/30 bg-ink-850/40 p-1 animate-slide-up" style={{ animationDelay: '100ms' }}>
        {([
          { key: 'datos' as const, label: 'Mis datos', icon: User },
          { key: 'ajustes' as const, label: 'Ajustes', icon: Settings },
          { key: 'privacidad' as const, label: 'Privacidad', icon: Shield },
        ]).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setSection(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                section === tab.key
                  ? 'bg-crimson-500 text-white shadow-lg shadow-crimson-500/20'
                  : 'text-ink-400 hover:text-ink-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Section content */}
      <div className="animate-slide-up" style={{ animationDelay: '120ms' }}>
        {section === 'datos' && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-ink-100">Información personal</h3>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-300">Nombre completo</label>
              <div className="flex items-center gap-2 rounded-xl bg-ink-850/50 border border-ink-700/30 px-4 py-3">
                <User className="h-4 w-4 shrink-0 text-crimson-600" />
                <input
                  type="text"
                  value={current.fullName}
                  onChange={(e) => updateDraft({ fullName: e.target.value })}
                  disabled={!editing}
                  className="flex-1 bg-transparent text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none disabled:cursor-default"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-300">Correo universitario</label>
              <div className="flex items-center gap-2 rounded-xl bg-ink-850/50 border border-ink-700/30 px-4 py-3">
                <Mail className="h-4 w-4 shrink-0 text-crimson-600" />
                <input
                  type="email"
                  value={current.email}
                  disabled
                  className="flex-1 bg-transparent text-sm text-ink-400 focus:outline-none disabled:cursor-default"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-300">Carrera / Grado</label>
                <div className="flex items-center gap-2 rounded-xl bg-ink-850/50 border border-ink-700/30 px-4 py-3">
                  <GraduationCap className="h-4 w-4 shrink-0 text-crimson-600" />
                  <select
                    value={current.degree}
                    onChange={(e) => updateDraft({ degree: e.target.value })}
                    disabled={!editing}
                    className="flex-1 bg-transparent text-sm text-ink-100 focus:outline-none disabled:cursor-default"
                  >
                    {US_DEGREES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-300">Curso</label>
                <div className="flex items-center gap-2 rounded-xl bg-ink-850/50 border border-ink-700/30 px-4 py-3">
                  <Calendar className="h-4 w-4 shrink-0 text-crimson-600" />
                  <select
                    value={current.course}
                    onChange={(e) => updateDraft({ course: e.target.value })}
                    disabled={!editing}
                    className="flex-1 bg-transparent text-sm text-ink-100 focus:outline-none disabled:cursor-default"
                  >
                    {US_COURSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-300">Grupo de clase</label>
                <div className="flex items-center gap-2 rounded-xl bg-ink-850/50 border border-ink-700/30 px-4 py-3">
                  <MapPin className="h-4 w-4 shrink-0 text-crimson-600" />
                  <select
                    value={current.classGroup}
                    onChange={(e) => updateDraft({ classGroup: e.target.value })}
                    disabled={!editing}
                    className="flex-1 bg-transparent text-sm text-ink-100 focus:outline-none disabled:cursor-default"
                  >
                    {US_CLASS_GROUPS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-300">Ubicación</label>
                <div className="flex items-center gap-2 rounded-xl bg-ink-850/50 border border-ink-700/30 px-4 py-3">
                  <MapPin className="h-4 w-4 shrink-0 text-crimson-600" />
                  <input
                    type="text"
                    value={extras.location}
                    onChange={(e) => setExtras({ ...extras, location: e.target.value })}
                    disabled={!editing}
                    placeholder="Ej. Sevilla · Nervión"
                    className="flex-1 bg-transparent text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none disabled:cursor-default"
                  />
                </div>
              </div>
            </div>

            {/* Personality tags (editable) */}
            <div className="border-t border-ink-800/50 pt-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-ink-300">
                <Target className="h-3.5 w-3.5 text-crimson-600" />
                Personalidad e intereses
              </p>

              <TagEditor
                icon={<Coffee className="h-3 w-3" />}
                label="Plan ideal"
                options={PLAN_TAGS}
                value={current.planTag}
                onChange={(v) => updateDraft({ planTag: v })}
                editing={editing}
              />
              <TagEditor
                icon={<Users className="h-3 w-3" />}
                label="En grupo"
                options={GROUP_TAGS}
                value={current.groupTag}
                onChange={(v) => updateDraft({ groupTag: v })}
                editing={editing}
              />
              <TagEditor
                icon={<Target className="h-3 w-3" />}
                label="Busco"
                options={GOAL_TAGS}
                value={current.goalTag}
                onChange={(v) => updateDraft({ goalTag: v })}
                editing={editing}
              />
            </div>

            <div className="border-t border-ink-800/50 pt-4">
              <label className="mb-1.5 block text-xs font-medium text-ink-300">Biografía</label>
              <textarea
                value={extras.bio}
                onChange={(e) => setExtras({ ...extras, bio: e.target.value })}
                disabled={!editing}
                rows={3}
                className="w-full resize-none rounded-xl bg-ink-850/50 border border-ink-700/30 px-4 py-3 text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-crimson-400/40 disabled:cursor-default"
              />
            </div>
          </div>
        )}

        {section === 'ajustes' && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold text-ink-100">Notificaciones</h3>
              <p className="mt-1 text-xs text-ink-400">Decide qué quieres recibir</p>
              <div className="mt-4 space-y-3">
                {([
                  { key: 'notifPosts' as const, label: 'Nuevas publicaciones en el muro', icon: MessageCircle },
                  { key: 'notifEvents' as const, label: 'Recordatorios de eventos', icon: CalendarDays },
                  { key: 'notifMessages' as const, label: 'Mensajes privados', icon: MessageCircle },
                  { key: 'notifAds' as const, label: 'Ofertas de empresas colaboradoras', icon: Bell },
                ]).map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.key} className="flex items-center justify-between border-b border-ink-800/50 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-crimson-500/10">
                          <Icon className="h-4 w-4 text-crimson-600" />
                        </div>
                        <span className="text-sm text-ink-200">{item.label}</span>
                      </div>
                      <Toggle
                        value={settings[item.key]}
                        onChange={(v) => setSettings({ ...settings, [item.key]: v })}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold text-ink-100">Preferencias</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between border-b border-ink-800/50 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-400/10">
                      <Globe className="h-4 w-4 text-gold-600" />
                    </div>
                    <span className="text-sm text-ink-200">Idioma</span>
                  </div>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    className="rounded-lg border border-ink-700 bg-white px-3 py-1.5 text-xs text-ink-200 focus:outline-none focus:ring-1 focus:ring-crimson-400/40"
                  >
                    <option value="Español">Español</option>
                    <option value="English">English</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-crimson-500/10">
                      <Settings className="h-4 w-4 text-crimson-600" />
                    </div>
                    <span className="text-sm text-ink-200">Modo oscuro</span>
                  </div>
                  <Toggle
                    value={settings.darkMode}
                    onChange={(v) => setSettings({ ...settings, darkMode: v })}
                  />
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold text-ink-100">Cuenta</h3>
              <div className="mt-4 space-y-2">
                <button className="flex w-full items-center gap-3 rounded-xl border border-ink-700/30 bg-ink-850/40 px-4 py-3 text-sm text-ink-300 transition-all hover:bg-ink-850 hover:text-ink-100">
                  <Lock className="h-4 w-4 text-crimson-600" />
                  Cambiar contraseña
                </button>
                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-3 rounded-xl border border-crimson-400/30 bg-crimson-500/5 px-4 py-3 text-sm text-crimson-600 transition-all hover:bg-crimson-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión{session ? ` (${session.email})` : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        {section === 'privacidad' && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold text-ink-100">Visibilidad del perfil</h3>
              <p className="mt-1 text-xs text-ink-400">Quién puede ver tu perfil en Uni verse</p>
              <div className="mt-4 space-y-2">
                {(['Público', 'Solo facultad', 'Privado']).map((option) => (
                  <button
                    key={option}
                    onClick={() => setPrivacy({ ...privacy, profileVisible: option })}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all ${
                      privacy.profileVisible === option
                        ? 'border-crimson-400/40 bg-crimson-500/10 text-crimson-600'
                        : 'border-ink-700/30 bg-ink-850/40 text-ink-300 hover:bg-ink-850'
                    }`}
                  >
                    {option}
                    {privacy.profileVisible === option && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold text-ink-100">Datos visibles</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between border-b border-ink-800/50 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-crimson-500/10">
                      <GraduationCap className="h-4 w-4 text-crimson-600" />
                    </div>
                    <span className="text-sm text-ink-200">Mostrar carrera y curso</span>
                  </div>
                  <Toggle
                    value={privacy.showFaculty}
                    onChange={(v) => setPrivacy({ ...privacy, showFaculty: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-400/10">
                      <Mail className="h-4 w-4 text-gold-600" />
                    </div>
                    <span className="text-sm text-ink-200">Mostrar correo electrónico</span>
                  </div>
                  <Toggle
                    value={privacy.showEmail}
                    onChange={(v) => setPrivacy({ ...privacy, showEmail: v })}
                  />
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold text-ink-100">Mensajes privados</h3>
              <p className="mt-1 text-xs text-ink-400">Quién puede iniciarte un chat</p>
              <div className="mt-4 space-y-2">
                {(['Todos', 'Solo mi facultad', 'Nadie']).map((option) => (
                  <button
                    key={option}
                    onClick={() => setPrivacy({ ...privacy, allowMessages: option })}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all ${
                      privacy.allowMessages === option
                        ? 'border-crimson-400/40 bg-crimson-500/10 text-crimson-600'
                        : 'border-ink-700/30 bg-ink-850/40 text-ink-300 hover:bg-ink-850'
                    }`}
                  >
                    {option}
                    {privacy.allowMessages === option && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function computeAvatar(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'TU';
  return trimmed.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'TU';
}

function TagEditor({
  icon,
  label,
  options,
  value,
  onChange,
  editing,
}: {
  icon: React.ReactNode;
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  editing: boolean;
}) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-ink-400">
        <span className="text-crimson-600">{icon}</span>
        {label}
      </p>
      {editing ? (
        <div className="flex flex-wrap gap-1.5">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => onChange(option)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all ${
                value === option
                  ? 'border-crimson-400/40 bg-crimson-500/10 text-crimson-600'
                  : 'border-ink-700/30 bg-ink-850/40 text-ink-300 hover:bg-ink-850'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full border border-ink-700/30 bg-ink-850/40 px-3 py-1.5 text-[11px] font-medium text-ink-300">
          {value}
        </span>
      )}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        value ? 'bg-crimson-500' : 'bg-ink-700'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all ${
          value ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}
