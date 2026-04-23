'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  getProfileActivityList,
  ProfileListsError,
  type ProfileActivityItem,
} from '../../../lib/profile-lists';
import { resolvePromptImage } from '../../../lib/content-image-fallbacks';
import { redirectToSignInModal } from '../../../lib/utils/auth-redirect';
import { refreshSession } from '../../../lib/utils/session';

const PAGE_SIZE = 20;

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

function isAccessTokenExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;
  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtMs)) return false;
  return expiresAtMs <= Date.now() + 60_000;
}

function formatRelativeTime(value: string) {
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
}

function toActivityTone(type: ProfileActivityItem['type']) {
  if (type === 'SAVE') return 'bg-[#f4f7ff] text-[#2f5bd9]';
  if (type === 'LIKE') return 'bg-[#fff4e6] text-[#d2603a]';
  if (type === 'CREATE') return 'bg-[#eef7f1] text-[#2f7a5a]';
  if (type === 'VIEW_PROMPT') return 'bg-[#eef4ff] text-[#3158b0]';
  return 'bg-[#f5f0ff] text-[#7750c6]';
}

function toActivityLabel(type: ProfileActivityItem['type']) {
  if (type === 'SAVE') return 'Prompt saved';
  if (type === 'LIKE') return 'Prompt liked';
  if (type === 'CREATE') return 'Prompt created';
  if (type === 'VIEW_PROMPT') return 'Prompt visited';
  return 'Blog visited';
}

export function ProfileActivityClient() {
  const { data: session, status: sessionStatus, update } = useSession();
  const [items, setItems] = useState<ProfileActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncRetryTick, setSyncRetryTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState<
    'ALL' | 'HISTORY' | 'SAVE' | 'LIKE' | 'CREATE'
  >('ALL');
  const [contentFilter, setContentFilter] = useState<'ALL' | ProfileActivityItem['targetType']>(
    'ALL',
  );
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'prompt_az' | 'prompt_za'>('latest');
  const isGoogleSyncPending =
    session?.authError === 'GoogleBackendSyncFailed' && !session?.apiAccessToken;

  const getAccessToken = useCallback(async () => {
    const currentToken = session?.apiAccessToken ?? null;
    if (currentToken && !isAccessTokenExpired(session?.apiAccessTokenExpiresAt)) {
      return currentToken;
    }

    const refreshed = await refreshSession(update).catch(() => null);
    return refreshed?.apiAccessToken ?? null;
  }, [session?.apiAccessToken, session?.apiAccessTokenExpiresAt, update]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      redirectToSignInModal('/profile/activity');
      return;
    }
    if (sessionStatus !== 'authenticated') {
      return;
    }

    let isActive = true;
    let retryTimeoutId: number | null = null;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          if (isGoogleSyncPending) {
            if (isActive) {
              setError('Finishing Google sign-in. Retrying automatically...');
              retryTimeoutId = window.setTimeout(() => {
                setSyncRetryTick((value) => value + 1);
              }, 2200);
            }
            return;
          }
          redirectToSignInModal('/profile/activity');
          return;
        }
        const payload = await getProfileActivityList(accessToken, {
          skip: pageIndex * PAGE_SIZE,
          take: PAGE_SIZE,
        });
        if (!isActive) return;
        setItems(payload.items ?? []);
        setTotal(payload.total ?? 0);
      } catch (loadError) {
        if (!isActive) return;
        if (loadError instanceof ProfileListsError && loadError.status === 401) {
          if (isGoogleSyncPending) {
            setError('Finishing Google sign-in. Retrying automatically...');
            retryTimeoutId = window.setTimeout(() => {
              setSyncRetryTick((value) => value + 1);
            }, 2200);
            return;
          }
          redirectToSignInModal('/profile/activity');
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to load activity.');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      isActive = false;
      if (retryTimeoutId) {
        window.clearTimeout(retryTimeoutId);
      }
    };
  }, [getAccessToken, isGoogleSyncPending, pageIndex, sessionStatus, syncRetryTick]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const canPrev = pageIndex > 0;
  const canNext = pageIndex + 1 < totalPages;
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    activityFilter !== 'ALL' ||
    contentFilter !== 'ALL' ||
    sortBy !== 'latest';

  const displayedItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = items.filter((item) => {
      if (
        activityFilter === 'HISTORY' &&
        item.type !== 'VIEW_PROMPT' &&
        item.type !== 'VIEW_POST'
      ) {
        return false;
      }
      if (
        activityFilter !== 'ALL' &&
        activityFilter !== 'HISTORY' &&
        item.type !== activityFilter
      ) {
        return false;
      }
      if (contentFilter !== 'ALL' && item.targetType !== contentFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const title = item.title?.toLowerCase() ?? '';
      const label = toActivityLabel(item.type).toLowerCase();
      const subtitle = item.subtitle?.toLowerCase() ?? '';
      return title.includes(query) || label.includes(query) || subtitle.includes(query);
    });

    const sorted = [...filtered];
    sorted.sort((left, right) => {
      if (sortBy === 'latest') {
        return Date.parse(right.createdAt) - Date.parse(left.createdAt);
      }
      if (sortBy === 'oldest') {
        return Date.parse(left.createdAt) - Date.parse(right.createdAt);
      }
      if (sortBy === 'prompt_az') {
        return (left.title ?? '').localeCompare(right.title ?? '', undefined, {
          sensitivity: 'base',
        });
      }
      return (right.title ?? '').localeCompare(left.title ?? '', undefined, {
        sensitivity: 'base',
      });
    });

    return sorted;
  }, [activityFilter, contentFilter, items, searchQuery, sortBy]);

  return (
    <section className="page-shell-tight bg-white">
      <div className="page-container-wide max-w-[1300px]">
        <div className="rounded-[24px] bg-white p-5 sm:p-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-[1.55rem] leading-[1.08] tracking-[-0.04em] text-[#0f1116] sm:text-[1.85rem]">
              All activity
            </h1>
            <Link
              href="/profile"
              className="rounded-full border border-[#d8dde6] bg-white px-3.5 py-1.5 text-[0.76rem] text-[#0f1116] transition-colors hover:border-[#0f1116] hover:bg-[#0f1116] hover:text-white"
            >
              Back profile
            </Link>
          </div>

          {!loading && !error ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(240px,1fr)_170px_180px_auto]">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search prompt or activity..."
                className="h-10 rounded-xl border border-[#dfe5ef] bg-white px-3 text-[0.84rem] text-[#0f1116] outline-none transition-colors placeholder:text-[#98a1b1] focus:border-[#b9c4d9]"
              />
              <select
                value={activityFilter}
                onChange={(event) => setActivityFilter(event.target.value as typeof activityFilter)}
                className="h-10 rounded-xl border border-[#dfe5ef] bg-white px-3 text-[0.82rem] text-[#0f1116] outline-none transition-colors focus:border-[#b9c4d9]"
              >
                <option value="ALL">All activity</option>
                <option value="HISTORY">History</option>
                <option value="SAVE">Saved</option>
                <option value="LIKE">Liked</option>
                <option value="CREATE">Created</option>
              </select>
              <select
                value={contentFilter}
                onChange={(event) =>
                  setContentFilter(event.target.value as 'ALL' | ProfileActivityItem['targetType'])
                }
                className="h-10 rounded-xl border border-[#dfe5ef] bg-white px-3 text-[0.82rem] text-[#0f1116] outline-none transition-colors focus:border-[#b9c4d9]"
              >
                <option value="ALL">All content</option>
                <option value="PROMPT">Prompts</option>
                <option value="POST">Blogs</option>
              </select>
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as 'latest' | 'oldest' | 'prompt_az' | 'prompt_za')
                }
                className="h-10 rounded-xl border border-[#dfe5ef] bg-white px-3 text-[0.82rem] text-[#0f1116] outline-none transition-colors focus:border-[#b9c4d9]"
              >
                <option value="latest">Latest first</option>
                <option value="oldest">Oldest first</option>
                <option value="prompt_az">Title A-Z</option>
                <option value="prompt_za">Title Z-A</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActivityFilter('ALL');
                  setContentFilter('ALL');
                  setSortBy('latest');
                }}
                disabled={!hasActiveFilters}
                className="h-10 rounded-xl border border-[#dfe5ef] bg-white px-3 text-[0.8rem] text-[#10141c] transition-colors hover:bg-[#f8fafd] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="mt-4 rounded-[16px] border border-[#eef1f6] bg-[#fbfcff] p-4 text-[0.9rem] text-[#6f7a86]">
              Loading activity...
            </div>
          ) : null}

          {!loading && error ? (
            <div className="mt-4 rounded-[16px] border border-[#f0d6d6] bg-[#fff6f6] p-4 text-[0.9rem] text-[#8f2f2f]">
              {error}
            </div>
          ) : null}

          {!loading && !error ? (
            <div className="mt-4">
              {displayedItems.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-[#d8dde6] bg-white p-4 text-[0.9rem] text-[#7a8292]">
                  {hasActiveFilters
                    ? 'No activity matches the current filters.'
                    : 'No activity yet.'}
                </div>
              ) : (
                <>
                  <div className="space-y-2.5 md:hidden">
                    {displayedItems.map((item) => (
                      <article
                        key={`${item.id}-mobile`}
                        className="rounded-[16px] border border-[#e8ecf4] bg-white p-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[0.72rem] ${toActivityTone(item.type)}`}
                          >
                            {formatRelativeTime(item.createdAt)}
                          </span>
                          {item.targetPath ? (
                            <Link
                              href={item.targetPath}
                              className="inline-flex rounded-full border border-[#d4d9e2] px-2.5 py-1 text-[0.72rem] text-[#10141c] transition-colors hover:border-[#10141c] hover:bg-[#10141c] hover:text-white"
                            >
                              Open
                            </Link>
                          ) : (
                            <span className="text-[0.76rem] text-[#a0a8b6]">—</span>
                          )}
                        </div>
                        <div className="mt-2.5 flex gap-3">
                          <PromptThumb
                            image={item.image}
                            title={item.title ?? 'Activity image'}
                            fallbackKey={item.targetPath ?? item.id}
                            className="h-14 w-20 shrink-0 rounded-[10px] border border-[#e3e7ef]"
                          />
                          <div className="min-w-0">
                            <p className="text-[0.88rem] font-medium text-[#10141c]">
                              {toActivityLabel(item.type)}
                            </p>
                            <p className="mt-1 text-[0.8rem] text-[#667080]">
                              {item.title ? `“${item.title}”` : 'Your recent activity.'}
                            </p>
                            <p className="mt-1 text-[0.76rem] text-[#9aa1ae]">
                              {item.targetType === 'POST'
                                ? (item.subtitle ?? 'Blog history')
                                : 'Gemini Prompts'}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto rounded-[16px] border border-[#e8ecf4] md:block">
                    <table className="w-full min-w-[900px] text-left">
                      <thead className="bg-[#f8fafd] text-[0.72rem] uppercase tracking-[0.08em] text-[#7a8292]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Time</th>
                          <th className="px-4 py-3 font-semibold">Activity</th>
                          <th className="px-4 py-3 font-semibold">Image</th>
                          <th className="px-4 py-3 font-semibold">Title</th>
                          <th className="px-4 py-3 font-semibold">Source</th>
                          <th className="px-4 py-3 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {displayedItems.map((item) => (
                          <tr key={item.id} className="border-t border-[#eef1f6] align-middle">
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[0.75rem] ${toActivityTone(item.type)}`}
                              >
                                {formatRelativeTime(item.createdAt)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[0.9rem] font-medium text-[#10141c]">
                              {toActivityLabel(item.type)}
                            </td>
                            <td className="px-4 py-3">
                              <PromptThumb
                                image={item.image}
                                title={item.title ?? 'Activity image'}
                                fallbackKey={item.targetPath ?? item.id}
                                className="h-11 w-20 rounded-[10px] border border-[#e3e7ef]"
                              />
                            </td>
                            <td className="px-4 py-3 text-[0.86rem] text-[#667080]">
                              {item.title ? `“${item.title}”` : 'Your recent activity.'}
                            </td>
                            <td className="px-4 py-3 text-[0.82rem] text-[#9aa1ae]">
                              {item.targetType === 'POST'
                                ? (item.subtitle ?? 'Blog history')
                                : 'Gemini Prompts'}
                            </td>
                            <td className="px-4 py-3">
                              {item.targetPath ? (
                                <Link
                                  href={item.targetPath}
                                  className="inline-flex rounded-full border border-[#d4d9e2] px-3 py-1 text-[0.74rem] text-[#10141c] transition-colors hover:border-[#10141c] hover:bg-[#10141c] hover:text-white"
                                >
                                  Open
                                </Link>
                              ) : (
                                <span className="text-[0.78rem] text-[#a0a8b6]">—</span>
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
          ) : null}

          {!loading && !error ? (
            <div className="mt-4 flex flex-col gap-3 rounded-[14px] border border-[#e8ecf4] bg-[#f8fafd] p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[0.8rem] text-[#6b7280]">
                {total} total item{total === 1 ? '' : 's'} • Page {pageIndex + 1} of {totalPages} •
                Showing {displayedItems.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
                  disabled={!canPrev}
                  className="rounded-full border border-[#d4d9e2] px-3 py-1 text-[0.75rem] text-[#10141c] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPageIndex((value) => value + 1)}
                  disabled={!canNext}
                  className="rounded-full border border-[#d4d9e2] px-3 py-1 text-[0.75rem] text-[#10141c] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
