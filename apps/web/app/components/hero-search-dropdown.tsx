'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SearchResponse } from '../../lib/public-content';
import { CATEGORY_IMAGE_FALLBACK } from '../../lib/content-image-fallbacks';
import { buildAvatarSrc, normalizeAvatarUrl } from '../../lib/utils/avatar';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';
const SEARCH_MIN_QUERY_LENGTH = 2;
const SEARCH_CACHE_TTL_MS = 45_000;
const searchResultCache = new Map<string, { expiresAt: number; payload: SearchResponse }>();

type SearchTab = 'everything' | 'prompts' | 'posts' | 'categories' | 'tags' | 'authors';
type ResultType = 'prompt' | 'post' | 'category' | 'tag' | 'author';

type HeroSearchDropdownProps = {
  categories: SearchResponse['categories'];
  tags: SearchResponse['tags'];
  latestPrompts: SearchResponse['prompts'];
  latestPosts: SearchResponse['posts'];
  latestAuthors: SearchResponse['authors'];
};

type SearchResultItem = {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  href: string;
  thumbnail: string | null;
  thumbnailBase?: string | null;
  thumbnailFallback?: string | null;
};

type SearchResultsByTab = {
  prompts: SearchResultItem[];
  posts: SearchResultItem[];
  categories: SearchResultItem[];
  tags: SearchResultItem[];
  authors: SearchResultItem[];
};

const EMPTY_RESULTS: SearchResponse = {
  query: '',
  prompts: [],
  posts: [],
  categories: [],
  tags: [],
  authors: [],
};

const TAB_OPTIONS: Array<{ id: SearchTab; label: string }> = [
  { id: 'everything', label: 'Everything' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'posts', label: 'Posts' },
  { id: 'categories', label: 'Categories' },
  { id: 'tags', label: 'Tags' },
  { id: 'authors', label: 'Authors' },
];

const RESULT_TYPE_LABEL: Record<ResultType, string> = {
  prompt: 'Prompt',
  post: 'Post',
  category: 'Category',
  tag: 'Tag',
  author: 'Author',
};

const FALLBACK_LABEL_BY_TYPE: Record<ResultType, string> = {
  prompt: 'P',
  post: 'B',
  category: 'C',
  tag: '#',
  author: 'U',
};
function formatCount(value: number) {
  return value.toLocaleString('en-US');
}

function getFallbackLabel(item: SearchResultItem) {
  if (item.type === 'author') {
    return (item.title.trim().charAt(0) || FALLBACK_LABEL_BY_TYPE.author).toUpperCase();
  }
  return FALLBACK_LABEL_BY_TYPE[item.type];
}

function ResultThumbnail({ item }: { item: SearchResultItem }) {
  const [src, setSrc] = useState(item.thumbnail);
  const [hasError, setHasError] = useState(false);
  const [didRetryBase, setDidRetryBase] = useState(false);
  const [didRetryFallback, setDidRetryFallback] = useState(false);

  useEffect(() => {
    setSrc(item.thumbnail);
    setHasError(false);
    setDidRetryBase(false);
    setDidRetryFallback(false);
  }, [item.thumbnail]);

  if (!src || hasError) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef1f5] text-[0.76rem] font-semibold text-[#7b8597]">
        {getFallbackLabel(item)}
      </span>
    );
  }

  return (
    <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#e2e7f0] bg-[#f2f5f9]">
      <img
        src={src}
        alt={`${item.title} ${RESULT_TYPE_LABEL[item.type]}`}
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
        decoding="async"
        onError={() => {
          if (!didRetryBase && item.thumbnailBase && src !== item.thumbnailBase) {
            setDidRetryBase(true);
            setSrc(item.thumbnailBase);
            return;
          }
          if (!didRetryFallback && item.thumbnailFallback && src !== item.thumbnailFallback) {
            setDidRetryFallback(true);
            setSrc(item.thumbnailFallback);
            return;
          }
          setHasError(true);
        }}
      />
    </span>
  );
}

function buildResultsByTab(payload: SearchResponse): SearchResultsByTab {
  const categoryImageById = new Map<string, string>();
  const categoryImageBySlug = new Map<string, string>();

  const registerCategoryImage = (id: string | null | undefined, slug: string | null | undefined, image: string | null) => {
    if (!image) return;
    if (id && !categoryImageById.has(id)) {
      categoryImageById.set(id, image);
    }
    if (slug && !categoryImageBySlug.has(slug)) {
      categoryImageBySlug.set(slug, image);
    }
  };

  payload.prompts.forEach((prompt) => {
    const normalizedImage = normalizeAvatarUrl(prompt.image);
    if (!normalizedImage) return;
    registerCategoryImage(prompt.primaryCategory?.id, prompt.primaryCategory?.slug, normalizedImage);
    prompt.categories.forEach((category) => {
      registerCategoryImage(category.id, category.slug, normalizedImage);
    });
  });

  payload.posts.forEach((post) => {
    const normalizedImage = normalizeAvatarUrl(post.image);
    if (!normalizedImage) return;
    registerCategoryImage(post.primaryCategory?.id, post.primaryCategory?.slug, normalizedImage);
    post.categories.forEach((category) => {
      registerCategoryImage(category.id, category.slug, normalizedImage);
    });
  });

  const resolveCategoryImage = (id?: string | null, slug?: string | null) =>
    (id ? categoryImageById.get(id) : null) || (slug ? categoryImageBySlug.get(slug) : null) || null;

  return {
    prompts: payload.prompts.map((prompt) => {
      const categorySlug = prompt.primaryCategory?.slug || prompt.categories[0]?.slug || 'uncategorized';
      return {
        id: prompt.id,
        type: 'prompt',
        title: prompt.title,
        subtitle:
          prompt.primaryCategory?.name ||
          prompt.categories[0]?.name ||
          prompt.author.name ||
          'Prompt result',
        href: `/${categorySlug}/${prompt.slug}`,
        thumbnail:
          normalizeAvatarUrl(prompt.image) ||
          resolveCategoryImage(
            prompt.primaryCategory?.id || prompt.categories[0]?.id,
            prompt.primaryCategory?.slug || prompt.categories[0]?.slug,
          ),
        thumbnailFallback: CATEGORY_IMAGE_FALLBACK,
      };
    }),
    posts: payload.posts.map((post) => ({
      id: post.id,
      type: 'post',
      title: post.title,
      subtitle: post.primaryCategory?.name || post.author.name || 'Post result',
      href: `/blog/${post.slug}`,
      thumbnail:
        normalizeAvatarUrl(post.image) ||
        resolveCategoryImage(
          post.primaryCategory?.id || post.categories[0]?.id,
          post.primaryCategory?.slug || post.categories[0]?.slug,
        ),
      thumbnailFallback: CATEGORY_IMAGE_FALLBACK,
    })),
    categories: payload.categories.map((category) => ({
      id: category.id,
      type: 'category',
      title: category.name,
      subtitle: `${formatCount(category.totalCount)} items`,
      href: `/${category.slug}`,
      thumbnail:
        normalizeAvatarUrl(category.imageUrl) || CATEGORY_IMAGE_FALLBACK,
      thumbnailFallback: CATEGORY_IMAGE_FALLBACK,
    })),
    tags: payload.tags.map((tag) => ({
      id: tag.id,
      type: 'tag',
      title: `#${tag.name}`,
      subtitle: `${formatCount(tag.usage)} uses`,
      href: `/tag/${tag.slug}`,
      thumbnail: null,
    })),
    authors: payload.authors.map((author) => {
      const publishedCount =
        author.totalCount ?? (author.promptCount ?? 0) + (author.postCount ?? 0);
      return {
        id: author.id,
        type: 'author',
        title: author.name,
        subtitle:
          publishedCount > 0
            ? `${formatCount(publishedCount)} published`
            : author.handle
              ? `@${author.handle}`
              : 'Author profile',
        href: `/u/${author.slug}`,
        thumbnail: buildAvatarSrc(author.avatarUrl, author.avatarUpdatedAt),
        thumbnailBase: normalizeAvatarUrl(author.avatarUrl),
      };
    }),
  };
}

export function HeroSearchDropdown({
  categories,
  tags,
  latestPrompts,
  latestPosts,
  latestAuthors,
}: HeroSearchDropdownProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTab>('everything');
  const [activeIndex, setActiveIndex] = useState(-1);
  const defaultResults = useMemo<SearchResponse>(
    () => ({
      query: '',
      prompts: latestPrompts.slice(0, 10),
      posts: latestPosts.slice(0, 10),
      categories: categories.slice(0, 10),
      tags: tags.slice(0, 10),
      authors: latestAuthors.slice(0, 10),
    }),
    [categories, latestAuthors, latestPosts, latestPrompts, tags],
  );
  const [results, setResults] = useState<SearchResponse>(defaultResults);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  const resultsByTab = useMemo(() => buildResultsByTab(results), [results]);

  const everythingResults = useMemo(
    () =>
      [
        ...resultsByTab.prompts.slice(0, 4),
        ...resultsByTab.posts.slice(0, 3),
        ...resultsByTab.categories.slice(0, 3),
        ...resultsByTab.tags.slice(0, 3),
        ...resultsByTab.authors.slice(0, 3),
      ].slice(0, 12),
    [resultsByTab],
  );

  const tabCounts = useMemo(
    () => ({
      everything:
        resultsByTab.prompts.length +
        resultsByTab.posts.length +
        resultsByTab.categories.length +
        resultsByTab.tags.length +
        resultsByTab.authors.length,
      prompts: resultsByTab.prompts.length,
      posts: resultsByTab.posts.length,
      categories: resultsByTab.categories.length,
      tags: resultsByTab.tags.length,
      authors: resultsByTab.authors.length,
    }),
    [resultsByTab],
  );

  const visibleResults = useMemo(() => {
    if (activeTab === 'everything') {
      return everythingResults;
    }
    return resultsByTab[activeTab];
  }, [activeTab, everythingResults, resultsByTab]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        event.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
      searchAbortRef.current = null;
    }

    if (!isOpen) {
      setIsSearching(false);
      return;
    }

    if (!hasQuery) {
      setResults(defaultResults);
      setIsSearching(false);
      return;
    }

    if (trimmedQuery.length < SEARCH_MIN_QUERY_LENGTH) {
      setResults({ ...EMPTY_RESULTS, query: trimmedQuery });
      setIsSearching(false);
      return;
    }

    const cacheKey = trimmedQuery.toLowerCase();
    const cachedEntry = searchResultCache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      setResults(cachedEntry.payload);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbortRef.current = controller;

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/public/search?query=${encodeURIComponent(trimmedQuery)}&take=10`,
          { cache: 'no-store', signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error('Search request failed');
        }

        const payload = (await response.json()) as SearchResponse;
        setResults(payload);
        searchResultCache.set(cacheKey, {
          expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
          payload,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setResults({ ...EMPTY_RESULTS, query: trimmedQuery });
        }
      } finally {
        setIsSearching(false);
      }
    }, 170);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
        searchAbortRef.current = null;
      }
    };
  }, [defaultResults, hasQuery, isOpen, trimmedQuery]);

  useEffect(() => {
    if (!hasQuery) {
      setResults(defaultResults);
    }
  }, [defaultResults, hasQuery]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [activeTab, query, isOpen]);

  useEffect(() => {
    if (!hasQuery) {
      setActiveTab('everything');
    }
  }, [hasQuery]);

  const openSearchPage = () => {
    if (!trimmedQuery) return;
    router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const openResult = (href: string) => {
    router.push(href);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen) return;

    if (event.key === 'ArrowDown') {
      if (visibleResults.length === 0) return;
      event.preventDefault();
      setActiveIndex((index) => (index < visibleResults.length - 1 ? index + 1 : 0));
      return;
    }

    if (event.key === 'ArrowUp') {
      if (visibleResults.length === 0) return;
      event.preventDefault();
      setActiveIndex((index) => (index > 0 ? index - 1 : visibleResults.length - 1));
      return;
    }

    if (event.key === 'Enter') {
      if (activeIndex >= 0) {
        event.preventDefault();
        const nextResult = visibleResults[activeIndex];
        if (nextResult) {
          openResult(nextResult.href);
        }
        return;
      }

      if (trimmedQuery) {
        event.preventDefault();
        openSearchPage();
      }
    }
  };

  return (
    <div ref={containerRef} className="hero-copy relative z-40 mx-auto mt-4 w-full max-w-[34rem]">
      <div
        className={`relative flex h-[52px] items-center gap-2 rounded-full border bg-white pl-4 pr-[5px] transition-colors ${
          isOpen ? 'border-[#b8bfd1]' : 'border-[#d7dce7]'
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 text-[#80889a]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        >
          <circle cx="10.5" cy="10.5" r="5.2" />
          <path d="m14.5 14.5 4.2 4.2" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="What would you like to find today?"
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-[0.97rem] text-[#141821] placeholder-[#7f8798] outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5f7fb] text-[#727a8c] transition-colors hover:bg-[#eceff7]"
            aria-label="Clear search query"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : null}
        <kbd className="hidden h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#c8dc45] bg-[#d5ea52] px-3.5 py-0 text-[0.92rem] font-semibold leading-none text-[#101418] md:inline-flex">
          <span className="inline-flex w-4 items-center justify-center">⌘</span>
          <span className="inline-flex w-4 items-center justify-center">+</span>
          <span className="inline-flex w-4 items-center justify-center">/</span>
        </kbd>
      </div>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-[24px] border border-[#d8deea] bg-white">
          <div className="border-b border-[#eceff6] px-3 pt-2.5">
            <div className="no-scrollbar -mb-px flex gap-1.5 overflow-x-auto pb-2.5">
              {TAB_OPTIONS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.8rem] font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#111827] text-white'
                      : 'bg-[#f2f4f8] text-[#5b6376] hover:bg-[#e9edf5]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[0.68rem] ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-white text-[#495264]'
                    }`}
                  >
                    {formatCount(tabCounts[tab.id])}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {isSearching ? (
            <div className="px-4 py-7 text-center text-[0.88rem] text-[#7a8296]">Searching...</div>
          ) : null}

          {!isSearching && visibleResults.length > 0 ? (
            <div className="search-dropdown-scroll max-h-[20rem] overflow-y-auto py-1.5">
              {visibleResults.map((item, index) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                    index === activeIndex ? 'bg-[#f2f5fb]' : 'hover:bg-[#f7f9fd]'
                  }`}
                >
                  <ResultThumbnail item={item} />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[0.92rem] font-medium text-[#111826]">
                      {item.title}
                    </span>
                    <span className="block truncate text-[0.8rem] text-[#788092]">
                      {item.subtitle}
                    </span>
                  </span>
                  <span className="rounded-full bg-[#f2f4f8] px-2 py-0.5 text-[0.67rem] font-medium text-[#5f6778]">
                    {RESULT_TYPE_LABEL[item.type]}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          {!isSearching && visibleResults.length === 0 ? (
            <div className="px-4 py-7 text-center">
              <p className="text-[0.9rem] text-[#5f6778]">
                {hasQuery ? 'No matches found in this view.' : 'No latest results yet.'}
              </p>
              {hasQuery ? (
                <button
                  type="button"
                  onClick={openSearchPage}
                  className="mt-3 rounded-full bg-[#111111] px-4 py-2 text-[0.8rem] font-medium text-white transition-colors hover:bg-[#272727]"
                >
                  Search all results for &ldquo;{trimmedQuery}&rdquo;
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
