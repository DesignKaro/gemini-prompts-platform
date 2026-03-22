import { DefaultSession } from 'next-auth';
import { JWT as DefaultJWT } from 'next-auth/jwt';

type AppUserRole = 'ADMIN' | 'EDITOR' | 'MODERATOR' | 'USER' | 'SUPERADMIN';
type AppMembershipPlan = 'FREE' | 'PREMIUM';

declare module 'next-auth' {
  interface User {
    role?: AppUserRole;
    plan?: AppMembershipPlan;
    handle?: string | null;
    profileTitle?: string | null;
    bio?: string | null;
    focusTags?: string[] | null;
    avatarUpdatedAt?: string | null;
    apiAccessToken?: string;
    apiAccessTokenExpiresAt?: string;
    apiRefreshToken?: string;
    permissions?: string[];
    roleNames?: string[];
  }

  interface Session {
    user: {
      id?: string;
      role?: AppUserRole;
      plan?: AppMembershipPlan;
      handle?: string | null;
      profileTitle?: string | null;
      bio?: string | null;
      focusTags?: string[] | null;
      avatarUpdatedAt?: string | null;
      permissions?: string[];
      roleNames?: string[];
    } & DefaultSession['user'];
    apiAccessToken?: string;
    apiAccessTokenExpiresAt?: string;
    authError?: string;
    authErrorMessage?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    role?: AppUserRole;
    plan?: AppMembershipPlan;
    handle?: string | null;
    profileTitle?: string | null;
    bio?: string | null;
    focusTags?: string[] | null;
    apiAccessToken?: string;
    apiAccessTokenExpiresAt?: string;
    apiRefreshToken?: string;
    authError?: string;
    authErrorMessage?: string;
    googleIdToken?: string;
    googleAccessToken?: string;
    permissions?: string[];
    roleNames?: string[];
  }
}
