import { useState } from 'react';
import { Mail, MapPin, Send, Loader2, Check, Instagram, Twitter, Github, Linkedin, Sparkles, Users, Target, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const TEAM = [
  {
    name: 'Sergio Bazán Fernández',
    roles: ['Dirección general', 'Estrategia de negocio'],
    bio: 'Lidera el proyecto y define la hoja de ruta de Uni verse. Negocia con empresas de ocio local para traer ofertas exclusivas a la comunidad.',
    initials: 'SB',
    color: 'from-crimson-400/20 to-crimson-500/5',
  },
  {
    name: 'Sergio Fernández Montes',
    roles: ['Desarrollo frontend', 'Optimización y rendimiento'],
    bio: 'Construye la interfaz de Uni verse y se asegura de que todo funcione rápido y fluido en cualquier dispositivo.',
    initials: 'SF',
    color: 'from-sky-400/20 to-sky-500/5',
  },
  {
    name: 'Iker Castell César',
    roles: ['Desarrollo backend', 'Seguridad y base de datos'],
    bio: 'Mantiene los datos seguros y la infraestructura estable. Detrás de cada publicación y mensaje que viaja por la red.',
    initials: 'IC',
    color: 'from-gold-400/20 to-gold-500/5',
  },
  {
    name: 'Dana Jackeline García Rodríguez',
    roles: ['Diseño UX/UI', 'Identidad visual de marca'],
    bio: 'Diseña cada pantalla y cada detalle visual. La estética roja y dorada de Uni verse lleva su firma.',
    initials: 'DG',
    color: 'from-violet-400/20 to-violet-500/5',
  },
  {
    name: 'Juan Manuel Rojo Asencio',
    roles: ['Marketing y comunidad', 'Relaciones con facultades'],
    bio: 'Conecta Uni verse con delegaciones y asociaciones estudiantiles. Si tu facultad está en la app, es por él.',
    initials: 'JR',
    color: 'from-emerald-400/20 to-emerald-500/5',
  },
  {
    name: 'Cristóbal Aunión Núñez',
    roles: ['Gestión de contenidos', 'Eventos y patrocinios'],
    bio: 'Coordina los eventos universitarios y gestiona las colaboraciones con empresas de ocio de Sevilla.',
    initials: 'CA',
    color: 'from-crimson-400/20 to-gold-500/5',
  },
];

const SOCIALS = [
  { name: 'Instagram', icon: Instagram, url: '#', color: 'hover:text-crimson-600 hover:border-crimson-400/40' },
  { name: 'Twitter / X', icon: Twitter, url: '#', color: 'hover:text-sky-600 hover:border-sky-400/40' },
  { name: 'GitHub', icon: Github, url: '#', color: 'hover:text-ink-100 hover:border-ink-500/50' },
  { name: 'LinkedIn', icon: Linkedin, url: '#', color: 'hover:text-sky-600 hover:border-sky-400/40' },
];

const VALID_DOMAINS = ['@alumnos.us.es', '@alu.upo.es', '@alum.uca.es'];

export default function AboutPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email: string): boolean => {
    return VALID_DOMAINS.some((d) => email.toLowerCase().endsWith(d));
  };

  const handleSubmit = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Por favor, completa todos los campos.');
      return;
    }
    if (!validateEmail(email)) {
      setError('El correo debe ser universitario (@alumnos.us.es, @alu.upo.es o @alum.uca.es).');
      return;
    }
    setSubmitting(true);
    const { error: insertError } = await supabase
      .from('contact_submissions')
      .insert({ name: name.trim(), email: email.trim(), message: message.trim() });
    setSubmitting(false);
    if (insertError) {
      setError('No se pudo enviar el mensaje. Inténtalo de nuevo.');
      return;
    }
    setSubmitted(true);
    setName('');
    setEmail('');
    setMessage('');
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-8 lg:px-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-ink-800 bg-gradient-to-br from-white via-ink-900 to-ink-850 p-8 lg:p-12 animate-slide-up">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-crimson-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-crimson-400/30 bg-crimson-500/10 px-4 py-1.5 text-xs font-medium text-crimson-600">
            <Sparkles className="h-3.5 w-3.5" />
            Proyecto universitario · Sevilla
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink-100 lg:text-4xl">
            Uni<span className="text-gradient-uni">verse</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-400">
            La red social que conecta a toda la comunidad universitaria de Sevilla. Una plataforma hecha
            por y para estudiantes, donde las facultades de la Universidad de Sevilla y la Pablo de
            Olavide conviven en un mismo espacio digital.
          </p>
        </div>
      </section>

      {/* Sobre el proyecto */}
      <section className="animate-slide-up" style={{ animationDelay: '80ms' }}>
        <h2 className="font-display text-xl font-bold text-ink-100">Sobre el proyecto</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-crimson-500/10">
              <Target className="h-5 w-5 text-crimson-600" />
            </div>
            <h3 className="mt-4 font-semibold text-ink-100">Conectar</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-400">
              Unir a estudiantes de FCom, Reina Mercedes, Ramón y Cajal, Viapol y Cartuja en un solo
              muro de charla y opiniones.
            </p>
          </div>
          <div className="glass-card rounded-2xl p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-400/10">
              <Sparkles className="h-5 w-5 text-gold-600" />
            </div>
            <h3 className="mt-4 font-semibold text-ink-100">Facilitar</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-400">
              Hacer la vida estudiantil más sencilla: apuntes compartidos, eventos, quedadas de estudio
              y piso compartido, todo en un lugar.
            </p>
          </div>
          <div className="glass-card rounded-2xl p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-crimson-500/10">
              <Users className="h-5 w-5 text-crimson-600" />
            </div>
            <h3 className="mt-4 font-semibold text-ink-100">Colaborar</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-400">
              Fomentar proyectos colaborativos entre facultades. Que un periodista y un ingeniero
              puedan encontrarse y crear algo juntos.
            </p>
          </div>
        </div>
      </section>

      {/* Equipo */}
      <section className="animate-slide-up" style={{ animationDelay: '120ms' }}>
        <h2 className="font-display text-xl font-bold text-ink-100">Equipo / Quiénes Somos</h2>
        <p className="mt-2 text-sm text-ink-400">
          Seis estudiantes de Sevilla con una idea: que la universidad no acabe en las aulas.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((member) => (
            <div key={member.name} className="glass-card group rounded-2xl p-6 text-center transition-all hover:border-crimson-400/30">
              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${member.color} border border-ink-700/30`}>
                <span className="font-display text-lg font-bold text-crimson-600">{member.initials}</span>
              </div>
              <h3 className="mt-4 font-semibold text-ink-100">{member.name}</h3>
              <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
                {member.roles.map((r) => (
                  <span key={r} className="rounded-full bg-crimson-500/10 px-2.5 py-0.5 text-[10px] font-medium text-crimson-600">
                    {r}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-400">{member.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contacto */}
      <section className="animate-slide-up" style={{ animationDelay: '160ms' }}>
        <h2 className="font-display text-xl font-bold text-ink-100">Contacto</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-5">
          {/* Form */}
          <div className="glass-card rounded-2xl p-6 lg:col-span-3">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-8 text-center animate-bounce-in">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10">
                  <Check className="h-7 w-7 text-emerald-400" />
                </div>
                <h3 className="mt-4 font-semibold text-ink-100">¡Mensaje enviado!</h3>
                <p className="mt-1 text-sm text-ink-400">Te responderemos en breve. Gracias por escribir.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-300">Nombre</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="¿Cómo te llamas?"
                    className="w-full rounded-xl bg-ink-850/50 border border-ink-700/30 px-4 py-3 text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-crimson-400/40"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-300">Correo universitario</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@alumnos.us.es"
                    className="w-full rounded-xl bg-ink-850/50 border border-ink-700/30 px-4 py-3 text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-crimson-400/40"
                  />
                  <p className="mt-1 text-[11px] text-ink-500">
                    Acepta @alumnos.us.es · @alu.upo.es · @alum.uca.es
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-300">Mensaje</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Cuéntanos tu idea, duda o sugerencia..."
                    rows={4}
                    className="w-full resize-none rounded-xl bg-ink-850/50 border border-ink-700/30 px-4 py-3 text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-crimson-400/40"
                  />
                </div>
                {error && (
                  <p className="text-xs text-crimson-600">{error}</p>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:opacity-40"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar mensaje
                </button>
              </div>
            )}
          </div>

          {/* Info + socials */}
          <div className="space-y-4 lg:col-span-2">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold text-ink-100">Encuéntranos en Sevilla</h3>
              <div className="mt-3 space-y-3 text-sm text-ink-400">
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-crimson-600" />
                  <span>Av. de la Ciudad Jardín, 41005 Sevilla<br />(Campus FCom)</span>
                </p>
                <p className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-crimson-600" />
                  <span>hola@universe.sevilla</span>
                </p>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold text-ink-100">Síguenos</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {SOCIALS.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.url}
                      className={`flex items-center gap-2 rounded-xl border border-ink-700/40 bg-ink-850/40 px-4 py-3 text-sm text-ink-400 transition-all ${social.color}`}
                    >
                      <Icon className="h-4 w-4" />
                      {social.name}
                    </a>
                  );
                })}
              </div>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-crimson-600" />
                <p className="text-xs text-ink-400">
                  Hecho con cariño por estudiantes de la Universidad de Sevilla y la UPO.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
