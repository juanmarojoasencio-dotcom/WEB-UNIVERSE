import { useState, useCallback, useEffect } from 'react';
import {
  CalendarPlus, BellPlus, Megaphone, Trash2, Pencil, Loader2, CheckCircle2, AlertCircle, ImagePlus, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/storage';
import type { UniEvent } from '@/types';

interface Ad {
  id: string;
  brand: string;
  title: string;
  description: string;
  discount: string | null;
  image_url: string | null;
  link: string | null;
  created_at: string;
}

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  link: string | null;
  brand: string | null;
  image_url: string | null;
  created_at: string;
}

const EVENT_CATEGORIES = ['Fiesta', 'Charla', 'Deportes', 'Estudio', 'Cultura'];

type Section = 'eventos' | 'notificaciones' | 'anuncios';

const inputClass =
  'w-full rounded-xl border border-ink-700/30 bg-ink-850/50 px-4 py-3 text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none focus:border-crimson-400/40';
const labelClass = 'mb-1.5 block text-xs font-medium text-ink-300';

export default function CreatorPanelPage() {
  const [section, setSection] = useState<Section>('eventos');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Events form
  const [evTitle, setEvTitle] = useState('');
  const [evDescription, setEvDescription] = useState('');
  const [evDate, setEvDate] = useState('');
  const [evTime, setEvTime] = useState('');
  const [evLocation, setEvLocation] = useState('');
  const [evCategory, setEvCategory] = useState(EVENT_CATEGORIES[0]);
  const [evImageUrl, setEvImageUrl] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);

  // Notifications form
  const [notifBrand, setNotifBrand] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifImageFile, setNotifImageFile] = useState<File | null>(null);
  const [notifImagePreview, setNotifImagePreview] = useState<string | null>(null);
  const [sendingNotif, setSendingNotif] = useState(false);

  // Ads form
  const [adBrand, setAdBrand] = useState('');
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adDiscount, setAdDiscount] = useState('');
  const [adImageUrl, setAdImageUrl] = useState('');
  const [adLink, setAdLink] = useState('');
  const [savingAd, setSavingAd] = useState(false);

  const [ads, setAds] = useState<Ad[]>([]);
  const [notifs, setNotifs] = useState<NotificationRow[]>([]);
  const [events, setEvents] = useState<UniEvent[]>([]);

  // Edit notification modal
  const [editingNotif, setEditingNotif] = useState<NotificationRow | null>(null);
  const [editNotifBrand, setEditNotifBrand] = useState('');
  const [editNotifMessage, setEditNotifMessage] = useState('');
  const [editNotifImageFile, setEditNotifImageFile] = useState<File | null>(null);
  const [editNotifImagePreview, setEditNotifImagePreview] = useState<string | null>(null);
  const [savingNotif, setSavingNotif] = useState(false);

  // Edit ad modal
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [editAdBrand, setEditAdBrand] = useState('');
  const [editAdTitle, setEditAdTitle] = useState('');
  const [editAdDescription, setEditAdDescription] = useState('');
  const [editAdDiscount, setEditAdDiscount] = useState('');
  const [editAdImageUrl, setEditAdImageUrl] = useState('');
  const [editAdLink, setEditAdLink] = useState('');
  const [savingAdEdit, setSavingAdEdit] = useState(false);

  const loadLists = useCallback(async () => {
    const [adsRes, notifsRes, eventsRes] = await Promise.all([
      supabase.from('ads').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('event_date', { ascending: true }),
    ]);
    if (adsRes.data) setAds(adsRes.data as Ad[]);
    if (notifsRes.data) setNotifs(notifsRes.data as NotificationRow[]);
    if (eventsRes.data) setEvents(eventsRes.data as UniEvent[]);
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const showFeedback = (kind: 'ok' | 'error', text: string) => {
    setFeedback({ kind, text });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handlePublishEvent = async () => {
    if (!evTitle.trim() || !evDescription.trim() || !evDate || !evTime || !evLocation.trim() || savingEvent) return;
    setSavingEvent(true);
    const { error } = await supabase.from('events').insert({
      title: evTitle.trim(),
      description: evDescription.trim(),
      event_date: evDate,
      event_time: evTime,
      location: evLocation.trim(),
      category: evCategory,
      attendee_count: 0,
      is_attending: false,
    });
    setSavingEvent(false);
    if (error) {
      showFeedback('error', 'No se pudo publicar el evento. Inténtalo de nuevo.');
      return;
    }
    setEvTitle(''); setEvDescription(''); setEvDate(''); setEvTime(''); setEvLocation(''); setEvImageUrl('');
    showFeedback('ok', 'Evento publicado. Ya visible para todos los estudiantes.');
    loadLists();
  };

  const handleDeleteEvent = async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      showFeedback('ok', 'Evento eliminado.');
    } else {
      showFeedback('error', 'No se pudo eliminar el evento.');
    }
  };

  const handleSendNotification = async () => {
    if (!notifBrand.trim() || !notifMessage.trim() || sendingNotif) return;
    setSendingNotif(true);
    let imageUrl: string | null = null;
    if (notifImageFile) {
      imageUrl = await uploadImage(notifImageFile, 'notifications');
      if (!imageUrl) {
        setSendingNotif(false);
        showFeedback('error', 'No se pudo subir la imagen. Inténtalo de nuevo.');
        return;
      }
    }
    const { error } = await supabase.from('notifications').insert({
      brand: notifBrand.trim(),
      title: notifBrand.trim(),
      message: notifMessage.trim(),
      image_url: imageUrl,
    });
    setSendingNotif(false);
    if (error) {
      showFeedback('error', 'No se pudo enviar la notificación. Inténtalo de nuevo.');
      return;
    }
    setNotifBrand(''); setNotifMessage('');
    setNotifImageFile(null); setNotifImagePreview(null);
    showFeedback('ok', 'Notificación enviada. Los estudiantes la verán al instante.');
    loadLists();
  };

  const handleDeleteNotification = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (!error) {
      setNotifs((prev) => prev.filter((n) => n.id !== id));
      showFeedback('ok', 'Notificación eliminada.');
    } else {
      showFeedback('error', 'No se pudo eliminar la notificación.');
    }
  };

  const openEditNotification = (n: NotificationRow) => {
    setEditingNotif(n);
    setEditNotifBrand(n.brand ?? '');
    setEditNotifMessage(n.message);
    setEditNotifImageFile(null);
    setEditNotifImagePreview(n.image_url ?? null);
  };

  const handleUpdateNotification = async () => {
    if (!editingNotif || !editNotifBrand.trim() || !editNotifMessage.trim() || savingNotif) return;
    setSavingNotif(true);
    let imageUrl = editingNotif.image_url ?? null;
    if (editNotifImageFile) {
      const uploaded = await uploadImage(editNotifImageFile, 'notifications');
      if (!uploaded) {
        setSavingNotif(false);
        showFeedback('error', 'No se pudo subir la imagen. Inténtalo de nuevo.');
        return;
      }
      imageUrl = uploaded;
    }
    const { error } = await supabase
      .from('notifications')
      .update({
        brand: editNotifBrand.trim(),
        title: editNotifBrand.trim(),
        message: editNotifMessage.trim(),
        image_url: imageUrl,
      })
      .eq('id', editingNotif.id);
    setSavingNotif(false);
    if (error) {
      showFeedback('error', 'No se pudo actualizar la notificación.');
      return;
    }
    setNotifs((prev) =>
      prev.map((n) =>
        n.id === editingNotif.id
          ? { ...n, brand: editNotifBrand.trim(), title: editNotifBrand.trim(), message: editNotifMessage.trim(), image_url: imageUrl }
          : n,
      ),
    );
    setEditingNotif(null);
    showFeedback('ok', 'Notificación actualizada. Los estudiantes verán los cambios al instante.');
  };

  const handlePublishAd = async () => {
    if (!adBrand.trim() || !adTitle.trim() || !adDescription.trim() || savingAd) return;
    setSavingAd(true);
    const { error } = await supabase.from('ads').insert({
      brand: adBrand.trim(),
      title: adTitle.trim(),
      description: adDescription.trim(),
      discount: adDiscount.trim() || null,
      image_url: adImageUrl.trim() || null,
      link: adLink.trim() || null,
    });
    setSavingAd(false);
    if (error) {
      showFeedback('error', 'No se pudo publicar el anuncio. Inténtalo de nuevo.');
      return;
    }
    setAdBrand(''); setAdTitle(''); setAdDescription(''); setAdDiscount(''); setAdImageUrl(''); setAdLink('');
    showFeedback('ok', 'Anuncio publicado en el espacio de ofertas.');
    loadLists();
  };

  const handleDeleteAd = async (id: string) => {
    const { error } = await supabase.from('ads').delete().eq('id', id);
    if (!error) {
      setAds((prev) => prev.filter((a) => a.id !== id));
      showFeedback('ok', 'Anuncio eliminado.');
    } else {
      showFeedback('error', 'No se pudo eliminar el anuncio.');
    }
  };

  const openEditAd = (a: Ad) => {
    setEditingAd(a);
    setEditAdBrand(a.brand);
    setEditAdTitle(a.title);
    setEditAdDescription(a.description);
    setEditAdDiscount(a.discount ?? '');
    setEditAdImageUrl(a.image_url ?? '');
    setEditAdLink(a.link ?? '');
  };

  const handleUpdateAd = async () => {
    if (!editingAd || !editAdBrand.trim() || !editAdTitle.trim() || !editAdDescription.trim() || savingAdEdit) return;
    setSavingAdEdit(true);
    const { error } = await supabase
      .from('ads')
      .update({
        brand: editAdBrand.trim(),
        title: editAdTitle.trim(),
        description: editAdDescription.trim(),
        discount: editAdDiscount.trim() || null,
        image_url: editAdImageUrl.trim() || null,
        link: editAdLink.trim() || null,
      })
      .eq('id', editingAd.id);
    setSavingAdEdit(false);
    if (error) {
      showFeedback('error', 'No se pudo actualizar el anuncio.');
      return;
    }
    setAds((prev) =>
      prev.map((a) =>
        a.id === editingAd.id
          ? {
              ...a,
              brand: editAdBrand.trim(),
              title: editAdTitle.trim(),
              description: editAdDescription.trim(),
              discount: editAdDiscount.trim() || null,
              image_url: editAdImageUrl.trim() || null,
              link: editAdLink.trim() || null,
            }
          : a,
      ),
    );
    setEditingAd(null);
    showFeedback('ok', 'Anuncio actualizado. Visible al instante para toda la comunidad.');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 lg:px-8">
      <div className="glass-card rounded-2xl p-5">
        <h1 className="font-display text-xl font-bold text-ink-100">Panel de Creador</h1>
        <p className="mt-1 text-sm text-ink-400">
          Publica y gestiona el contenido oficial de Uni verse para toda la comunidad.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { key: 'eventos', label: 'Eventos', icon: CalendarPlus },
              { key: 'notificaciones', label: 'Notificaciones', icon: BellPlus },
              { key: 'anuncios', label: 'Publicidad / Colaboradores', icon: Megaphone },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                section === key
                  ? 'bg-crimson-500 text-white shadow-lg shadow-crimson-500/20'
                  : 'bg-white/60 text-ink-400 border border-ink-700/40 hover:bg-ink-850 hover:text-ink-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            feedback.kind === 'ok'
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-600'
              : 'border-crimson-500/30 bg-crimson-500/10 text-crimson-600'
          }`}
        >
          {feedback.kind === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {feedback.text}
        </div>
      )}

      {section === 'eventos' && (
        <>
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h2 className="font-display text-sm font-bold text-ink-100">Publicar nuevo evento</h2>
            <div>
              <label className={labelClass}>Título</label>
              <input className={inputClass} value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Ej. Torneo de fútbol sala interfacultades" />
            </div>
            <div>
              <label className={labelClass}>Descripción</label>
              <textarea className={`${inputClass} min-h-[80px] resize-y`} value={evDescription} onChange={(e) => setEvDescription(e.target.value)} placeholder="Detalles del evento, entrada, precios..." />
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
              <label className={labelClass}>Ubicación / Campus</label>
              <input className={inputClass} value={evLocation} onChange={(e) => setEvLocation(e.target.value)} placeholder="Ej. Reina Mercedes, Sevilla" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Categoría</label>
                <select className={inputClass} value={evCategory} onChange={(e) => setEvCategory(e.target.value)}>
                  {EVENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Imagen o enlace (opcional)</label>
                <input className={inputClass} value={evImageUrl} onChange={(e) => setEvImageUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <button
              onClick={handlePublishEvent}
              disabled={!evTitle.trim() || !evDescription.trim() || !evDate || !evTime || !evLocation.trim() || savingEvent}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {savingEvent ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
              Publicar evento
            </button>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h2 className="font-display text-sm font-bold text-ink-100">
              Eventos publicados ({events.length})
            </h2>
            {events.length === 0 ? (
              <p className="mt-3 text-sm text-ink-400">Todavía no hay eventos publicados.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {events.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-xl border border-ink-700/30 bg-ink-850/40 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-100">{e.title}</p>
                      <p className="text-xs text-ink-400">{e.event_date} · {e.event_time} · {e.location}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(e.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-crimson-500/10 hover:text-crimson-600"
                      aria-label={`Eliminar evento ${e.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {section === 'notificaciones' && (
        <>
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h2 className="font-display text-sm font-bold text-ink-100">Nueva notificación</h2>
            <div>
              <label className={labelClass}>Nombre del local / colaborador</label>
              <input className={inputClass} value={notifBrand} onChange={(e) => setNotifBrand(e.target.value)} placeholder="Ej. Cafetería La Scala" />
            </div>
            <div>
              <label className={labelClass}>Texto pequeño ({notifMessage.length}/140)</label>
              <textarea
                className={`${inputClass} min-h-[60px] resize-y`}
                value={notifMessage}
                maxLength={140}
                onChange={(e) => setNotifMessage(e.target.value)}
                placeholder="Mensaje breve de la oferta o aviso..."
              />
            </div>
            <div>
              <label className={labelClass}>Imagen pequeña</label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-ink-700/40 bg-ink-850/40 px-4 py-3 transition-colors hover:border-crimson-400/40">
                <ImagePlus className="h-4 w-4 shrink-0 text-crimson-600" />
                <span className="text-xs text-ink-400">
                  {notifImageFile ? notifImageFile.name : 'Sube una imagen desde tu dispositivo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setNotifImageFile(file);
                    setNotifImagePreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
              </label>
              {notifImagePreview && (
                <img src={notifImagePreview} alt="Vista previa" className="mt-3 h-20 w-20 rounded-xl object-cover" />
              )}
            </div>
            <button
              onClick={handleSendNotification}
              disabled={!notifBrand.trim() || !notifMessage.trim() || sendingNotif}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sendingNotif ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellPlus className="h-4 w-4" />}
              Enviar notificación
            </button>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h2 className="font-display text-sm font-bold text-ink-100">
              Notificaciones enviadas ({notifs.length})
            </h2>
            {notifs.length === 0 ? (
              <p className="mt-3 text-sm text-ink-400">Todavía no has enviado notificaciones.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {notifs.map((n) => (
                  <li key={n.id} className="flex items-center gap-3 rounded-xl border border-ink-700/30 bg-ink-850/40 px-4 py-3">
                    {n.image_url && (
                      <img src={n.image_url} alt={n.brand ?? n.title} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-100">{n.brand ?? n.title}</p>
                      <p className="truncate text-xs text-ink-400">{n.message}</p>
                    </div>
                    <button
                      onClick={() => openEditNotification(n)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-700/40 hover:text-ink-100"
                      aria-label={`Modificar notificación ${n.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteNotification(n.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-crimson-500/10 hover:text-crimson-600"
                      aria-label={`Eliminar notificación ${n.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {section === 'anuncios' && (
        <>
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h2 className="font-display text-sm font-bold text-ink-100">Publicar anuncio de colaborador</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Marca / Local</label>
                <input className={inputClass} value={adBrand} onChange={(e) => setAdBrand(e.target.value)} placeholder="Ej. Cafetería La Scala" />
              </div>
              <div>
                <label className={labelClass}>Título de la oferta</label>
                <input className={inputClass} value={adTitle} onChange={(e) => setAdTitle(e.target.value)} placeholder="Ej. 2x1 en cafés con leche" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Descripción</label>
              <textarea className={`${inputClass} min-h-[80px] resize-y`} value={adDescription} onChange={(e) => setAdDescription(e.target.value)} placeholder="Detalles de la oferta, condiciones..." />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Código / Descuento</label>
                <input className={inputClass} value={adDiscount} onChange={(e) => setAdDiscount(e.target.value)} placeholder="Ej. -20%" />
              </div>
              <div>
                <label className={labelClass}>Banner / Imagen</label>
                <input className={inputClass} value={adImageUrl} onChange={(e) => setAdImageUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className={labelClass}>Enlace (opcional)</label>
                <input className={inputClass} value={adLink} onChange={(e) => setAdLink(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <button
              onClick={handlePublishAd}
              disabled={!adBrand.trim() || !adTitle.trim() || !adDescription.trim() || savingAd}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {savingAd ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
              Publicar anuncio
            </button>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h2 className="font-display text-sm font-bold text-ink-100">
              Anuncios publicados ({ads.length})
            </h2>
            {ads.length === 0 ? (
              <p className="mt-3 text-sm text-ink-400">Todavía no hay anuncios publicados.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {ads.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-xl border border-ink-700/30 bg-ink-850/40 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-100">{a.brand}</p>
                      <p className="truncate text-xs text-ink-400">{a.title}{a.discount ? ` · ${a.discount}` : ''}</p>
                    </div>
                    <button
                      onClick={() => openEditAd(a)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-700/40 hover:text-ink-100"
                      aria-label={`Modificar anuncio ${a.brand}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAd(a.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-crimson-500/10 hover:text-crimson-600"
                      aria-label={`Eliminar anuncio ${a.brand}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Edit notification modal */}
      {editingNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setEditingNotif(null)} />
          <div className="relative max-h-[85vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl scrollbar-thin">
            <button
              onClick={() => setEditingNotif(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-200"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-display text-lg font-bold text-ink-100">Modificar notificación</h3>
            <p className="mt-1 text-sm text-ink-400">
              Los cambios se reflejarán al instante en la campana de los estudiantes.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className={labelClass}>Nombre del local / colaborador</label>
                <input className={inputClass} value={editNotifBrand} onChange={(e) => setEditNotifBrand(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Texto pequeño ({editNotifMessage.length}/140)</label>
                <textarea
                  className={`${inputClass} min-h-[60px] resize-y`}
                  value={editNotifMessage}
                  maxLength={140}
                  onChange={(e) => setEditNotifMessage(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Imagen pequeña</label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-ink-700/40 bg-ink-850/40 px-4 py-3 transition-colors hover:border-crimson-400/40">
                  <ImagePlus className="h-4 w-4 shrink-0 text-crimson-600" />
                  <span className="text-xs text-ink-400">
                    {editNotifImageFile ? editNotifImageFile.name : editNotifImagePreview ? 'Mantener imagen actual o subir una nueva' : 'Sube una imagen desde tu dispositivo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setEditNotifImageFile(file);
                      setEditNotifImagePreview(file ? URL.createObjectURL(file) : (editingNotif.image_url ?? null));
                    }}
                  />
                </label>
                {editNotifImagePreview && (
                  <img src={editNotifImagePreview} alt="Vista previa" className="mt-3 h-20 w-20 rounded-xl object-cover" />
                )}
              </div>
              <button
                onClick={handleUpdateNotification}
                disabled={!editNotifBrand.trim() || !editNotifMessage.trim() || savingNotif}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {savingNotif ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit ad modal */}
      {editingAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setEditingAd(null)} />
          <div className="relative max-h-[85vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl scrollbar-thin">
            <button
              onClick={() => setEditingAd(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-200"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-display text-lg font-bold text-ink-100">Modificar anuncio</h3>
            <p className="mt-1 text-sm text-ink-400">
              Los cambios se aplicarán al instante en el espacio de ofertas.
            </p>

            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Marca / Local</label>
                  <input className={inputClass} value={editAdBrand} onChange={(e) => setEditAdBrand(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Título de la oferta</label>
                  <input className={inputClass} value={editAdTitle} onChange={(e) => setEditAdTitle(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Descripción</label>
                <textarea className={`${inputClass} min-h-[80px] resize-y`} value={editAdDescription} onChange={(e) => setEditAdDescription(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>Código / Descuento</label>
                  <input className={inputClass} value={editAdDiscount} onChange={(e) => setEditAdDiscount(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Banner / Imagen</label>
                  <input className={inputClass} value={editAdImageUrl} onChange={(e) => setEditAdImageUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <label className={labelClass}>Enlace (opcional)</label>
                  <input className={inputClass} value={editAdLink} onChange={(e) => setEditAdLink(e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <button
                onClick={handleUpdateAd}
                disabled={!editAdBrand.trim() || !editAdTitle.trim() || !editAdDescription.trim() || savingAdEdit}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {savingAdEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
