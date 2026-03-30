import type { Session } from 'next-auth';

type SessionUpdater = (data?: unknown) => Promise<Session | null>;
type ExtendedSession = Session & { authError?: string; authErrorMessage?: string };
type RefreshSessionOptions = {
  force?: boolean;
};

let refreshPromise: Promise<Session | null> | null = null;
let refreshCooldownUntil = 0;
const HARD_REFRESH_COOLDOWN_MS = 10 * 60_000;
const MEDIUM_REFRESH_COOLDOWN_MS = 15_000;
const SOFT_REFRESH_COOLDOWN_MS = 5_000;
const FAST_RETRY_COOLDOWN_MS = 2_000;
const HARD_COOLDOWN_AUTH_ERRORS = new Set(['AccountSuspended']);
const MEDIUM_COOLDOWN_AUTH_ERRORS = new Set(['RefreshAccessTokenError', 'GoogleTokenMissing']);
const FAST_RETRY_AUTH_ERRORS = new Set(['GoogleBackendSyncFailed']);

function resolveRefreshCooldownMs(authError?: string | null) {
  if (!authError) return 0;
  if (HARD_COOLDOWN_AUTH_ERRORS.has(authError)) {
    return HARD_REFRESH_COOLDOWN_MS;
  }
  if (MEDIUM_COOLDOWN_AUTH_ERRORS.has(authError)) {
    return MEDIUM_REFRESH_COOLDOWN_MS;
  }
  if (FAST_RETRY_AUTH_ERRORS.has(authError)) {
    return FAST_RETRY_COOLDOWN_MS;
  }
  return SOFT_REFRESH_COOLDOWN_MS;
}

export async function refreshSession(
  update?: SessionUpdater,
  options: RefreshSessionOptions = {},
): Promise<Session | null> {
  if (!update) return null;
  const forceRefresh = options.force === true;

  if (!forceRefresh && refreshCooldownUntil > Date.now()) return null;
  if (forceRefresh) {
    refreshCooldownUntil = 0;
  }

  if (!refreshPromise) {
    refreshPromise = update(forceRefresh ? { forceRefresh: true } : undefined)
      .then((session) => {
        const authError = (session as ExtendedSession | null)?.authError;
        const cooldownMs = resolveRefreshCooldownMs(authError);
        if (cooldownMs > 0) {
          refreshCooldownUntil = Date.now() + cooldownMs;
        } else {
          refreshCooldownUntil = 0;
        }
        return session;
      })
      .catch(() => {
        refreshCooldownUntil = Date.now() + SOFT_REFRESH_COOLDOWN_MS;
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise.catch(() => null);
}
