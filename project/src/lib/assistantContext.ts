import { supabase } from '@/lib/supabase';
import { fetchDiscoverUsers, type DiscoverUser } from '@/lib/discoverUsers';
import type { UserProfile } from '@/lib/session';
import type { UniEvent, Group, Chat } from '@/types';

export interface AppContext {
  profile: UserProfile | null;
  users: DiscoverUser[];
  events: UniEvent[];
  groups: Group[];
  chats: Chat[];
}

export interface AssistantAction {
  label: string;
  tab: 'inicio' | 'grupos' | 'eventos' | 'chats' | 'explorar' | 'perfil';
}

export interface ContextualReply {
  content: string;
  actions: AssistantAction[];
}

export async function fetchAppContext(profile: UserProfile | null): Promise<AppContext> {
  const [eventsRes, groupsRes, chatsRes, users] = await Promise.all([
    supabase.from('events').select('*').order('event_date', { ascending: true }),
    supabase.from('groups').select('*').order('member_count', { ascending: false }),
    supabase.from('chats').select('*'),
    fetchDiscoverUsers(profile?.email),
  ]);

  return {
    profile,
    users,
    events: (eventsRes.data as UniEvent[]) ?? [],
    groups: (groupsRes.data as Group[]) ?? [],
    chats: (chatsRes.data as Chat[]) ?? [],
  };
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function matchAny(query: string, keywords: string[]): boolean {
  const q = normalize(query);
  return keywords.some((kw) => q.includes(normalize(kw)));
}

export function generateContextualResponse(userQuery: string, ctx: AppContext): ContextualReply {
  const q = userQuery.trim();
  const profile = ctx.profile;

  if (!profile) {
    return {
      content:
        'Aún no tienes un perfil configurado. Completa la configuración inicial para que pueda darte recomendaciones personalizadas sobre eventos, compañeros y comunidades.',
      actions: [{ label: 'Ir a Mi Perfil', tab: 'perfil' }],
    };
  }

  // --- Conectar / gente / afinidad ---
  if (matchAny(q, ['conectar', 'gente', 'alguien', 'companero', 'compañero', 'mi carrera', 'mi facultad', 'con quien', 'con quién', 'afinidad', 'amigo'])) {
    return matchPeople(profile, ctx.users);
  }

  // --- Eventos / planes ---
  if (matchAny(q, ['evento', 'plan', 'hacer hoy', 'esta semana', 'agenda', 'que hacer', 'qué hacer', 'fiesta', 'charla', 'actividad'])) {
    return matchEvents(profile, ctx.events);
  }

  // --- Grupos / comunidades ---
  if (matchAny(q, ['grupo', 'comunidad', 'unirme', 'unirme', 'asociacion', 'asociación', 'club'])) {
    return matchGroups(profile, ctx.groups);
  }

  // --- Chats / mensajes ---
  if (matchAny(q, ['mensaje', 'chat', 'sin leer', 'pendiente', 'notificacion', 'notificación', 'actividad', 'novedad'])) {
    return matchChats(ctx.chats);
  }

  // --- Perfil / ajustes / navegación ---
  if (matchAny(q, ['perfil', 'editar', 'cambiar', 'ajustes', 'configurar', 'notificacion', 'notificación', 'privacidad', 'cerrar sesion', 'cerrar sesión', 'cerrar sesión', 'como', 'cómo', 'ayuda', 'navegar'])) {
    return matchSettings(profile);
  }

  // --- Fallback ---
  return {
    content: `¡Hola ${profile.fullName.split(' ')[0]}! Soy tu asistente de Uni verse y puedo ayudarte con varias cosas sobre tu vida universitaria:

• **Conectar con gente** de tu carrera, curso o intereses similares
• **Eventos y planes** próximos en tu campus o facultad
• **Comunidades y grupos** a los que unirte o que encajen contigo
• **Mensajes y actividad** reciente en tus chats
• **Ajustes y navegación** de la app

¿Qué te gustaría saber?`,
    actions: [
      { label: 'Gente de mi carrera', tab: 'explorar' },
      { label: 'Próximos eventos', tab: 'eventos' },
      { label: 'Comunidades', tab: 'grupos' },
    ],
  };
}

function matchPeople(profile: UserProfile, users: DiscoverUser[]): ContextualReply {
  if (users.length === 0) {
    return {
      content:
        'Aún no hay otros estudiantes registrados en la plataforma además de ti. ¡Comparte Uni verse con tus compañeros de facultad para empezar a conectar! Cuando más gente se registre, podré recomendarte gente de tu carrera, curso o intereses.',
      actions: [{ label: 'Explorar estudiantes', tab: 'explorar' }],
    };
  }

  const sameDegree = users.filter((u) => u.degree === profile.degree);
  const sameCourse = users.filter((u) => u.course === profile.course && u.degree !== profile.degree);
  const samePlan = users.filter(
    (u) => u.planTag === profile.planTag || u.groupTag === profile.groupTag,
  );

  const lines: string[] = [];

  if (sameDegree.length > 0) {
    lines.push(`**Gente de tu carrera (${profile.degree}):**`);
    sameDegree.slice(0, 4).forEach((u) => {
      lines.push(`• **${u.name}** — ${u.course}, ${u.classGroup}. ${u.faculty}. Plan ideal: ${u.planTag}.`);
    });
  }

  if (sameCourse.length > 0) {
    lines.push(`\n**Mismo curso (${profile.course}) pero otra carrera:**`);
    sameCourse.slice(0, 3).forEach((u) => {
      lines.push(`• **${u.name}** — ${u.degree}. ${u.faculty}.`);
    });
  }

  if (samePlan.length > 0) {
    lines.push(`\n**Afinidad por intereses (plan o personalidad en común):**`);
    samePlan.slice(0, 3).forEach((u) => {
      const shared = [];
      if (u.planTag === profile.planTag) shared.push('mismo plan ideal');
      if (u.groupTag === profile.groupTag) shared.push('misma personalidad en grupo');
      lines.push(`• **${u.name}** — ${u.degree}, ${u.course}. Coincide: ${shared.join(', ')}.`);
    });
  }

  if (lines.length === 0) {
    lines.push(
      `No encontré estudiantes con coincidencias exactas, pero puedes explorar la lista completa en la sección Explorar y filtrar por carrera, curso, grupo o personalidad.`,
    );
  }

  return {
    content: lines.join('\n'),
    actions: [{ label: 'Ver en Explorar', tab: 'explorar' }],
  };
}

function matchEvents(profile: UserProfile, events: UniEvent[]): ContextualReply {
  if (events.length === 0) {
    return {
      content: 'No hay eventos próximos cargados en este momento. Vuelve a revisar la sección de Eventos más tarde.',
      actions: [{ label: 'Ir a Eventos', tab: 'eventos' }],
    };
  }

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.event_date + 'T00:00:00') >= now);
  const sorted = upcoming.length > 0 ? upcoming : events;
  const top = sorted.slice(0, 4);

  const lines: string[] = ['Estos son los próximos eventos en la Universidad de Sevilla:\n'];
  top.forEach((e) => {
    lines.push(
      `• **${e.title}** — ${formatDateShort(e.event_date)} a las ${e.event_time}. ${e.location}. ${e.attendee_count} asistentes. Categoría: ${e.category}.`,
    );
  });

  const facultyKeywords = profile.degree.toLowerCase();
  const matching = sorted.filter(
    (e) =>
      normalize(e.location + ' ' + e.title + ' ' + e.description).includes(
        normalize(facultyKeywords.split(' ')[0]),
      ) || e.is_attending,
  );

  if (matching.length > 0) {
    lines.push(
      `\nEn función de tu perfil (${profile.degree}, ${profile.classGroup}), este evento podría encajar contigo:`,
    );
    lines.push(`• **${matching[0].title}** — ${matching[0].location}, ${formatDateShort(matching[0].event_date)} a las ${matching[0].event_time}.`);
  }

  return {
    content: lines.join('\n'),
    actions: [{ label: 'Ver todos los eventos', tab: 'eventos' }],
  };
}

function matchGroups(profile: UserProfile, groups: Group[]): ContextualReply {
  const joined = groups.filter((g) => g.is_joined);
  const notJoined = groups.filter((g) => !g.is_joined);

  const lines: string[] = [];

  if (joined.length > 0) {
    lines.push('**Comunidades a las que ya perteneces:**');
    joined.forEach((g) => {
      lines.push(`• **${g.name}** — ${g.member_count} miembros. ${g.faculty}. Categoría: ${g.category}.`);
    });
  }

  const recommended = notJoined
    .filter((g) => {
      const text = normalize(g.name + ' ' + g.description + ' ' + g.category);
      const degreeMatch = normalize(profile.degree).split(' ').some((word) => word.length > 4 && text.includes(word));
      const interestMatch =
        (profile.planTag.includes('Deporte') && g.category === 'Deportes') ||
        (profile.planTag.includes('cultural') && g.category === 'Aficiones') ||
        (profile.planTag.includes('biblioteca') && g.category === 'Académico');
      return degreeMatch || interestMatch;
    })
    .slice(0, 3);

  if (recommended.length > 0) {
    lines.push('\n**Te recomiendo estas comunidades según tu perfil:**');
    recommended.forEach((g) => {
      lines.push(`• **${g.name}** — ${g.member_count} miembros. ${g.description.slice(0, 80)}...`);
    });
  }

  if (lines.length === 0) {
    lines.push(
      'Aún no te has unido a ninguna comunidad. Explora los grupos disponibles y únete a los que encajen con tus intereses.',
    );
  }

  return {
    content: lines.join('\n'),
    actions: [{ label: 'Explorar comunidades', tab: 'grupos' }],
  };
}

function matchChats(chats: Chat[]): ContextualReply {
  if (chats.length === 0) {
    return {
      content:
        'No tienes conversaciones activas todavía. Cuando inicies un chat privado con otro estudiante o te unas a una comunidad, tus mensajes aparecerán aquí. Mientras tanto, puedes explorar estudiantes o comunidades para empezar a conectar.',
      actions: [
        { label: 'Explorar estudiantes', tab: 'explorar' },
        { label: 'Ver comunidades', tab: 'grupos' },
      ],
    };
  }

  const privateChats = chats.filter((c) => (c.chat_type ?? 'private') === 'private');
  const groupChats = chats.filter((c) => c.chat_type === 'group');
  const totalUnread = chats.reduce((sum, c) => sum + (c.unread || 0), 0);

  const lines: string[] = [];

  if (totalUnread > 0) {
    lines.push(`Tienes **${totalUnread} mensajes sin leer** en total.\n`);
  } else {
    lines.push('No tienes mensajes sin leer. Todo al día.\n');
  }

  const unreadPrivate = privateChats.filter((c) => c.unread > 0);
  if (unreadPrivate.length > 0) {
    lines.push('**Chats privados con actividad:**');
    unreadPrivate.slice(0, 3).forEach((c) => {
      lines.push(`• **${c.contact_name}** — ${c.last_message} (${c.last_time}). ${c.unread} sin leer.`);
    });
  }

  const unreadGroup = groupChats.filter((c) => c.unread > 0);
  if (unreadGroup.length > 0) {
    lines.push('\n**Grupos con actividad:**');
    unreadGroup.slice(0, 3).forEach((c) => {
      lines.push(`• **${c.contact_name}** — ${c.last_message} (${c.last_time}). ${c.unread} sin leer.`);
    });
  }

  if (unreadPrivate.length === 0 && unreadGroup.length === 0) {
    const recent = chats.slice(0, 3);
    lines.push('**Conversaciones recientes:**');
    recent.forEach((c) => {
      lines.push(`• **${c.contact_name}** — ${c.last_message} (${c.last_time}).`);
    });
  }

  return {
    content: lines.join('\n'),
    actions: [{ label: 'Abrir Chats', tab: 'chats' }],
  };
}

function matchSettings(profile: UserProfile): ContextualReply {
  return {
    content: `Puedes gestionar tu cuenta desde la sección **Mi Perfil**. Aquí tienes un resumen de lo que puedes hacer:

**Tus datos actuales:**
• Nombre: ${profile.fullName}
• Carrera: ${profile.degree}
• Curso: ${profile.course}
• Grupo: ${profile.classGroup}
• Plan ideal: ${profile.planTag}
• Personalidad: ${profile.groupTag}
• Objetivo: ${profile.goalTag}

**Qué puedes cambiar:**
1. Ve a **Mi Perfil** → pestaña "Mis datos" para editar tu nombre, carrera, curso, grupo y etiquetas de personalidad.
2. En la pestaña **Ajustes** puedes configurar notificaciones (muro, eventos, mensajes, ofertas), idioma y modo oscuro.
3. En **Privacidad** decides quién ve tu perfil y quién puede escribirte.
4. Para **cerrar sesión**, usa el botón al final de la sección Cuenta en Ajustes.

¿Necesitas ayuda con algo concreto?`,
    actions: [{ label: 'Ir a Mi Perfil', tab: 'perfil' }],
  };
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function getDynamicChips(profile: UserProfile | null): string[] {
  if (!profile) {
    return [
      '¿Qué puedo hacer aquí?',
      '¿Qué eventos hay próximos?',
      '¿Qué comunidades existen?',
      '¿Cómo configuro mi perfil?',
    ];
  }
  return [
    '¿Con quién puedo conectar de mi carrera?',
    '¿Qué eventos encajan conmigo?',
    'Recomiéndame una comunidad',
    '¿Tengo mensajes sin leer?',
  ];
}
