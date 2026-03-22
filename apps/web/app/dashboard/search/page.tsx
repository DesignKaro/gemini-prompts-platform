'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MdSearch } from 'react-icons/md';
import { useAdminApi } from '../../components/dashboard/use-admin-api';
import { Skeleton } from '../../components/ui/skeleton';
import { formatBytes, formatRelativeTimeOrDash, titleCase } from '../../../lib/utils/format';

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  stats?: { posts: number; prompts: number };
  updatedAt?: string;
  createdAt?: string;
};

type TagItem = {
  id: string;
  name: string;
  slug: string;
  usage?: number;
  updatedAt?: string;
  createdAt?: string;
};

type PromptItem = {
  id: string;
  title: string;
  status?: string | null;
  updatedAt?: string;
  createdAt?: string;
  primaryCategory?: { id: string; name: string } | null;
  categories?: Array<{ id: string; name: string }>;
};

type PostItem = {
  id: string;
  title: string;
  status?: string | null;
  postFormat?: string | null;
  updatedAt?: string;
  createdAt?: string;
};

type MediaItem = {
  id: string;
  title?: string | null;
  url?: string | null;
  mime?: string | null;
  size?: number | null;
  createdAt?: string;
};

const PAGE_SIZE = 20;


export default function SearchPage() {
  const { request, status } = useAdminApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = (searchParams?.get('q') ?? '').trim();

  const [query, setQuery] = useState(queryParam);
  const [results, setResults] = useState<{
    categories: CategoryItem[];
    tags: TagItem[];
    prompts: PromptItem[];
    posts: PostItem[];
    media: MediaItem[];
  }>({ categories: [], tags: [], prompts: [], posts: [], media: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      requestIdRef.current += 1;
      setResults({ categories: [], tags: [], prompts: [], posts: [], media: [] });
      setHasSearched(false);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      if (status !== 'authenticated') return;
      setIsLoading(true);
      setLoadError(null);
      setHasSearched(true);

      const term = encodeURIComponent(trimmed);
      request<{
        categories: CategoryItem[];
        tags: TagItem[];
        prompts: PromptItem[];
        posts: PostItem[];
        media: MediaItem[];
      }>(`/api/admin/search?search=${term}&take=${PAGE_SIZE}`, {
        signal: controller.signal,
      })
        .then((payload) => {
          if (requestIdRef.current !== requestId) return;
          setResults({
            categories: payload.categories ?? [],
            tags: payload.tags ?? [],
            prompts: payload.prompts ?? [],
            posts: payload.posts ?? [],
            media: payload.media ?? [],
          });
        })
        .catch((err: Error) => {
          if (requestIdRef.current !== requestId) return;
          if (err?.name === 'AbortError') return;
          setLoadError(err.message || 'Unable to load search results.');
        })
        .finally(() => {
          if (requestIdRef.current !== requestId) return;
          setIsLoading(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, request, status]);

  useEffect(() => {
    if (query.trim() === queryParam) return;
    const next = query.trim();
    if (!next) {
      router.replace('/dashboard/search');
    } else {
      router.replace(`/dashboard/search?q=${encodeURIComponent(next)}`);
    }
  }, [query, queryParam, router]);

  const totalResults = useMemo(
    () =>
      results.categories.length +
      results.tags.length +
      results.prompts.length +
      results.posts.length +
      results.media.length,
    [results],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116]">Search</h1>
          <p className="text-[0.95rem] text-gray-500">
            {hasSearched ? `${totalResults} result${totalResults === 1 ? '' : 's'} found` : 'Search across the dashboard.'}
          </p>
        </div>
        <div className="relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search categories, tags, prompts, posts, media..."
            className="h-10 w-full rounded-full border border-[#e1e5ee] bg-white pl-10 pr-4 text-[0.9rem] text-[#0f1116] outline-none focus:border-[#0f1116] focus:ring-1 focus:ring-[#0f1116] sm:w-[300px]"
          />
        </div>
      </div>

      {loadError && (
        <div className="rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-[0.85rem] text-red-700">
          {loadError}
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`search-loading-${index}`} className="rounded-[20px] border border-[#eef2f6] bg-white p-5">
              <div className="space-y-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && hasSearched && totalResults === 0 && (
        <div className="rounded-[20px] border border-dashed border-[#e1e5ee] bg-white px-6 py-10 text-center text-[0.9rem] text-gray-500">
          No results found. Try a different search term.
        </div>
      )}

      <div className="space-y-6">
        {results.categories.length > 0 && (
          <section className="rounded-[20px] border border-[#eef2f6] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[1.05rem] font-medium text-[#0f1116]">Categories</h2>
              <span className="text-[0.8rem] text-gray-400">{results.categories.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[0.85rem]">
                <thead className="text-[0.7rem] uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Slug</th>
                    <th className="pb-3 font-medium">Posts</th>
                    <th className="pb-3 font-medium">Prompts</th>
                    <th className="pb-3 text-right font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {results.categories.map((item) => (
                    <tr key={item.id} className="border-t border-[#eef2f6]">
                      <td className="py-3 font-medium text-[#0f1116]">{item.name}</td>
                      <td className="py-3 text-gray-500">{item.slug}</td>
                      <td className="py-3 text-gray-500">{item.stats?.posts ?? 0}</td>
                      <td className="py-3 text-gray-500">{item.stats?.prompts ?? 0}</td>
                      <td className="py-3 text-right text-gray-400">
                        {formatRelativeTimeOrDash(item.updatedAt || item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {results.tags.length > 0 && (
          <section className="rounded-[20px] border border-[#eef2f6] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[1.05rem] font-medium text-[#0f1116]">Tags</h2>
              <span className="text-[0.8rem] text-gray-400">{results.tags.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[0.85rem]">
                <thead className="text-[0.7rem] uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Slug</th>
                    <th className="pb-3 font-medium">Usage</th>
                    <th className="pb-3 text-right font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {results.tags.map((item) => (
                    <tr key={item.id} className="border-t border-[#eef2f6]">
                      <td className="py-3 font-medium text-[#0f1116]">{item.name}</td>
                      <td className="py-3 text-gray-500">{item.slug}</td>
                      <td className="py-3 text-gray-500">{item.usage ?? 0}</td>
                      <td className="py-3 text-right text-gray-400">
                        {formatRelativeTimeOrDash(item.updatedAt || item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {results.prompts.length > 0 && (
          <section className="rounded-[20px] border border-[#eef2f6] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[1.05rem] font-medium text-[#0f1116]">Prompts</h2>
              <span className="text-[0.8rem] text-gray-400">{results.prompts.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[0.85rem]">
                <thead className="text-[0.7rem] uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="pb-3 font-medium">Title</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 text-right font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {results.prompts.map((item) => (
                    <tr key={item.id} className="border-t border-[#eef2f6]">
                      <td className="py-3 font-medium text-[#0f1116]">
                        <Link href={`/dashboard/content/new?edit=${item.id}&type=prompt`} className="hover:underline">
                          {item.title}
                        </Link>
                      </td>
                      <td className="py-3 text-gray-500">{titleCase(item.status)}</td>
                      <td className="py-3 text-gray-500">
                        {item.primaryCategory?.name || item.categories?.[0]?.name || 'Uncategorized'}
                      </td>
                      <td className="py-3 text-right text-gray-400">
                        {formatRelativeTimeOrDash(item.updatedAt || item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {results.posts.length > 0 && (
          <section className="rounded-[20px] border border-[#eef2f6] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[1.05rem] font-medium text-[#0f1116]">Posts</h2>
              <span className="text-[0.8rem] text-gray-400">{results.posts.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[0.85rem]">
                <thead className="text-[0.7rem] uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="pb-3 font-medium">Title</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Format</th>
                    <th className="pb-3 text-right font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {results.posts.map((item) => (
                    <tr key={item.id} className="border-t border-[#eef2f6]">
                      <td className="py-3 font-medium text-[#0f1116]">
                        <Link href={`/dashboard/content/new?edit=${item.id}&type=post`} className="hover:underline">
                          {item.title}
                        </Link>
                      </td>
                      <td className="py-3 text-gray-500">{titleCase(item.status)}</td>
                      <td className="py-3 text-gray-500">{titleCase(item.postFormat)}</td>
                      <td className="py-3 text-right text-gray-400">
                        {formatRelativeTimeOrDash(item.updatedAt || item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {results.media.length > 0 && (
          <section className="rounded-[20px] border border-[#eef2f6] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[1.05rem] font-medium text-[#0f1116]">Media</h2>
              <span className="text-[0.8rem] text-gray-400">{results.media.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[0.85rem]">
                <thead className="text-[0.7rem] uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="pb-3 font-medium">Preview</th>
                    <th className="pb-3 font-medium">Title</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Size</th>
                    <th className="pb-3 text-right font-medium">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {results.media.map((item) => (
                    <tr key={item.id} className="border-t border-[#eef2f6]">
                      <td className="py-3">
                        <div className="h-10 w-10 overflow-hidden rounded-lg border border-[#e5e9f2] bg-gray-50">
                          {item.url ? (
                            <img src={item.url} alt={item.title ?? 'Media'} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 font-medium text-[#0f1116]">{item.title ?? 'Untitled'}</td>
                      <td className="py-3 text-gray-500">{item.mime ?? '—'}</td>
                      <td className="py-3 text-gray-500">{formatBytes(item.size)}</td>
                      <td className="py-3 text-right text-gray-400">
                        {formatRelativeTimeOrDash(item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
