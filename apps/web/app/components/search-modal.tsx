'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

type SearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type Suggestion = {
  type: 'category' | 'tag' | 'prompt';
  label: string;
  href: string;
};

type TrendingChip = {
  label: string;
  href: string;
};

type LiteCategory = {
  id: string;
  name: string;
  slug: string;
};

type LiteTag = {
  id: string;
  name: string;
  slug: string;
};

type LitePrompt = {
  id: string;
  title: string;
  slug: string;
};

type ListResponse<T> = {
  items: T[];
  total: number;
};

type SearchResponse = {
  query: string;
  prompts: LitePrompt[];
  categories: LiteCategory[];
  tags: LiteTag[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';

const DEFAULT_TRENDING_CHIPS: TrendingChip[] = [
  { label: 'Marketing', href: '/category/marketing' },
  { label: 'Technology', href: '/category/technology' },
  { label: 'Business', href: '/category/business' },
  { label: '#SaaS', href: '/tag/saas' },
  { label: '#SEO', href: '/tag/seo' },
  { label: '#Email', href: '/tag/email' },
];

function prioritizeTrendingChips(chips: TrendingChip[], pathname: string | null): TrendingChip[] {
  if (!pathname) {
    return chips;
  }

  const categoryMatch = pathname.match(/^\/category\/([^/]+)/);
  const tagMatch = pathname.match(/^\/tag\/([^/]+)/);
  const preferredHref = categoryMatch
    ? `/category/${categoryMatch[1]}`
    : tagMatch
      ? `/tag/${tagMatch[1]}`
      : null;

  if (!preferredHref) {
    return chips;
  }

  const preferredIndex = chips.findIndex((chip) => chip.href === preferredHref);
  if (preferredIndex <= 0) {
    return chips;
  }

  const preferredChip = chips[preferredIndex];
  if (!preferredChip) {
    return chips;
  }
  return [preferredChip, ...chips.slice(0, preferredIndex), ...chips.slice(preferredIndex + 1)];
}

function buildSuggestions(payload: SearchResponse): Suggestion[] {
  const ranked: Suggestion[] = [
    ...payload.categories.slice(0, 2).map((category) => ({
      type: 'category' as const,
      label: category.name,
      href: `/category/${category.slug}`,
    })),
    ...payload.tags.slice(0, 2).map((tag) => ({
      type: 'tag' as const,
      label: tag.name,
      href: `/tag/${tag.slug}`,
    })),
    ...payload.prompts.slice(0, 4).map((prompt) => ({
      type: 'prompt' as const,
      label: prompt.title,
      href: `/prompt/${prompt.slug}`,
    })),
  ];

  const seen = new Set<string>();
  return ranked.filter((item) => {
    if (seen.has(item.href)) {
      return false;
    }
    seen.add(item.href);
    return true;
  });
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  category: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  tag: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  prompt: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 9.5h2.6a3.4 3.4 0 0 1 0 6.8h-2.6M9.5 14.5H6.9a3.4 3.4 0 1 1 0-6.8h2.6M8.9 12h6.2" />
    </svg>
  ),
};

const TYPE_COLORS: Record<string, string> = {
  category: 'text-[#15a0ff] bg-[#15a0ff]/10',
  tag: 'text-[#6f63ff] bg-[#6f63ff]/10',
  prompt: 'text-[#22a66f] bg-[#22a66f]/10',
};

const TYPE_LABELS: Record<string, string> = {
  category: 'Category',
  tag: 'Tag',
  prompt: 'Prompt',
};

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [trendingChips, setTrendingChips] = useState<TrendingChip[]>(DEFAULT_TRENDING_CHIPS);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadTrendingChips = async () => {
      try {
        const [categoriesResponse, tagsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/public/categories?take=4`, { cache: 'no-store' }),
          fetch(`${API_BASE_URL}/api/public/tags?take=4&sort=popular`, { cache: 'no-store' }),
        ]);

        if (!categoriesResponse.ok || !tagsResponse.ok) {
          return;
        }

        const categoriesPayload = (await categoriesResponse.json()) as ListResponse<LiteCategory>;
        const tagsPayload = (await tagsResponse.json()) as ListResponse<LiteTag>;

        const nextChips: TrendingChip[] = [
          ...categoriesPayload.items.map((category) => ({
            label: category.name,
            href: `/category/${category.slug}`,
          })),
          ...tagsPayload.items.map((tag) => ({
            label: `#${tag.name}`,
            href: `/tag/${tag.slug}`,
          })),
        ].slice(0, 8);

        if (!cancelled && nextChips.length > 0) {
          setTrendingChips(prioritizeTrendingChips(nextChips, pathname));
        }
      } catch {
        // Keep default chips on fetch errors.
      }
    };

    void loadTrendingChips();

    return () => {
      cancelled = true;
    };
  }, [isOpen, pathname]);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
      searchAbortRef.current = null;
    }

    const trimmedQuery = query.trim();

    if (!isOpen || !trimmedQuery) {
      setSuggestions([]);
      setActiveIndex(-1);
      setIsFetchingSuggestions(false);
      return;
    }

    setIsFetchingSuggestions(true);

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbortRef.current = controller;

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/public/search?query=${encodeURIComponent(trimmedQuery)}&take=8`,
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error('Search request failed');
        }

        const payload = (await response.json()) as SearchResponse;
        setSuggestions(buildSuggestions(payload));
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setSuggestions([]);
        }
      } finally {
        setIsFetchingSuggestions(false);
        setActiveIndex(-1);
      }
    }, 180);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
        searchAbortRef.current = null;
      }
    };
  }, [isOpen, query]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = 'auto';
      setQuery('');
      setSuggestions([]);
      setActiveIndex(-1);
      setIsFetchingSuggestions(false);
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (!suggestions.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((index) => (index < suggestions.length - 1 ? index + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((index) => (index > 0 ? index - 1 : suggestions.length - 1));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        const active = suggestions[activeIndex];
        if (active) {
          router.push(active.href);
          onClose();
        }
      }
    },
    [activeIndex, onClose, router, suggestions],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[14vh] sm:pt-[18vh]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-50 w-full max-w-[640px] overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-black/8">
        <form onSubmit={handleSubmit} className="flex items-center border-b border-[#e8eaef] px-4 py-3.5">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="mr-3 h-5 w-5 shrink-0 text-[#9ca3af]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="10.5" cy="10.5" r="5.2" />
            <path d="m14.5 14.5 4.2 4.2" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-[1.05rem] text-[#111118] placeholder-[#9ca3af] outline-none"
            placeholder="Search prompts, categories, tags..."
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#f3f4f6] text-[#6b7280] transition-colors hover:bg-[#e5e7eb]"
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
          <kbd className="ml-3 hidden rounded-[6px] border border-[#e1e5ee] bg-[#f8fafc] px-2 py-1 text-[0.78rem] font-medium text-[#9ca3af] sm:block">
            ESC
          </kbd>
        </form>

        {query.trim() && suggestions.length > 0 ? (
          <div className="py-2">
            {suggestions.map((suggestion, index) => (
              <Link
                key={`${suggestion.type}-${suggestion.href}`}
                href={suggestion.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                  index === activeIndex ? 'bg-[#f3f4f6]' : 'hover:bg-[#f8fafc]'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TYPE_COLORS[suggestion.type]}`}
                >
                  {TYPE_ICONS[suggestion.type]}
                </span>
                <span className="flex-1 text-[0.98rem] text-[#111118]">{suggestion.label}</span>
                <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[0.75rem] font-medium text-[#6b7280]">
                  {TYPE_LABELS[suggestion.type]}
                </span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#c8cdd8]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            ))}

            <div className="border-t border-[#e8eaef] px-4 pb-1 pt-2.5">
              <button
                type="button"
                onClick={handleSubmit as unknown as React.MouseEventHandler}
                className="w-full rounded-xl py-2.5 text-center text-[0.9rem] text-[#6b7280] transition-colors hover:bg-[#f3f4f6]"
              >
                Search all results for <strong className="text-[#111118]">&ldquo;{query}&rdquo;</strong>
              </button>
            </div>
          </div>
        ) : null}

        {query.trim() && isFetchingSuggestions ? (
          <div className="px-6 py-8 text-center text-[0.98rem] text-[#9ca3af]">Searching...</div>
        ) : null}

        {query.trim() && !isFetchingSuggestions && suggestions.length === 0 ? (
          <div className="px-6 py-8 text-center text-[0.98rem] text-[#9ca3af]">
            No results for <strong className="text-[#111118]">&ldquo;{query}&rdquo;</strong>
          </div>
        ) : null}

        {!query.trim() ? (
          <div className="px-5 py-5">
            <p className="mb-3 text-[0.78rem] font-semibold uppercase tracking-wider text-[#9ca3af]">
              Trending Searches
            </p>
            <div className="flex flex-wrap gap-2">
              {trendingChips.map((chip) => (
                <button
                  key={`${chip.href}-${chip.label}`}
                  type="button"
                  className="rounded-full bg-[#f3f4f6] px-4 py-2 text-[0.93rem] text-[#374151] transition-colors hover:bg-[#e5e7eb] hover:text-[#111118]"
                  onClick={() => {
                    router.push(chip.href);
                    onClose();
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
