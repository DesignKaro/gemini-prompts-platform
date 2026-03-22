'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from './site-header';
import { BackToTopButton } from './back-to-top-button';

export function ConditionalHeader() {
  const pathname = usePathname();
  if (pathname?.startsWith('/dashboard')) return null;
  return <SiteHeader />;
}

export function ConditionalShell({
  newsletterCta,
  footer,
}: {
  newsletterCta?: React.ReactNode;
  footer: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname?.startsWith('/dashboard')) return null;
  const hideNewsletterCta = pathname === '/newsletter';

  return (
    <>
      <BackToTopButton />
      {!hideNewsletterCta ? newsletterCta : null}
      {footer}
    </>
  );
}
