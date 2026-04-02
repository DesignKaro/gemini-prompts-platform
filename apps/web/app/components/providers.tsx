'use client';

import { useEffect, useRef } from 'react';
import { getSession, signOut, SessionProvider } from 'next-auth/react';
import { buildAuthCallbackFallbackFromPath } from '../../lib/utils/auth-callback';
import { redirectToLoginPage } from '../../lib/utils/auth-redirect';

type SessionWithAuthError = {
  authError?: string;
};

function SessionExpiryGuard() {
  const isRedirectingRef = useRef(false);
  const checkInFlightRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    let isActive = true;

    const checkSessionExpiry = async () => {
      if (!isActive || isRedirectingRef.current || checkInFlightRef.current) return;

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
            redirectToLoginPage(callbackPath, { replace: true });
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
    }, 3000);
    window.addEventListener('focus', onWindowVisible);
    document.addEventListener('visibilitychange', onWindowVisible);

    return () => {
      isActive = false;
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      window.removeEventListener('focus', onWindowVisible);
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
