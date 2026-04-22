'use client';

import { useEffect, useRef } from 'react';
import { getSession, signOut, SessionProvider } from 'next-auth/react';
import { buildAuthCallbackFallbackFromPath } from '../../lib/utils/auth-callback';
import { redirectToSignInModal } from '../../lib/utils/auth-redirect';

type SessionWithAuthError = {
  authError?: string;
};

const SESSION_EXPIRY_CHECK_INTERVAL_MS = 60_000;

function SessionExpiryGuard() {
  const isRedirectingRef = useRef(false);
  const checkInFlightRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    let isActive = true;

    const checkSessionExpiry = async () => {
      if (!isActive || isRedirectingRef.current || checkInFlightRef.current) return;
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;

      checkInFlightRef.current = true;
      try {
        const session = (await getSession()) as SessionWithAuthError | null;
        if (!isActive || isRedirectingRef.current) return;
        if (session?.authError !== 'RefreshAccessTokenError') return;

        isRedirectingRef.current = true;
        const callbackPath = buildAuthCallbackFallbackFromPath(
          window.location.pathname || '/',
          window.location.search || '',
          window.location.hash || '',
        );

        void signOut({ redirect: false })
          .catch(() => null)
          .finally(() => {
            redirectToSignInModal(callbackPath, { replace: true });
          });
      } finally {
        checkInFlightRef.current = false;
      }
    };

    const onWindowVisible = () => {
      if (document.visibilityState === 'visible') {
        void checkSessionExpiry();
      }
    };

    void checkSessionExpiry();
    intervalRef.current = window.setInterval(() => {
      void checkSessionExpiry();
    }, SESSION_EXPIRY_CHECK_INTERVAL_MS);
    window.addEventListener('focus', onWindowVisible);
    window.addEventListener('online', onWindowVisible);
    document.addEventListener('visibilitychange', onWindowVisible);

    return () => {
      isActive = false;
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      window.removeEventListener('focus', onWindowVisible);
      window.removeEventListener('online', onWindowVisible);
      document.removeEventListener('visibilitychange', onWindowVisible);
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchWhenOffline={false}>
      <SessionExpiryGuard />
      {children}
    </SessionProvider>
  );
}
