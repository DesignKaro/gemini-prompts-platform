import type { Session } from 'next-auth';

export const PROTECTED_SUPERADMIN_EMAIL = 'argro.official@gmail.com';
const SYSTEM_ROLE_NAMES = ['SUPERADMIN', 'ADMIN', 'EDITOR', 'MODERATOR', 'USER'] as const;
const STAFF_ROLE_NAMES = ['SUPERADMIN', 'ADMIN', 'EDITOR', 'MODERATOR'] as const;
const DASHBOARD_PERMISSION_HINTS = [
  'users:read',
  'users:manage',
  'roles:read',
  'roles:manage',
  'permissions:read',
  'prompts:manage',
  'posts:manage',
  'media:read',
  'media:manage',
  'categories:read',
  'categories:manage',
  'tags:read',
  'tags:manage',
  'comments:moderate',
  'analytics:read',
  'activity:read',
  'contacts:read',
  'contacts:manage',
] as const;

export function isProtectedSuperadminEmail(email?: string | null): boolean {
  return email?.trim().toLowerCase() === PROTECTED_SUPERADMIN_EMAIL;
}

export function isSuperadminSession(session: Session | null | undefined): boolean {
  return isProtectedSuperadminEmail(session?.user?.email);
}

function isSystemRoleName(roleName: string): roleName is (typeof SYSTEM_ROLE_NAMES)[number] {
  return SYSTEM_ROLE_NAMES.includes(roleName as (typeof SYSTEM_ROLE_NAMES)[number]);
}

export function isStaffSession(session: Session | null | undefined): boolean {
  if (isSuperadminSession(session)) return true;

  const systemRole = session?.user?.role;
  if (systemRole && STAFF_ROLE_NAMES.includes(systemRole as (typeof STAFF_ROLE_NAMES)[number])) {
    return true;
  }

  const roleNames = session?.user?.roleNames ?? [];
  return roleNames.some((roleName) => !isSystemRoleName(roleName));
}

export function hasPermission(session: Session | null | undefined, permission: string): boolean {
  if (isSuperadminSession(session)) return true;
  return Boolean(session?.user?.permissions?.includes(permission));
}

export function hasAnyPermission(
  session: Session | null | undefined,
  permissions: string[],
): boolean {
  if (isSuperadminSession(session)) return true;
  const current = session?.user?.permissions ?? [];
  return permissions.some((permission) => current.includes(permission));
}

export function hasAllPermissions(
  session: Session | null | undefined,
  permissions: string[],
): boolean {
  if (isSuperadminSession(session)) return true;
  const current = session?.user?.permissions ?? [];
  return permissions.every((permission) => current.includes(permission));
}

export function hasDashboardAccess(session: Session | null | undefined): boolean {
  if (isStaffSession(session)) return true;
  return hasAnyPermission(session, [...DASHBOARD_PERMISSION_HINTS]);
}
