import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Clock, MapPin, Check, Loader2, Users, PartyPopper, Mic, Dumbbell, BookOpen, Plus, X, ImagePlus, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/storage';
import { useSession } from '@/lib/session';
import type { UniEvent } from '@/types';

const CATEGORIES = ['Todos', 'Fiesta', 'Charla', 'Deportes', 'Estudio', 'Cultura'];

const CATEGORY_ICONS: Record<string, typeof CalendarDays> = {
  Fiesta: PartyPopper,
  Charla: Mic,
  Deportes: Dumbbell,
  Estudio: BookOpen,
  Cultura: Mic,
};

const CATEGORY_COLORS: Record<string, string> = {
  Fiesta: 'from-gold-400/20 to-gold-500/5 text-gold-700',
  Charla: 'from-sky-400/20 to-sky-500/5 text-sky-600',
  Deportes: 'from-emerald-400/20 to-emerald-500/5 text-emerald-600',
  Estudio: 'from-violet-400/20 to-violet-500/5 text-violet-600',
  Cultura: 'from-crimson-400/20 to-crimson-500/5 text-crimson-600',
};

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatDate(dateStr: string): { day: string; month: string; weekday: string } {
  const d = new Date(dateStr + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS_ES[d.getMonth()];
  const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return { day, month, weekday: weekdays[d.getDay()] };
}

const inputClass =
  'w-full rounded-xl border border-ink-700/30 bg-ink-850/50 px-4 py-3 text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none focus:border-crimson-400/40';
const labelClass = 'mb-1.5 block text-xs font-medium text-ink-300';

export default function EventsPage() {
  const { session, isCreator } = useSession();
  const myEmail = session?.email ?? '';

  const [events, setEvents] = useState<UniEvent[]>([]);
  const [attendingIds, setAttendingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('Todos');

  const [showCreate, setShowCreate] = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [evLocation, setEvLocation] = useState('');
  const [evDate, setEvDate] = useState('');
  const [evTime, setEvTime] = useState('');
  const [evImageFile, setEvImageFile] = useState<File | null>(null);
  const [evImagePreview, setEvImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<UniEvent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<UniEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: true });
    if (error) {
      console.error('Error fetching events:', error);
    } else if (data) {
      setEvents(data as UniEvent[]);
    }
    setLoading(false);
  }, []);

  const fetchAttendance = useCallback(async () => {
    if (!myEmail) return;
    const { data } = await supabase
      .from('event_attendees')
      .select('event_id')
      .eq('user_email', myEmail);
    if (data) {
      setAttendingIds(new Set(data.map((r) => r.event_id)));
    }
  }, [myEmail]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleToggleAttend = async (event: UniEvent) => {
    if (!myEmail) return;
    const isAttending = attendingIds.has(event.id);
    if (isAttending) {
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', event.id)
        .eq('user_email', myEmail);
      if (error) return;
      const newCount = Math.max(0, event.attendee_count - 1);
      await supabase.from('events').update({ attendee_count: newCount }).eq('id', event.id);
      setAttendingIds((prev) => {
        const next = new Set(prev);
        next.delete(event.id);
        return next;
      });
      setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, attendee_count: newCount } : e)));
    } else {
      const { error } = await supabase
        .from('event_attendees')
        .insert({ event_id: event.id, user_email: myEmail });
      if (error) return;
      const newCount = event.attendee_count + 1;
      await supabase.from('events').update({ attendee_count: newCount }).eq('id', event.id);
      setAttendingIds((prev) => new Set(prev).add(event.id));
      setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, attendee_count: newCount } : e)));
    }
  };

  const handleImageChange = (file: File | null) => {
    setEvImageFile(file);
    setEvImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleEditImageChange = (file: File | null) => {
    setEditImageFile(file);
    setEditImagePreview(file ? URL.createObjectURL(file) : (editingEvent?.image_url ?? null));
  };

  const openEditEvent = (event: UniEvent) => {
    setEditingEvent(event);
    setEditTitle(event.title);
    setEditLocation(event.location);
    setEditDate(event.event_date);
    setEditTime(event.event_time);
    setEditImageFile(null);
    setEditImagePreview(event.image_url ?? null);
    setEditError(null);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !editTitle.trim() || !editLocation.trim() || !editDate || !editTime || editSaving) return;
    setEditSaving(true);
    setEditError(null);
    let imageUrl = editingEvent.image_url ?? null;
    if (editImageFile) {
      const uploaded = await uploadImage(editImageFile, 'events');
      if (!uploaded) {
        setEditError('No se pudo subir la imagen. Inténtalo de nuevo.');
        setEditSaving(false);
        return;
      }
      imageUrl = uploaded;
    }
    const { error } = await supabase
      .from('events')
      .update({
        title: editTitle.trim(),
        location: editLocation.trim(),
        event_date: editDate,
        event_time: editTime,
        image_url: imageUrl,
      })
      .eq('id', editingEvent.id);
    setEditSaving(false);
    if (error) {
      setEditError('No se pudo guardar el evento. Inténtalo de nuevo.');
      return;
    }
    setEvents((prev) =>
      prev.map((e) =>
        e.id === editingEvent.id
          ? { ...e, title: editTitle.trim(), location: editLocation.trim(), event_date: editDate, event_time: editTime, image_url: imageUrl }
          : e,
      ),
    );
    setEditingEvent(null);
  };

  const handleDeleteEvent = async () => {
    if (!deletingEvent || deleting) return;
    setDeleting(true);
    const { error } = await supabase.from('events').delete().eq('id', deletingEvent.id);
    setDeleting(false);
    if (error) return;
    setEvents((prev) => prev.filter((e) => e.id !== deletingEvent.id));
    setDeletingEvent(null);
  };

  const handleCreateEvent = async () => {
    if (!evTitle.trim() || !evLocation.trim() || !evDate || !evTime || creating) return;
    setCreating(true);
    setCreateError(null);
    let imageUrl: string | null = null;
    if (evImageFile) {
      imageUrl = await uploadImage(evImageFile, 'events');
      if (!imageUrl) {
        setCreateError('No se pudo subir la imagen. Inténtalo de nuevo.');
        setCreating(false);
        return;
      }
    }
    const { data, error } = await supabase
      .from('events')
      .insert({
        title: evTitle.trim(),
        description: evTitle.trim(),
        event_date: evDate,
        event_time: evTime,
        location: evLocation.trim(),
        category: 'Cultura',
        attendee_count: 0,
        is_attending: false,
        image_url: imageUrl,
        creator_email: myEmail || null,
      })
      .select('id');
    setCreating(false);
    if (error || !data || data.length === 0) {
      setCreateError('No se pudo publicar el evento. Inténtalo de nuevo.');
      return;
    }
    setShowCreate(false);
    setEvTitle(''); setEvLocation(''); setEvDate(''); setEvTime('');
    setEvImageFile(null); setEvImagePreview(null);
    fetchEvents();
  };

  const filtered = category === 'Todos' ? events : events.filter((e) => e.category === category);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 lg:px-8">
      {isCreator && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500"
          >
            <Plus className="h-4 w-4" />
            Crear evento
          </button>
        </div>
      )}

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

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-crimson-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-700 py-12 text-center">
          <p className="text-sm text-ink-400">
            {events.length === 0
              ? 'No hay eventos publicados todavía. ¡Pronto anunciaremos nuevos planes universitarios!'
              : 'No hay eventos de esta categoría.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((event, idx) => {
            const CatIcon = CATEGORY_ICONS[event.category] || CalendarDays;
            const catColor = CATEGORY_COLORS[event.category] || 'from-ink-600/20 to-ink-700/5 text-ink-300';
            const { day, month, weekday } = formatDate(event.event_date);
            const isAttending = attendingIds.has(event.id);
            return (
              <div
                key={event.id}
                className="glass-card group overflow-hidden rounded-2xl transition-all hover:border-crimson-400/30 animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {event.image_url && (
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="h-40 w-full object-cover"
                  />
                )}
                <div className="flex gap-4 p-5">
                  {/* Date block */}
                  <div className="flex shrink-0 flex-col items-center justify-center">
                    <div className="flex h-16 w-16 flex-col items-center justify-center rounded-xl border border-ink-700/30 bg-gradient-to-br from-crimson-500/10 to-gold-500/5">
                      <span className="font-display text-2xl font-bold text-crimson-600">{day}</span>
                      <span className="text-[10px] font-medium uppercase text-ink-400">{month}</span>
                    </div>
                    <span className="mt-1 text-[10px] text-ink-400">{weekday}</span>
                  </div>

                  {/* Event content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${catColor}`}>
                        <CatIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-base font-bold text-ink-100">{event.title}</h3>
                        <span className="text-[10px] font-medium uppercase tracking-wide text-crimson-500/80">{event.category}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-crimson-500/70" />
                        {event.event_time}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-crimson-500/70" />
                        {event.location}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-crimson-500/70" />
                        {event.attendee_count} asistentes
                      </span>
                    </div>

                    <div className="mt-4 border-t border-ink-800/50 pt-3">
                      {isCreator ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditEvent(event)}
                            className="flex items-center gap-2 rounded-lg border border-ink-700/40 bg-white/60 px-4 py-2 text-xs font-semibold text-ink-200 transition-all hover:bg-ink-850 hover:text-ink-100"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Modificar
                          </button>
                          <button
                            onClick={() => setDeletingEvent(event)}
                            className="flex items-center gap-2 rounded-lg border border-crimson-500/30 bg-crimson-500/5 px-4 py-2 text-xs font-semibold text-crimson-600 transition-all hover:bg-crimson-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleToggleAttend(event)}
                          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                            isAttending
                              ? 'bg-emerald-400/10 text-emerald-600 border border-emerald-400/30 hover:bg-emerald-400/20'
                              : 'bg-crimson-500 text-white shadow-lg shadow-crimson-500/20 hover:bg-crimson-400'
                          }`}
                        >
                          {isAttending ? (
                            <>
                              <Check className="h-3.5 w-3.5" /> Ya estoy apuntado
                            </>
                          ) : (
                            <>
                              <CalendarDays className="h-3.5 w-3.5" /> Apuntarme
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create event modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative max-h-[85vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl scrollbar-thin">
            <button
              onClick={() => setShowCreate(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-200"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-display text-lg font-bold text-ink-100">Crear evento</h3>
            <p className="mt-1 text-sm text-ink-400">
              El evento será visible al instante para toda la comunidad.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className={labelClass}>Nombre del evento</label>
                <input className={inputClass} value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Ej. Torneo de fútbol sala" />
              </div>
              <div>
                <label className={labelClass}>Lugar</label>
                <input className={inputClass} value={evLocation} onChange={(e) => setEvLocation(e.target.value)} placeholder="Ej. Facultad de Comunicación, Reina Mercedes, Alameda..." />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Fecha</label>
                  <input type="date" className={inputClass} value={evDate} onChange={(e) => setEvDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Hora</label>
                  <input type="time" className={inputClass} value={evTime} onChange={(e) => setEvTime(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Imagen del evento</label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-ink-700/40 bg-ink-850/40 px-4 py-3 transition-colors hover:border-crimson-400/40">
                  <ImagePlus className="h-4 w-4 shrink-0 text-crimson-600" />
                  <span className="text-xs text-ink-400">
                    {evImageFile ? evImageFile.name : 'Sube una imagen desde tu dispositivo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                  />
                </label>
                {evImagePreview && (
                  <img src={evImagePreview} alt="Vista previa" className="mt-3 h-32 w-full rounded-xl object-cover" />
                )}
              </div>

              {createError && (
                <p className="flex items-start gap-1.5 text-xs text-crimson-600">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {createError}
                </p>
              )}

              <button
                onClick={handleCreateEvent}
                disabled={!evTitle.trim() || !evLocation.trim() || !evDate || !evTime || creating}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Publicar evento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit event modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setEditingEvent(null)} />
          <div className="relative max-h-[85vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl scrollbar-thin">
            <button
              onClick={() => setEditingEvent(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-200"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-display text-lg font-bold text-ink-100">Modificar evento</h3>
            <p className="mt-1 text-sm text-ink-400">
              Los cambios se aplicarán al instante para toda la comunidad.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className={labelClass}>Nombre del evento</label>
                <input className={inputClass} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Lugar</label>
                <input className={inputClass} value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Fecha</label>
                  <input type="date" className={inputClass} value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Hora</label>
                  <input type="time" className={inputClass} value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Imagen del evento</label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-ink-700/40 bg-ink-850/40 px-4 py-3 transition-colors hover:border-crimson-400/40">
                  <ImagePlus className="h-4 w-4 shrink-0 text-crimson-600" />
                  <span className="text-xs text-ink-400">
                    {editImageFile ? editImageFile.name : editImagePreview ? 'Mantener imagen actual o subir una nueva' : 'Sube una imagen desde tu dispositivo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleEditImageChange(e.target.files?.[0] ?? null)}
                  />
                </label>
                {editImagePreview && (
                  <img src={editImagePreview} alt="Vista previa" className="mt-3 h-32 w-full rounded-xl object-cover" />
                )}
              </div>

              {editError && (
                <p className="flex items-start gap-1.5 text-xs text-crimson-600">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {editError}
                </p>
              )}

              <button
                onClick={handleUpdateEvent}
                disabled={!editTitle.trim() || !editLocation.trim() || !editDate || !editTime || editSaving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => !deleting && setDeletingEvent(null)} />
          <div className="relative w-full max-w-sm animate-slide-up rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-ink-100">Eliminar evento</h3>
            <p className="mt-2 text-sm text-ink-400">¿Seguro que quieres eliminar este evento?</p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setDeletingEvent(null)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-ink-700/40 bg-white/60 px-4 py-2.5 text-sm font-semibold text-ink-200 transition-all hover:bg-ink-850 hover:text-ink-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={deleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-crimson-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:bg-crimson-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
