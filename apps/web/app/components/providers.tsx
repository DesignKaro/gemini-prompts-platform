'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { signOut, SessionProvider, useSession } from 'next-auth/react';
import { buildAuthCallbackFallbackFromPath } from '../../lib/utils/auth-callback';
import { redirectToLoginPage } from '../../lib/utils/auth-redirect';

function SessionExpiryGuard() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isRedirectingRef = useRef(false);
  const signOutTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (signOutTimerRef.current) {
        window.clearTimeout(signOutTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (session?.authError !== 'RefreshAccessTokenError') return;
    if (isRedirectingRef.current) return;

    isRedirectingRef.current = true;
    const callbackPath = buildAuthCallbackFallbackFromPath(
      pathname || '/',
      searchParams?.toString() ? `?${searchParams.toString()}` : '',
    );

    signOutTimerRef.current = window.setTimeout(() => {
      redirectToLoginPage(callbackPath, { replace: true });
    }, 1200);

    void signOut({ redirect: false })
      .catch(() => null)
      .finally(() => {
        if (signOutTimerRef.current) {
          window.clearTimeout(signOutTimerRef.current);
          signOutTimerRef.current = null;
        }
        redirectToLoginPage(callbackPath, { replace: true });
      });
  }, [pathname, searchParams, session?.authError, status]);

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
