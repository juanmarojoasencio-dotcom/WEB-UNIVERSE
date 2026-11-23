import type { AssistantMessage, AssistantMode } from '@/types';

const ASSISTANT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type AssistantRequest =
  | { action: 'history'; session_id: string; mode: AssistantMode }
  | { action: 'send'; session_id: string; mode: AssistantMode; message: string };

const isAssistantMessage = (value: unknown): value is AssistantMessage => {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    (row.role === 'user' || row.role === 'assistant') &&
    typeof row.content === 'string' &&
    typeof row.created_at === 'string'
  );
};

export async function requestAssistant(payload: AssistantRequest): Promise<AssistantMessage[]> {
  let response: Response;
  try {
    response = await fetch(ASSISTANT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('No hay conexión con el asistente. Revisa tu conexión e inténtalo de nuevo.');
  }

  const data: unknown = await response.json().catch(() => null);
  const errorMessage =
    data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string'
      ? (data as { error: string }).error
      : null;

  if (!response.ok) {
    throw new Error(errorMessage ?? 'El asistente no está disponible en este momento.');
  }

  const messages = (data as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(messages) || !messages.every(isAssistantMessage)) {
    throw new Error('La respuesta del asistente no es válida.');
  }
  return messages;
}
