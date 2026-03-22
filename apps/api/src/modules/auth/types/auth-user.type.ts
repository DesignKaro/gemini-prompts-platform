import type { MembershipPlan, UserRole } from '@prisma/client';

export type AuthUser = {
  sub: string;
  email: string;
  role: UserRole;
  plan: MembershipPlan;
  permissions?: string[];
  roleNames?: string[];
  suspendedAt?: string | null;
  iat: number;
  exp: number;
};

export type AuthenticatedRequest = {
  headers?: Record<string, string | string[] | undefined>;
  user?: AuthUser;
};
