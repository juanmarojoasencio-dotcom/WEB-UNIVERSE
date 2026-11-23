import { useState } from 'react';
import {
  GraduationCap, Users, Target, ArrowRight, Check, Loader2, Sparkles,
} from 'lucide-react';
import {
  US_DEGREES,
  US_COURSES,
  US_CLASS_GROUPS,
  PLAN_TAGS,
  GROUP_TAGS,
  GOAL_TAGS,
  type UserProfile,
} from '@/lib/session';

interface OnboardingPageProps {
  email: string;
  onComplete: (profile: UserProfile) => void;
}

export default function OnboardingPage({ email, onComplete }: OnboardingPageProps) {
  const [fullName, setFullName] = useState('');
  const [degree, setDegree] = useState('');
  const [course, setCourse] = useState('');
  const [classGroup, setClassGroup] = useState('');
  const [planTag, setPlanTag] = useState('');
  const [groupTag, setGroupTag] = useState('');
  const [goalTag, setGoalTag] = useState('');
  const [saving, setSaving] = useState(false);

  const academicValid = fullName.trim() && degree && course && classGroup;
  const personalityValid = planTag && groupTag && goalTag;
  const canSubmit = academicValid && personalityValid && !saving;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSaving(true);
    setTimeout(() => {
      const profile: UserProfile = {
        email,
        fullName: fullName.trim(),
        degree,
        course,
        classGroup,
        planTag,
        groupTag,
        goalTag,
      };
      onComplete(profile);
    }, 800);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-4 py-8">
      <div className="w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-gold-400/50 bg-white shadow-lg shadow-crimson-500/10">
            <img
              src="/images/IMG_6813.PNG"
              alt="Logo de Uni verse"
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="mt-3 font-display text-xl font-bold tracking-tight text-ink-100">
            Configura tu perfil
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            Unos datos y listo para conectar con tu gente en la US
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin">
          {/* Nombre */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-300">Nombre completo</label>
            <div className="flex items-center gap-2 rounded-xl border border-ink-700/30 bg-ink-850/50 px-4 py-3 focus-within:border-crimson-400/40">
              <Sparkles className="h-4 w-4 shrink-0 text-crimson-600" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Marta López"
                autoFocus
                className="flex-1 bg-transparent text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Bloque A: Datos académicos */}
          <div className="border-t border-ink-800 pt-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-crimson-500/10">
                <GraduationCap className="h-4 w-4 text-crimson-600" />
              </div>
              <h2 className="font-display text-sm font-bold text-ink-100">Datos académicos</h2>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-300">Grado / Carrera</label>
                <div className="flex items-center gap-2 rounded-xl border border-ink-700/30 bg-ink-850/50 px-4 py-3 focus-within:border-crimson-400/40">
                  <GraduationCap className="h-4 w-4 shrink-0 text-crimson-600" />
                  <select
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-ink-100 focus:outline-none"
                  >
                    <option value="">Selecciona tu grado...</option>
                    {US_DEGREES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-300">Curso</label>
                <div className="flex flex-wrap gap-2">
                  {US_COURSES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCourse(c)}
                      className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                        course === c
                          ? 'border-crimson-400/40 bg-crimson-500/10 text-crimson-600'
                          : 'border-ink-700/30 bg-ink-850/40 text-ink-300 hover:bg-ink-850'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-300">Grupo de clase</label>
                <div className="flex flex-wrap gap-2">
                  {US_CLASS_GROUPS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setClassGroup(g)}
                      className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                        classGroup === g
                          ? 'border-crimson-400/40 bg-crimson-500/10 text-crimson-600'
                          : 'border-ink-700/30 bg-ink-850/40 text-ink-300 hover:bg-ink-850'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bloque B: Personalidad */}
          <div className="border-t border-ink-800 pt-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-400/10">
                <Users className="h-4 w-4 text-gold-600" />
              </div>
              <h2 className="font-display text-sm font-bold text-ink-100">Personalidad e intereses</h2>
            </div>

            <TagQuestion
              icon={<Target className="h-3.5 w-3.5" />}
              question="¿Cuál es tu plan ideal entre clases o después de la uni?"
              options={PLAN_TAGS}
              selected={planTag}
              onSelect={setPlanTag}
            />
            <TagQuestion
              icon={<Users className="h-3.5 w-3.5" />}
              question="¿Cómo te defines en grupo?"
              options={GROUP_TAGS}
              selected={groupTag}
              onSelect={setGroupTag}
            />
            <TagQuestion
              icon={<Target className="h-3.5 w-3.5" />}
              question="¿Qué buscas principalmente aquí?"
              options={GOAL_TAGS}
              selected={goalTag}
              onSelect={setGoalTag}
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Guardar perfil y entrar
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function TagQuestion({
  icon,
  question,
  options,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  question: string;
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-300">
        <span className="text-crimson-600">{icon}</span>
        {question}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected === option;
          return (
            <button
              key={option}
              onClick={() => onSelect(option)}
              className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all ${
                active
                  ? 'border-crimson-400/40 bg-crimson-500/10 text-crimson-600'
                  : 'border-ink-700/30 bg-ink-850/40 text-ink-300 hover:bg-ink-850'
              }`}
            >
              {active && <Check className="mr-1 inline h-3 w-3" />}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
