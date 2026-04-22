'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ProgressiveImage } from '../components/progressive-image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
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
  MdLogout,
  MdErrorOutline,
  MdEmail,
  MdContactMail,
  MdRefresh,
} from 'react-icons/md';
import { BRAND_LOGO_URL } from '../../lib/site-assets';
import {
  hasAnyPermission,
  hasDashboardAccess as userHasDashboardAccess,
  isProtectedSuperadminEmail,
} from '../../lib/utils/permissions';
import { useAdminApi } from '../components/dashboard/use-admin-api';
import { ProfileSettingsModal } from '../../features/dashboard/profile';
import { AuthModal } from '../components/auth-modal';
import {
  buildAuthCallbackFallbackFromPath,
  normalizeAuthCallbackPath,
} from '../../lib/utils/auth-callback';
import { redirectToSignInModal } from '../../lib/utils/auth-redirect';
import { normalizeAvatarUrl } from '../../lib/utils/avatar';

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
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const nextHref = search && href.includes('?') ? href : `${href}${search}`;
    const canUseViewTransition =
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px)').matches;

    if (canUseViewTransition) {
      (
        document as Document & { startViewTransition: (cb: () => void) => void }
      ).startViewTransition(() => {
        router.push(nextHref);
      });
    } else {
      router.push(nextHref);
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
  const { data: session, status: sessionStatus } = useSession();
  const { request: adminRequest } = useAdminApi();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Content']);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isClearingPublicCache, setIsClearingPublicCache] = useState(false);
  const [cacheClearNotice, setCacheClearNotice] = useState<string | null>(null);
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
    hasPassword: false,
  });
  const [focusTagsInput, setFocusTagsInput] = useState('');
  const [previousPassword, setPreviousPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [profileSnapshot, setProfileSnapshot] = useState<{
    name: string | null;
    avatarUrl: string | null;
    avatarUpdatedAt: string | null;
    role: string | null;
    hasPassword: boolean;
  } | null>(null);
  const [resolvedPermissions, setResolvedPermissions] = useState<string[] | null>(null);

  const hasDashboardAccess = userHasDashboardAccess(session);
  const permissionSession = useMemo(
    () =>
      session
        ? ({
            ...session,
            user: {
              ...session.user,
              permissions: resolvedPermissions ?? session.user?.permissions ?? [],
            },
          } as typeof session)
        : session,
    [resolvedPermissions, session],
  );
  const canViewPrompts = hasAnyPermission(permissionSession, ['prompts:read', 'prompts:manage']);
  const canManagePrompts = hasAnyPermission(permissionSession, ['prompts:manage']);
  const canViewPosts = hasAnyPermission(permissionSession, ['posts:read', 'posts:manage']);
  const canManagePosts = hasAnyPermission(permissionSession, ['posts:manage']);
  const canViewMedia = hasAnyPermission(permissionSession, ['media:read', 'media:manage']);
  const canViewCategories = hasAnyPermission(permissionSession, ['categories:read', 'categories:manage']);
  const canManageCategories = hasAnyPermission(permissionSession, ['categories:manage']);
  const canViewTags = hasAnyPermission(permissionSession, ['tags:read', 'tags:manage']);
  const canManageTags = hasAnyPermission(permissionSession, ['tags:manage']);
  const canViewComments = hasAnyPermission(permissionSession, ['comments:read', 'comments:moderate']);
  const canModerateComments = hasAnyPermission(permissionSession, ['comments:moderate']);
  const canViewAnalytics = hasAnyPermission(permissionSession, ['analytics:read']);
  const canViewActivity = hasAnyPermission(permissionSession, ['activity:read']);
  const canViewErrorLogs = canViewActivity;
  const canViewNewsletterSubmissions = canViewActivity;
  const canViewContactSubmissions = hasAnyPermission(permissionSession, ['contacts:read', 'contacts:manage']);
  const canViewUsers = hasAnyPermission(permissionSession, ['users:read', 'users:manage']);
  const canManageUsers = hasAnyPermission(permissionSession, ['users:manage']);
  const canViewMembers = isProtectedSuperadminEmail(session?.user?.email);
  const canViewRoles = hasAnyPermission(permissionSession, ['roles:read', 'roles:manage']);
  const canViewSeo = hasAnyPermission(permissionSession, ['roles:read', 'roles:manage']);
  const canViewSeoIntegrations = isProtectedSuperadminEmail(session?.user?.email);
  const canCreateContent = canManagePrompts || canManagePosts;
  const canClearPublicCache =
    canManagePrompts || canManagePosts || canManageCategories || canManageTags || canManageUsers;

  useEffect(() => {
    if (sessionStatus !== 'authenticated') {
      setResolvedPermissions(null);
      return;
    }

    let isActive = true;
    const hydratePermissions = async () => {
      try {
        const payload = await adminRequest<{
          user?: {
            permissions?: string[];
          };
        }>('/api/auth/me', {
          actionName: 'dashboard.auth.me',
        });
        if (!isActive) return;
        setResolvedPermissions(payload.user?.permissions ?? []);
      } catch {
        if (!isActive) return;
        setResolvedPermissions(null);
      }
    };

    void hydratePermissions();

    return () => {
      isActive = false;
    };
  }, [adminRequest, sessionStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncSearch = () => {
      setDashboardSearch(window.location.search || '');
    };
    syncSearch();
    window.addEventListener('popstate', syncSearch);
    return () => {
      window.removeEventListener('popstate', syncSearch);
    };
  }, []);

  const dashboardCallbackUrl = useMemo(() => {
    const query = new URLSearchParams(dashboardSearch);
    const requested = query.get('callbackUrl')?.trim();
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const fallback = buildAuthCallbackFallbackFromPath(
      pathname || '/dashboard',
      dashboardSearch,
    );
    return normalizeAuthCallbackPath(requested, { origin, fallback });
  }, [dashboardSearch, pathname]);

  const handleClearPublicCache = async () => {
    if (isClearingPublicCache) return;
    setIsClearingPublicCache(true);
    setCacheClearNotice(null);

    try {
      const response = await fetch('/api/admin/cache/clear', {
        method: 'POST',
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to clear cache right now.');
      }

      setCacheClearNotice(payload?.message || 'Public site cache cleared.');
      router.refresh();
    } catch (error) {
      setCacheClearNotice(error instanceof Error ? error.message : 'Unable to clear cache right now.');
    } finally {
      setIsClearingPublicCache(false);
    }
  };

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
      ...(canViewErrorLogs
        ? [{ href: '/dashboard/logs', label: 'Logs', icon: <MdErrorOutline size={20} /> }]
        : []),
      ...(canViewNewsletterSubmissions
        ? [{ href: '/dashboard/newsletter', label: 'Newsletter', icon: <MdEmail size={20} /> }]
        : []),
      ...(canViewContactSubmissions
        ? [
            {
              href: '/dashboard/contact-submissions',
              label: 'Contact submissions',
              icon: <MdContactMail size={20} />,
            },
          ]
        : []),
      ...(canViewSeo
        ? [
            {
              label: 'SEO',
              icon: <MdSettings size={20} />,
              children: [
                { href: '/dashboard/seo', label: 'Overview' },
                { href: '/dashboard/seo/robots', label: 'Robots.txt' },
                { href: '/dashboard/seo/sitemap', label: 'Sitemap.xml' },
                { href: '/dashboard/seo/settings', label: 'Meta Defaults' },
                { href: '/dashboard/seo/social', label: 'Social & Schema' },
                { href: '/dashboard/seo/custom-code', label: 'Custom Code' },
                ...(canViewSeoIntegrations
                  ? [{ href: '/dashboard/seo/integrations', label: 'Integrations' }]
                  : []),
                { href: '/dashboard/seo/redirects', label: 'Redirects' },
              ],
            },
          ]
        : []),
      ...(canViewUsers
        ? [{ href: '/dashboard/users', label: 'Users', icon: <MdGroup size={20} /> }]
        : []),
      ...(canViewMembers
        ? [{ href: '/dashboard/members', label: 'Members', icon: <MdGroup size={20} /> }]
        : []),
      ...(canViewRoles
        ? [{ href: '/dashboard/roles', label: 'Roles', icon: <MdSecurity size={20} /> }]
        : []),
    ];
  }, [
    canCreateContent,
    canViewAnalytics,
    canViewErrorLogs,
    canViewNewsletterSubmissions,
    canViewContactSubmissions,
    canViewSeo,
    canViewSeoIntegrations,
    canViewCategories,
    canViewComments,
    canViewMedia,
    canViewMembers,
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

    if (pathname.startsWith('/dashboard/seo')) {
      if (pathname.startsWith('/dashboard/seo/integrations')) {
        return canViewSeoIntegrations;
      }
      if (pathname.startsWith('/dashboard/seo/custom-code')) {
        return canViewSeo;
      }
      return canViewSeo;
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

    if (pathname.startsWith('/dashboard/logs')) {
      return canViewErrorLogs;
    }

    if (pathname.startsWith('/dashboard/newsletter')) {
      return canViewNewsletterSubmissions;
    }

    if (pathname.startsWith('/dashboard/contact-submissions')) {
      return canViewContactSubmissions;
    }

    if (pathname.startsWith('/dashboard/users')) {
      return canViewUsers;
    }

    if (pathname.startsWith('/dashboard/members')) {
      return canViewMembers;
    }

    if (pathname.startsWith('/dashboard/roles')) {
      return canViewRoles;
    }

    return true;
  }, [
    canCreateContent,
    canViewActivity,
    canViewAnalytics,
    canViewErrorLogs,
    canViewNewsletterSubmissions,
    canViewContactSubmissions,
    canViewSeo,
    canViewSeoIntegrations,
    canViewCategories,
    canViewComments,
    canViewMedia,
    canViewMembers,
    canViewPosts,
    canViewPrompts,
    canViewRoles,
    canViewTags,
    canViewUsers,
    hasDashboardAccess,
    pathname,
  ]);

  useEffect(() => {
    if (sessionStatus === 'loading') {
      return;
    }

    if (sessionStatus === 'unauthenticated') {
      const query = new URLSearchParams(dashboardSearch);
      const authIntent = query.get('auth');
      const hasCallbackIntent = Boolean(query.get('callbackUrl'));
      if (authIntent === 'signin' || hasCallbackIntent) {
        setIsAuthOpen(true);
        return;
      }
      redirectToSignInModal(dashboardCallbackUrl, { replace: true });
      setIsAuthOpen(true);
      return;
    }

    if (!hasDashboardAccess) {
      if (pathname !== '/profile') {
        router.replace('/profile');
      }
      return;
    }

    if (!canAccessCurrentRoute && pathname !== defaultDashboardHref) {
      router.replace(defaultDashboardHref);
    }
  }, [
    canAccessCurrentRoute,
    dashboardCallbackUrl,
    defaultDashboardHref,
    hasDashboardAccess,
    pathname,
    router,
    dashboardSearch,
    sessionStatus,
  ]);

  useLayoutEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

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

  const clearPasswordInputs = () => {
    setPreviousPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const avatarBase = profileSnapshot?.avatarUrl || session?.user?.image || null;
  const avatarSrc = normalizeAvatarUrl(
    avatarBase && profileSnapshot?.avatarUpdatedAt && !avatarBase.startsWith('data:')
      ? `${avatarBase}${avatarBase.includes('?') ? '&' : '?'}v=${profileSnapshot.avatarUpdatedAt}`
      : avatarBase,
  );

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;

    let isActive = true;

    const fetchProfile = async () => {
      try {
        const payload = await adminRequest<{
          user: {
            name: string | null;
            avatarUrl: string | null;
            avatarUpdatedAt: string | null;
            role: string | null;
            hasPassword: boolean;
          };
        }>('/api/auth/profile/summary', {
          actionName: 'profile.summary.load',
        });
        if (!isActive) return;
        setProfileSnapshot({
          name: payload.user.name ?? null,
          avatarUrl: payload.user.avatarUrl ?? null,
          avatarUpdatedAt: payload.user.avatarUpdatedAt ?? null,
          role: payload.user.role ?? null,
          hasPassword: Boolean(payload.user.hasPassword),
        });
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[profile.summary.load] failed', error);
        }
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
  }, [adminRequest, sessionStatus]);

  const fetchProfileDetails = async () => {
    setProfileLoadError(null);
    try {
      const payload = await adminRequest<{
        user: {
          name?: string | null;
          handle?: string | null;
          profileTitle?: string | null;
          bio?: string | null;
          focusTags?: string[] | null;
          avatarUrl?: string | null;
          avatarUpdatedAt?: string | null;
          hasPassword?: boolean;
        };
      }>('/api/auth/profile/summary', {
        actionName: 'profile.modal.load',
      });
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
        hasPassword: Boolean(
          payload.user.hasPassword ?? profileSnapshot?.hasPassword ?? session?.user?.hasPassword,
        ),
      });
      setFocusTagsInput(nextFocusTags.join(', '));
      setAvatarPreview(null);
    } catch (error) {
      setProfileLoadError(error instanceof Error ? error.message : 'Unable to load profile.');
    }
  };

  const openProfileModal = async () => {
    clearPasswordInputs();
    setProfileForm((prev) => ({
      ...prev,
      name: profileSnapshot?.name ?? session?.user?.name ?? prev.name,
      avatarUrl: profileSnapshot?.avatarUrl ?? session?.user?.image ?? prev.avatarUrl,
      avatarUpdatedAt: profileSnapshot?.avatarUpdatedAt ?? prev.avatarUpdatedAt,
      hasPassword:
        profileSnapshot?.hasPassword ?? Boolean(session?.user?.hasPassword ?? prev.hasPassword),
    }));
    setIsProfileModalOpen(true);
    await fetchProfileDetails();
  };

  const handleLogout = async () => {
    if (isSigningOut) {
      return;
    }
    setIsSigningOut(true);
    try {
      const callbackUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : '/';
      await signOut({ redirect: false, callbackUrl });
      if (typeof window !== 'undefined') {
        window.location.replace('/');
        return;
      }
      router.replace('/');
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
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

    const normalizedName = profileForm.name.trim();
    const normalizedHandle = profileForm.handle.trim();
    const normalizedProfileTitle = profileForm.profileTitle.trim();
    const normalizedBio = profileForm.bio.trim();
    const parsedFocusTags = focusTagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    const uniqueFocusTags: string[] = [];
    const seenFocusTags = new Set<string>();
    for (const tag of parsedFocusTags) {
      const key = tag.toLowerCase();
      if (seenFocusTags.has(key)) continue;
      seenFocusTags.add(key);
      uniqueFocusTags.push(tag);
    }

    if (normalizedName.length > 80) {
      setProfileSaveError('Name must be 80 characters or fewer.');
      return;
    }
    if (normalizedHandle.length > 40) {
      setProfileSaveError('Handle must be 40 characters or fewer.');
      return;
    }
    if (normalizedHandle && !/^[a-zA-Z0-9._-]+$/.test(normalizedHandle)) {
      setProfileSaveError(
        'Handle can only include letters, numbers, dots, underscores, and hyphens.',
      );
      return;
    }
    if (normalizedProfileTitle.length > 120) {
      setProfileSaveError('Profile title must be 120 characters or fewer.');
      return;
    }
    if (normalizedBio.length > 400) {
      setProfileSaveError('Bio must be 400 characters or fewer.');
      return;
    }
    if (uniqueFocusTags.length > 30) {
      setProfileSaveError('You can save up to 30 focus tags.');
      return;
    }
    if (uniqueFocusTags.some((tag) => tag.length > 40)) {
      setProfileSaveError('Each focus tag must be 40 characters or fewer.');
      return;
    }

    const hasPreviousPassword = previousPassword.length > 0;
    const hasNewPassword = newPassword.length > 0;
    const hasConfirmPassword = confirmPassword.length > 0;
    const hasAnyPasswordInput = hasPreviousPassword || hasNewPassword || hasConfirmPassword;

    if (hasAnyPasswordInput) {
      if (profileForm.hasPassword) {
        if (!hasPreviousPassword) {
          setProfileSaveError('Previous password is required to set a new password.');
          return;
        }
        if (!hasNewPassword) {
          setProfileSaveError('New password is required.');
          return;
        }
      } else {
        if (!hasNewPassword) {
          setProfileSaveError('New password is required.');
          return;
        }
        if (!hasConfirmPassword) {
          setProfileSaveError('Confirm password is required.');
          return;
        }
        if (newPassword !== confirmPassword) {
          setProfileSaveError('Confirm password must match new password.');
          return;
        }
      }

      if (newPassword.length < 8 || newPassword.length > 128) {
        setProfileSaveError('Password must be between 8 and 128 characters long.');
        return;
      }
    }

    const avatarValue = avatarPreview || profileForm.avatarUrl || null;
    if (typeof avatarValue === 'string' && avatarValue.length > 5_000_000) {
      setProfileSaveError('Avatar payload is too large.');
      return;
    }

    setIsProfileSaving(true);
    try {
      const payload = await adminRequest<{
        user: {
          name?: string | null;
          handle?: string | null;
          profileTitle?: string | null;
          bio?: string | null;
          focusTags?: string[] | null;
          avatarUrl?: string | null;
          avatarUpdatedAt?: string | null;
          hasPassword?: boolean;
        };
      }>('/api/auth/profile', {
        method: 'PATCH',
        actionName: 'profile.update',
        body: JSON.stringify({
          name: normalizedName,
          ...(normalizedHandle ? { handle: normalizedHandle } : {}),
          profileTitle: normalizedProfileTitle,
          bio: normalizedBio,
          focusTags: uniqueFocusTags,
          avatarUrl: avatarValue,
          ...(hasPreviousPassword ? { previousPassword } : {}),
          ...(hasNewPassword ? { newPassword } : {}),
          ...(hasConfirmPassword ? { confirmPassword } : {}),
        }),
      });
      const nextFocusTags = payload.user.focusTags ?? [];
      setProfileForm({
        name: payload.user.name ?? '',
        handle: payload.user.handle ?? '',
        profileTitle: payload.user.profileTitle ?? '',
        bio: payload.user.bio ?? '',
        focusTags: nextFocusTags,
        avatarUrl: payload.user.avatarUrl ?? '',
        avatarUpdatedAt: payload.user.avatarUpdatedAt ?? null,
        hasPassword: Boolean(payload.user.hasPassword),
      });
      setFocusTagsInput(nextFocusTags.join(', '));
      setAvatarPreview(null);
      clearPasswordInputs();
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
    logs: 'Logs',
    newsletter: 'Newsletter',
    'contact-submissions': 'Contact Submissions',
    search: 'Search',
    'custom-code': 'Custom Code',
    users: 'Users',
    members: 'Members',
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

  const isInitialSessionLoading = sessionStatus === 'loading' && !session;

  if (isInitialSessionLoading) {
    return <div className="min-h-screen bg-[#f7f9fc]" />;
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#f7f9fc]">
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} callbackUrl={dashboardCallbackUrl} />
      </div>
    );
  }

  if (!hasDashboardAccess || !canAccessCurrentRoute) {
    return <div className="min-h-screen bg-[#f7f9fc]" />;
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
              <ProgressiveImage
                src={BRAND_LOGO_URL}
                alt="Gemini Prompts"
                width={200}
                height={44}
                className="h-auto min-w-[150px] object-contain brightness-0 invert"
                priority
                unoptimized
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

          <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto overflow-x-hidden">
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
              <div
                className={`flex items-center gap-2 shrink-0 ${isDesktopSidebarCollapsed ? 'hidden lg:hidden' : 'flex'}`}
              >
                <button
                  type="button"
                  onClick={openProfileModal}
                  className="text-gray-500 hover:text-white transition-colors"
                  title="Profile settings"
                  aria-label="Open profile settings"
                >
                  <MdSettings size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={isSigningOut}
                  className="text-gray-500 hover:text-[#ff6b6b] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  title="Logout"
                  aria-label="Logout"
                >
                  <MdLogout size={18} />
                </button>
              </div>
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
              <ProgressiveImage
                src={BRAND_LOGO_URL}
                alt="Gemini Prompts"
                width={180}
                height={40}
                className="h-auto w-[120px] object-contain"
                unoptimized
              />
            </Link>
            <nav
              aria-label="Breadcrumb"
              className="hidden items-center gap-1.5 text-[0.9rem] text-[#0f1116] sm:flex"
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
            {canClearPublicCache ? (
              <button
                type="button"
                onClick={() => void handleClearPublicCache()}
                disabled={isClearingPublicCache}
                className="hidden items-center gap-2 rounded-full border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] text-[#0f1116] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:flex"
                title="Clear public site cache"
                aria-label="Clear public site cache"
              >
                <MdRefresh size={16} className={isClearingPublicCache ? 'animate-spin' : ''} />
                {isClearingPublicCache ? 'Clearing...' : 'Clear cache'}
              </button>
            ) : null}
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

        {cacheClearNotice ? (
          <div className="border-b border-[#eef2f6] bg-[#f8fbff] px-4 py-2 text-[0.82rem] text-[#445066] lg:px-8">
            {cacheClearNotice}
          </div>
        ) : null}

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

      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        displayName={displayName}
        isProfileSaving={isProfileSaving}
        profileLoadError={profileLoadError}
        profileSaveError={profileSaveError}
        avatarPreview={avatarPreview}
        profileForm={profileForm}
        focusTagsInput={focusTagsInput}
        onRetryLoad={fetchProfileDetails}
        onClose={() => {
          clearPasswordInputs();
          setIsProfileModalOpen(false);
        }}
        onSubmit={saveProfile}
        onAvatarChange={handleAvatarChange}
        onRemoveAvatar={() => {
          setAvatarPreview(null);
          setProfileForm((prev) => ({ ...prev, avatarUrl: '' }));
        }}
        onNameChange={(value) => setProfileForm((prev) => ({ ...prev, name: value }))}
        onProfileTitleChange={(value) =>
          setProfileForm((prev) => ({ ...prev, profileTitle: value }))
        }
        onHandleChange={(value) => setProfileForm((prev) => ({ ...prev, handle: value }))}
        onFocusTagsInputChange={setFocusTagsInput}
        onBioChange={(value) => setProfileForm((prev) => ({ ...prev, bio: value }))}
        previousPassword={previousPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        onPreviousPasswordChange={setPreviousPassword}
        onNewPasswordChange={setNewPassword}
        onConfirmPasswordChange={setConfirmPassword}
      />
    </div>
  );
}
