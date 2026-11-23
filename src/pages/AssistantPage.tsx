import { useState, useEffect, useRef, useCallback } from 'react';
import { GraduationCap, Landmark, LifeBuoy, Send, Loader2, Bot, AlertCircle, ArrowRight } from 'lucide-react';
import type { AssistantMode } from '@/types';
import { requestAssistant } from '@/lib/assistant';
import { useSession } from '@/lib/session';
import {
  fetchAppContext,
  generateContextualResponse,
  getDynamicChips,
  type AppContext,
  type AssistantAction,
} from '@/lib/assistantContext';

const SESSION_STORAGE_KEY = 'uniVerse.assistantSession';

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: AssistantAction[];
  source: 'server' | 'local';
}

const MODES: {
  key: AssistantMode;
  label: string;
  description: string;
  placeholder: string;
  icon: typeof Bot;
}[] = [
  {
    key: 'academic',
    label: 'Académico',
    description: 'Estudio, exámenes y organización',
    placeholder: 'Pregunta sobre estudio o tu vida académica...',
    icon: GraduationCap,
  },
  {
    key: 'official',
    label: 'Información oficial',
    description: 'Trámites, matrícula y normativa',
    placeholder: 'Pregunta sobre trámites o normativa...',
    icon: Landmark,
  },
  {
    key: 'support',
    label: 'Soporte',
    description: 'Problemas con la app',
    placeholder: 'Describe el problema que tienes en la app...',
    icon: LifeBuoy,
  },
];

const CONTEXTUAL_MODE: AssistantMode = 'academic';

const getSessionId = () => {
  const stored = localStorage.getItem(SESSION_STORAGE_KEY);
  if (stored && stored.length >= 8) return stored;
  const created = crypto.randomUUID();
  localStorage.setItem(SESSION_STORAGE_KEY, created);
  return created;
};

interface AssistantPageProps {
  onNavigate?: (tab: 'inicio' | 'grupos' | 'eventos' | 'chats' | 'explorar' | 'perfil') => void;
}

export default function AssistantPage({ onNavigate }: AssistantPageProps) {
  const { profile } = useSession();
  const [sessionId] = useState(getSessionId);
  const [mode, setMode] = useState<AssistantMode>('academic');
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appContext, setAppContext] = useState<AppContext | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const activeMode = MODES.find((item) => item.key === mode) ?? MODES[0];
  const chips = getDynamicChips(profile);

  useEffect(() => {
    fetchAppContext(profile).then(setAppContext).catch(() => {});
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    setError(null);
    requestAssistant({ action: 'history', session_id: sessionId, mode })
      .then((history) => {
        if (!cancelled) {
          setMessages(
            history.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              source: 'server' as const,
            })),
          );
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setMessages([]);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, mode]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = useCallback(
    async (content?: string) => {
      const text = (content ?? input).trim();
      if (!text || sending) return;

      setInput('');
      setSending(true);
      setError(null);

      const userMsg: LocalMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        source: 'local',
      };
      setMessages((prev) => [...prev, userMsg]);

      if (mode === CONTEXTUAL_MODE && appContext) {
        try {
          const reply = generateContextualResponse(text, appContext);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: reply.content,
              actions: reply.actions,
              source: 'local',
            },
          ]);
        } catch {
          setError('No pude generar una respuesta en este momento.');
        } finally {
          setSending(false);
        }
        return;
      }

      try {
        const newMessages = await requestAssistant({
          action: 'send',
          session_id: sessionId,
          mode,
          message: text,
        });
        setMessages((prev) => [
          ...prev,
          ...newMessages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            source: 'server' as const,
          })),
        ]);
      } catch (err) {
        setInput(text);
        setError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje');
      } finally {
        setSending(false);
      }
    },
    [input, sending, mode, appContext, sessionId],
  );

  return (
    <div className="mx-auto flex h-[calc(100vh-73px)] max-w-4xl flex-col gap-4 p-4 lg:p-6">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {MODES.map((item) => {
          const Icon = item.icon;
          const active = item.key === mode;
          return (
            <button
              key={item.key}
              onClick={() => setMode(item.key)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                active
                  ? 'border-crimson-500/40 bg-crimson-500/10 shadow-sm'
                  : 'border-ink-700/30 bg-white/60 hover:border-ink-700/60 hover:bg-ink-850/40'
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  active ? 'bg-crimson-500/15 text-crimson-600' : 'bg-ink-850/60 text-ink-400'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${active ? 'text-crimson-600' : 'text-ink-200'}`}>
                  {item.label}
                </p>
                <p className="truncate text-xs text-ink-400">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-ink-800 bg-white/70 shadow-sm">
        <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin p-4 lg:p-6">
          {loadingHistory ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-crimson-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-850/60 border border-ink-700/30">
                <Bot className="h-7 w-7 text-ink-500" />
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-ink-200">{activeMode.label}</h3>
              <p className="mt-1 max-w-sm text-sm text-ink-400">{activeMode.description}</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex animate-slide-up flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'rounded-br-sm bg-gradient-to-br from-crimson-500 to-crimson-600 text-white shadow-lg shadow-crimson-500/10'
                      : 'rounded-bl-sm border border-ink-700/30 bg-ink-800/60 text-ink-200'
                  }`}
                >
                  {renderMarkdownLite(msg.content)}
                </div>
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {msg.actions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => onNavigate?.(action.tab)}
                        className="flex items-center gap-1.5 rounded-full border border-crimson-400/30 bg-crimson-500/5 px-3 py-1.5 text-xs font-medium text-crimson-600 transition-all hover:bg-crimson-500/10"
                      >
                        {action.label}
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-ink-700/30 bg-ink-800/60 px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-ink-500 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-ink-500 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-ink-500" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {error && (
          <div className="flex items-center gap-2 border-t border-crimson-500/20 bg-crimson-500/5 px-4 py-2.5 text-xs text-crimson-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dynamic chips */}
        {messages.length === 0 && !loadingHistory && (
          <div className="flex flex-wrap gap-2 border-t border-ink-800 px-4 pt-3">
            {chips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleSend(chip)}
                disabled={sending}
                className="rounded-full border border-ink-700/40 bg-ink-850/40 px-3.5 py-2 text-xs font-medium text-ink-300 transition-all hover:border-crimson-400/30 hover:bg-crimson-500/5 hover:text-crimson-600 disabled:opacity-40"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-ink-800 bg-white/80 p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              maxLength={1000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={sending || loadingHistory}
              placeholder={activeMode.placeholder}
              className="flex-1 rounded-xl border border-ink-700/30 bg-ink-850/60 px-4 py-3 text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-crimson-400/40 disabled:opacity-60"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sending || loadingHistory}
              aria-label="Enviar mensaje"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-crimson-500 to-crimson-600 text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          {mode === 'support' && (
            <p className="mt-2 text-[11px] text-ink-400">
              Cada mensaje de soporte se registra como un aviso para el equipo de Uni verse.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function renderMarkdownLite(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <span key={i}>
      {renderBold(line)}
      {i < lines.length - 1 && <br />}
    </span>
  ));
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-ink-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
