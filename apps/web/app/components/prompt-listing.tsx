'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  formatDisplayDate,
  getPromptCategoryName,
  type PublicPrompt,
} from '../../lib/public-content';
import { usePromptInteractions } from './prompt-interactions/use-prompt-interactions';
import { AuthorFollowButton } from '../author/[slug]/author-follow-button';

/* ─── Prompt Card UI ────────────────────────────────────────── */
type PromptCardProps = { prompt: PublicPrompt; showReadTime?: boolean };

export type SortKey = 'newest' | 'oldest' | 'most-liked' | 'most-commented';

const FALLBACK_PROMPT_IMAGE =
  'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200';

export function PromptCardUI({ prompt, showReadTime = true }: PromptCardProps) {
  const categoryName = getPromptCategoryName(prompt);
  const categorySlug = prompt.primaryCategory?.slug || prompt.categories[0]?.slug || null;
  const dateSource = prompt.publishedAt || prompt.updatedAt;
  const dateLabel = formatDisplayDate(prompt.publishedAt || prompt.updatedAt);
  const dateArchiveKey = dateSource
    ? (() => {
        const parsedDate = new Date(dateSource);
        if (Number.isNaN(parsedDate.getTime())) return null;
        return parsedDate.toISOString().slice(0, 10);
      })()
    : null;
  const dateArchiveHref = dateArchiveKey ? `/prompt/date/${dateArchiveKey}` : null;
  const durationLabel = '3-4 minutes';
  const {
    likeCount,
    commentCount,
    likedByIp,
    savedByUser,
    likePending,
    savePending,
    likePrompt,
    toggleSavePrompt,
  } = usePromptInteractions({
    promptId: prompt.id,
    initialLikeCount: prompt.likeCount,
    initialSaveCount: prompt.saveCount,
    initialCommentCount: prompt.commentCount,
    syncAnonymousStatus: true,
  });

  return (
    <article className="flex h-full flex-col rounded-[24px] bg-transparent">
      <div
        role="img"
        aria-label={prompt.title}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-[24px]"
      >
        <Image
          src={prompt.image || FALLBACK_PROMPT_IMAGE}
          alt={prompt.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover"
        />
        <Link
          href={`/prompt/${prompt.slug}`}
          aria-label={`Open prompt: ${prompt.title}`}
          className="absolute inset-0 z-10"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 z-[1] bg-gradient-to-b from-black/20 via-black/5 to-transparent"
        />
        {categorySlug ? (
          <Link
            href={`/category/${categorySlug}`}
            className="absolute left-4 top-4 z-20 inline-flex h-9 items-center rounded-full bg-white/95 px-4 text-[0.78rem] font-[500] leading-none text-[#0b0f18] transition-colors hover:bg-white"
          >
            {categoryName}
          </Link>
        ) : (
          <span className="absolute left-4 top-4 z-20 inline-flex h-9 items-center rounded-full bg-white/95 px-4 text-[0.78rem] font-[500] leading-none text-[#0b0f18]">
            {categoryName}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-4 sm:px-2">
        <Link href={`/prompt/${prompt.slug}`} className="block">
          <h3 className="text-[1.12rem] leading-[1.3] tracking-[-0.015em] text-[#0f1118] sm:text-[1.2rem]">
            {prompt.title}
          </h3>
        </Link>

        <div className="mt-3 flex items-center gap-3 text-[0.95rem] text-[#6b7382] sm:text-[1rem]">
          {dateArchiveHref && dateLabel ? (
            <Link
              href={dateArchiveHref}
              className="transition-colors hover:text-[#111827]"
              aria-label={`View prompts published on ${dateLabel}`}
            >
              {dateLabel}
            </Link>
          ) : (
            <span>{dateLabel}</span>
          )}
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between gap-4 text-[#374151]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void likePrompt()}
                  disabled={likedByIp || likePending}
                  aria-label={likedByIp ? 'Liked' : 'Like prompt'}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-[#4b5563] transition-colors ${
                    likedByIp
                      ? 'bg-[#ffecef] text-[#e11d48] hover:bg-[#ffdfe5]'
                      : 'bg-[#f3f4f6] hover:bg-[#e5e7eb]'
                  } disabled:cursor-not-allowed disabled:opacity-80`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
                    <path
                      d="M12 20.2S4.5 15.6 4.5 10.2a4.2 4.2 0 0 1 7.2-3 4.2 4.2 0 0 1 7.2 3c0 5.4-7.5 10-7.5 10Z"
                      fill={likedByIp ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </button>
                <span className="text-[0.92rem] font-[400] leading-none text-[#0f1118] sm:text-[0.95rem]">
                  {likeCount}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/prompt/${prompt.slug}#comments`}
                  aria-label={`View comments for ${prompt.title}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-[#4b5563] transition-colors hover:bg-[#e5e7eb]"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
                    <path
                      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </Link>
                <span className="text-[0.92rem] font-[400] leading-none text-[#0f1118] sm:text-[0.95rem]">
                  {commentCount}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {showReadTime ? (
                <span className="text-[0.86rem] font-[400] leading-none text-[#445064] sm:text-[0.9rem]">
                  {durationLabel}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => void toggleSavePrompt()}
                disabled={savePending}
                aria-label={savedByUser ? 'Unsave prompt' : 'Save prompt'}
                aria-pressed={savedByUser}
                className={`flex h-10 w-10 items-center justify-center rounded-full text-[#4b5563] transition-colors ${
                  savedByUser
                    ? 'bg-[#111111] text-white'
                    : 'bg-[#f3f4f6] hover:bg-[#e5e7eb]'
                } disabled:cursor-not-allowed disabled:opacity-80`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
                  <path
                    d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
                    fill={savedByUser ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ─── Filter + Sort Bar ─────────────────────────────────────── */
type FilterBarProps = {
  categories: string[];
  activeCategory: string;
  sort: SortKey;
  total: number;
  onCategory: (c: string) => void;
  onSort: (s: SortKey) => void;
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'most-liked', label: 'Most liked' },
  { value: 'most-commented', label: 'Most commented' },
];

export function FilterBar({ categories, activeCategory, sort, total, onCategory, onSort }: FilterBarProps) {
  const visibleCategories = categories.slice(0, 6);
  const hasMoreCategories = categories.length > visibleCategories.length;

  return (
    <div className="mb-6 mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onCategory('all')}
          className={`rounded-full px-4 py-2 text-[0.88rem] font-[500] transition-colors ${
            activeCategory === 'all'
              ? 'bg-[#d5ea52] text-[#0f1116]'
              : 'bg-[#f2f4f8] text-[#4b525e] hover:bg-white'
          }`}
        >
          All
        </button>
        {visibleCategories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => onCategory(cat)}
            className={`rounded-full px-4 py-2 text-[0.88rem] font-[500] transition-colors ${
              activeCategory === cat
                ? 'bg-[#d5ea52] text-[#0f1116]'
                : 'bg-[#f2f4f8] text-[#4b525e] hover:bg-white'
            }`}
          >
            {cat}
          </button>
        ))}
        {hasMoreCategories ? (
          <Link
            href="/category"
            className="rounded-full bg-[#f2f4f8] px-4 py-2 text-[0.88rem] font-[500] text-[#4b525e] transition-colors hover:bg-white"
            aria-label="Explore all categories"
          >
            More
          </Link>
        ) : null}
      </div>

      {/* Sort + count */}
      <div className="flex w-full shrink-0 items-center justify-between gap-3 sm:w-auto sm:justify-end">
        <span className="text-[0.88rem] text-[#9ca3af]">{total} prompts</span>
        <select
          value={sort}
          onChange={e => onSort(e.target.value as SortKey)}
          className="rounded-full border border-[#e1e5ee] bg-white px-4 py-2 text-[0.88rem] font-[500] text-[#0f1118] outline-none hover:border-[#c0c6d1]"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ─── Pagination ────────────────────────────────────────────── */
type PaginationProps = { page: number; total: number; onPage: (p: number) => void };

export function Pagination({ page, total, onPage }: PaginationProps) {
  if (total <= 1) return null;
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="mt-12 flex flex-wrap items-center justify-center gap-2.5">
      <button
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page === 1}
        className="rounded-full border border-[#d8dce2] px-4 py-2 text-[0.9rem] font-[500] text-[#101010] transition-colors hover:border-[#101010] disabled:cursor-not-allowed disabled:border-[#e1e5ee] disabled:text-[#c0c6d1]"
      >
        Previous
      </button>
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPage(p)}
          className={`h-10 w-10 rounded-full border text-[0.9rem] font-[500] ${
            p === page
              ? 'border-[#c8e030] bg-[#d5ea52] text-[#0f1116]'
              : 'border-[#d8dce2] text-[#101010] hover:border-[#101010]'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPage(Math.min(total, page + 1))}
        disabled={page === total}
        className="rounded-full border border-[#d8dce2] px-4 py-2 text-[0.9rem] font-[500] text-[#101010] transition-colors hover:border-[#101010] disabled:cursor-not-allowed disabled:border-[#e1e5ee] disabled:text-[#c0c6d1]"
      >
        Next
      </button>
    </div>
  );
}

/* ─── Page Shell (shared hero + grid wrapper) ───────────────── */
type PromptPageShellProps = {
  title: string;
  description: string;
  badge: string;
  badgeNoBorder?: boolean;
  breadcrumb: string;
  breadcrumbHref: string;
  defaultSort: SortKey;
  prompts: PublicPrompt[];
  followAuthorId?: string;
  followInitialFollowerCount?: number;
};

const PAGE_SIZE = 12;

export function PromptPageShell({
  title,
  description,
  badge,
  badgeNoBorder = false,
  breadcrumb,
  breadcrumbHref,
  defaultSort,
  prompts,
  followAuthorId,
  followInitialFollowerCount = 0,
}: PromptPageShellProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [sort, setSort] = useState<SortKey>(defaultSort);
  const [page, setPage] = useState(1);
  const categories = useMemo(
    () => {
      const categoryStats = new Map<
        string,
        { count: number; engagement: number; latestTimestamp: number }
      >();

      for (const prompt of prompts) {
        const category = getPromptCategoryName(prompt);
        const current = categoryStats.get(category) ?? {
          count: 0,
          engagement: 0,
          latestTimestamp: 0,
        };
        const promptDate = prompt.publishedAt || prompt.updatedAt;
        const promptTimestamp = promptDate ? new Date(promptDate).getTime() : 0;
        const safeTimestamp = Number.isNaN(promptTimestamp) ? 0 : promptTimestamp;

        categoryStats.set(category, {
          count: current.count + 1,
          engagement:
            current.engagement +
            prompt.likeCount +
            prompt.commentCount +
            Math.round(prompt.viewCount / 10),
          latestTimestamp: Math.max(current.latestTimestamp, safeTimestamp),
        });
      }

      return Array.from(categoryStats.entries())
        .sort((a, b) => {
          const [, left] = a;
          const [, right] = b;
          if (right.count !== left.count) return right.count - left.count;
          if (right.engagement !== left.engagement) return right.engagement - left.engagement;
          if (right.latestTimestamp !== left.latestTimestamp) {
            return right.latestTimestamp - left.latestTimestamp;
          }
          return a[0].localeCompare(b[0]);
        })
        .map(([name]) => name);
    },
    [prompts],
  );

  const filtered = useMemo(() => {
    const base =
      activeCategory === 'all'
        ? prompts
        : prompts.filter((prompt) => getPromptCategoryName(prompt) === activeCategory);

    const copy = [...base];
    switch (sort) {
      case 'oldest':
        return copy.sort((a, b) =>
          (a.publishedAt || a.updatedAt).localeCompare(b.publishedAt || b.updatedAt),
        );
      case 'most-liked':
        return copy.sort((a, b) => b.likeCount - a.likeCount || b.viewCount - a.viewCount);
      case 'most-commented':
        return copy.sort((a, b) => b.commentCount - a.commentCount || b.likeCount - a.likeCount);
      case 'newest':
      default:
        return copy.sort((a, b) =>
          (b.publishedAt || b.updatedAt).localeCompare(a.publishedAt || a.updatedAt),
        );
    }
  }, [prompts, activeCategory, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleCategory = (c: string) => { setActiveCategory(c); setPage(1); };
  const handleSort = (s: SortKey) => { setSort(s); setPage(1); };

  return (
    <main className="page-shell bg-white">
      <div className="page-container">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-[0.9rem] text-[#8b8f99]">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="transition-colors hover:text-[#101010]">Home</Link></li>
            <li className="text-[#c0c6d1]">/</li>
            <li><Link href={breadcrumbHref} className="transition-colors hover:text-[#101010]">{breadcrumb}</Link></li>
          </ol>
        </nav>

        {/* Hero */}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="section-heading-medium text-[2.2rem] font-[500] leading-[1.05] tracking-[-0.04em] text-[#111111] sm:text-[2.8rem] lg:text-[3.1rem]">
              {title}
            </h1>
            <p className="mt-3 max-w-[600px] text-[1.02rem] leading-[1.72] text-[#5f6773]">
              {description}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <span
              className={`shrink-0 rounded-full bg-[#f8fafc] px-5 py-2.5 text-[0.9rem] font-[500] text-[#4b525e] ${
                badgeNoBorder ? '' : 'border border-[#e1e5ee]'
              }`}
            >
              {badge}
            </span>
            {followAuthorId ? (
              <AuthorFollowButton
                authorId={followAuthorId}
                initialFollowerCount={followInitialFollowerCount}
              />
            ) : null}
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          categories={categories}
          activeCategory={activeCategory}
          sort={sort}
          total={filtered.length}
          onCategory={handleCategory}
          onSort={handleSort}
        />

        {/* Grid */}
        <div className="site-section-sub grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map(prompt => (
            <PromptCardUI key={prompt.id} prompt={prompt} />
          ))}
        </div>

        {/* Pagination */}
        <Pagination page={safePage} total={totalPages} onPage={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      </div>
    </main>
  );
}
