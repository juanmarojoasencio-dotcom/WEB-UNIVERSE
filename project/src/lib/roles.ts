export type UserRole = 'student' | 'creator';

export const CREATOR_PASSWORD = 'UNIVERSE123';

export const CREATOR_EMAILS = [
  'juarojase@alum.us.es',
  'serfermon@alum.us.es',
  'criaunnun@alum.us.es',
  'criaunnun.alum.us.es',
  'serbazfer@alum.us.es',
  'ikecasces@alum.us.es',
  'dangarrod@alum.us.es',
] as const;

export function isCreatorEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return CREATOR_EMAILS.some((allowed) => normalized === allowed);
}

export function isValidCreatorPassword(password: string): boolean {
  return password === CREATOR_PASSWORD;
}

const ROLE_STORAGE_KEY = 'uniVerse.role';

export function loadRole(): UserRole | null {
  try {
    const raw = localStorage.getItem(ROLE_STORAGE_KEY);
    if (raw === 'student' || raw === 'creator') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveRole(role: UserRole): void {
  localStorage.setItem(ROLE_STORAGE_KEY, role);
}

export function clearRole(): void {
  localStorage.removeItem(ROLE_STORAGE_KEY);
}
