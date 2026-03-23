'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  MdDashboard,
  MdDescription,
  MdCategory,
  MdLabel,
  MdComment,
  MdAnalytics,
  MdGroup,
  MdSecurity,
  MdSettings,
  MdAdd,
  MdMenu,
  MdClose,
  MdPostAdd,
  MdNavigateNext,
  MdChevronRight,
  MdDeleteOutline,
  MdSearch,
} from 'react-icons/md';
import brandLogo from '../../Assets/Branding/logo.svg';
import {
  hasAnyPermission,
  hasDashboardAccess as userHasDashboardAccess,
} from '../../lib/utils/permissions';

type DashboardNavChild = {
  href: string;
  label: string;
  icon?: React.ReactNode;
};

type DashboardNavItem = {
  href?: string;
  label: string;
  icon: React.ReactNode;
  children?: DashboardNavChild[];
};

function DashboardLink({
  href,
  className,
  children,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) {
  const router = useRouter();
  const isDashboard = href.startsWith('/dashboard');
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isDashboard) return;
    e.preventDefault();
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (
        document as Document & { startViewTransition: (cb: () => void) => void }
      ).startViewTransition(() => {
        router.push(href);
      });
    } else {
      router.push(href);
    }
  };
  return (
    <Link href={href} className={className} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status: sessionStatus, update: refreshSession } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Content']);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    handle: '',
    profileTitle: '',
    bio: '',
    focusTags: [] as string[],
    avatarUrl: '',
    avatarUpdatedAt: null as string | null,
  });
  const [focusTagsInput, setFocusTagsInput] = useState('');
  const [profileSnapshot, setProfileSnapshot] = useState<{
    name: string | null;
    avatarUrl: string | null;
    avatarUpdatedAt: string | null;
    role: string | null;
  } | null>(null);

  const hasDashboardAccess = userHasDashboardAccess(session);
  const canViewPrompts = hasAnyPermission(session, ['prompts:read', 'prompts:manage']);
  const canManagePrompts = hasAnyPermission(session, ['prompts:manage']);
  const canViewPosts = hasAnyPermission(session, ['posts:read', 'posts:manage']);
  const canManagePosts = hasAnyPermission(session, ['posts:manage']);
  const canViewMedia = hasAnyPermission(session, ['media:read', 'media:manage']);
  const canViewCategories = hasAnyPermission(session, ['categories:read', 'categories:manage']);
  const canManageCategories = hasAnyPermission(session, ['categories:manage']);
  const canViewTags = hasAnyPermission(session, ['tags:read', 'tags:manage']);
  const canManageTags = hasAnyPermission(session, ['tags:manage']);
  const canViewComments = hasAnyPermission(session, ['comments:read', 'comments:moderate']);
  const canModerateComments = hasAnyPermission(session, ['comments:moderate']);
  const canViewAnalytics = hasAnyPermission(session, ['analytics:read']);
  const canViewActivity = hasAnyPermission(session, ['activity:read']);
  const canViewUsers = hasAnyPermission(session, ['users:read', 'users:manage']);
  const canViewRoles = hasAnyPermission(session, ['roles:read', 'roles:manage']);
  const canCreateContent = canManagePrompts || canManagePosts;

  const navItems = useMemo<DashboardNavItem[]>(() => {
    const contentChildren: DashboardNavChild[] = [
      ...(canCreateContent
        ? [{ href: '/dashboard/content/new', label: 'Create New', icon: <MdAdd size={16} /> }]
        : []),
      ...(canViewMedia ? [{ href: '/dashboard/content/media', label: 'Media' }] : []),
      ...(canViewPrompts ? [{ href: '/dashboard/content/prompts', label: 'Prompts' }] : []),
      ...(canViewPosts ? [{ href: '/dashboard/content/posts', label: 'Posts' }] : []),
    ];

    return [
      ...(hasDashboardAccess
        ? [{ href: '/dashboard', label: 'Overview', icon: <MdDashboard size={20} /> }]
        : []),
      ...(contentChildren.length > 0
        ? [
            {
              label: 'Content',
              icon: <MdDescription size={20} />,
              children: contentChildren,
            },
          ]
        : []),
      ...(canViewCategories
        ? [{ href: '/dashboard/categories', label: 'Categories', icon: <MdCategory size={20} /> }]
        : []),
      ...(canViewTags
        ? [{ href: '/dashboard/tags', label: 'Tags', icon: <MdLabel size={20} /> }]
        : []),
      ...(canViewComments
        ? [{ href: '/dashboard/comments', label: 'Comments', icon: <MdComment size={20} /> }]
        : []),
      ...(canViewAnalytics
        ? [{ href: '/dashboard/analytics', label: 'Analytics', icon: <MdAnalytics size={20} /> }]
        : []),
      ...(canViewUsers
        ? [{ href: '/dashboard/users', label: 'Users', icon: <MdGroup size={20} /> }]
        : []),
      ...(canViewRoles
        ? [{ href: '/dashboard/roles', label: 'Roles', icon: <MdSecurity size={20} /> }]
        : []),
    ];
  }, [
    canCreateContent,
    canViewAnalytics,
    canViewCategories,
    canViewComments,
    canViewMedia,
    canViewPosts,
    canViewPrompts,
    canViewRoles,
    canViewTags,
    canViewUsers,
    hasDashboardAccess,
  ]);

  const defaultDashboardHref = useMemo(() => {
    for (const item of navItems) {
      if (item.href) {
        return item.href;
      }
      const childHref = item.children?.[0]?.href;
      if (childHref) {
        return childHref;
      }
    }

    return '/profile';
  }, [navItems]);

  const canAccessCurrentRoute = useMemo(() => {
    if (!pathname?.startsWith('/dashboard')) {
      return true;
    }

    if (!hasDashboardAccess) {
      return false;
    }

    if (pathname === '/dashboard' || pathname === '/dashboard/search') {
      return true;
    }

    if (pathname.startsWith('/dashboard/content/new')) {
      return canCreateContent;
    }

    if (pathname.startsWith('/dashboard/content/media')) {
      return canViewMedia;
    }

    if (pathname.startsWith('/dashboard/content/prompts')) {
      return canViewPrompts;
    }

    if (pathname.startsWith('/dashboard/content/posts')) {
      return canViewPosts;
    }

    if (pathname.startsWith('/dashboard/categories')) {
      return canViewCategories;
    }

    if (pathname.startsWith('/dashboard/tags')) {
      return canViewTags;
    }

    if (pathname.startsWith('/dashboard/comments')) {
      return canViewComments;
    }

    if (pathname.startsWith('/dashboard/analytics')) {
      return canViewAnalytics;
    }

    if (pathname.startsWith('/dashboard/activity')) {
      return canViewActivity;
    }

    if (pathname.startsWith('/dashboard/users')) {
      return canViewUsers;
    }

    if (pathname.startsWith('/dashboard/roles')) {
      return canViewRoles;
    }

    return true;
  }, [
    canCreateContent,
    canViewActivity,
    canViewAnalytics,
    canViewCategories,
    canViewComments,
    canViewMedia,
    canViewPosts,
    canViewPrompts,
    canViewRoles,
    canViewTags,
    canViewUsers,
    hasDashboardAccess,
    pathname,
  ]);

  const apiBaseUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';
  }, []);

  const isAccessTokenExpired = (expiresAt?: string | null) => {
    if (!expiresAt) return false;
    const expiresMs = Date.parse(expiresAt);
    if (Number.isNaN(expiresMs)) return false;
    return expiresMs <= Date.now() + 60_000;
  };

  const getAccessToken = async () => {
    let accessToken = session?.apiAccessToken;
    if (!accessToken || isAccessTokenExpired(session?.apiAccessTokenExpiresAt)) {
      if (refreshSession) {
        const refreshed = await refreshSession();
        accessToken = refreshed?.apiAccessToken;
      }
    }
    return accessToken;
  };

  useEffect(() => {
    if (sessionStatus === 'loading') {
      return;
    }

    if (sessionStatus === 'unauthenticated') {
      router.replace('/');
      return;
    }

    if (!hasDashboardAccess) {
      router.replace('/profile');
      return;
    }

    if (!canAccessCurrentRoute) {
      router.replace(defaultDashboardHref);
    }
  }, [canAccessCurrentRoute, defaultDashboardHref, hasDashboardAccess, router, sessionStatus]);

  const displayName =
    profileSnapshot?.name?.trim() ||
    session?.user?.name?.trim() ||
    session?.user?.email?.split('@')[0] ||
    'Signed in';

  const roleLabelRaw = profileSnapshot?.role || session?.user?.role || 'USER';
  const roleLabel = roleLabelRaw
    .toString()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const avatarBase = profileSnapshot?.avatarUrl || session?.user?.image || null;
  const avatarSrc =
    avatarBase && profileSnapshot?.avatarUpdatedAt && !avatarBase.startsWith('data:')
      ? `${avatarBase}${avatarBase.includes('?') ? '&' : '?'}v=${profileSnapshot.avatarUpdatedAt}`
      : avatarBase;

  useEffect(() => {
    if (!session?.apiAccessToken) return;

    let isActive = true;

    const fetchProfile = async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) return;
        let response = await fetch(`${apiBaseUrl}/api/auth/profile/summary`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: 'no-store',
        });
        if (response.status === 401 && refreshSession) {
          const refreshed = await refreshSession();
          const retryToken = refreshed?.apiAccessToken;
          if (retryToken) {
            response = await fetch(`${apiBaseUrl}/api/auth/profile/summary`, {
              headers: {
                Authorization: `Bearer ${retryToken}`,
              },
              cache: 'no-store',
            });
          }
        }
        if (!response.ok) return;
        const payload = (await response.json()) as {
          user: {
            name: string | null;
            avatarUrl: string | null;
            avatarUpdatedAt: string | null;
            role: string | null;
          };
        };
        if (!isActive) return;
        setProfileSnapshot({
          name: payload.user.name ?? null,
          avatarUrl: payload.user.avatarUrl ?? null,
          avatarUpdatedAt: payload.user.avatarUpdatedAt ?? null,
          role: payload.user.role ?? null,
        });
      } catch {
        // Fall back to session values when profile fetch fails.
      }
    };

    fetchProfile();

    const onProfileUpdated = () => {
      fetchProfile();
    };

    window.addEventListener('profile-updated', onProfileUpdated);
    return () => {
      isActive = false;
      window.removeEventListener('profile-updated', onProfileUpdated);
    };
  }, [apiBaseUrl, session?.apiAccessToken]);

  const fetchProfileDetails = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setProfileLoadError('Session expired. Please sign out and sign in again.');
      return;
    }
    setProfileLoadError(null);
    try {
      let response = await fetch(`${apiBaseUrl}/api/auth/profile/summary`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      });
      if (response.status === 401 && refreshSession) {
        const refreshed = await refreshSession();
        const retryToken = refreshed?.apiAccessToken;
        if (retryToken) {
          response = await fetch(`${apiBaseUrl}/api/auth/profile/summary`, {
            headers: {
              Authorization: `Bearer ${retryToken}`,
            },
            cache: 'no-store',
          });
        }
      }
      if (!response.ok) {
        if (response.status === 401) {
          setProfileLoadError('Session expired. Please sign out and sign in again.');
          return;
        }
        throw new Error('Unable to load profile.');
      }
      const payload = (await response.json()) as {
        user: {
          name?: string | null;
          handle?: string | null;
          profileTitle?: string | null;
          bio?: string | null;
          focusTags?: string[] | null;
          avatarUrl?: string | null;
          avatarUpdatedAt?: string | null;
        };
      };
      const nextFocusTags = payload.user.focusTags ?? [];
      setProfileForm({
        name: payload.user.name ?? profileSnapshot?.name ?? session?.user?.name ?? '',
        handle: payload.user.handle ?? '',
        profileTitle: payload.user.profileTitle ?? '',
        bio: payload.user.bio ?? '',
        focusTags: nextFocusTags,
        avatarUrl:
          payload.user.avatarUrl ?? profileSnapshot?.avatarUrl ?? session?.user?.image ?? '',
        avatarUpdatedAt: payload.user.avatarUpdatedAt ?? profileSnapshot?.avatarUpdatedAt ?? null,
      });
      setFocusTagsInput(nextFocusTags.join(', '));
      setAvatarPreview(null);
    } catch (error) {
      setProfileLoadError(error instanceof Error ? error.message : 'Unable to load profile.');
    }
  };

  const openProfileModal = async () => {
    setProfileForm((prev) => ({
      ...prev,
      name: profileSnapshot?.name ?? session?.user?.name ?? prev.name,
      avatarUrl: profileSnapshot?.avatarUrl ?? session?.user?.image ?? prev.avatarUrl,
      avatarUpdatedAt: profileSnapshot?.avatarUpdatedAt ?? prev.avatarUpdatedAt,
    }));
    setIsProfileModalOpen(true);
    await fetchProfileDetails();
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileSaveError('Please upload a valid image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileSaveError('Image must be under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileSaveError(null);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setProfileSaveError('Session expired. Please sign out and sign in again.');
      return;
    }
    setIsProfileSaving(true);
    try {
      let response = await fetch(`${apiBaseUrl}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: profileForm.name,
          handle: profileForm.handle,
          profileTitle: profileForm.profileTitle,
          bio: profileForm.bio,
          focusTags: focusTagsInput
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0),
          avatarUrl: avatarPreview || profileForm.avatarUrl || null,
        }),
      });
      if (response.status === 401 && refreshSession) {
        const refreshed = await refreshSession();
        const retryToken = refreshed?.apiAccessToken;
        if (retryToken) {
          response = await fetch(`${apiBaseUrl}/api/auth/profile`, {
            method: 'PATCH',
            headers: {
              'content-type': 'application/json',
              Authorization: `Bearer ${retryToken}`,
            },
            body: JSON.stringify({
              name: profileForm.name,
              handle: profileForm.handle,
              profileTitle: profileForm.profileTitle,
              bio: profileForm.bio,
              focusTags: focusTagsInput
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0),
              avatarUrl: avatarPreview || profileForm.avatarUrl || null,
            }),
          });
        }
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to update profile.');
      }
      const nextFocusTags = payload.user.focusTags ?? [];
      setProfileForm({
        name: payload.user.name ?? '',
        handle: payload.user.handle ?? '',
        profileTitle: payload.user.profileTitle ?? '',
        bio: payload.user.bio ?? '',
        focusTags: nextFocusTags,
        avatarUrl: payload.user.avatarUrl ?? '',
        avatarUpdatedAt: payload.user.avatarUpdatedAt ?? null,
      });
      setFocusTagsInput(nextFocusTags.join(', '));
      setAvatarPreview(null);
      setIsProfileModalOpen(false);
      window.dispatchEvent(new Event('profile-updated'));
    } catch (error) {
      setProfileSaveError(error instanceof Error ? error.message : 'Failed to update profile.');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const pathSegments =
    pathname
      ?.replace(/^\/dashboard\/?/, '')
      .split('/')
      .filter(Boolean) || [];
  const breadcrumbLabels: Record<string, string> = {
    '': 'Overview',
    new: 'Create New',
    media: 'Media',
    prompts: 'Prompts',
    posts: 'Posts',
    categories: 'Categories',
    tags: 'Tags',
    comments: 'Comments',
    analytics: 'Analytics',
    activity: 'Activity',
    search: 'Search',
    users: 'Users',
    roles: 'Roles',
  };
  const breadcrumbs = useMemo(() => {
    const items: { path: string; label: string }[] = [{ path: '/dashboard', label: 'Dashboard' }];
    let acc = '/dashboard';
    pathSegments.forEach((segment) => {
      acc += `/${segment}`;
      const label =
        breadcrumbLabels[segment] ??
        segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      items.push({ path: acc, label });
    });
    if (pathSegments.length === 0) {
      items.push({ path: '/dashboard', label: 'Overview' });
    }
    return items;
  }, [pathname]);

  const isRouteActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  if (sessionStatus === 'loading') {
    return <div className="min-h-screen bg-[#f7f9fc]" />;
  }

  if (sessionStatus === 'unauthenticated' || !hasDashboardAccess || !canAccessCurrentRoute) {
    return null;
  }

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-[#f7f9fc] font-medium font-poppins">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden dashboard-overlay-enter"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#0f1116] text-white transition-transform duration-200 ease-out lg:transition-none lg:static lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        <div className="flex h-full flex-col p-4">
          <div
            className={`mb-8 flex items-center px-2 py-1 ${isDesktopSidebarCollapsed ? 'justify-between lg:justify-center' : 'justify-between'}`}
          >
            <Link
              href="/"
              className={`flex items-center overflow-hidden transition-all duration-300 ${isDesktopSidebarCollapsed ? 'lg:w-0 lg:opacity-0' : 'w-[150px] opacity-100'}`}
            >
              <Image
                src={brandLogo}
                alt="Gemini Prompts"
                width={200}
                height={44}
                className="h-auto min-w-[150px] object-contain brightness-0 invert"
                priority
              />
            </Link>
            {isDesktopSidebarCollapsed && (
              <Link
                href="/"
                className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg bg-[#d5ea52] text-[#0f1116] font-bold text-xl shrink-0"
              >
                G
              </Link>
            )}
            <button className="lg:hidden shrink-0" onClick={() => setIsSidebarOpen(false)}>
              <MdClose size={24} />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-none">
            {navItems.map((item) => {
              const isActive = item.href ? isRouteActive(item.href) : false;
              const hasChildren = !!item.children;
              const isExpanded = expandedMenus.includes(item.label) && !isDesktopSidebarCollapsed;

              return (
                <div key={item.label} className="relative group">
                  {item.href ? (
                    <DashboardLink
                      href={item.href}
                      className={`flex items-center rounded-xl px-3 py-2.5 transition-colors ${
                        isActive
                          ? 'bg-[#d5ea52] text-[#0f1116] font-medium'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      } ${isDesktopSidebarCollapsed ? 'justify-center lg:px-0' : 'gap-3'}`}
                      title={isDesktopSidebarCollapsed ? item.label : undefined}
                    >
                      <div className="shrink-0 flex items-center justify-center w-5">
                        {item.icon}
                      </div>
                      <span
                        className={`whitespace-nowrap transition-all duration-300 text-[0.9rem] ${isDesktopSidebarCollapsed ? 'lg:w-0 lg:opacity-0 hidden lg:block' : 'opacity-100'}`}
                      >
                        {item.label}
                      </span>
                    </DashboardLink>
                  ) : (
                    <button
                      onClick={() => !isDesktopSidebarCollapsed && toggleMenu(item.label)}
                      className={`flex w-full items-center rounded-xl px-3 py-2.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white ${isDesktopSidebarCollapsed ? 'justify-center lg:px-0' : 'justify-between'}`}
                      title={isDesktopSidebarCollapsed ? item.label : undefined}
                    >
                      <div
                        className={`flex items-center ${isDesktopSidebarCollapsed ? 'justify-center' : 'gap-3'}`}
                      >
                        <div className="shrink-0 flex items-center justify-center w-5">
                          {item.icon}
                        </div>
                        <span
                          className={`whitespace-nowrap transition-all duration-300 text-[0.9rem] ${isDesktopSidebarCollapsed ? 'lg:w-0 lg:opacity-0 hidden lg:block' : 'opacity-100'}`}
                        >
                          {item.label}
                        </span>
                      </div>
                      <MdNavigateNext
                        className={`shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''} ${isDesktopSidebarCollapsed ? 'hidden lg:hidden' : 'block'}`}
                      />
                    </button>
                  )}

                  {hasChildren && isExpanded && !isDesktopSidebarCollapsed && (
                    <div className="mt-1 flex flex-col space-y-1 pl-10 pr-2 pb-1">
                      {(item.children ?? []).map((child) => (
                        <DashboardLink
                          key={child.label}
                          href={child.href}
                          className={`flex items-center gap-2 rounded-xl py-1.5 px-2 text-[0.85rem] transition-colors ${
                            isRouteActive(child.href)
                              ? 'text-[#d5ea52] font-medium'
                              : 'text-gray-500 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {child.icon && <div className="shrink-0">{child.icon}</div>}
                          <span className="truncate">{child.label}</span>
                        </DashboardLink>
                      ))}
                    </div>
                  )}

                  {/* Tooltip for collapsed state */}
                  {isDesktopSidebarCollapsed && hasChildren && (
                    <div className="absolute left-[calc(100%+8px)] top-0 z-50 hidden w-48 rounded-xl border border-white/10 bg-[#1e222b] p-2 shadow-xl group-hover:lg:block">
                      <p className="mb-2 px-2 text-[0.75rem] font-medium text-gray-400 uppercase tracking-wider">
                        {item.label}
                      </p>
                      {(item.children ?? []).map((child) => (
                        <DashboardLink
                          key={child.label}
                          href={child.href}
                          className={`flex items-center gap-2 rounded-lg px-2 py-2 text-[0.85rem] transition-colors ${
                            isRouteActive(child.href)
                              ? 'bg-white/10 text-[#d5ea52] font-medium'
                              : 'text-gray-300 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {child.icon && child.icon}
                          {child.label}
                        </DashboardLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="mt-auto border-t border-white/10 pt-4 flex flex-col gap-3">
            <div
              className={`flex items-center px-2 py-1 ${isDesktopSidebarCollapsed ? 'justify-center lg:px-0' : 'gap-3'}`}
            >
              <button
                type="button"
                onClick={openProfileModal}
                className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#1e222b] flex items-center justify-center text-[0.8rem] font-medium text-[#d5ea52] hover:ring-2 hover:ring-[#d5ea52] transition-all cursor-pointer"
                title="Profile settings"
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  displayName.slice(0, 1).toUpperCase()
                )}
              </button>
              <div
                className={`flex-1 overflow-hidden transition-all duration-300 ${isDesktopSidebarCollapsed ? 'w-0 opacity-0 lg:hidden' : 'opacity-100'}`}
              >
                <p className="truncate text-[0.85rem] font-medium">{displayName}</p>
                <p className="truncate text-[0.7rem] text-gray-500">{roleLabel}</p>
              </div>
              <button
                type="button"
                onClick={openProfileModal}
                className={`text-gray-500 hover:text-white transition-colors shrink-0 ${isDesktopSidebarCollapsed ? 'hidden lg:hidden' : 'block'}`}
                title="Profile settings"
                aria-label="Open profile settings"
              >
                <MdSettings size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-[#eef2f6] bg-white px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button className="lg:hidden" onClick={() => setIsSidebarOpen(true)}>
              <MdMenu size={24} className="text-[#0f1116]" />
            </button>
            <Link href="/" className="flex items-center lg:hidden">
              <Image
                src={brandLogo}
                alt="Gemini Prompts"
                width={180}
                height={40}
                className="h-auto w-[120px] object-contain"
              />
            </Link>
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-[0.9rem] text-[#0f1116]"
            >
              {breadcrumbs.map((item, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <span key={`${item.path}-${i}`} className="flex items-center gap-1.5">
                    {i > 0 ? (
                      <MdChevronRight size={18} className="text-gray-400 shrink-0" aria-hidden />
                    ) : null}
                    {isLast ? (
                      <span className="font-medium text-[#0f1116]">{item.label}</span>
                    ) : (
                      <DashboardLink
                        href={item.path}
                        className="text-gray-500 hover:text-[#0f1116] transition-colors"
                      >
                        {item.label}
                      </DashboardLink>
                    )}
                  </span>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Search */}
            <div className="relative hidden md:block group">
              <MdSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0f1116] transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder="Search... (Cmd+K)"
                className="h-9 w-48 lg:w-64 rounded-full border border-[#e1e5ee] bg-gray-50/50 pl-10 pr-4 text-[0.85rem] text-[#0f1116] placeholder-gray-400 focus:border-[#0f1116] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0f1116] transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1">
                <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[0.6rem] font-medium text-gray-400 shadow-sm">
                  ⌘K
                </kbd>
              </div>
            </div>
            {canManageCategories &&
            pathname?.startsWith('/dashboard/categories') &&
            !pathname.includes('/trash') ? (
              <DashboardLink
                href="/dashboard/categories/trash"
                className="hidden items-center gap-2 rounded-full border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] text-[#0f1116] transition-colors hover:bg-gray-50 sm:flex"
              >
                <MdDeleteOutline size={18} /> Trash
              </DashboardLink>
            ) : null}
            {canManageTags &&
            pathname?.startsWith('/dashboard/tags') &&
            !pathname.includes('/trash') ? (
              <DashboardLink
                href="/dashboard/tags/trash"
                className="hidden items-center gap-2 rounded-full border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] text-[#0f1116] transition-colors hover:bg-gray-50 sm:flex"
              >
                <MdDeleteOutline size={18} /> Trash
              </DashboardLink>
            ) : null}
            {canModerateComments &&
            pathname?.startsWith('/dashboard/comments') &&
            !pathname.includes('/trash') ? (
              <DashboardLink
                href="/dashboard/comments/trash"
                className="hidden items-center gap-2 rounded-full border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] text-[#0f1116] transition-colors hover:bg-gray-50 sm:flex"
              >
                <MdDeleteOutline size={18} /> Trash
              </DashboardLink>
            ) : null}
            {canManagePrompts &&
            pathname?.startsWith('/dashboard/content/prompts') &&
            !pathname.includes('/trash') ? (
              <DashboardLink
                href="/dashboard/content/prompts/trash"
                className="hidden items-center gap-2 rounded-full border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] text-[#0f1116] transition-colors hover:bg-gray-50 sm:flex"
              >
                <MdDeleteOutline size={18} /> Trash
              </DashboardLink>
            ) : null}
            {canManagePosts &&
            pathname?.startsWith('/dashboard/content/posts') &&
            !pathname.includes('/trash') ? (
              <DashboardLink
                href="/dashboard/content/posts/trash"
                className="hidden items-center gap-2 rounded-full border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] text-[#0f1116] transition-colors hover:bg-gray-50 sm:flex"
              >
                <MdDeleteOutline size={18} /> Trash
              </DashboardLink>
            ) : null}

            {/* New Content */}
            {canCreateContent ? (
              <DashboardLink
                href="/dashboard/content/new"
                className="hidden items-center gap-2 rounded-full bg-[#0f1116] px-4 py-2 text-[0.85rem] text-white transition-opacity hover:opacity-90 sm:flex"
              >
                <MdPostAdd size={18} /> New Content
              </DashboardLink>
            ) : null}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#f7f9fc] p-4 lg:p-8">
          <div
            key={pathname ?? 'dashboard'}
            className="dashboard-page-enter dashboard-content-transition min-h-full"
          >
            {children}
          </div>
        </main>
      </div>

      {isProfileModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-[560px] rounded-[24px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.8rem] text-[#7a8292]">Profile</p>
                <h2 className="text-[1.4rem] font-medium text-[#0f1116]">Edit profile</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e1e5ee] text-[#6a7280] transition-colors hover:border-[#0f1116] hover:text-[#0f1116]"
                aria-label="Close edit profile"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={saveProfile}>
              {profileLoadError ? (
                <div className="rounded-[12px] border border-red-100 bg-red-50 px-3 py-2 text-[0.8rem] text-red-600">
                  {profileLoadError}
                </div>
              ) : null}
              {profileSaveError ? (
                <div className="rounded-[12px] border border-red-100 bg-red-50 px-3 py-2 text-[0.8rem] text-red-600">
                  {profileSaveError}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-[170px_1fr] sm:items-start">
                <div>
                  <span className="text-[0.8rem] text-[#7a8292]">Profile photo</span>
                  <div className="mt-2 flex flex-col gap-3">
                    <div className="h-16 w-16 overflow-hidden rounded-full bg-[#f0f2f7]">
                      {avatarPreview || profileForm.avatarUrl ? (
                        <img
                          src={avatarPreview || profileForm.avatarUrl}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[0.9rem] font-medium text-[#9aa3b2]">
                          {displayName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <label className="cursor-pointer text-[0.8rem] text-[#1e4fd2]">
                      Upload photo
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleAvatarChange}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarPreview(null);
                        setProfileForm((prev) => ({ ...prev, avatarUrl: '' }));
                      }}
                      className="text-left text-[0.75rem] text-[#7a8292]"
                    >
                      Remove photo
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[0.8rem] text-[#7a8292]">Full name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      className="mt-2 w-full rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116]"
                    />
                  </div>
                  <div>
                    <label className="text-[0.8rem] text-[#7a8292]">Role</label>
                    <input
                      type="text"
                      value={profileForm.profileTitle}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, profileTitle: event.target.value }))
                      }
                      className="mt-2 w-full rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[0.8rem] text-[#7a8292]">Handle</label>
                  <input
                    type="text"
                    value={profileForm.handle}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, handle: event.target.value }))
                    }
                    className="mt-2 w-full rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116]"
                  />
                </div>
                <div>
                  <label className="text-[0.8rem] text-[#7a8292]">Focus tags</label>
                  <input
                    type="text"
                    value={focusTagsInput}
                    onChange={(event) => setFocusTagsInput(event.target.value)}
                    placeholder="design, ai, writing"
                    className="mt-2 w-full rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116]"
                  />
                  <p className="mt-1 text-[0.72rem] text-[#9aa3b2]">Separate tags with commas.</p>
                </div>
              </div>

              <div>
                <label className="text-[0.8rem] text-[#7a8292]">Bio</label>
                <textarea
                  value={profileForm.bio}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, bio: event.target.value }))
                  }
                  rows={3}
                  className="mt-2 w-full resize-none rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="rounded-full border border-[#e1e5ee] px-4 py-2 text-[0.85rem] text-[#0f1116]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProfileSaving}
                  className="rounded-full bg-[#0f1116] px-4 py-2 text-[0.85rem] text-white disabled:opacity-60"
                >
                  {isProfileSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
