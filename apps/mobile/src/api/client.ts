import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/auth-store';

const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL ?? 'https://geminiprompts.io').replace(/\/$/, '');
const API_BASE = `${API_ORIGIN}/api`;
const APP_VERSION = Constants.expoConfig?.version ?? 'dev';

type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type RequestOptions = {
  method?: ApiMethod;
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
  retryOnAuthFailure?: boolean;
};

let refreshInFlight: Promise<string | null> | null = null;

function buildHeaders(
  options: RequestOptions,
  accessToken: string | null,
): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-app-platform': Platform.OS,
    'x-app-version': APP_VERSION,
    ...(options.headers ?? {}),
  };

  if (options.auth && accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

async function refreshAccessToken(): Promise<string | null> {
  const state = useAuthStore.getState();
  const refreshToken = state.session?.refreshToken;
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: buildHeaders({ method: 'POST' }, null),
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await useAuthStore.getState().clearSession();
        return null;
      }

      const payload = await parseJson<{ accessToken: string; refreshToken?: string; user?: unknown }>(
        response,
      );

      const current = useAuthStore.getState().session;
      if (!current || !payload.accessToken) {
        await useAuthStore.getState().clearSession();
        return null;
      }

      await useAuthStore.getState().setSession({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken ?? current.refreshToken,
        user: current.user,
      });

      return payload.accessToken;
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const currentSession = useAuthStore.getState().session;
  const accessToken = currentSession?.accessToken ?? null;
  const method = options.method ?? 'GET';

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: buildHeaders(options, accessToken),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 401 && options.auth && options.retryOnAuthFailure !== false) {
    const refreshedAccessToken = await refreshAccessToken();
    if (!refreshedAccessToken) {
      throw new Error('Authentication expired. Please log in again.');
    }

    const retryResponse = await fetch(`${API_BASE}${path}`, {
      method,
      headers: buildHeaders(options, refreshedAccessToken),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (!retryResponse.ok) {
      const retryError = await retryResponse.text();
      throw new Error(retryError || `Request failed with status ${retryResponse.status}`);
    }

    return parseJson<T>(retryResponse);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return parseJson<T>(response);
}
