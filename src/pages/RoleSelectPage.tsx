import { useState } from 'react';
import {
  GraduationCap, PenTool, ArrowRight, ArrowLeft, ShieldAlert, Lock, Loader2, ShieldCheck,
} from 'lucide-react';
import { isCreatorEmail, isValidCreatorPassword } from '@/lib/roles';

type Stage = 'choose' | 'creator-email' | 'creator-password';

interface RoleSelectPageProps {
  email: string;
  onStudent: () => void;
  onCreator: () => void;
}

export default function RoleSelectPage({ email, onStudent, onCreator }: RoleSelectPageProps) {
  const [stage, setStage] = useState<Stage>('choose');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleStudent = () => onStudent();

  const handleCreatorClick = () => {
    setEmailError(null);
    if (!isCreatorEmail(email)) {
      setEmailError('Este correo no tiene permisos de creador de la web');
      return;
    }
    setStage('creator-password');
  };

  const handlePasswordSubmit = () => {
    if (!password || checking) return;
    setChecking(true);
    setPasswordError(null);
    setTimeout(() => {
      if (!isValidCreatorPassword(password)) {
        setPasswordError('Contraseña de creador incorrecta');
        setChecking(false);
        return;
      }
      onCreator();
    }, 400);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-4 py-8">
      <div className="w-full max-w-md animate-slide-up">
        {/* Header / logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-gold-400/50 bg-white shadow-lg shadow-crimson-500/10">
            <img
              src="/images/IMG_6813.PNG"
              alt="Logo de Uni verse"
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink-100">
            Uni<span className="text-crimson-600">verse</span>
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            Correo verificado: <span className="font-medium text-ink-200">{email}</span>
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 sm:p-8">
          {stage === 'choose' && (
            <div>
              <h2 className="font-display text-lg font-bold text-ink-100">¿Cómo quieres entrar?</h2>
              <p className="mt-1 text-sm text-ink-400">
                Elige tu rol para continuar. Podrás cambiar de opinión cerrando sesión.
              </p>

              <div className="mt-6 space-y-3">
                <button
                  onClick={handleStudent}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-ink-700/30 bg-ink-850/40 p-4 text-left transition-all hover:border-crimson-400/40 hover:bg-crimson-500/5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-crimson-500/10 to-gold-500/10">
                    <GraduationCap className="h-6 w-6 text-crimson-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-sm font-bold text-ink-100">Estudiante</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-400">
                      Conecta con tu gente, descubre grupos y planes universitarios
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-crimson-500" />
                </button>

                <button
                  onClick={() => setStage('creator-email')}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-ink-700/30 bg-ink-850/40 p-4 text-left transition-all hover:border-gold-400/40 hover:bg-gold-400/5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400/10 to-gold-500/10">
                    <PenTool className="h-6 w-6 text-gold-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-sm font-bold text-ink-100">Creador de la web</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-400">
                      Acceso exclusivo del equipo: publica eventos, notificaciones y ofertas
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-500" />
                </button>
              </div>
            </div>
          )}

          {stage === 'creator-email' && (
            <div>
              <button
                onClick={() => setStage('choose')}
                className="mb-4 flex items-center gap-1.5 text-xs font-medium text-ink-400 transition-colors hover:text-ink-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver a elegir rol
              </button>

              <h2 className="font-display text-lg font-bold text-ink-100">Validación de creador</h2>
              <p className="mt-1 text-sm text-ink-400">
                Comprobamos que tu correo tenga permisos de creador.
              </p>

              <div className="mt-6 flex items-center gap-2 rounded-xl border border-ink-700/30 bg-ink-850/50 px-4 py-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-crimson-600" />
                <span className="flex-1 truncate text-sm text-ink-100">{email}</span>
              </div>

              {emailError && (
                <p className="mt-3 flex items-start gap-1.5 text-xs text-crimson-600">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {emailError}
                </p>
              )}

              {emailError ? (
                <button
                  onClick={onStudent}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500"
                >
                  Entrar como Estudiante
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleCreatorClick}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-3 text-sm font-semibold text-ink-950 shadow-lg shadow-gold-500/20 transition-all hover:from-gold-300 hover:to-gold-400"
                >
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {stage === 'creator-password' && (
            <div>
              <button
                onClick={() => setStage('choose')}
                className="mb-4 flex items-center gap-1.5 text-xs font-medium text-ink-400 transition-colors hover:text-ink-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver a elegir rol
              </button>

              <h2 className="font-display text-lg font-bold text-ink-100">Contraseña de creador</h2>
              <p className="mt-1 text-sm text-ink-400">
                Introduce la contraseña exclusiva del equipo de creadores.
              </p>

              <div className="mt-6">
                <label className="mb-1.5 block text-xs font-medium text-ink-300">
                  Contraseña de creador
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-ink-700/30 bg-ink-850/50 px-4 py-3 focus-within:border-gold-400/40">
                  <Lock className="h-4 w-4 shrink-0 text-gold-600" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                    placeholder="Contraseña"
                    autoFocus
                    className="flex-1 bg-transparent text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none"
                  />
                </div>
                {passwordError && (
                  <p className="mt-3 flex items-start gap-1.5 text-xs text-crimson-600">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {passwordError}
                  </p>
                )}
              </div>

              <button
                onClick={handlePasswordSubmit}
                disabled={!password || checking}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-3 text-sm font-semibold text-ink-950 shadow-lg shadow-gold-500/20 transition-all hover:from-gold-300 hover:to-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {checking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Acceder como creador
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">
          Al continuar aceptas los términos de uso y la política de privacidad de Uni verse.
        </p>
      </div>
    </div>
  );
}
