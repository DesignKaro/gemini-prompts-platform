'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthModal } from '../components/auth-modal';
import { normalizeAuthCallbackPath } from '../../lib/utils/auth-callback';

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const requested = searchParams?.get('callbackUrl') ?? undefined;
    return normalizeAuthCallbackPath(requested, { origin, fallback: '/' });
  }, [searchParams]);

  return (
    <main className="bg-white px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[80vh] max-h-[80vh] w-full max-w-5xl items-center justify-center overflow-y-auto">
        <AuthModal
          variant="page"
          callbackUrl={callbackUrl}
          onClose={() => {
            router.push('/');
          }}
        />
      </div>
    </main>
  );
}
