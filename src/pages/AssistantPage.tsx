import { useState, useEffect, useRef, useCallback } from 'react';
import {
  GraduationCap, Landmark, LifeBuoy, Send, Loader2, Bot, Trash2,
  ChevronDown, ChevronRight, Pencil, Save, X,
} from 'lucide-react';
import type { AssistantMode } from '@/types';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { generateReply, CHIPS, type AcademicInfo, type ChatTurn } from '@/lib/assistantEngine';

const HISTORY_KEY = 'uniVerse.assistantHistory';

interface LocalMessage extends ChatTurn {
  id: string;
}

type HistoryMap = Record<AssistantMode, LocalMessage[]>;

function loadHistory(): HistoryMap {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<HistoryMap>;
      if (
        Array.isArray(parsed.academic) &&
        Array.isArray(parsed.official) &&
        Array.isArray(parsed.support)
      ) {
        return parsed as HistoryMap;
      }
    }
  } catch {
    /* ignore */
  }
  return { academic: [], official: [], support: [] };
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
    description: 'Tutor de apuntes y organización de estudio',
    placeholder: 'Pega tus apuntes o pregunta sobre tu estudio...',
    icon: GraduationCap,
  },
  {
    key: 'official',
    label: 'Información oficial',
    description: 'Becas, matrícula y trámites de la US',
    placeholder: 'Pregunta sobre becas, matrícula o SEVIUS...',
    icon: Landmark,
  },
  {
    key: 'support',
    label: 'Soporte',
    description: 'Guía rápida sobre la app Uni verse',
    placeholder: '¿Qué duda tienes sobre la app?...',
    icon: LifeBuoy,
  },
];

const MEC_OPTIONS = ['No solicitada', 'En trámite', 'Concedida', 'Denegada'];
const ENROLLMENT_OPTIONS = ['Curso completo', 'Tiempo parcial'];
const OTHER_SCHOLARSHIP_OPTIONS = ['Ninguna', 'Beca propia US', 'Erasmus', 'Bonificación Junta de Andalucía'];

const inputClass =
  'w-full rounded-xl border border-ink-700/30 bg-ink-850/50 px-3 py-2.5 text-sm text-ink-100 focus:outline-none focus:ring-1 focus:ring-crimson-400/40';
const labelClass = 'mb-1 block text-xs font-medium text-ink-300';

export default function AssistantPage() {
  const { profile } = useSession();
  const [mode, setMode] = useState<AssistantMode>('academic');
  const [history, setHistory] = useState<HistoryMap>(loadHistory);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [academicInfo, setAcademicInfo] = useState<AcademicInfo | null>(null);
  const [cardSaving, setCardSaving] = useState(false);
  const [cardEditing, setCardEditing] = useState(false);
  const [cardDraft, setCardDraft] = useState<AcademicInfo>({
    enrollment_type: null,
    enrolled_credits: null,
    mec_status: null,
    other_scholarships: null,
  });
  const endRef = useRef<HTMLDivElement>(null);

  const activeMode = MODES.find((item) => item.key === mode) ?? MODES[0];
  const messages = history[mode];
  const chips = CHIPS[mode];

  // Load academic info for the official tab
  useEffect(() => {
    if (!profile?.email) return;
    let cancelled = false;
    supabase
      .from('user_academic_info')
      .select('enrollment_type, enrolled_credits, mec_status, other_scholarships')
      .eq('email', profile.email)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          const info: AcademicInfo = {
            enrollment_type: data.enrollment_type ?? null,
            enrolled_credits: data.enrolled_credits ?? null,
            mec_status: data.mec_status ?? null,
            other_scholarships: data.other_scholarships ?? null,
          };
          setAcademicInfo(info);
          setCardDraft(info);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.email]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const persist = useCallback((next: HistoryMap) => {
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const clearChat = useCallback(() => {
    persist({ ...history, [mode]: [] });
  }, [history, mode, persist]);

  const handleSend = useCallback(
    async (content?: string) => {
      const text = (content ?? input).trim();
      if (!text || sending) return;

      setInput('');
      setSending(true);

      const userMsg: LocalMessage = { id: crypto.randomUUID(), role: 'user', content: text };
      const base: HistoryMap = { ...history, [mode]: [...history[mode], userMsg] };
      persist(base);

      const reply = await generateReply(mode, base[mode], profile, academicInfo);

      const assistantMsg: LocalMessage = { id: crypto.randomUUID(), role: 'assistant', content: reply };
      persist({ ...base, [mode]: [...base[mode], assistantMsg] });
      setSending(false);
    },
    [input, sending, mode, history, profile, academicInfo, persist],
  );

  const handleCardSave = useCallback(async () => {
    if (!profile?.email) return;
    setCardSaving(true);
    const row = {
      email: profile.email,
      enrollment_type: cardDraft.enrollment_type,
      enrolled_credits: cardDraft.enrolled_credits,
      mec_status: cardDraft.mec_status,
      other_scholarships: cardDraft.other_scholarships,
      updated_at: new Date().toISOString(),
    };
    await supabase.from('user_academic_info').upsert(row, { onConflict: 'email' });
    setAcademicInfo({ ...cardDraft });
    setCardSaving(false);
    setCardEditing(false);
  }, [profile?.email, cardDraft]);

  const handleCardChange = (patch: Partial<AcademicInfo>) => {
    setCardDraft((prev) => ({ ...prev, ...patch }));
  };

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
        {/* Chat header with clear button */}
        <div className="flex items-center justify-between border-b border-ink-800 bg-white/80 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-crimson-500/10">
              <Bot className="h-4 w-4 text-crimson-600" />
            </div>
            <p className="truncate text-sm font-semibold text-ink-200">{activeMode.label}</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              disabled={sending}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-ink-400 transition-colors hover:bg-ink-850/40 hover:text-crimson-600 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpiar chat
            </button>
          )}
        </div>

        {/* Collapsible academic info card (official tab only) */}
        {mode === 'official' && profile && (
          <div className="border-b border-ink-800 bg-white/60 px-4 py-2.5">
            <button
              onClick={() => setShowCard((v) => !v)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-ink-200">
                {showCard ? <ChevronDown className="h-4 w-4 text-crimson-600" /> : <ChevronRight className="h-4 w-4 text-crimson-600" />}
                Mis datos de matrícula y beca
                {academicInfo && (
                  <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                    Guardado
                  </span>
                )}
              </span>
              {!cardEditing && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-crimson-600">
                  {academicInfo ? <Pencil className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {academicInfo ? 'Editar' : 'Añadir'}
                </span>
              )}
            </button>

            {showCard && (
              <div className="mt-3 animate-slide-up">
                {cardEditing ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Tipo de matrícula</label>
                        <select
                          className={inputClass}
                          value={cardDraft.enrollment_type ?? ''}
                          onChange={(e) => handleCardChange({ enrollment_type: e.target.value || null })}
                        >
                          <option value="">Sin especificar</option>
                          {ENROLLMENT_OPTIONS.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Créditos matriculados (ECTS)</label>
                        <input
                          type="number"
                          min={0}
                          max={120}
                          className={inputClass}
                          value={cardDraft.enrolled_credits ?? ''}
                          onChange={(e) =>
                            handleCardChange({ enrolled_credits: e.target.value ? Number(e.target.value) : null })
                          }
                          placeholder="Ej. 60"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Estado de Beca MEC</label>
                        <select
                          className={inputClass}
                          value={cardDraft.mec_status ?? ''}
                          onChange={(e) => handleCardChange({ mec_status: e.target.value || null })}
                        >
                          <option value="">Sin especificar</option>
                          {MEC_OPTIONS.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Otras becas</label>
                        <select
                          className={inputClass}
                          value={cardDraft.other_scholarships ?? ''}
                          onChange={(e) => handleCardChange({ other_scholarships: e.target.value || null })}
                        >
                          <option value="">Ninguna</option>
                          {OTHER_SCHOLARSHIP_OPTIONS.filter((o) => o !== 'Ninguna').map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCardSave}
                        disabled={cardSaving}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:opacity-40"
                      >
                        {cardSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Guardar
                      </button>
                      <button
                        onClick={() => {
                          setCardDraft(academicInfo ?? {
                            enrollment_type: null,
                            enrolled_credits: null,
                            mec_status: null,
                            other_scholarships: null,
                          });
                          setCardEditing(false);
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-ink-700/30 bg-ink-850/30 px-4 py-2 text-xs font-medium text-ink-300 transition-all hover:bg-ink-850/60"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {academicInfo ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <InfoLine label="Tipo de matrícula" value={academicInfo.enrollment_type ?? 'Sin especificar'} />
                        <InfoLine label="Créditos matriculados" value={academicInfo.enrolled_credits ? `${academicInfo.enrolled_credits} ECTS` : 'Sin especificar'} />
                        <InfoLine label="Beca MEC" value={academicInfo.mec_status ?? 'Sin especificar'} />
                        <InfoLine label="Otras becas" value={academicInfo.other_scholarships ?? 'Ninguna'} />
                      </div>
                    ) : (
                      <p className="text-xs text-ink-400">
                        Añade tus datos de matrícula y beca para que el asistente te dé consejos personalizados sobre Beca MEC, créditos y trámites.
                      </p>
                    )}
                    {!cardEditing && (
                      <button
                        onClick={() => {
                          setCardDraft(academicInfo ?? {
                            enrollment_type: null,
                            enrolled_credits: null,
                            mec_status: null,
                            other_scholarships: null,
                          });
                          setCardEditing(true);
                        }}
                        className="text-xs font-medium text-crimson-600 transition-colors hover:text-crimson-500"
                      >
                        {academicInfo ? 'Editar mis datos' : 'Añadir mis datos'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin p-4 lg:p-6">
          {messages.length === 0 ? (
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

        {/* Chips */}
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

        <div className="border-t border-ink-800 bg-white/80 p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              maxLength={4000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={sending}
              placeholder={activeMode.placeholder}
              className="flex-1 rounded-xl border border-ink-700/30 bg-ink-850/60 px-4 py-3 text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-crimson-400/40 disabled:opacity-60"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sending}
              aria-label="Enviar mensaje"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-crimson-500 to-crimson-600 text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-700/30 bg-ink-850/30 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink-100">{value}</p>
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
