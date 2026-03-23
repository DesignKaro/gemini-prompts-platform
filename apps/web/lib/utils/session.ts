import type { Session } from 'next-auth';

type SessionUpdater = (data?: unknown) => Promise<Session | null>;
type ExtendedSession = Session & { authError?: string; authErrorMessage?: string };

let refreshPromise: Promise<Session | null> | null = null;
let refreshCooldownUntil = 0;
const REFRESH_COOLDOWN_MS = 60_000;

export async function refreshSession(update?: SessionUpdater): Promise<Session | null> {
  if (!update) return null;
  if (refreshCooldownUntil > Date.now()) return null;
  if (!refreshPromise) {
    refreshPromise = update()
      .then((session) => {
        const authError = (session as ExtendedSession | null)?.authError;
        if (authError) {
          refreshCooldownUntil = Date.now() + REFRESH_COOLDOWN_MS;
        }
        return session;
      })
      .catch((error) => {
        refreshCooldownUntil = Date.now() + REFRESH_COOLDOWN_MS;
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}
