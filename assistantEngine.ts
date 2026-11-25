import type { AssistantMode } from '@/types';
import type { UserProfile } from '@/lib/session';

export interface AcademicInfo {
  enrollment_type: string | null;
  enrolled_credits: number | null;
  mec_status: string | null;
  other_scholarships: string | null;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export const CHIPS: Record<AssistantMode, string[]> = {
  academic: [
    'Resumir y estructurar apuntes',
    'Organizar mi horario de estudio',
    'Preparar plan para exámenes',
  ],
  official: [
    '¿Qué requisitos necesito para mantener mi Beca MEC?',
    'Dudas sobre mi matrícula y créditos',
    'Becas disponibles para mi carrera y curso',
  ],
  support: [
    '¿Cómo chatear con otro estudiante?',
    '¿Cómo crear o unirme a un grupo?',
    '¿Cómo apuntarme a un evento?',
  ],
};

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function matchAny(query: string, keywords: string[]): boolean {
  const q = normalize(query);
  return keywords.some((kw) => q.includes(normalize(kw)));
}

function firstName(profile: UserProfile | null): string {
  return profile?.fullName.split(' ')[0] ?? '';
}

// ---------------------------------------------------------------------------
// Hybrid engine: external API if a key exists, smart local fallback otherwise
// ---------------------------------------------------------------------------

function hasOpenAIKey(): boolean {
  return Boolean(import.meta.env.VITE_OPENAI_API_KEY);
}

function hasGeminiKey(): boolean {
  return Boolean(import.meta.env.VITE_GEMINI_API_KEY);
}

export function isApiConfigured(): boolean {
  return hasOpenAIKey() || hasGeminiKey();
}

function systemPrompt(mode: AssistantMode, profile: UserProfile | null, info: AcademicInfo | null): string {
  const personal = profile
    ? `Datos del estudiante: nombre ${profile.fullName}, correo ${profile.email}, carrera ${profile.degree}, curso ${profile.course}, grupo ${profile.classGroup}.`
    : 'El estudiante aún no ha completado su perfil.';

  const academic = info
    ? `Datos de matrícula: tipo ${info.enrollment_type ?? 'no indicado'}, créditos ${info.enrolled_credits ?? 'no indicados'}, Beca MEC ${info.mec_status ?? 'no indicada'}, otras becas ${info.other_scholarships ?? 'ninguna indicada'}.`
    : 'El estudiante no ha rellenado sus datos de matrícula y beca.';

  if (mode === 'academic') {
    return `Eres el tutor académico de Uni verse, la red social de la Universidad de Sevilla. Hablas en español, de forma cercana, sencilla y práctica.
${personal}
Tu función:
1. Ayuda con apuntes: si el usuario pega apuntes o pide ayuda con un tema, devuelve un resumen claro en puntos clave, los conceptos principales explicados de forma sencilla y 3 preguntas rápidas de autoevaluación.
2. Organización del estudio: si indica exámenes/entregas, fechas u horas libres, genera un plan de estudio personalizado en bloques de 45-50 minutos con descansos, priorizando asignaturas más próximas y adaptado a su curso. Si faltan datos, hazle 2 preguntas breves antes de dar el plan.
Formatea con párrafos cortos, listas con viñetas y **negritas**.`;
  }

  if (mode === 'official') {
    return `Eres el orientador administrativo de Uni verse, especializado en trámites de la Universidad de Sevilla (US) y becas universitarias. Hablas en español, con rigor y claridad.
${personal}
${academic}
Tu función: requisitos académicos y económicos de la Beca MEC (porcentaje de créditos a aprobar según rama: Artes y Humanidades 50%, Ciencias Sociales y Jurídicas 50%, Ingeniería y Arquitectura 50% curso completo o 40% tiempo parcial, Ciencias 50% con nota media 5.5 en Ciencias de la Salud 6.5 según convocatoria), bonificación del 99% de créditos aprobados de la Junta de Andalucía en segundas matrículas, plazos y normas de matrícula, ampliación, modificación o anulación en la US, e indicar siempre qué pasos realizar en Secretaría Virtual (SEVIUS) cuando necesite resguardos oficiales.
Formatea con párrafos cortos, listas con viñetas y **negritas**.`;
  }

  return `Eres el asistente de soporte de Uni verse, la red social de la Universidad de Sevilla. Hablas en español, de forma directa, amable y MUY concisa: máximo 2-4 líneas o pasos numerados.
${personal}
Conocimiento de la app: registro solo con correo institucional (@alum.us.es / @us.es) y código de verificación de 8 dígitos; para chatear, Explorar -> filtrar compañeros -> botón "Chatear" en su tarjeta; grupos: sección Grupos -> "Unirse" o "Crear grupo"; eventos: sección Eventos -> "Apuntarme" (el contador de asistentes se actualiza solo); notificaciones en la campana superior; perfil "Tú" con estadísticas en tiempo real (Publicaciones, Me gusta dados, Grupos activos, Eventos confirmados); contacto con el equipo en la sección "Quiénes somos".`;
}

async function callOpenAI(
  mode: AssistantMode,
  history: ChatTurn[],
  profile: UserProfile | null,
  info: AcademicInfo | null,
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt(mode, profile, info) },
        ...history.slice(-10),
      ],
      temperature: 0.7,
    }),
  });
  if (!response.ok) throw new Error('api');
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('api');
  return content.trim();
}

async function callGemini(
  mode: AssistantMode,
  history: ChatTurn[],
  profile: UserProfile | null,
  info: AcademicInfo | null,
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt(mode, profile, info) }] },
        contents: history.slice(-10).map((turn) => ({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.content }],
        })),
      }),
    },
  );
  if (!response.ok) throw new Error('api');
  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof content !== 'string' || !content.trim()) throw new Error('api');
  return content.trim();
}

export async function generateReply(
  mode: AssistantMode,
  history: ChatTurn[],
  profile: UserProfile | null,
  info: AcademicInfo | null,
): Promise<string> {
  if (isApiConfigured()) {
    try {
      if (hasOpenAIKey()) {
        return await callOpenAI(mode, history, profile, info);
      }
      return await callGemini(mode, history, profile, info);
    } catch {
      // fall through to the local engine — never surface API errors
    }
  }
  return localReply(mode, history, profile, info);
}

// ---------------------------------------------------------------------------
// Local conversational engine (works with zero external dependencies)
// ---------------------------------------------------------------------------

export function localReply(
  mode: AssistantMode,
  history: ChatTurn[],
  profile: UserProfile | null,
  info: AcademicInfo | null,
): string {
  const lastUser = [...history].reverse().find((t) => t.role === 'user');
  const q = lastUser?.content ?? '';

  if (mode === 'academic') return academicReply(q, history, profile);
  if (mode === 'official') return officialReply(q, profile, info);
  return supportReply(q);
}

// --- Academic ---------------------------------------------------------------

function academicReply(q: string, history: ChatTurn[], profile: UserProfile | null): string {
  const name = firstName(profile);
  const longText = q.length > 240 || q.includes('\n\n') || matchAny(q, ['resumir', 'resume', 'apuntes', 'temario', 'explicame', 'explícame', 'explica', 'no entiendo']);

  if (matchAny(q, ['horario', 'plan de estudio', 'organizar', 'organiza', 'examen', 'examenes', 'exámenes', 'entrega', 'preparar']) && !longText) {
    return studyPlanReply(q, history, profile);
  }

  if (longText) {
    const pastedNotes = q.length > 400 && !matchAny(q, ['resumir', 'resume', 'apuntes']);
    if (pastedNotes) {
      return summarizeNotes(q);
    }
    // Asked to summarize a topic or pasted shorter notes
    const topic = q.replace(/.*?(resumir|resume|explicame|explícame|explica|ayuda con|no entiendo)\s*/i, '').trim() || 'este tema';
    if (q.length < 300) {
      return `¡Claro, ${name}! Para darte un buen resumen de **${topic}** necesito el material. Pega aquí tus apuntes, diapositivas o el temario (pueden ser varias líneas) y te devolveré:

• Un **resumen claro** en puntos clave
• Los **conceptos principales** explicados de forma sencilla
• **3 preguntas de autoevaluación** para repasar

También dime de qué asignatura se trata y adapto el nivel a **${profile?.degree ?? 'tu carrera'}**.`;
    }
    return summarizeNotes(q);
  }

  return `¡Hola${name ? ` ${name}` : ''}! Soy tu tutor académico de Uni verse. Puedo ayudarte de dos formas:

• **Entender apuntes:** pega un fragmento de apuntes, un temario o pídeme ayuda con un tema de tu carrera y te daré un resumen, los conceptos clave y preguntas de autoevaluación.
• **Organizar tu estudio:** dime qué exámenes o entregas tienes y cuántas horas libres tienes al día, y te preparo un plan de estudio por bloques.

¿Por dónde empezamos?`;
}

function summarizeNotes(text: string): string {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+|;\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const stopWords = new Set(['de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'en', 'que', 'con', 'por', 'para', 'del', 'al', 'es', 'se', 'su', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'fue', 'este', 'esta', 'entre', 'cuando', 'muy', 'sobre', 'también', 'hasta', 'hay', 'desde', 'puede', 'pueden']);

  const freq = new Map<string, number>();
  normalize(text).match(/[a-z]{5,}/g)?.forEach((w) => {
    if (!stopWords.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  });
  const keywords = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);

  const keySentences = [...sentences]
    .sort((a, b) => {
      const scoreA = keywords.reduce((acc, kw) => acc + (normalize(a).includes(kw) ? 1 : 0), 0);
      const scoreB = keywords.reduce((acc, kw) => acc + (normalize(b).includes(kw) ? 1 : 0), 0);
      return scoreB - scoreA;
    })
    .slice(0, 5);

  const titleCase = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

  const lines: string[] = [];
  lines.push('**Resumen de tus apuntes:**\n');
  if (keySentences.length > 0) {
    keySentences.forEach((s) => lines.push(`• ${s}`));
  } else {
    lines.push('• He recibido tu texto, pero es muy breve. Pega un fragmento más extenso para un resumen más completo.');
  }
  lines.push('\n**Conceptos principales:**');
  if (keywords.length > 0) {
    keywords.slice(0, 4).forEach((kw) => lines.push(`• **${titleCase(kw)}:** concepto recurrente en tus apuntes; repasa su definición y cómo se relaciona con el resto del tema.`));
  } else {
    lines.push('• No se identificaron conceptos dominantes; prueba a pegar un temario más extenso.');
  }
  lines.push('\n**3 preguntas de autoevaluación:**');
  const kws = keywords.slice(0, 3);
  if (kws.length === 3) {
    lines.push(`1. ¿Cómo definirías **${kws[0]}** con tus propias palabras?`);
    lines.push(`2. ¿Qué relación existe entre **${kws[0]}** y **${kws[1]}**?`);
    lines.push(`3. Pon un ejemplo práctico donde se aplique **${kws[kws.length - 1]}**.`);
  } else {
    lines.push('1. ¿Cuál es la idea principal del texto?');
    lines.push('2. ¿Cómo la resumirías en una frase?');
    lines.push('3. ¿Qué ejemplo práctico la ilustra?');
  }
  return lines.join('\n');
}

function studyPlanReply(q: string, history: ChatTurn[], profile: UserProfile | null): string {
  const convo = history.map((t) => normalize(t.content)).join(' ');

  const daysMatch = q.match(/(\d+)\s*(hora|horas|h)\b/);
  const hours = daysMatch ? parseInt(daysMatch[1], 10) : null;

  const examKeywords = ['examen', 'examenes', 'exámenes', 'entrega', 'final', 'parcial'];
  const mentionsExam = examKeywords.some((k) => q.includes(k) || convo.includes(k));
  const mentionsDate = /\d{1,2}[\/\-]\d{1,2}|\b(lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)\b|proxima|próxima|próximo|semana/.test(normalize(q));

  // Ask for missing data (max 2 brief questions) once
  if ((hours === null || !mentionsExam) && !matchAny(convo, ['sesion', 'sesión', 'bloque', 'plan listo', 'perfecto'])) {
    const questions: string[] = [];
    if (hours === null) questions.push('¿**Cuántas horas libres** tienes al día para estudiar?');
    if (!mentionsExam || !mentionsDate) questions.push('¿Qué **exámenes o entregas** tienes y **para qué fecha**?');
    if (questions.length > 0) {
      return `¡Perfecto,${firstName(profile) ? ` ${firstName(profile)}` : ''}! Para montarte un plan a tu medida necesito 2 cosas:

1. ${questions[0]}
2. ${questions[1] ?? '¿Hay alguna asignatura que quieras **priorizar**?'}

Con eso te preparo un horario por bloques de **45-50 minutos** con descansos, priorizando lo más próximo.`;
    }
  }

  const blocks = hours === null ? 4 : Math.max(1, Math.min(8, hours));
  const subject = profile?.degree ?? 'tu carrera';
  const lines: string[] = [];
  lines.push(`Aquí tienes tu **plan de estudio** adaptado a ${subject}:\n`);
  lines.push('**Estructura de cada bloque:** 45-50 min de estudio concentrado + 10 min de descanso.');
  lines.push('\n**Distribución diaria:**');
  for (let i = 1; i <= blocks; i++) {
    const start = 9 + (i - 1) * 1;
    lines.push(`• **Bloque ${i}** (${String(start).padStart(2, '0')}:00-${String(start).padStart(2, '0')}:50): asignatura prioritaria ${i % 2 === 1 ? '(revisión activa y resúmenes)' : '(ejercicios y repaso)'}`);
  }
  lines.push('\n**Reglas de oro:**');
  lines.push('• Prioriza las asignaturas con **examen más próximo** en los primeros bloques del día.');
  lines.push('• Repaso activo: al terminar cada bloque, escribe **3 preguntas** sobre lo estudiado.');
  lines.push('• La noche previa al examen, solo **repaso ligero**, nada de temas nuevos.');
  return lines.join('\n');
}

// --- Official ----------------------------------------------------------------

function officialReply(q: string, profile: UserProfile | null, info: AcademicInfo | null): string {
  const name = firstName(profile);
  const rama = getRama(profile?.degree ?? '');
  const credits = info?.enrolled_credits ?? null;
  const mec = info?.mec_status ?? null;

  if (matchAny(q, ['mec', 'beca general', 'mantener', 'perder', 'requisitos'])) {
    const pct = rama === 'Ingeniería y Arquitectura' ? '50% (curso completo) o 40% (tiempo parcial)' : '50%';
    return `**Requisitos para mantener tu Beca MEC** (según tu rama, **${rama}**):

• Aprobar al menos el **${pct}** de los créditos matriculados.
• No superar el número de créditos de duración del plan (menos en casos justificados).
• Mantener la **nota media** exigida según la convocatoria (en ramas de Ciencias y Salud suele pedirse algo más).
• Declarar la **renta familiar** dentro de los umbrales de la convocatoria.${mec ? `\n\nTu estado actual: **${mec}**.` : ''}${credits ? `\nTienes matriculados **${credits} ECTS**, por lo que deberías aprobar unos **${Math.ceil(credits * 0.5)} ECTS**.` : ''}

Si aún no la has solicitado, hazlo en la **Sede Electrónica del Ministerio** antes del cierre de la convocatoria. Puedes registrar tus datos en la tarjeta **"Mis datos de matrícula y beca"** de arriba para que te asesore mejor.`;
  }

  if (matchAny(q, ['junta', 'andalucia', 'andalucía', 'bonificacion', 'bonificación', '99', 'segunda matricula', 'segunda matrícula'])) {
    return `**Bonificación de la Junta de Andalucía (99% en segundas matrículas):**

• La Junta de Andalucía bonifica el **99% del precio de los créditos** matriculados por segunda vez (y siguientes) en tu misma titulación.
• Se aplica **automáticamente** en la liquidación de matrícula si estás matriculado en una universidad andaluza (como la **US**).
• No requiere solicitud separada: basta con estar matriculado de créditos repetidos.
• La bonificación no cubre la **primera matrícula** ni tasas administrativas.`;
  }

  if (matchAny(q, ['matricula', 'matrícula', 'ampliacion', 'ampliación', 'modificacion', 'modificación', 'anulacion', 'anulación', 'creditos', 'créditos', 'sevius', 'resguardo'])) {
    return `**Matrícula y trámites en la Universidad de Sevilla:**

• **Ampliación de matrícula:** solo se puede durante los **15 días hábiles** siguientes al cierre del plazo ordinario (octubre, o febrero-marzo en cuatrimestres).
• **Modificación o anulación:** se realiza dentro de los plazos oficiales publicados en el calendario académico; la anulación total tiene plazos y efectos distintos a la parcial.
• Todos los trámites se hacen en **SEVIUS** (Secretaría Virtual): entra con tu identificador y contraseña, sección *Matrícula*.
• Para descargar tu **resguardo oficial**: SEVIUS → *Trámites* → *Justificante de matrícula* → descargar PDF.${credits ? `\n\nAhora mismo tienes registrados **${credits} ECTS** (matrícula tipo: **${info?.enrollment_type ?? 'no indicada'}**).` : ''}`;
  }

  if (matchAny(q, ['becas disponibles', 'que becas', 'qué becas', 'otras becas', 'erasmus', 'propia', 'colabora'])) {
    return `**Becas y ayudas para ${profile?.degree ?? 'tu carrera'} (${profile?.course ?? 'tu curso'}):**

• **Beca MEC** (general del Ministerio): según renta y rendimiento académico.
• **Bonificación Junta de Andalucía:** 99% en créditos de segunda matrícula y siguientes.
• **Beca propia de la US:** matrícula y colaboraciones para estudiantes matriculados a tiempo completo.
• **Erasmus+ y movilidad:** ayudas de movilidad internacional según nota media del expediente.
• **Becas de colaboradores:** biblioteca, deporte, actividades culturales.

Si me dices tu situación (por ejemplo, tu estado de Beca MEC: **${mec ?? 'indícalo en la tarjeta de arriba'}**) te oriento sobre la siguiente mejor opción.`;
  }

  return `¡Hola${name ? ` ${name}` : ''}! Soy tu orientador administrativo de Uni verse para la **Universidad de Sevilla**. Puedo ayudarte con:

• **Beca MEC:** requisitos académicos y económicos para solicitarla o mantenerla según tu rama (**${rama}**).
• **Bonificación Junta de Andalucía:** 99% en segundas matrículas.
• **Matrícula:** plazos de ampliación, modificación y anulación, y trámites en **SEVIUS**.

Cuéntame tu duda concreta, o revisa la tarjeta **"Mis datos de matrícula y beca"** para personalizar mejor la ayuda.`;
}

function getRama(degree: string): string {
  const d = normalize(degree);
  if (matchAny(d, ['ingenier', 'informatic', 'industrial', 'telecomunic', 'arquitect', 'informatica'])) return 'Ingeniería y Arquitectura';
  if (matchAny(d, ['medicina', 'enfermer', 'fisioterap', 'odontolog', 'farmacia', 'psicolog', 'biolog', 'quimic', 'fisica', 'matematic', 'bioquimic', 'geolog'])) return 'Ciencias / Ciencias de la Salud';
  if (matchAny(d, ['derecho', 'ade', 'empresariales', 'economia', 'sociolog', 'trabajo social', 'comunicacion', 'periodismo', 'publicidad', 'audiovisual', 'educacion', 'educación', 'primaria', 'infantil', 'social'])) return 'Ciencias Sociales y Jurídicas';
  if (matchAny(d, ['bellas', 'arte', 'filosof', 'historia', 'lengua', 'filolog', 'ingles', 'ingleses', 'traduccion', 'humanidad'])) return 'Artes y Humanidades';
  return 'Ciencias Sociales y Jurídicas';
}

// --- Support ------------------------------------------------------------------

function supportReply(q: string): string {
  if (matchAny(q, ['chatear', 'chat', 'mensaje', 'hablar', 'conversacion', 'conversación', 'escribir a', 'contactar a'])) {
    return `Para chatear con otro estudiante:

1. Ve a **Explorar** y filtra por carrera, curso o intereses.
2. Entra en su tarjeta y pulsa **"Chatear"**.
3. La conversación se abre en tiempo real en la sección **Mensajes**.`;
  }

  if (matchAny(q, ['grupo', 'comunidad', 'unirme', 'crear'])) {
    return `Para unirte o crear un grupo:

1. Abre la sección **Grupos** en el menú.
2. Para unirte: pulsa **"Unirse"** en la tarjeta del grupo.
3. Para crear uno nuevo: pulsa **"Crear grupo"**, ponle nombre, categoría y descripción, y quedarás unido automáticamente.`;
  }

  if (matchAny(q, ['evento', 'apuntarme', 'asistencia', 'asistir', 'cancelar', 'inscripcion', 'inscripción'])) {
    return `Para apuntarte a un evento:

1. Abre la sección **Eventos** y elige uno de la agenda.
2. Pulsa **"Apuntarme"** — el contador de asistentes se actualiza solo.
3. Si ya estás apuntado, el mismo botón sirve para **cancelar la asistencia**.`;
  }

  if (matchAny(q, ['notificacion', 'notificación', 'campana', 'campana', 'oferta', 'avisos', 'locales'])) {
    return `Las notificaciones y ofertas de locales colaboradores llegan a la **campana** de la barra superior. Pulsa el icono para ver los avisos pendientes y las novedades de la comunidad.`;
  }

  if (matchAny(q, ['estadistica', 'estadísticas', 'contador', 'publicaciones', 'me gusta', 'perfil', 'tu ', 'editar perfil'])) {
    return `Tu sección **"Tú"** (Mi Perfil) muestra tus estadísticas en tiempo real: **Publicaciones**, **Me gusta dados**, **Grupos activos** y **Eventos confirmados**. Para editar tus datos, pulsa **"Editar perfil"** en la misma pantalla y guarda los cambios.`;
  }

  if (matchAny(q, ['cuenta', 'registro', 'registrarme', 'acceso', 'entrar', 'correo', 'codigo', 'código', 'verificacion', 'verificación', 'contraseña'])) {
    return `El acceso es solo con **correo institucional** (@alum.us.es / @us.es): introduces tu correo, recibes un **código de verificación de 8 dígitos** y ya estás dentro. Si no te llega el código, revisa spam o inténtalo de nuevo.`;
  }

  if (matchAny(q, ['equipo', 'contacto', 'quienes somos', 'quiénes somos', 'gestiona', 'quien gestiona', 'quién gestiona', 'reportar', 'bug', 'error'])) {
    return `Uni verse lo gestiona un equipo de seis estudiantes de Sevilla; puedes ver a cada uno y su función en la sección **"Quiénes somos"**. Desde ahí también puedes enviar un mensaje directo al equipo con el formulario de contacto.`;
  }

  return `¡Hola! Soy el soporte de **Uni verse**. Puedo ayudarte con: acceso y cuenta, **chats privados**, **grupos**, **eventos**, **notificaciones** y tu **perfil** con sus estadísticas. ¿Cuál es tu duda?`;
}
