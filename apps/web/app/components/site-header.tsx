'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import brandLogo from '../../Assets/Branding/logo.svg';
import { AuthModal } from './auth-modal';
import { getInitial, normalizeAvatarUrl } from '../../lib/utils/avatar';
import { hasDashboardAccess as userHasDashboardAccess } from '../../lib/utils/permissions';
import { SearchModal } from './search-modal';
import { MobileMenu } from './mobile-menu';

const navItems = [
  {
    href: '/',
    label: 'Home',
    prefetch: true,
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
        <path
          d="M4 10.7 12 4l8 6.7V20a1 1 0 0 1-1 1h-4.8v-5.2H9.8V21H5a1 1 0 0 1-1-1v-9.3Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: '/prompt',
    label: 'Prompts',
    prefetch: true,
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
        <rect x="3" y="3" width="18" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M7 8h10M7 12h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8 17l-2 4h12l-2-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/blog',
    label: 'Blog',
    prefetch: true,
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
        <path d="M4 4h16v16H4z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8 8h8M8 12h8M8 16h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/trending',
    label: 'Trending',
    prefetch: true,
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="16 7 22 7 22 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/newsletter',
    label: 'Newsletter',
    prefetch: true,
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
        <rect x="2" y="5" width="20" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M2 8l10 7 10-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  // {
  //   href: '/membership',
  //   label: 'Membership',
  //   icon: (
  //     <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
  //       <path d="M12 2l2.9 6.3 6.8.9-5 4.7 1.3 6.7L12 17.5l-6 3.1 1.3-6.7-5-4.7 6.8-.9z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  //     </svg>
  //   ),
  // },
];


export function SiteHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [profileSnapshot, setProfileSnapshot] = useState<{
    name: string | null;
    avatarUrl: string | null;
    avatarUpdatedAt: string | null;
  } | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const callbackUrl = pathname || '/';
  const displayName =
    session?.user?.name?.trim() || session?.user?.email?.split('@')[0] || 'Signed in';
  const hasDashboardAccess = userHasDashboardAccess(session);

  const apiBaseUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';
  }, []);

  const headerName =
    profileSnapshot?.name?.trim() || session?.user?.name?.trim() || displayName;

  const headerAvatarBase = profileSnapshot?.avatarUrl || session?.user?.image || null;
  const headerAvatarSrc =
    headerAvatarBase && profileSnapshot?.avatarUpdatedAt && !headerAvatarBase.startsWith('data:')
      ? `${headerAvatarBase}${headerAvatarBase.includes('?') ? '&' : '?'}v=${profileSnapshot.avatarUpdatedAt}`
      : headerAvatarBase;
  const menuAvatarSrc = normalizeAvatarUrl(headerAvatarSrc);
  const normalizedAvatarSrc = normalizeAvatarUrl(headerAvatarSrc);

  useEffect(() => {
    setAvatarError(false);
  }, [normalizedAvatarSrc]);

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onEscape);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (!session?.apiAccessToken) {
      return;
    }

    let isActive = true;

    const fetchProfile = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${session.apiAccessToken}`,
          },
          cache: 'no-store',
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          user: {
            name: string | null;
            avatarUrl: string | null;
            avatarUpdatedAt: string | null;
          };
        };
        if (!isActive) return;
        setProfileSnapshot({
          name: payload.user.name ?? null,
          avatarUrl: payload.user.avatarUrl ?? null,
          avatarUpdatedAt: payload.user.avatarUpdatedAt ?? null,
        });
      } catch {
        // Silent: fall back to session values.
      }
    };

    const onProfileUpdated = () => {
      void fetchProfile();
    };

    window.addEventListener('profile-updated', onProfileUpdated);

    if (!session.user?.name || !session.user?.image) {
      void fetchProfile();
    }

    return () => {
      isActive = false;
      window.removeEventListener('profile-updated', onProfileUpdated);
    };
  }, [apiBaseUrl, session?.apiAccessToken, session?.user?.image, session?.user?.name]);

  return (
    <>
      <header className="sticky top-0 z-40 px-2.5 pb-1 pt-1.5 sm:px-4 md:px-6">
        <div className="page-container-wide rounded-full border border-[#e8e8e8] bg-white/72 px-3 py-1.5 shadow-[0_10px_30px_rgba(17,17,17,0.04)] backdrop-blur-md sm:rounded-[25px] sm:px-4 md:rounded-[30px] md:px-5">
          <div className="flex min-w-0 items-center justify-between gap-2.5 sm:gap-3 lg:gap-4">
            <Link href="/" className="flex shrink-0 items-center">
              <Image
                src={brandLogo}
                alt="Gemini Prompts"
                width={250}
                height={44}
                className="h-auto w-[140px] object-contain sm:w-[178px] md:w-[205px]"
                priority
              />
            </Link>

            <nav className="hidden items-center gap-2.5 lg:flex">
              {navItems.map((item) => (
                <Link
                  key={`header-nav-${item.href}`}
                  href={item.href}
                  prefetch={item.prefetch}
                  className="flex h-[50px] items-center gap-2.5 rounded-full bg-[#e9edf1] p-2 pr-5 text-[14px] leading-none text-[#15181d]"
                >
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[#d1d8de] bg-white text-[#171b21]">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
              {status === 'authenticated' && session.user ? (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    className="flex h-[44px] items-center gap-2 rounded-full bg-[#f2f5f8] p-1.5 pr-3 text-[#171c24] sm:h-[48px] sm:p-2 sm:pr-4"
                    aria-expanded={isProfileMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Open profile menu"
                  >
                    <span className="relative flex h-[30px] w-[30px] sm:h-[34px] sm:w-[34px] items-center justify-center overflow-hidden rounded-full bg-[#e2e6ee]">
                      {normalizedAvatarSrc && !avatarError ? (
                        <img
                          src={normalizedAvatarSrc}
                          alt={headerName}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        <span className="m-auto text-[0.85rem] text-[#1b2028]">
                          {getInitial(headerName)}
                        </span>
                      )}
                    </span>
                    <span className="hidden max-w-[110px] truncate text-[14px] md:block">{headerName}</span>
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-[#5b6272]">
                      <path
                        d={isProfileMenuOpen ? 'm6 14 6-6 6 6' : 'm6 10 6 6 6-6'}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {isProfileMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 top-[calc(100%+8px)] z-[90] w-[236px] max-w-[calc(100vw-32px)] rounded-[18px] border border-[#d8dbe3] bg-white p-3 shadow-[0_16px_48px_rgba(18,24,33,0.14)] sm:w-[236px]"
                    >
                      <div className="mb-2.5 flex items-center gap-2 border-b border-[#eceff4] pb-2.5">
                        <span className="relative flex h-8 w-8 overflow-hidden rounded-full bg-[#e2e6ee]">
                          {menuAvatarSrc && !avatarError ? (
                            <img
                              src={menuAvatarSrc}
                              alt={headerName}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              onError={() => setAvatarError(true)}
                            />
                          ) : (
                            <span className="m-auto text-[0.9rem] text-[#1b2028]">
                              {headerName.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[0.9rem] text-[#141922]">{headerName}</p>
                          <p className="truncate text-[0.76rem] text-[#778093]">{session.user.email}</p>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <Link
                          href="/profile"
                          role="menuitem"
                          className="flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[0.95rem] text-[#1a1f29] transition hover:bg-[#f3f5fa]"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <span className="text-[#556072]">
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                              <circle cx="12" cy="8.1" r="3.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                              <path
                                d="M5 19a7 7 0 0 1 14 0"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                              />
                            </svg>
                          </span>
                          <span>Profile</span>
                        </Link>
                        {hasDashboardAccess ? (
                          <Link
                            href="/dashboard"
                            role="menuitem"
                            className="flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[0.95rem] text-[#1a1f29] transition hover:bg-[#f3f5fa]"
                            onClick={() => setIsProfileMenuOpen(false)}
                          >
                            <span className="text-[#556072]">
                              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                                <circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                                <path d="M12 8v8M8 12h8" fill="none" stroke="currentColor" strokeWidth="1.8" />
                              </svg>
                            </span>
                            <span>Dashboard</span>
                          </Link>
                        ) : null}
                        <Link
                          href="/profile#saved-prompts"
                          role="menuitem"
                          className="flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[0.95rem] text-[#1a1f29] transition hover:bg-[#f3f5fa]"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <span className="text-[#556072]">
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                              <path
                                d="M6 4.5h9.5a3 3 0 0 1 3 3V19a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2V6.5a2 2 0 0 1 2-2Z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path d="M8.5 8.5h7M8.5 11.5H14" fill="none" stroke="currentColor" strokeWidth="1.6" />
                            </svg>
                          </span>
                          <span>Saved prompts</span>
                        </Link>
                      </div>

                      <div className="mt-2.5 border-t border-[#e8ebf1] pt-2.5">
                        <Link
                          href="/help"
                          role="menuitem"
                          className="flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[0.95rem] text-[#1a1f29] transition hover:bg-[#f3f5fa]"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <span className="text-[#556072]">
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                              <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                              <path
                                d="M9.6 10a2.4 2.4 0 1 1 4.2 1.6c-.7.7-1.3 1-1.3 2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                              />
                              <circle cx="12" cy="16.8" r="0.9" fill="currentColor" />
                            </svg>
                          </span>
                          <span>Help</span>
                        </Link>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            void signOut({ callbackUrl });
                          }}
                          className="flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-[0.95rem] text-[#be2d2d] transition hover:bg-[#fff2f2]"
                        >
                          <span>
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                              <path
                                d="M10 16.5H6.5A2.5 2.5 0 0 1 4 14V6.5A2.5 2.5 0 0 1 6.5 4H10"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                              />
                              <path
                                d="M14 8.2 19 12l-5 3.8M9.3 12H19"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="flex h-[44px] items-center rounded-full bg-[#d5ea52] px-3.5 text-[13px] leading-none text-[#101418] sm:h-[48px] sm:px-5 sm:text-[14px]"
                >
                  Login
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search"
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#091216] text-white"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                  <circle cx="10.5" cy="10.5" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
                  <path d="m14.5 14.5 4.2 4.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open menu"
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#091216] text-white lg:hidden"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                  <path
                    d="M5 7.5h14M5 12h14M5 16.5h14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} callbackUrl={callbackUrl} />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} navItems={navItems} />
    </>
  );
}
