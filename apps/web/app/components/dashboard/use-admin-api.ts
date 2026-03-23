'use client';

import { useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { refreshSession } from '../../../lib/utils/session';
import type { Session } from 'next-auth';

type RequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

type ExtendedSession = Session & { authError?: string; authErrorMessage?: string };

export function useAdminApi() {
  const { data: session, status, update } = useSession();
  const authSession = session as ExtendedSession | null;
  const authError = authSession?.authError;
  const authErrorMessage = authSession?.authErrorMessage;

  const apiBaseUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';
  }, []);

  const appOrigin = useMemo(() => {
    return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || null;
  }, []);

  const hasOriginMismatch = useCallback(() => {
    if (!appOrigin || typeof window === 'undefined') return false;
    return window.location.origin !== appOrigin;
  }, [appOrigin]);

  const isAccessTokenExpired = useCallback((expiresAt?: string | null) => {
    if (!expiresAt) return false;
    const expiresMs = Date.parse(expiresAt);
    if (Number.isNaN(expiresMs)) return false;
    return expiresMs <= Date.now() + 60_000;
  }, []);

  const getAccessToken = useCallback(async () => {
    let accessToken = session?.apiAccessToken;
    if (authError) {
      if (accessToken && !isAccessTokenExpired(session?.apiAccessTokenExpiresAt)) {
        return accessToken;
      }
      if (update) {
        const refreshed = await refreshSession(update);
        accessToken = refreshed?.apiAccessToken ?? accessToken;
        if (!accessToken) {
          const authMessage =
            refreshed?.authErrorMessage || authErrorMessage || session?.authErrorMessage;
          throw new Error(authMessage || 'Authentication is temporarily unavailable.');
        }
      } else {
        throw new Error(authErrorMessage || 'Authentication is temporarily unavailable.');
      }
    }
    if (!accessToken || isAccessTokenExpired(session?.apiAccessTokenExpiresAt)) {
      if (hasOriginMismatch()) {
        throw new Error(`App URL mismatch. Open ${appOrigin} to avoid auth session fetch errors.`);
      }
      if (update) {
        const refreshed = await refreshSession(update);
        accessToken = refreshed?.apiAccessToken;
        if (!accessToken) {
          const authMessage =
            refreshed?.authErrorMessage || authErrorMessage || session?.authErrorMessage;
          if (authMessage) {
            throw new Error(authMessage);
          }
          const sessionExpiry = session?.apiAccessTokenExpiresAt
            ? Date.parse(session.apiAccessTokenExpiresAt)
            : NaN;
          if (
            session?.apiAccessToken &&
            !Number.isNaN(sessionExpiry) &&
            sessionExpiry > Date.now()
          ) {
            return session.apiAccessToken;
          }
          throw new Error(
            'Unable to refresh auth session. Please restart the web app and try again.',
          );
        }
      }
    }
    return accessToken ?? null;
  }, [
    appOrigin,
    authError,
    authErrorMessage,
    hasOriginMismatch,
    isAccessTokenExpired,
    session?.apiAccessToken,
    session?.apiAccessTokenExpiresAt,
    update,
  ]);

  const request = useCallback(
    async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Session expired. Please sign out and sign in again.');
      }

      const headers: Record<string, string> = {
        ...(options.headers ?? {}),
        Authorization: `Bearer ${token}`,
      };

      const hasBody = options.body !== undefined && options.body !== null;
      const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

      if (hasBody && !isFormData && !headers['content-type']) {
        headers['content-type'] = 'application/json';
      }

      let response = await fetch(`${apiBaseUrl}${path}`, {
        ...options,
        headers,
        cache: 'no-store',
      });

      if (response.status === 401 && update) {
        const refreshed = await refreshSession(update);
        const retryToken = refreshed?.apiAccessToken;
        if (retryToken) {
          response = await fetch(`${apiBaseUrl}${path}`, {
            ...options,
            headers: {
              ...headers,
              Authorization: `Bearer ${retryToken}`,
            },
            cache: 'no-store',
          });
        }
      }

      const contentType = response.headers.get('content-type') ?? '';
      const expectsJson = contentType.includes('application/json');
      const shouldParseBody = response.status !== 204;
      let payload: unknown = null;

      if (shouldParseBody) {
        if (expectsJson) {
          payload = await response.json().catch(() => null);
        } else {
          payload = await response.text().catch(() => null);
        }
      }

      if (!response.ok) {
        const message =
          typeof payload === 'object' && payload && 'message' in payload
            ? String((payload as { message?: unknown }).message)
            : typeof payload === 'string' && payload
              ? payload
              : 'Request failed.';
        throw new Error(message);
      }

      return payload as T;
    },
    [apiBaseUrl, getAccessToken, update],
  );

  return {
    apiBaseUrl,
    request,
    status,
    session,
  };
}
