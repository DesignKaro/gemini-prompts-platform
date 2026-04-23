'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { refreshSession } from '../../../lib/utils/session';
import type { Session } from 'next-auth';

type RequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
  actionName?: string;
  dedupeKey?: string;
  timeoutMs?: number;
  retryCount?: number;
  preventDuplicate?: boolean;
  pendingKey?: string;
  skipProcessingTracking?: boolean;
};

type ExtendedSession = Session & { authError?: string; authErrorMessage?: string };

type ApiErrorPayload = {
  statusCode?: unknown;
  message?: unknown;
  error?: unknown;
  code?: unknown;
  requestId?: unknown;
};

type RequestExecutionContext = {
  token: string;
  path: string;
  options: RequestOptions;
};

const DEFAULT_TIMEOUT_MS = 15_000;
const MEDIA_UPLOAD_TIMEOUT_MS = 90_000;
const DASHBOARD_ACTION_HEADER = 'x-dashboard-action';

type PendingListener = () => void;

const pendingCountsByKey = new Map<string, number>();
const pendingListeners = new Set<PendingListener>();

function normalizePendingKey(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function notifyPendingListeners() {
  pendingListeners.forEach((listener) => listener());
}

function incrementPendingCount(key: string) {
  const current = pendingCountsByKey.get(key) ?? 0;
  pendingCountsByKey.set(key, current + 1);
  notifyPendingListeners();
}

function decrementPendingCount(key: string) {
  const current = pendingCountsByKey.get(key) ?? 0;
  if (current <= 1) {
    pendingCountsByKey.delete(key);
  } else {
    pendingCountsByKey.set(key, current - 1);
  }
  notifyPendingListeners();
}

function subscribePending(listener: PendingListener) {
  pendingListeners.add(listener);
  return () => {
    pendingListeners.delete(listener);
  };
}

function hasAnyPending() {
  return pendingCountsByKey.size > 0;
}

function hasPendingKey(key: string) {
  return (pendingCountsByKey.get(key) ?? 0) > 0;
}

function isDashboardApiPath(path: string) {
  const normalizedPath = path.split('?')[0] ?? path;
  return normalizedPath.startsWith('/api/admin') || normalizedPath.startsWith('/api/auth/profile');
}

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

function extractMessage(value: unknown): string | null {
  if (Array.isArray(value)) {
    const normalized = value.map((entry) => String(entry).trim()).filter(Boolean);
    return normalized.length > 0 ? normalized.join('. ') : null;
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return null;
}

function defaultActionName(method: string, path: string) {
  const normalizedPath = path.split('?')[0] ?? path;
  const cleanPath = normalizedPath.replace(/^\/api\//, '');
  return `${method.toLowerCase()} ${cleanPath}`;
}

function defaultTimeoutForPath(path: string) {
  const normalizedPath = path.split('?')[0] ?? path;
  if (normalizedPath === '/api/admin/media/upload') {
    return MEDIA_UPLOAD_TIMEOUT_MS;
  }
  return DEFAULT_TIMEOUT_MS;
}

export class DashboardApiError extends Error {
  readonly actionName: string;
  readonly path: string;
  readonly statusCode?: number;
  readonly code?: string;
  readonly requestId?: string;

  constructor(params: {
    actionName: string;
    path: string;
    message: string;
    statusCode?: number;
    code?: string;
    requestId?: string;
  }) {
    const requestIdSuffix = params.requestId ? ` (Request ID: ${params.requestId})` : '';
    super(`${params.actionName}: ${params.message}${requestIdSuffix}`);
    this.name = 'DashboardApiError';
    this.actionName = params.actionName;
    this.path = params.path;
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.requestId = params.requestId;
  }
}

export function useAdminApi() {
  const { data: session, status, update } = useSession();
  const authSession = session as ExtendedSession | null;
  const authError = authSession?.authError;
  const authErrorMessage = authSession?.authErrorMessage;
  const inFlightRequestsRef = useRef(new Map<string, Promise<unknown>>());
  const [pendingVersion, setPendingVersion] = useState(0);

  useEffect(
    () =>
      subscribePending(() => {
        setPendingVersion((current) => (current + 1) % 1_000_000);
      }),
    [],
  );

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

  const executeOnce = useCallback(
    async ({
      token,
      path,
      options,
      actionName,
    }: RequestExecutionContext & { actionName: string }): Promise<unknown> => {
      const headers: Record<string, string> = {
        [DASHBOARD_ACTION_HEADER]: actionName,
        ...(options.headers ?? {}),
        Authorization: `Bearer ${token}`,
      };

      const hasBody = options.body !== undefined && options.body !== null;
      const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
      const hasContentTypeHeader = Object.keys(headers).some(
        (header) => header.toLowerCase() === 'content-type',
      );

      if (hasBody && !isFormData && !hasContentTypeHeader) {
        headers['content-type'] = 'application/json';
      }

      const timeoutMs = options.timeoutMs ?? defaultTimeoutForPath(path);
      const timeoutController = new AbortController();
      const timeoutRef = window.setTimeout(() => timeoutController.abort(), timeoutMs);

      let abortListener: (() => void) | undefined;
      const externalSignal = options.signal;
      if (externalSignal) {
        if (externalSignal.aborted) {
          timeoutController.abort();
        } else {
          abortListener = () => timeoutController.abort();
          externalSignal.addEventListener('abort', abortListener, { once: true });
        }
      }

      try {
        const requestInit: RequestInit = {
          ...options,
          headers,
          signal: timeoutController.signal,
          cache: 'no-store',
        };

        let response = await fetch(`${apiBaseUrl}${path}`, requestInit);

        if (response.status === 401 && update) {
          const refreshed = await refreshSession(update);
          const retryToken = refreshed?.apiAccessToken;
          if (retryToken) {
            response = await fetch(`${apiBaseUrl}${path}`, {
              ...requestInit,
              headers: {
                ...headers,
                Authorization: `Bearer ${retryToken}`,
              },
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

        const requestIdFromHeader = response.headers.get('x-request-id') ?? undefined;
        const requestIdFromBody =
          payload && typeof payload === 'object'
            ? extractMessage((payload as ApiErrorPayload).requestId)
            : null;
        const requestId = requestIdFromHeader ?? requestIdFromBody ?? undefined;
        const responseErrorCode =
          payload &&
          typeof payload === 'object' &&
          typeof (payload as ApiErrorPayload).code === 'string'
            ? ((payload as ApiErrorPayload).code as string)
            : undefined;

        if (!response.ok) {
          const payloadMessage =
            payload && typeof payload === 'object'
              ? extractMessage((payload as ApiErrorPayload).message)
              : null;

          const apiMessage =
            payloadMessage ??
            (typeof payload === 'string' && payload.trim() ? payload.trim() : 'Request failed.');

          throw new DashboardApiError({
            actionName,
            path,
            message: apiMessage,
            statusCode: response.status,
            code: responseErrorCode,
            requestId,
          });
        }

        return payload;
      } catch (error) {
        if (isAbortError(error) && externalSignal?.aborted) {
          throw error;
        }

        if (isAbortError(error)) {
          throw new DashboardApiError({
            actionName,
            path,
            message: 'Request timed out. Please retry.',
            statusCode: 408,
            code: 'TIMEOUT',
          });
        }

        if (error instanceof DashboardApiError) {
          throw error;
        }

        throw new DashboardApiError({
          actionName,
          path,
          message: error instanceof Error ? error.message : 'Network request failed.',
          code: 'NETWORK_ERROR',
        });
      } finally {
        window.clearTimeout(timeoutRef);
        if (externalSignal && abortListener) {
          externalSignal.removeEventListener('abort', abortListener);
        }
      }
    },
    [apiBaseUrl, update],
  );

  const request = useCallback(
    async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
      const token = await getAccessToken();
      if (!token) {
        throw new DashboardApiError({
          actionName: options.actionName ?? defaultActionName(options.method ?? 'GET', path),
          path,
          message: 'Session expired. Please sign out and sign in again.',
          statusCode: 401,
          code: 'SESSION_EXPIRED',
        });
      }

      const method = (options.method ?? 'GET').toUpperCase();
      const providedActionName = options.actionName?.trim();
      const actionName = providedActionName || defaultActionName(method, path);

      if (
        !providedActionName &&
        isDashboardApiPath(path) &&
        process.env.NODE_ENV !== 'production'
      ) {
        console.warn(
          `[dashboard-api] missing explicit actionName for ${method} ${path}; using "${actionName}".`,
        );
      }

      const dedupeKey =
        options.dedupeKey ??
        `${actionName}:${method}:${path}:${typeof options.body === 'string' ? options.body : 'body'}`;
      const shouldPreventDuplicate = options.preventDuplicate ?? true;
      const isMutation = method !== 'GET' && method !== 'HEAD';
      const retryCount = Math.max(0, Math.min(options.retryCount ?? 1, 1));
      const trackedPendingKey = !options.skipProcessingTracking
        ? (normalizePendingKey(options.pendingKey) ?? (isMutation ? actionName : null))
        : null;

      if (shouldPreventDuplicate) {
        const inFlight = inFlightRequestsRef.current.get(dedupeKey);
        if (inFlight) {
          return inFlight as Promise<T>;
        }
      }

      const execute = async () => {
        let attempt = 0;

        while (attempt <= retryCount) {
          try {
            const result = await executeOnce({
              token,
              path,
              options,
              actionName,
            });
            return result as T;
          } catch (error) {
            const isFinalAttempt = attempt >= retryCount;
            const shouldRetryForStatus =
              error instanceof DashboardApiError && error.statusCode === 503 && !isFinalAttempt;
            const shouldRetryForTimeout =
              error instanceof DashboardApiError &&
              error.code === 'TIMEOUT' &&
              !isFinalAttempt &&
              !isMutation;

            if (!shouldRetryForStatus && !shouldRetryForTimeout) {
              throw error;
            }

            attempt += 1;
            await new Promise((resolve) => window.setTimeout(resolve, 250));
          }
        }

        throw new DashboardApiError({
          actionName,
          path,
          message: 'Request failed after retry.',
        });
      };

      if (trackedPendingKey) {
        incrementPendingCount(trackedPendingKey);
      }

      const operation = execute().finally(() => {
        if (shouldPreventDuplicate) {
          inFlightRequestsRef.current.delete(dedupeKey);
        }
        if (trackedPendingKey) {
          decrementPendingCount(trackedPendingKey);
        }
      });

      if (shouldPreventDuplicate) {
        inFlightRequestsRef.current.set(dedupeKey, operation);
      }

      return operation;
    },
    [executeOnce, getAccessToken],
  );

  return {
    apiBaseUrl,
    request,
    isPending: (key: string) => {
      void pendingVersion;
      const normalizedKey = normalizePendingKey(key);
      if (!normalizedKey) return false;
      return hasPendingKey(normalizedKey);
    },
    isAnyPending: (() => {
      void pendingVersion;
      return hasAnyPending();
    })(),
    status,
    session,
  };
}
