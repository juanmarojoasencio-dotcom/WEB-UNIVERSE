import { useState, useEffect, useRef } from 'react';
import { Mail, Loader2, ArrowLeft, ArrowRight, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isValidUSEmail, OTP_RESEND_SECONDS } from '@/lib/session';

type Step = 'email' | 'otp';

const OTP_LENGTH = 8;

export default function LoginPage({ onVerified }: { onVerified: (email: string) => void }) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const trimmedEmail = email.trim();
  const emailValid = isValidUSEmail(trimmedEmail);
  const showEmailError = emailTouched && trimmedEmail.length > 0 && !emailValid;

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (step === 'otp') {
      setResendCountdown(OTP_RESEND_SECONDS);
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  const handleEmailSubmit = async () => {
    if (!emailValid || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStep('otp');
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? `No se pudo enviar el código: ${err.message}`
          : 'No se pudo enviar el código de verificación. Inténtalo de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    setOtpError(null);

    if (cleanValue.length <= 1) {
      const next = [...otp];
      next[index] = cleanValue;
      setOtp(next);
      if (cleanValue && index < OTP_LENGTH - 1) {
        otpRefs.current[index + 1]?.focus();
      }
      return;
    }

    const digits = cleanValue.slice(0, OTP_LENGTH).split('');
    const next = Array(OTP_LENGTH).fill('');
    digits.forEach((digit, i) => {
      next[i] = digit;
    });
    setOtp(next);
    const lastIndex = Math.min(digits.length, OTP_LENGTH) - 1;
    otpRefs.current[Math.min(lastIndex + 1, OTP_LENGTH - 1)]?.focus();
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((digit, i) => {
      next[i] = digit;
    });
    setOtp(next);
    setOtpError(null);
    otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const otpCode = otp.join('');

  const handleVerify = async () => {
    if (otpCode.length !== OTP_LENGTH || verifying) return;
    setVerifying(true);
    setOtpError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: otpCode,
        type: 'email',
      });
      if (error) throw error;
      onVerified(trimmedEmail);
    } catch {
      setOtpError(
        'El código introducido no es válido o ha expirado. Inténtalo de nuevo o solicita uno nuevo.',
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setOtp(Array(OTP_LENGTH).fill(''));
    setOtpError(null);
    setResendCountdown(OTP_RESEND_SECONDS);
    otpRefs.current[0]?.focus();
    try {
      await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { shouldCreateUser: true },
      });
    } catch {
      setOtpError('No se pudo reenviar el código. Inténtalo de nuevo en unos segundos.');
      setResendCountdown(0);
    }
  };

  const handleChangeEmail = () => {
    setStep('email');
    setOtp(Array(OTP_LENGTH).fill(''));
    setOtpError(null);
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
            Acceso exclusivo para miembros de la Universidad de Sevilla
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 sm:p-8">
          {step === 'email' && (
            <div>
              <h2 className="font-display text-lg font-bold text-ink-100">Iniciar sesión</h2>
              <p className="mt-1 text-sm text-ink-400">
                Introduce tu correo institucional para continuar.
              </p>

              <div className="mt-6">
                <label className="mb-1.5 block text-xs font-medium text-ink-300">
                  Correo institucional de la US
                </label>
                <div
                  className={`flex items-center gap-2 rounded-xl border bg-ink-850/50 px-4 py-3 transition-colors ${
                    showEmailError
                      ? 'border-crimson-500/50'
                      : 'border-ink-700/30 focus-within:border-crimson-400/40'
                  }`}
                >
                  <Mail className="h-4 w-4 shrink-0 text-crimson-600" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                    placeholder="usuario@alum.us.es o usuario@us.es"
                    autoComplete="email"
                    autoFocus
                    className="flex-1 bg-transparent text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none"
                  />
                </div>
                {showEmailError && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-crimson-600">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Por favor, utiliza tu correo institucional de la Universidad de Sevilla
                    (@alum.us.es o @us.es).
                  </p>
                )}
              </div>

              {submitError && (
                <p className="mt-3 flex items-start gap-1.5 text-xs text-crimson-600">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {submitError}
                </p>
              )}

              <button
                onClick={handleEmailSubmit}
                disabled={!emailValid || submitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continuar con correo US
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div>
              <button
                onClick={handleChangeEmail}
                className="mb-4 flex items-center gap-1.5 text-xs font-medium text-ink-400 transition-colors hover:text-ink-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Cambiar correo
              </button>

              <h2 className="font-display text-lg font-bold text-ink-100">Verifica tu correo</h2>
              <p className="mt-1 text-sm text-ink-400">
                Hemos enviado un código de verificación de 8 dígitos a{' '}
                <span className="font-medium text-ink-200">{trimmedEmail}</span>
              </p>

              <div className="mt-6 grid grid-cols-8 justify-items-center gap-1.5 sm:gap-2" onPaste={handleOtpPaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className={`h-12 w-full min-w-0 rounded-xl border bg-ink-850/50 text-center font-display text-lg font-bold text-ink-100 focus:outline-none focus:ring-1 sm:h-14 sm:text-xl ${
                      otpError
                        ? 'border-crimson-500/50 focus:ring-crimson-400/40'
                        : 'border-ink-700/30 focus:border-crimson-400/40 focus:ring-crimson-400/40'
                    }`}
                  />
                ))}
              </div>

              {otpError && (
                <p className="mt-3 flex items-start gap-1.5 text-xs text-crimson-600">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {otpError}
                </p>
              )}

              <button
                onClick={handleVerify}
                disabled={otpCode.length !== OTP_LENGTH || verifying}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-crimson-500/20 transition-all hover:from-crimson-400 hover:to-crimson-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {verifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Verificar y entrar
                  </>
                )}
              </button>

              <div className="mt-4 flex items-center justify-center">
                <button
                  onClick={handleResend}
                  disabled={resendCountdown > 0}
                  className="flex items-center gap-1.5 text-xs font-medium text-ink-400 transition-colors hover:text-ink-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {resendCountdown > 0 ? `Reenviar código (${resendCountdown}s)` : 'Reenviar código'}
                </button>
              </div>
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
