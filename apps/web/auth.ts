import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import type { JWT } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { hasDashboardAccess } from './lib/utils/permissions';

type ApiUser = {
  id: string;
  email: string;
  name: string | null;
  handle: string | null;
  profileTitle: string | null;
  bio: string | null;
  focusTags: string[] | null;
  avatarUrl: string | null;
  avatarUpdatedAt: string | null;
  role: 'ADMIN' | 'EDITOR' | 'MODERATOR' | 'USER' | 'SUPERADMIN';
  plan: 'FREE' | 'PREMIUM';
  permissions?: string[];
  roleNames?: string[];
};

type ApiAuthResponse = {
  user: ApiUser;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
};

type AuthExtendedUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  handle?: string | null;
  profileTitle?: string | null;
  bio?: string | null;
  focusTags?: string[] | null;
  avatarUpdatedAt?: string | null;
  role: ApiUser['role'];
  plan: ApiUser['plan'];
  apiAccessToken: string;
  apiAccessTokenExpiresAt: string;
  apiRefreshToken: string;
  permissions?: string[];
  roleNames?: string[];
};

class AuthApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
  }
}

class InvalidCredentialsSigninError extends CredentialsSignin {
  code = 'invalid_credentials';
}

class EmailAlreadyExistsSigninError extends CredentialsSignin {
  code = 'email_exists';
}

class WeakPasswordSigninError extends CredentialsSignin {
  code = 'weak_password';
}

class InvalidEmailSigninError extends CredentialsSignin {
  code = 'invalid_email';
}

class AuthServiceUnavailableSigninError extends CredentialsSignin {
  code = 'auth_unavailable';
}

class AuthUnknownSigninError extends CredentialsSignin {
  code = 'auth_unknown';
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  return value.trim();
}

const googleClientId = optionalEnv('GOOGLE_CLIENT_ID');
const googleClientSecret = optionalEnv('GOOGLE_CLIENT_SECRET');
const nextAuthSecret =
  optionalEnv('NEXTAUTH_SECRET') ||
  (process.env.NODE_ENV === 'development'
    ? 'dev-only-insecure-secret-change-in-env'
    : undefined);
const authApiUrl = optionalEnv('AUTH_API_URL');

if (process.env.NODE_ENV === 'development' && (!googleClientId || !googleClientSecret)) {
  console.warn('[auth] Google provider disabled: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET missing.');
}

function normalizeApiUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function buildApiBaseUrls(): string[] {
  const candidates = [
    authApiUrl,
    process.env.NEXT_PUBLIC_API_URL,
    'http://127.0.0.1:4000',
    'http://localhost:4000',
  ];

  const unique = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate || !candidate.trim()) continue;
    unique.add(normalizeApiUrl(candidate.trim()));
  }

  return [...unique];
}

const apiBaseUrls = buildApiBaseUrls();

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function safeAvatarUrl(value: string | null | undefined): string | undefined {
  if (!isNonEmptyString(value)) {
    return undefined;
  }
  if (value.startsWith('data:')) {
    return undefined;
  }
  if (value.length > 1024) {
    return undefined;
  }
  return value;
}

async function authFetch(url: string, body: Record<string, unknown>): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function authApiRequest(path: string, body: Record<string, unknown>): Promise<ApiAuthResponse> {
  let lastError: AuthApiError | null = null;

  try {
    for (const baseUrl of apiBaseUrls) {
      try {
        const response = await authFetch(`${baseUrl}${path}`, body);
        const payload = (await response.json().catch(() => null)) as
          | (ApiAuthResponse & { message?: string | string[] })
          | { message?: string | string[] }
          | null;

        if (!response.ok || !payload || !('user' in payload)) {
          const message =
            payload && 'message' in payload
              ? Array.isArray(payload.message)
                ? payload.message[0] || 'Authentication request failed.'
                : payload.message || 'Authentication request failed.'
              : 'Authentication request failed.';
          const apiError = new AuthApiError(message, response.status);

          // Retry only if endpoint may be unreachable/incorrect for this base URL.
          if (response.status === 404 || response.status >= 500) {
            lastError = apiError;
            continue;
          }

          throw apiError;
        }

        return payload;
      } catch (error) {
        if (error instanceof AuthApiError) {
          throw error;
        }

        lastError = new AuthApiError('Auth service is unavailable.');
        continue;
      }
    }

    throw lastError ?? new AuthApiError('Auth service is unavailable.');
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error;
    }
    throw new AuthApiError('Auth service is unavailable.');
  }
}

async function exchangeGoogleWithApi(params: { idToken?: string; accessToken?: string }) {
  return authApiRequest('/api/auth/google/exchange', params);
}

async function loginWithCredentials(params: { email: string; password: string }) {
  return authApiRequest('/api/auth/login', params);
}

async function registerWithCredentials(params: { email: string; password: string }) {
  return authApiRequest('/api/auth/register', params);
}

async function refreshApiSession(refreshToken: string) {
  return authApiRequest('/api/auth/refresh', { refreshToken });
}

function mergeTokenFromApiResponse(token: JWT, auth: ApiAuthResponse): JWT {
  token.sub = auth.user.id;
  token.email = auth.user.email;
  token.name = auth.user.name;
  token.picture = safeAvatarUrl(auth.user.avatarUrl);
  token.handle = auth.user.handle;
  token.role = auth.user.role;
  token.plan = auth.user.plan;
  token.profileTitle = auth.user.profileTitle;
  token.bio = auth.user.bio;
  token.focusTags = auth.user.focusTags ?? undefined;
  token.avatarUpdatedAt = auth.user.avatarUpdatedAt ?? undefined;
  token.apiAccessToken = auth.accessToken;
  token.apiAccessTokenExpiresAt = auth.accessTokenExpiresAt;
  token.apiRefreshToken = auth.refreshToken;
  token.permissions = auth.user.permissions ?? [];
  token.roleNames = auth.user.roleNames ?? [auth.user.role];
  token.authError = undefined;
  token.authErrorMessage = undefined;
  token.authRetryAt = undefined;
  token.googleIdToken = undefined;
  token.googleAccessToken = undefined;
  return token;
}

function accessTokenExpired(token: JWT): boolean {
  if (!isNonEmptyString(token.apiAccessTokenExpiresAt)) {
    return true;
  }

  const expiresAt = Date.parse(token.apiAccessTokenExpiresAt);
  if (Number.isNaN(expiresAt)) {
    return true;
  }

  const refreshThresholdMs = 30 * 1000;
  return Date.now() >= expiresAt - refreshThresholdMs;
}

const authConfig: NextAuthConfig = {
  secret: nextAuthSecret,
  trustHost: true,
  debug: process.env.NODE_ENV === 'development',
  session: {
    strategy: 'jwt',
  },
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          }),
        ]
      : []),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        mode: { label: 'Mode', type: 'text' },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        const mode = credentials?.mode;
        if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
          throw new AuthUnknownSigninError();
        }
        const isSignup = isNonEmptyString(mode) && mode === 'signup';

        try {
          const auth = isSignup
            ? await registerWithCredentials({ email, password })
            : await loginWithCredentials({ email, password });

          const user: AuthExtendedUser = {
            id: auth.user.id,
            email: auth.user.email,
            name: auth.user.name,
            image: auth.user.avatarUrl,
            handle: auth.user.handle,
            profileTitle: auth.user.profileTitle,
            bio: auth.user.bio,
            focusTags: auth.user.focusTags ?? undefined,
            avatarUpdatedAt: auth.user.avatarUpdatedAt ?? undefined,
            role: auth.user.role,
            plan: auth.user.plan,
            apiAccessToken: auth.accessToken,
            apiAccessTokenExpiresAt: auth.accessTokenExpiresAt,
            apiRefreshToken: auth.refreshToken,
            permissions: auth.user.permissions ?? [],
            roleNames: auth.user.roleNames ?? [auth.user.role],
          };

          return user;
        } catch (error) {
          console.error('[auth] Credentials authorize failed:', error);
        if (error instanceof AuthApiError) {
          if (!error.status) {
            throw new AuthServiceUnavailableSigninError();
          }

          if (error.status === 404 || error.status >= 500) {
            throw new AuthServiceUnavailableSigninError();
          }

          const normalizedMessage = error.message.toLowerCase();
          if (isSignup) {
            if (error.status === 409 || normalizedMessage.includes('already exists')) {
              throw new EmailAlreadyExistsSigninError();
            }
            if (error.status === 400 && normalizedMessage.includes('email')) {
              throw new InvalidEmailSigninError();
            }
            if (error.status === 400 && normalizedMessage.includes('password')) {
              throw new WeakPasswordSigninError();
            }
          }

          if (!isSignup && error.status === 401) {
            throw new InvalidCredentialsSigninError();
          }

          if (!isSignup && error.status === 400 && normalizedMessage.includes('email')) {
            throw new InvalidEmailSigninError();
          }

          throw new AuthUnknownSigninError();
        }

          throw new AuthUnknownSigninError();
        }
      },
    }),
  ],
  callbacks: {
    authorized({ request, auth }) {
      if (!request.nextUrl.pathname.startsWith('/dashboard')) {
        return true;
      }

      if (!auth) {
        return NextResponse.redirect(new URL('/', request.nextUrl));
      }

      if (!hasDashboardAccess(auth)) {
        return NextResponse.redirect(new URL('/profile', request.nextUrl));
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === 'credentials' && user) {
        return mergeTokenFromApiResponse(token, {
          user: {
            id: user.id ?? '',
            email: user.email ?? '',
            name: user.name ?? null,
            avatarUrl: user.image ?? null,
            handle: (user as AuthExtendedUser).handle ?? null,
            profileTitle: (user as AuthExtendedUser).profileTitle ?? null,
            bio: (user as AuthExtendedUser).bio ?? null,
            focusTags: (user as AuthExtendedUser).focusTags ?? null,
            avatarUpdatedAt: (user as AuthExtendedUser).avatarUpdatedAt ?? null,
            role: (user as AuthExtendedUser).role,
            plan: (user as AuthExtendedUser).plan,
          },
          accessToken: (user as AuthExtendedUser).apiAccessToken,
          accessTokenExpiresAt: (user as AuthExtendedUser).apiAccessTokenExpiresAt,
          refreshToken: (user as AuthExtendedUser).apiRefreshToken,
        });
      }

      if (account?.provider === 'google') {
        const idToken = isNonEmptyString(account.id_token) ? account.id_token : undefined;
        const accessToken = isNonEmptyString(account.access_token) ? account.access_token : undefined;

        if (user) {
          token.sub = user.id ?? token.sub;
          token.email = user.email ?? token.email;
          token.name = user.name ?? token.name;
          token.picture = user.image ?? token.picture;
        }

        if (idToken) {
          token.googleIdToken = idToken;
        }
        if (accessToken) {
          token.googleAccessToken = accessToken;
        }

        if (!idToken && !accessToken) {
          console.error('[auth] Google login did not return id_token or access_token.');
          token.authError = 'GoogleTokenMissing';
          token.authErrorMessage = 'Google login did not return a valid token.';
          return token;
        }

        try {
          const auth = await exchangeGoogleWithApi({ idToken, accessToken });
          return mergeTokenFromApiResponse(token, auth);
        } catch (error) {
          console.error('[auth] Google backend exchange failed:', error);
          token.authError = 'GoogleBackendSyncFailed';
          token.authErrorMessage =
            error instanceof AuthApiError ? error.message : 'Google backend exchange failed.';
          token.authRetryAt = Date.now() + 60_000;
          return token;
        }
      }

      if (
        token.authError === 'GoogleBackendSyncFailed' &&
        (isNonEmptyString(token.googleIdToken) || isNonEmptyString(token.googleAccessToken))
      ) {
        const retryAt = typeof token.authRetryAt === 'number' ? token.authRetryAt : 0;
        if (retryAt && Date.now() < retryAt) {
          return token;
        }
        try {
          const auth = await exchangeGoogleWithApi({
            idToken: isNonEmptyString(token.googleIdToken) ? token.googleIdToken : undefined,
            accessToken: isNonEmptyString(token.googleAccessToken) ? token.googleAccessToken : undefined,
          });
          return mergeTokenFromApiResponse(token, auth);
        } catch (error) {
          console.error('[auth] Google backend retry failed:', error);
          token.authErrorMessage =
            error instanceof AuthApiError ? error.message : 'Google backend retry failed.';
          token.authRetryAt = Date.now() + 60_000;
        }
      }

      if (isNonEmptyString(token.apiRefreshToken) && accessTokenExpired(token)) {
        try {
          const refreshed = await refreshApiSession(token.apiRefreshToken);
          return mergeTokenFromApiResponse(token, refreshed);
        } catch {
          token.authError = 'RefreshAccessTokenError';
          token.authErrorMessage = 'Session refresh failed.';
          token.apiAccessToken = undefined;
          token.apiAccessTokenExpiresAt = undefined;
          token.apiRefreshToken = undefined;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub && typeof token.sub === 'string') {
        session.user.id = token.sub;
      }
      if (session.user && isNonEmptyString(token.role)) {
        session.user.role = token.role;
      }
      if (session.user && Array.isArray(token.roleNames)) {
        session.user.roleNames = token.roleNames;
      }
      if (session.user && isNonEmptyString(token.plan)) {
        session.user.plan = token.plan;
      }
      if (session.user) {
        session.user.profileTitle = token.profileTitle ?? null;
        session.user.bio = token.bio ?? null;
        session.user.focusTags = Array.isArray(token.focusTags) ? token.focusTags : null;
        session.user.avatarUpdatedAt = (token.avatarUpdatedAt as string | null) ?? null;
        session.user.handle = token.handle ?? null;
      }
      if (isNonEmptyString(token.apiAccessToken)) {
        session.apiAccessToken = token.apiAccessToken;
      }
      if (isNonEmptyString(token.apiAccessTokenExpiresAt)) {
        session.apiAccessTokenExpiresAt = token.apiAccessTokenExpiresAt;
      }
      if (Array.isArray(token.permissions)) {
        session.user.permissions = token.permissions;
      }
      if (isNonEmptyString(token.authError)) {
        session.authError = token.authError;
      }
      if (isNonEmptyString(token.authErrorMessage)) {
        session.authErrorMessage = token.authErrorMessage;
      }
      return session;
    },
  },
};

const nextAuthResult = NextAuth(authConfig);

export const auth: typeof nextAuthResult.auth = nextAuthResult.auth;
export const handlers = nextAuthResult.handlers;
export const signIn = nextAuthResult.signIn;
export const signOut = nextAuthResult.signOut;
