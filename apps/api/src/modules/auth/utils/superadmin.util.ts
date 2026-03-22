export const PROTECTED_SUPERADMIN_EMAIL = 'argro.official@gmail.com';

export function normalizeProtectedSuperadminEmail(email?: string | null): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function isProtectedSuperadminEmail(email?: string | null): boolean {
  return normalizeProtectedSuperadminEmail(email) === PROTECTED_SUPERADMIN_EMAIL;
}
