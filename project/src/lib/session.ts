import { createContext, useContext } from 'react';

export interface Session {
  email: string;
  verifiedAt: number;
}

export interface UserProfile {
  email: string;
  fullName: string;
  degree: string;
  course: string;
  classGroup: string;
  planTag: string;
  groupTag: string;
  goalTag: string;
}

export const SESSION_STORAGE_KEY = 'uniVerse.session';
export const PROFILE_STORAGE_KEY = 'uniVerse.profile';
export const OTP_RESEND_SECONDS = 30;
export const ALLOWED_DOMAINS = ['@alum.us.es', '@us.es'] as const;

export const US_DEGREES = [
  'Periodismo',
  'Comunicación Audiovisual',
  'Publicidad y Relaciones Públicas',
  'Ingeniería Informática',
  'Ingeniería Industrial',
  'Ingeniería de Tecnologías de Telecomunicación',
  'Derecho',
  'Medicina',
  'Enfermería',
  'Administración y Dirección de Empresas (ADE)',
  'Economía',
  'Psicología',
  'Educación Primaria',
  'Educación Infantil',
  'Filosofía',
  'Historia',
  'Historia del Arte',
  'Geografía y Gestión del Territorio',
  'Sociología',
  'Trabajo Social',
  'Arquitectura',
  'Bellas Artes',
  'Biología',
  'Química',
  'Física',
  'Matemáticas',
  'Farmacia',
  'Bioquímica',
  'Antropología Social y Cultural',
  'Lengua y Literatura Españolas',
  'Estudios Ingleses',
  'Filología Hispánica',
] as const;

export const US_COURSES = ['1º', '2º', '3º', '4º', '5º / Doble Grado', 'Máster'] as const;

export const US_CLASS_GROUPS = [
  'Grupo 1',
  'Grupo 2',
  'Grupo 3',
  'Grupo 4',
  'Grupo A',
  'Grupo B',
  'Tarde',
  'Bilingüe',
] as const;

export const PLAN_TAGS = [
  'Tomar un café tranquilo',
  'Ir a estudiar a la biblioteca',
  'Deporte / Gym',
  'Salir de tapas / cañas',
  'Planes culturales / cine',
] as const;

export const GROUP_TAGS = [
  'Más de escuchar al principio',
  'El que organiza los planes',
  'Sociable y hablador',
  'Tranqui y de grupos pequeños',
] as const;

export const GOAL_TAGS = [
  'Conocer gente de mi facultad',
  'Hacer grupo de estudio',
  'Gente nueva fuera de mi carrera',
  'Compañeros para deporte/hobbies',
] as const;

export function isValidUSEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return false;
  return ALLOWED_DOMAINS.some((domain) => trimmed.endsWith(domain));
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (
      typeof parsed.email === 'string' &&
      typeof parsed.verifiedAt === 'number' &&
      isValidUSEmail(parsed.email)
    ) {
      return { email: parsed.email, verifiedAt: parsed.verifiedAt };
    }
  } catch {
    /* ignore malformed storage */
  }
  return null;
}

export function saveSession(email: string): void {
  const session: Session = { email: email.trim().toLowerCase(), verifiedAt: Date.now() };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.email === 'string' &&
    typeof p.fullName === 'string' &&
    typeof p.degree === 'string' &&
    typeof p.course === 'string' &&
    typeof p.classGroup === 'string' &&
    typeof p.planTag === 'string' &&
    typeof p.groupTag === 'string' &&
    typeof p.goalTag === 'string'
  );
}

export function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (isUserProfile(parsed)) return parsed as UserProfile;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  localStorage.removeItem(PROFILE_STORAGE_KEY);
}

interface SessionContextValue {
  session: Session | null;
  profile: UserProfile | null;
  isCreator: boolean;
  signIn: (email: string) => void;
  completeOnboarding: (profile: UserProfile) => void;
  updateProfile: (profile: UserProfile) => void;
  signOut: () => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de SessionContext');
  return ctx;
}
