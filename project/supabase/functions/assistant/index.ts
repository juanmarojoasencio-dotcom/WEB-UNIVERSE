import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MODES = ["academic", "official", "support"] as const;
type Mode = (typeof MODES)[number];

const SYSTEM_PROMPTS: Record<Mode, string> = {
  academic:
    "Eres el asistente académico de Uni verse, la red social de estudiantes de la Universidad de Sevilla. " +
    "Ayudas con técnicas de estudio, organización del tiempo, preparación de exámenes, elección de asignaturas " +
    "y dudas generales de la vida universitaria. Responde en español, de forma clara y breve. " +
    "No inventes fechas, tasas, notas de corte ni requisitos concretos: si la pregunta depende de normativa " +
    "específica, indica que el estudiante debe confirmarlo en su facultad o en la web oficial de la US (https://www.us.es).",
  official:
    "Eres el asistente de información oficial de Uni verse para estudiantes de la Universidad de Sevilla. " +
    "Orientas sobre trámites, matrícula, becas, calendario y normativa general. Responde en español. " +
    "No tienes acceso en tiempo real a los documentos oficiales, así que no inventes plazos, importes ni " +
    "procedimientos: indica siempre que la información puede cambiar y remite al estudiante a la fuente oficial " +
    "(https://www.us.es) o a la secretaría de su centro.",
  support:
    "Eres el asistente de soporte de la aplicación Uni verse. Ayudas a los estudiantes a resolver problemas " +
    "con las secciones Inicio, Grupos, Eventos, Chats y Perfil. Pide los pasos que hizo y qué error vio, " +
    "ofrece soluciones sencillas (recargar la página, revisar la conexión, cerrar sesión y volver a entrar) " +
    "y responde en español. Confirma que el problema ha quedado registrado para el equipo.",
};

const HISTORY_LIMIT = 50;
const CONTEXT_LIMIT = 12;
const MAX_MESSAGE_LENGTH = 1000;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const isValidMode = (value: unknown): value is Mode =>
  typeof value === "string" && (MODES as readonly string[]).includes(value);

const isValidSession = (value: unknown): value is string =>
  typeof value === "string" && value.length >= 8 && value.length <= 100;

async function requestCompletion(mode: Mode, history: { role: string; content: string }[]) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY no configurada");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM_PROMPTS[mode] }, ...history],
      temperature: 0.4,
      max_tokens: 600,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI respondió con ${response.status}`);

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) throw new Error("Respuesta vacía de OpenAI");
  return reply.trim();
}

async function handleHistory(sessionId: string, mode: Mode) {
  const { data, error } = await supabase
    .from("assistant_messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .eq("mode", mode)
    .order("created_at", { ascending: true })
    .limit(HISTORY_LIMIT);
  if (error) throw error;
  return json({ messages: data ?? [] });
}

async function handleSend(sessionId: string, mode: Mode, message: string) {
  const { data: userRow, error: insertError } = await supabase
    .from("assistant_messages")
    .insert({ session_id: sessionId, mode, role: "user", content: message })
    .select("id, role, content, created_at")
    .single();
  if (insertError) throw insertError;

  if (mode === "support") {
    const { error: ticketError } = await supabase
      .from("support_tickets")
      .insert({ session_id: sessionId, description: message });
    if (ticketError) throw ticketError;
  }

  const { data: recent, error: recentError } = await supabase
    .from("assistant_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .eq("mode", mode)
    .order("created_at", { ascending: false })
    .limit(CONTEXT_LIMIT);
  if (recentError) throw recentError;

  const history = (recent ?? []).reverse().map((row) => ({ role: row.role, content: row.content }));
  const reply = await requestCompletion(mode, history);

  const { data: assistantRow, error: replyError } = await supabase
    .from("assistant_messages")
    .insert({ session_id: sessionId, mode, role: "assistant", content: reply })
    .select("id, role, content, created_at")
    .single();
  if (replyError) throw replyError;

  return json({ messages: [userRow, assistantRow] });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, session_id: sessionId, mode } = body ?? {};

    if (!isValidSession(sessionId)) return json({ error: "Sesión no válida" }, 400);
    if (!isValidMode(mode)) return json({ error: "Modo no válido" }, 400);

    if (action === "history") return await handleHistory(sessionId, mode);

    if (action === "send") {
      const message = typeof body.message === "string" ? body.message.trim() : "";
      if (!message) return json({ error: "El mensaje está vacío" }, 400);
      if (message.length > MAX_MESSAGE_LENGTH) {
        return json({ error: `El mensaje no puede superar ${MAX_MESSAGE_LENGTH} caracteres` }, 400);
      }
      return await handleSend(sessionId, mode, message);
    }

    return json({ error: "Acción no válida" }, 400);
  } catch (err) {
    console.error("assistant function error:", err);
    return json({ error: "No se pudo completar la solicitud del asistente" }, 500);
  }
});
