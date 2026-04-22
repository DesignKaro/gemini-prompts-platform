'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { refreshSession as refreshSessionOnce } from '../../lib/utils/session';
import { useSearchParams } from 'next/navigation';
import { AuthorAvatar } from '../components/author-avatar';
import { LoadingButton } from '../components/ui/loading-button';
import { resolvePromptImage } from '../../lib/content-image-fallbacks';
import {
  FaFacebookF,
  FaHeart,
  FaLink,
  FaRegBookmark,
  FaPinterestP,
  FaTelegram,
  FaThreads,
  FaXTwitter,
} from 'react-icons/fa6';

type PromptThumbProps = {
  image: string | null;
  title: string;
  fallbackKey: string;
  className: string;
};

function PromptThumb({ image, title, fallbackKey, className }: PromptThumbProps) {
  const fallbackSrc = resolvePromptImage(null, fallbackKey);
  const [src, setSrc] = useState(() => resolvePromptImage(image, fallbackKey));

  useEffect(() => {
    setSrc(resolvePromptImage(image, fallbackKey));
  }, [image, fallbackKey]);

  return (
    <img
      src={src}
      alt={title}
      className={`${className} object-cover`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (src !== fallbackSrc) {
          setSrc(fallbackSrc);
        }
      }}
    />
  );
}

function ProfilePageContent() {
  const SAVED_PROMPTS_PREVIEW_LIMIT = 3;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [authSyncError, setAuthSyncError] = useState<string | null>(null);
  const { data: session, status, update: refreshSession } = useSession();
  const hasAutoOpenedEdit = useRef(false);
  const searchParams = useSearchParams();
  const isGoogleSyncPending =
    session?.authError === 'GoogleBackendSyncFailed' && !session?.apiAccessToken;

  useEffect(() => {
    const shouldOpen =
      searchParams?.get('edit') === 'true' ||
      searchParams?.get('edit') === '1' ||
      searchParams?.get('modal') === 'profile';
    if (shouldOpen && !hasAutoOpenedEdit.current) {
      hasAutoOpenedEdit.current = true;
      setIsEditOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (session?.authError && !session?.apiAccessToken) {
      const fallbackMessage =
        session.authError === 'AccountSuspended'
          ? 'Your account has been suspended. Please contact support for help.'
          : session.authError === 'GoogleBackendSyncFailed'
          ? 'Finishing Google sign-in. This can take a few seconds.'
          : session.authError === 'GoogleTokenMissing'
            ? 'Google login token was missing. Please sign out and sign in again.'
            : session.authError === 'RefreshAccessTokenError'
              ? 'Session refresh failed. Please sign out and sign in again.'
              : 'Login sync failed. Please sign out and sign in again.';
      const nextMessage =
        session.authError === 'AccountSuspended'
          ? session.authErrorMessage?.trim() || fallbackMessage
          : session.authError === 'GoogleBackendSyncFailed'
            ? fallbackMessage
          : session.authErrorMessage?.trim()
            ? `Login sync failed: ${session.authErrorMessage}`
            : fallbackMessage;
      setAuthSyncError(nextMessage);
    } else {
      setAuthSyncError(null);
    }
  }, [session?.apiAccessToken, session?.authError, session?.authErrorMessage]);

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
      // Avoid noisy session re-fetch loops while Google auth sync is still pending.
      if (!isGoogleSyncPending && refreshSession) {
        const refreshed = await refreshSessionOnce(refreshSession);
        accessToken = refreshed?.apiAccessToken;
      }
    }
    return accessToken;
  };

  const [profile, setProfile] = useState({
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

  const [profileStats, setProfileStats] = useState({
    promptCount: 0,
    savedCount: 0,
    likedCount: 0,
    audienceCount: 0,
    plan: 'FREE',
  });

  const [recentActivity, setRecentActivity] = useState<
    Array<{
      id: string;
      type: 'SAVE' | 'LIKE' | 'CREATE';
      promptTitle: string | null;
      promptSlug: string | null;
      createdAt: string;
    }>
  >([]);

  const [savedPromptCards, setSavedPromptCards] = useState<
    Array<{
      id: string;
      title: string;
      slug: string;
      promptType: string;
      savedAt: string;
      image: string | null;
    }>
  >([]);
  const [savedRange, setSavedRange] = useState('Lifetime');
  const [likedRange, setLikedRange] = useState('Lifetime');

  const rangeOptions = ['Yesterday', 'Last week', 'Last month', 'Last year', 'Lifetime'];

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    let isActive = true;
    let refreshId: number | null = null;
    setProfileLoadError(null);

    const fetchSummary = async (options: { updateProfile: boolean; showError: boolean }) => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          if (options.showError) {
            setProfileLoadError(
              isGoogleSyncPending
                ? 'Finishing Google sign-in. Please wait and try again in a moment.'
                : 'Unable to access profile right now. Please refresh once and try again.',
            );
          }
          return;
        }
        let response = await fetch(`${apiBaseUrl}/api/auth/profile/summary`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: 'no-store',
        });
        if (response.status === 401 && refreshSession) {
          const refreshed = await refreshSessionOnce(refreshSession);
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
          if (response.status === 401 && options.showError) {
            setProfileLoadError(
              isGoogleSyncPending
                ? 'Finishing Google sign-in. Please wait and try again in a moment.'
                : 'Unable to access profile right now. Please refresh once and try again.',
            );
            return;
          }
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || 'Unable to load profile details. Please try again.');
        }
        const payload = (await response.json()) as {
          user: {
            name: string | null;
            handle: string | null;
            profileTitle: string | null;
            bio: string | null;
            focusTags: string[] | null;
            avatarUrl: string | null;
            avatarUpdatedAt: string | null;
            hasPassword: boolean;
          };
          stats: {
            promptCount: number;
            savedCount: number;
            likedCount: number;
            audienceCount: number;
            plan: string;
          };
          recentActivity: Array<{
            id: string;
            type: 'SAVE' | 'LIKE' | 'CREATE';
            promptTitle: string | null;
            promptSlug: string | null;
            createdAt: string;
          }>;
          savedPrompts: Array<{
            id: string;
            title: string;
            slug: string;
            promptType: string;
            image: string | null;
            savedAt: string;
          }>;
        };

        if (!isActive) return;

        if (options.updateProfile) {
          const nextFocusTags = payload.user.focusTags ?? [];
          setFocusTagsInput(nextFocusTags.join(', '));
          setProfile({
            name: payload.user.name ?? '',
            handle: payload.user.handle ?? '',
            profileTitle: payload.user.profileTitle ?? '',
            bio: payload.user.bio ?? '',
            focusTags: nextFocusTags,
            avatarUrl: payload.user.avatarUrl ?? '',
            avatarUpdatedAt: payload.user.avatarUpdatedAt ?? null,
            hasPassword: Boolean(payload.user.hasPassword),
          });
        }

        setProfileStats({
          promptCount: payload.stats.promptCount,
          savedCount: payload.stats.savedCount,
          likedCount: payload.stats.likedCount,
          audienceCount: payload.stats.audienceCount,
          plan: payload.stats.plan,
        });
        setRecentActivity(payload.recentActivity);
        setSavedPromptCards(payload.savedPrompts.slice(0, SAVED_PROMPTS_PREVIEW_LIMIT));
        setProfileLoadError(null);
      } catch (error) {
        if (!isActive) return;
        if (options.showError) {
          setProfileLoadError(error instanceof Error ? error.message : 'Unable to load profile.');
        }
      }
    };

    fetchSummary({ updateProfile: !isEditOpen, showError: true });

    const refreshIntervalMs = isGoogleSyncPending ? 4000 : 15000;
    refreshId = window.setInterval(() => {
      fetchSummary({ updateProfile: !isEditOpen, showError: false });
    }, refreshIntervalMs);

    return () => {
      isActive = false;
      if (refreshId) {
        window.clearInterval(refreshId);
      }
    };
  }, [apiBaseUrl, isEditOpen, isGoogleSyncPending, refreshSession, session?.authError, session?.apiAccessToken, status]);

  useEffect(() => {
    if (!isEditOpen) {
      return;
    }
    setFocusTagsInput(profile.focusTags.join(', '));
    if (!profile.name && session?.user?.name) {
      setProfile((current) => ({ ...current, name: session.user.name ?? current.name }));
    }
    if (!profile.handle && session?.user?.handle) {
      setProfile((current) => ({ ...current, handle: session.user.handle ?? current.handle }));
    }
  }, [isEditOpen, profile.focusTags, session?.user?.handle, session?.user?.name]);

  const formatCompactNumber = (value: number) =>
    new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

  const formatRelativeTime = (value: string) => {
    const date = new Date(value);
    const diffMs = date.getTime() - Date.now();
    const minutes = Math.round(diffMs / 60000);
    const hours = Math.round(diffMs / 3600000);
    const days = Math.round(diffMs / 86400000);

    if (Math.abs(minutes) < 60) {
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(minutes, 'minute');
    }
    if (Math.abs(hours) < 24) {
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(hours, 'hour');
    }
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(days, 'day');
  };

  const formatPromptType = (value: string) =>
    value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const formatProfileError = (status: number | null, message?: string | string[] | null) => {
    if (status === 413) {
      return 'Image too large. Please use a smaller file (max 2MB).';
    }
    if (Array.isArray(message)) {
      return message[0] || 'Unable to update your profile. Please try again.';
    }
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    return 'Unable to update your profile. Please try again.';
  };

  const completionItems = [
    {
      label: 'Profile photo',
      done: Boolean(profile.avatarUrl || session?.user?.image),
    },
    {
      label: 'Full name',
      done: Boolean(profile.name.trim()),
    },
    {
      label: 'Role',
      done: Boolean(profile.profileTitle.trim()),
    },
    {
      label: 'Bio',
      done: Boolean(profile.bio.trim()),
    },
    {
      label: 'Focus tags',
      done: profile.focusTags.length > 0,
    },
  ];
  const completionScore = completionItems.filter((item) => item.done).length;
  const completionTotal = completionItems.length;
  const completionPercent =
    completionTotal > 0 ? Math.round((completionScore / completionTotal) * 100) : 0;
  const showCompletionBar = completionPercent < 100;
  const showCreatorDashboard = false;

  const statCards = [
    {
      label: 'Prompt Packs',
      value: formatCompactNumber(profileStats.promptCount),
      tone: 'bg-[#f7f5f2]',
    },
    {
      label: 'Saved Items',
      value: formatCompactNumber(profileStats.savedCount),
      tone: 'bg-[#eff3ff]',
    },
    {
      label: 'Audience',
      value: formatCompactNumber(profileStats.audienceCount),
      tone: 'bg-[#f3f9f6]',
    },
  ];

  const activityTimeline = recentActivity.map((activity) => {
    const toneMap = {
      SAVE: 'bg-[#f4f7ff] text-[#2f5bd9]',
      LIKE: 'bg-[#fff4e6] text-[#d2603a]',
      CREATE: 'bg-[#eef7f1] text-[#2f7a5a]',
    } as const;

    const titleMap = {
      SAVE: 'Prompt saved',
      LIKE: 'Prompt liked',
      CREATE: 'Prompt created',
    } as const;

    return {
      id: activity.id || `${activity.type}-${activity.promptTitle ?? 'activity'}-${activity.createdAt}`,
      title: titleMap[activity.type],
      detail: activity.promptTitle ? `“${activity.promptTitle}”` : 'Your recent prompt activity.',
      time: formatRelativeTime(activity.createdAt),
      tone: toneMap[activity.type],
      promptSlug: activity.promptSlug,
    };
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const closeEditModal = () => {
    setAvatarPreview(null);
    setPreviousPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsEditOpen(false);
  };

  useEffect(() => {
    if (!isShareOpen) {
      setCopied(false);
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-share-menu]')) {
        setIsShareOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsShareOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onEscape);
    };
  }, [isShareOpen]);

  useEffect(() => {
    if (!copied) return;
    const timeoutId = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);
  const avatarFallbackName = profile.name || session?.user?.name || 'Your profile';
  const displayAvatarUrl = avatarPreview || profile.avatarUrl || session?.user?.image || null;
  const shareHandle = (profile.handle || session?.user?.handle || '').replace(/^@/, '').trim();
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    const origin = window.location.origin;
    return shareHandle ? `${origin}/u/${shareHandle}` : window.location.href;
  }, [shareHandle]);
  const shareText = profile.name?.trim()
    ? `Check out ${profile.name} on Gemini Prompts.`
    : 'Check out this creator on Gemini Prompts.';
  const openShare = (url: string) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const shareLinks = useMemo(() => {
    if (!shareUrl) {
      return null;
    }
    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      x: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
        shareText,
      )}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
        shareText,
      )}`,
      threads: `https://www.threads.net/intent/post?text=${encodeURIComponent(
        `${shareText} ${shareUrl}`,
      )}`,
      pinterest: `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(
        shareUrl,
      )}&description=${encodeURIComponent(shareText)}`,
    };
  }, [shareText, shareUrl]);

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('main > section.reveal-section'),
    );

    if (sections.length === 0) {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sections.forEach((section) => section.classList.add('is-visible'));
      return;
    }

    sections.forEach((section, index) => {
      section.style.setProperty('--reveal-delay', `${Math.min(index * 80, 320)}ms`);
    });

    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            currentObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.14,
        rootMargin: '0px 0px -10% 0px',
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isEditOpen) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeEditModal();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isEditOpen]);

  return (
    <main className="homepage-headings w-full pb-20 pt-4">
      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
        <div className="page-container-wide">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[32px] border border-[#e2e6ee] bg-white p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <AuthorAvatar
                    name={avatarFallbackName}
                    avatarUrl={displayAvatarUrl}
                    avatarUpdatedAt={profile.avatarUpdatedAt}
                    className="h-16 w-16 rounded-[22px] border border-[#e1e5ee]"
                    initialClassName="text-[1rem]"
                    alt={`${avatarFallbackName} profile`}
                  />
                  <div>
                    <p className="text-[1.15rem] leading-[1.1] text-[#0f1116] sm:text-[1.3rem]">
                      {profile.name || session?.user?.name || 'Your profile'}
                    </p>
                    <p className="mt-1 text-[0.82rem] text-[#6a7280] sm:text-[0.9rem]">
                      {profile.profileTitle || 'Creator Strategist'}
                    </p>
                    {profile.handle ? (
                      <p className="mt-1 text-[0.76rem] text-[#9aa1ae]">@{profile.handle}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileSaveError(null);
                      setIsEditOpen(true);
                    }}
                    disabled={status !== 'authenticated'}
                    className="w-full rounded-full border border-[#d7dde6] bg-white px-4 py-2 text-[0.85rem] text-[#0f1116] transition-colors duration-300 hover:border-[#0f1116] hover:bg-[#0f1116] hover:text-white sm:w-auto"
                  >
                    Edit profile
                  </button>
                  <div className="relative w-full sm:w-auto" data-share-menu>
                    <button
                      type="button"
                      onClick={() => setIsShareOpen((prev) => !prev)}
                      className="w-full rounded-full bg-[#0f1116] px-4 py-2 text-[0.85rem] text-white transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto"
                      aria-expanded={isShareOpen}
                      aria-haspopup="menu"
                    >
                      Share profile
                    </button>
                    {isShareOpen ? (
                      <div
                        role="menu"
                        className="absolute left-1/2 top-[calc(100%+10px)] z-40 flex w-[min(calc(100vw-2rem),22rem)] -translate-x-1/2 flex-wrap items-center gap-2 rounded-[20px] border border-[#e6e9ef] bg-white px-3 py-2.5 shadow-[0_8px_20px_rgba(15,18,24,0.08)] sm:left-0 sm:w-auto sm:translate-x-0 sm:flex-nowrap"
                      >
                        <button
                          type="button"
                          className="group relative flex h-9 w-9 items-center justify-center rounded-full bg-[#1877f2] text-white"
                          aria-label="Share on Facebook"
                          onClick={() => {
                            if (shareLinks?.facebook) {
                              openShare(shareLinks.facebook);
                            }
                          }}
                        >
                          <FaFacebookF className="h-4 w-4" />
                          <span className="pointer-events-none absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0f1116] px-2.5 py-1 text-[0.72rem] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            Share on Facebook
                          </span>
                        </button>
                        <button
                          type="button"
                          className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-[#d9dde6] bg-white text-[#111111]"
                          aria-label="Copy profile link"
                          onClick={async () => {
                            try {
                              if (!shareUrl) return;
                              await navigator.clipboard.writeText(shareUrl);
                              setCopied(true);
                            } catch {
                              setCopied(false);
                              // Swallow; clipboard may be blocked by permissions.
                            }
                          }}
                        >
                          <FaLink className="h-4 w-4" />
                          <span className="pointer-events-none absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0f1116] px-2.5 py-1 text-[0.72rem] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            Copy link
                          </span>
                        </button>
                        <button
                          type="button"
                          className="group relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#111111] border border-[#d9dde6]"
                          aria-label="Share on X"
                          onClick={() => {
                            if (shareLinks?.x) {
                              openShare(shareLinks.x);
                            }
                          }}
                        >
                          <FaXTwitter className="h-4 w-4" />
                          <span className="pointer-events-none absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0f1116] px-2.5 py-1 text-[0.72rem] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            Share on X
                          </span>
                        </button>
                        <button
                          type="button"
                          className="group relative flex h-9 w-9 items-center justify-center rounded-full bg-[#2aa4f4] text-white"
                          aria-label="Share on Telegram"
                          onClick={() => {
                            if (shareLinks?.telegram) {
                              openShare(shareLinks.telegram);
                            }
                          }}
                        >
                          <FaTelegram className="h-4 w-4" />
                          <span className="pointer-events-none absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0f1116] px-2.5 py-1 text-[0.72rem] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            Share on Telegram
                          </span>
                        </button>
                        <button
                          type="button"
                          className="group relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#111111] border border-[#d9dde6]"
                          aria-label="Share on Threads"
                          onClick={() => {
                            if (shareLinks?.threads) {
                              openShare(shareLinks.threads);
                            }
                          }}
                        >
                          <FaThreads className="h-4 w-4" />
                          <span className="pointer-events-none absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0f1116] px-2.5 py-1 text-[0.72rem] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            Share on Threads
                          </span>
                        </button>
                        <button
                          type="button"
                          className="group relative flex h-9 w-9 items-center justify-center rounded-full bg-[#e60023] text-white"
                          aria-label="Share on Pinterest"
                          onClick={() => {
                            if (shareLinks?.pinterest) {
                              openShare(shareLinks.pinterest);
                            }
                          }}
                        >
                          <FaPinterestP className="h-4 w-4" />
                          <span className="pointer-events-none absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0f1116] px-2.5 py-1 text-[0.72rem] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            Share on Pinterest
                          </span>
                        </button>
                        {copied ? (
                          <span className="ml-1 rounded-full bg-[#0f1116] px-2.5 py-1 text-[0.72rem] text-white">
                            Copied
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-6">
                <p className="max-w-[36rem] text-[0.92rem] leading-7 text-[#606874] sm:text-[0.98rem]">
                  {profile.bio}
                </p>

                <div className="flex flex-wrap gap-2.5">
                  {profile.focusTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#f0f2f6] px-3 py-1.5 text-[0.82rem] leading-none text-[#3d4654]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {showCompletionBar ? (
                  <div className="rounded-[22px] border border-[#e6e9ef] bg-white px-4 py-4">
                    <p className="text-[0.95rem] text-[#2b2f3a]">Profile completeness</p>
                    <div className="mt-4 rounded-full bg-[#f2f4f7] p-1.5">
                      <div
                        className="h-2.5 rounded-full bg-[#0f1116]"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[0.88rem] text-[#6b7280]">
                      <span>
                        {completionPercent}% complete • {completionScore}/{completionTotal} points
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileSaveError(null);
                          setIsEditOpen(true);
                        }}
                        className="text-[0.88rem] text-[#6b7280] underline decoration-[#d1d6df] underline-offset-4"
                      >
                        Update portfolio
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-[#d9e7df] bg-gradient-to-br from-[#eef7f1] via-[#f4faf6] to-[#e8f4ee] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[0.82rem] text-[#6f7a86]">Saved prompts</p>
                        <p className="mt-2 text-[1.6rem] leading-none text-[#0f1116]">
                          {formatCompactNumber(profileStats.savedCount)}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-[1.1rem] text-[#2b5a3a]">
                        <FaRegBookmark className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="sr-only" htmlFor="saved-range">
                        Saved prompts range
                      </label>
                      <select
                        id="saved-range"
                        value={savedRange}
                        onChange={(event) => setSavedRange(event.target.value)}
                        className="rounded-full border border-white/60 bg-white/80 px-4 py-1.5 pr-9 text-[0.78rem] text-[#6f7a86] shadow-none outline-none"
                      >
                        {rangeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-[#f1dcc5] bg-gradient-to-br from-[#fff1e0] via-[#fff6ea] to-[#ffe9d0] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[0.82rem] text-[#7b6b5f]">Liked prompts</p>
                        <p className="mt-2 text-[1.6rem] leading-none text-[#0f1116]">
                          {formatCompactNumber(profileStats.likedCount)}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-[1.1rem] text-[#a24a1b]">
                        <FaHeart className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="sr-only" htmlFor="liked-range">
                        Liked prompts range
                      </label>
                      <select
                        id="liked-range"
                        value={likedRange}
                        onChange={(event) => setLikedRange(event.target.value)}
                        className="rounded-full border border-white/70 bg-white/80 px-4 py-1.5 pr-9 text-[0.78rem] text-[#7b6b5f] shadow-none outline-none"
                      >
                        {rangeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              {authSyncError ? (
                <p className="mt-3 text-[0.85rem] text-[#d2603a]">{authSyncError}</p>
              ) : profileLoadError ? (
                <p className="mt-3 text-[0.85rem] text-[#d2603a]">{profileLoadError}</p>
              ) : null}
            </div>

            <div className="rounded-[32px] border border-[#e6e9ef] bg-white p-6 sm:p-8 lg:p-10">
              <div className="mt-5 flex items-center justify-between rounded-[16px] border border-[#eef1f6] bg-[#f9fafc] px-4 py-3">
                <span className="text-[0.85rem] text-[#6b7280]">Plan</span>
                <span className="rounded-full bg-white px-3 py-1 text-[0.8rem] text-[#1c212b]">
                  {formatPromptType(profileStats.plan)}
                </span>
              </div>
              <div className="mt-3">
                <a
                  href="/membership/manage"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#d8dee9] bg-white px-4 text-[0.82rem] font-medium text-[#111827] transition-colors hover:border-[#111827]"
                >
                  Manage membership
                </a>
              </div>

              <div className="mt-8 grid gap-4">
                {statCards.map((card) => (
                  <div key={card.label} className={`${card.tone} rounded-[22px] p-4 sm:p-5`}>
                    <p className="text-[0.85rem] text-[#6b7280]">{card.label}</p>
                    <p className="mt-2 text-[1.6rem] leading-none text-[#0f1116] sm:text-[1.75rem]">
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="reveal-section px-4 pb-10 sm:px-6 sm:pb-12 lg:pb-16">
        <div className="page-container-wide grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[24px] border border-[#e2e6ee] bg-white p-5 sm:p-6 lg:p-7">
            <div className="flex items-center justify-between gap-4">
              <h2 className="section-heading-medium text-[1.65rem] leading-[1.08] tracking-[-0.04em] text-[#0f1116] sm:text-[1.95rem]">
                Recent activity
              </h2>
              <Link
                href="/profile/activity"
                className="rounded-full border border-[#d8dde6] bg-white px-3.5 py-1.5 text-[0.76rem] text-[#0f1116] transition-colors duration-300 hover:border-[#0f1116] hover:bg-[#0f1116] hover:text-white"
              >
                View all
              </Link>
            </div>

            <div className="mt-4">
              {activityTimeline.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[#d8dde6] bg-white p-4 text-[0.9rem] text-[#7a8292] sm:p-5">
                  No activity yet. Save or publish a prompt to see updates here.
                </div>
              ) : (
                <>
                  <div className="space-y-2.5 md:hidden">
                    {activityTimeline.map((item) => (
                      <article
                        key={`${item.id}-mobile`}
                        className="rounded-[16px] border border-[#e8ecf4] bg-white p-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[0.88rem] font-medium text-[#10141c]">{item.title}</p>
                            <p className="mt-1 text-[0.8rem] text-[#667080]">{item.detail}</p>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[0.72rem] ${item.tone}`}
                          >
                            {item.time}
                          </span>
                        </div>
                        <div className="mt-3">
                          {item.promptSlug ? (
                            <Link
                              href={`/prompt/${item.promptSlug}`}
                              className="inline-flex rounded-full border border-[#d4d9e2] px-2.5 py-1 text-[0.72rem] text-[#10141c] transition-colors duration-300 hover:border-[#10141c] hover:bg-[#10141c] hover:text-white"
                            >
                              Open
                            </Link>
                          ) : (
                            <span className="text-[0.76rem] text-[#a0a8b6]">—</span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto rounded-[16px] border border-[#e8ecf4] md:block">
                    <table className="w-full min-w-[560px] text-left">
                      <thead className="bg-[#f8fafd] text-[0.7rem] uppercase tracking-[0.08em] text-[#7a8292]">
                        <tr>
                          <th className="px-3 py-2.5 font-semibold">Time</th>
                          <th className="px-3 py-2.5 font-semibold">Activity</th>
                          <th className="px-3 py-2.5 font-semibold">Prompt</th>
                          <th className="px-3 py-2.5 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {activityTimeline.map((item) => (
                          <tr key={item.id} className="border-t border-[#eef1f6] align-middle">
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[0.72rem] ${item.tone}`}
                              >
                                {item.time}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-[0.88rem] font-medium text-[#10141c]">
                              {item.title}
                            </td>
                            <td className="px-3 py-2.5 text-[0.82rem] text-[#667080]">
                              {item.detail}
                            </td>
                            <td className="px-3 py-2.5">
                              {item.promptSlug ? (
                                <Link
                                  href={`/prompt/${item.promptSlug}`}
                                  className="inline-flex rounded-full border border-[#d4d9e2] px-2.5 py-1 text-[0.72rem] text-[#10141c] transition-colors duration-300 hover:border-[#10141c] hover:bg-[#10141c] hover:text-white"
                                >
                                  Open
                                </Link>
                              ) : (
                                <span className="text-[0.76rem] text-[#a0a8b6]">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          <div
            id="saved-prompts"
            className="scroll-mt-24 rounded-[22px] bg-[#f5f6f8] p-4 sm:p-5 lg:p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="section-heading-medium text-[1.45rem] leading-[1.08] tracking-[-0.04em] text-[#0f1116] sm:text-[1.7rem]">
                Saved prompts
              </h2>
              <Link
                href="/profile/saved"
                className="rounded-full border border-[#d8dde6] bg-white px-3 py-1.5 text-[0.72rem] text-[#0f1116] transition-colors duration-300 hover:border-[#0f1116] hover:bg-[#0f1116] hover:text-white"
              >
                View all
              </Link>
            </div>
            <p className="mt-2 max-w-[26rem] text-[0.84rem] leading-6 text-[#667080]">
              Your hand-picked prompt kits, always organized and ready to deploy.
            </p>

            <div className="mt-3.5 space-y-2.5">
              {savedPromptCards.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-[#d8dde6] bg-white p-3.5 text-[0.84rem] text-[#7a8292] sm:p-4">
                  No saved prompts yet.
                </div>
              ) : (
                savedPromptCards.map((prompt) => (
                  <article
                    key={prompt.id}
                    className="flex flex-col gap-2.5 rounded-[16px] border border-[#dde3eb] bg-white p-2.5 sm:flex-row sm:items-center sm:p-3"
                  >
                    <div
                      className="h-[90px] w-full overflow-hidden rounded-[12px] bg-[#eef1f5] sm:h-[74px] sm:w-[122px]"
                    >
                      <PromptThumb
                        image={prompt.image}
                        title={prompt.title}
                        fallbackKey={prompt.slug || prompt.id}
                        className="h-full w-full"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="rounded-full bg-[#f0f2f6] px-2 py-0.5 text-[0.7rem] text-[#4a5261]">
                        {formatPromptType(prompt.promptType)}
                      </span>
                      <h3 className="mt-1.5 text-[0.92rem] leading-[1.28] text-[#10141c] sm:text-[0.98rem]">
                        {prompt.title}
                      </h3>
                      <p className="mt-0.5 text-[0.76rem] text-[#7a8292]">
                        Saved {formatRelativeTime(prompt.savedAt)}
                      </p>
                    </div>
                    <Link
                      href={`/prompt/${prompt.slug}`}
                      className="self-start rounded-full border border-[#d4d9e2] px-3 py-1.5 text-[0.72rem] text-[#10141c] transition-colors duration-300 hover:border-[#10141c] hover:bg-[#10141c] hover:text-white sm:self-auto"
                    >
                      Open
                    </Link>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {showCreatorDashboard ? (
        <section className="reveal-section px-4 pb-12 sm:px-6 sm:pb-16">
          <div className="page-container-wide overflow-hidden rounded-[34px] border border-[#e2e6ee] bg-white">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="p-6 sm:p-8 lg:p-12">
                <h2 className="section-heading-medium text-[2.05rem] leading-[1.05] tracking-[-0.05em] text-[#0f1116] sm:text-[2.6rem]">
                  Creator dashboard
                </h2>
                <p className="mt-3 max-w-[32rem] text-[0.92rem] leading-7 text-[#667080] sm:text-[0.98rem]">
                  Track your audience growth, measure prompt engagement, and keep your launch
                  momentum visible at a glance.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[22px] bg-[#f7f4ee] p-4">
                    <p className="text-[0.82rem] text-[#7a7f89]">Engagement</p>
                    <p className="mt-2 text-[1.5rem] text-[#10141c]">+24%</p>
                    <p className="mt-2 text-[0.82rem] text-[#7a7f89]">Last 30 days</p>
                  </div>
                  <div className="rounded-[22px] bg-[#eef3ff] p-4">
                    <p className="text-[0.82rem] text-[#7a7f89]">New followers</p>
                    <p className="mt-2 text-[1.5rem] text-[#10141c]">312</p>
                    <p className="mt-2 text-[0.82rem] text-[#7a7f89]">Last 30 days</p>
                  </div>
                  <div className="rounded-[22px] bg-[#f2f8f4] p-4">
                    <p className="text-[0.82rem] text-[#7a7f89]">Prompt saves</p>
                    <p className="mt-2 text-[1.5rem] text-[#10141c]">1.9k</p>
                    <p className="mt-2 text-[0.82rem] text-[#7a7f89]">Lifetime</p>
                  </div>
                  <div className="rounded-[22px] bg-[#fff4e6] p-4">
                    <p className="text-[0.82rem] text-[#7a7f89]">Top category</p>
                    <p className="mt-2 text-[1.5rem] text-[#10141c]">Marketing</p>
                    <p className="mt-2 text-[0.82rem] text-[#7a7f89]">Last 90 days</p>
                  </div>
                </div>
              </div>

              <div className="relative min-h-[320px] bg-[#f0f2f6] p-6 sm:p-8 lg:p-10">
                <div className="rounded-[26px] bg-white p-5">
                  <p className="text-[0.85rem] text-[#6b7280]">Next milestone</p>
                  <p className="mt-3 text-[1.25rem] leading-[1.2] text-[#10141c]">
                    Reach 2,000 saves to unlock Creator Spotlight.
                  </p>
                  <div className="mt-5 rounded-full bg-[#eef1f6] p-1">
                    <div className="h-2 rounded-full bg-[#10141c]" style={{ width: '78%' }} />
                  </div>
                  <p className="mt-3 text-[0.82rem] text-[#7a8292]">1,562 of 2,000 saves</p>
                </div>

                <div className="mt-6 rounded-[26px] border border-[#e2e6ee] bg-white p-5">
                  <p className="text-[0.85rem] text-[#6b7280]">Upcoming collaborations</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#e6eaf2]" />
                    <div>
                      <p className="text-[0.92rem] text-[#10141c]">Studio North</p>
                      <p className="text-[0.82rem] text-[#7a8292]">Content sprint kickoff</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#f1e6f2]" />
                    <div>
                      <p className="text-[0.92rem] text-[#10141c]">Turn Around Music</p>
                      <p className="text-[0.82rem] text-[#7a8292]">Launch planning</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isEditOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0f141fcc] px-4 py-6"
          onClick={closeEditModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
        >
          <div
            className="no-scrollbar w-full max-w-[520px] max-h-[80vh] overflow-y-auto rounded-[24px] border border-[#e2e6ee] bg-white p-5 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.9rem] text-[#7a8292]">Profile</p>
                <h3
                  id="edit-profile-title"
                  className="text-[1.4rem] leading-[1.1] text-[#0f1116] sm:text-[1.6rem]"
                >
                  Edit profile
                </h3>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e1e5ee] text-[#6a7280] transition-colors duration-300 hover:border-[#0f1116] hover:text-[#0f1116]"
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

            <form
              className="mt-5 space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                const accessToken = await getAccessToken();
                if (!accessToken) {
                  setProfileSaveError(
                    isGoogleSyncPending
                      ? 'Finishing Google sign-in. Please wait a moment, then update your profile.'
                      : 'Session expired. Please sign out and sign in again to update your profile.',
                  );
                  return;
                }
                const hasPreviousPassword = previousPassword.length > 0;
                const hasNewPassword = newPassword.length > 0;
                const hasConfirmPassword = confirmPassword.length > 0;
                const hasAnyPasswordInput =
                  hasPreviousPassword || hasNewPassword || hasConfirmPassword;

                if (hasAnyPasswordInput) {
                  if (profile.hasPassword) {
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

                const updatePayload = {
                  name: profile.name,
                  handle: profile.handle,
                  profileTitle: profile.profileTitle,
                  bio: profile.bio,
                  focusTags: focusTagsInput
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter((tag) => tag.length > 0),
                  avatarUrl: avatarPreview || profile.avatarUrl || null,
                  ...(hasPreviousPassword ? { previousPassword } : {}),
                  ...(hasNewPassword ? { newPassword } : {}),
                  ...(hasConfirmPassword ? { confirmPassword } : {}),
                };

                setIsSaving(true);
                setProfileSaveError(null);
                try {
                  let response = await fetch(`${apiBaseUrl}/api/auth/profile`, {
                    method: 'PATCH',
                    headers: {
                      'content-type': 'application/json',
                      Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify(updatePayload),
                  });
                  if (response.status === 401 && refreshSession) {
                    const refreshed = await refreshSessionOnce(refreshSession);
                    const retryToken = refreshed?.apiAccessToken;
                    if (retryToken) {
                      response = await fetch(`${apiBaseUrl}/api/auth/profile`, {
                        method: 'PATCH',
                        headers: {
                          'content-type': 'application/json',
                          Authorization: `Bearer ${retryToken}`,
                        },
                        body: JSON.stringify(updatePayload),
                      });
                    }
                  }
                  const payload = await response.json().catch(() => null);
                  if (!response.ok) {
                    throw new Error(formatProfileError(response.status, payload?.message));
                  }
                  const nextFocusTags = payload.user.focusTags ?? [];
                  setProfile({
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
                  setPreviousPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setIsEditOpen(false);
                  window.dispatchEvent(new Event('profile-updated'));
                } catch (error) {
                  setProfileSaveError(
                    error instanceof Error ? error.message : 'Failed to update profile.',
                  );
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              <div className="grid gap-4 sm:grid-cols-[170px_1fr] sm:items-start">
                <div>
                  <span className="text-[0.8rem] text-[#7a8292]">Profile photo</span>
                  <div className="mt-2 flex flex-col gap-3">
                    <label className="cursor-pointer">
                      <span className="sr-only">Upload profile photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          setProfileSaveError(null);
                          if (!file) {
                            setAvatarPreview(null);
                            return;
                          }
                          if (!file.type.startsWith('image/')) {
                            setProfileSaveError('Please upload a valid image file.');
                            event.currentTarget.value = '';
                            return;
                          }
                          if (file.size > 2 * 1024 * 1024) {
                            setProfileSaveError('Image must be under 2MB.');
                            event.currentTarget.value = '';
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            setAvatarPreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      <AuthorAvatar
                        name={avatarFallbackName}
                        avatarUrl={displayAvatarUrl}
                        avatarUpdatedAt={profile.avatarUpdatedAt}
                        className="h-14 w-14 rounded-[18px] border border-[#e1e5ee]"
                        initialClassName="text-[0.92rem]"
                        alt={`${avatarFallbackName} profile`}
                      />
                    </label>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarPreview(null);
                          setProfile((current) => ({ ...current, avatarUrl: '' }));
                        }}
                        className="text-left text-[0.74rem] text-[#7a8292] underline decoration-[#d1d6df] underline-offset-4"
                      >
                        Remove photo
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-[0.74rem] text-[#9aa1ae]">JPG or PNG up to 2MB.</p>
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-[0.85rem] text-[#7a8292]">Full name</span>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(event) =>
                        setProfile((current) => ({ ...current, name: event.target.value }))
                      }
                      className="mt-2 w-full rounded-[14px] border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-[0.9rem] text-[#0f1116] outline-none focus:border-[#0f1116]"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[0.85rem] text-[#7a8292]">Role</span>
                    <input
                      type="text"
                      value={profile.profileTitle}
                      onChange={(event) =>
                        setProfile((current) => ({ ...current, profileTitle: event.target.value }))
                      }
                      className="mt-2 w-full rounded-[14px] border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-[0.9rem] text-[#0f1116] outline-none focus:border-[#0f1116]"
                    />
                  </label>
                </div>
              </div>

              <label className="mt-4 block">
                <span className="text-[0.85rem] text-[#7a8292]">Handle</span>
                <input
                  type="text"
                  value={profile.handle}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, handle: event.target.value }))
                  }
                  placeholder="@your-handle"
                  className="mt-2 w-full rounded-[14px] border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-[0.9rem] text-[#0f1116] outline-none focus:border-[#0f1116]"
                />
              </label>

              <label className="block">
                <span className="text-[0.85rem] text-[#7a8292]">Bio</span>
                <textarea
                  rows={3}
                  value={profile.bio}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, bio: event.target.value }))
                  }
                  className="mt-2 w-full rounded-[14px] border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-[0.9rem] text-[#0f1116] outline-none focus:border-[#0f1116]"
                />
              </label>

              <label className="block">
                <span className="text-[0.85rem] text-[#7a8292]">Focus tags</span>
                <input
                  type="text"
                  value={focusTagsInput}
                  onChange={(event) => setFocusTagsInput(event.target.value)}
                  className="mt-2 w-full rounded-[14px] border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-[0.9rem] text-[#0f1116] outline-none focus:border-[#0f1116]"
                />
                <p className="mt-2 text-[0.78rem] text-[#9aa1ae]">Separate tags with commas.</p>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                {profile.hasPassword ? (
                  <>
                    <label className="block">
                      <span className="text-[0.85rem] text-[#7a8292]">Previous password</span>
                      <input
                        type="password"
                        value={previousPassword}
                        onChange={(event) => setPreviousPassword(event.target.value)}
                        autoComplete="current-password"
                        className="mt-2 w-full rounded-[14px] border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-[0.9rem] text-[#0f1116] outline-none focus:border-[#0f1116]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[0.85rem] text-[#7a8292]">New password</span>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        autoComplete="new-password"
                        className="mt-2 w-full rounded-[14px] border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-[0.9rem] text-[#0f1116] outline-none focus:border-[#0f1116]"
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="block">
                      <span className="text-[0.85rem] text-[#7a8292]">New password</span>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        autoComplete="new-password"
                        className="mt-2 w-full rounded-[14px] border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-[0.9rem] text-[#0f1116] outline-none focus:border-[#0f1116]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[0.85rem] text-[#7a8292]">Confirm password</span>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        className="mt-2 w-full rounded-[14px] border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-[0.9rem] text-[#0f1116] outline-none focus:border-[#0f1116]"
                      />
                    </label>
                  </>
                )}
              </div>
              <p className="text-[0.78rem] text-[#9aa1ae]">
                {profile.hasPassword
                  ? 'Leave password fields empty if you do not want to change your password.'
                  : 'Set a password if you want email/password login in addition to Google.'}
              </p>

              {profileSaveError ? (
                <p className="text-[0.85rem] text-[#d2603a]">{profileSaveError}</p>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-full border border-[#d7dde6] bg-white px-4 py-2 text-[0.82rem] text-[#0f1116] transition-colors duration-300 hover:border-[#0f1116] hover:bg-[#0f1116] hover:text-white"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  pending={isSaving}
                  pendingLabel="Saving..."
                  spinnerSize="xs"
                  disabled={status !== 'authenticated'}
                  className="rounded-full bg-[#0f1116] px-4 py-2 text-[0.82rem] text-white transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Save changes
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ProfilePageFallback() {
  return <main className="bg-white px-4 py-8 sm:px-6 sm:py-12" />;
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageFallback />}>
      <ProfilePageContent />
    </Suspense>
  );
}
