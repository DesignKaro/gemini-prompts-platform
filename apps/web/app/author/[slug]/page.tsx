import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AuthorAvatar } from '../../components/author-avatar';
import { PostCardUI } from '../../components/post-card';
import { PromptCardUI } from '../../components/prompt-listing';
import { AuthorFollowButton } from './author-follow-button';
import {
  estimateReadTime,
  getAuthorDetail,
  getPostList,
  getPromptList,
} from '../../../lib/public-content';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    promptPage?: string;
    blogPage?: string;
  }>;
};

type ResolvedAuthor = NonNullable<Awaited<ReturnType<typeof getAuthorDetail>>>;
type PromptListResponse = Awaited<ReturnType<typeof getPromptList>>;
type PostListResponse = Awaited<ReturnType<typeof getPostList>>;

const PROMPT_PAGE_SIZE = 8;
const BLOG_PAGE_SIZE = 6;
export const revalidate = 120;

export default async function AuthorDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:30001';
  const promptPage = Math.max(1, Number.parseInt(resolvedSearchParams?.promptPage ?? '1', 10) || 1);
  const blogPage = Math.max(1, Number.parseInt(resolvedSearchParams?.blogPage ?? '1', 10) || 1);
  const author = await getAuthorDetail(slug, { revalidateSeconds: revalidate });

  if (!author) {
    notFound();
  }

  const promptsResponsePromise = getPromptList(
    {
      authorId: author.id,
      take: PROMPT_PAGE_SIZE,
      skip: (promptPage - 1) * PROMPT_PAGE_SIZE,
      sort: 'latest',
    },
    { revalidateSeconds: revalidate },
  );
  const postsResponsePromise = getPostList(
    {
      authorId: author.id,
      take: BLOG_PAGE_SIZE,
      skip: (blogPage - 1) * BLOG_PAGE_SIZE,
      sort: 'latest',
      includeContent: 0,
    },
    { revalidateSeconds: revalidate },
  );

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Authors', item: `${baseUrl}/author` },
      { '@type': 'ListItem', position: 3, name: author.name, item: `${baseUrl}/author/${author.slug}` },
    ],
  };

  return (
    <main className="page-shell bg-white font-normal">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="page-container space-y-12">
        <div className="rounded-[32px] border border-[#e2e6ee] bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-5 sm:flex-nowrap sm:justify-between">
            <div className="flex items-center gap-4">
              <AuthorAvatar
                name={author.name}
                avatarUrl={author.avatarUrl}
                avatarUpdatedAt={author.avatarUpdatedAt}
                className="h-16 w-16 rounded-[22px]"
                imageClassName="object-cover"
                initialClassName="text-[1.05rem]"
                alt={`${author.name} profile`}
              />
              <div>
                <p className="text-[1.4rem] leading-[1.1] text-[#0f1116] sm:text-[1.6rem]">
                  {author.name}
                </p>
                <p className="mt-1 text-[0.92rem] text-[#6a7280] sm:text-[0.98rem]">
                  {author.profileTitle || 'Prompt creator'}
                </p>
                {author.handle ? (
                  <p className="mt-1 text-[0.82rem] text-[#9aa1ae]">@{author.handle}</p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[#f2f4f8] px-4 py-2 text-[0.82rem] text-[#606874]">
                {author.promptCount ?? 0} prompt{author.promptCount === 1 ? '' : 's'}
              </div>
              <AuthorFollowButton
                authorId={author.id}
                initialFollowerCount={author.followerCount ?? 0}
              />
            </div>
          </div>

          {author.bio ? (
            <p className="mt-5 max-w-[40rem] text-[0.95rem] leading-7 text-[#606874]">
              {author.bio}
            </p>
          ) : null}
        </div>

        <Suspense fallback={<PromptSectionSkeleton />}>
          <PromptSection
            author={author}
            promptPage={promptPage}
            blogPage={blogPage}
            promptsResponsePromise={promptsResponsePromise}
          />
        </Suspense>

        <Suspense fallback={<BlogSectionSkeleton />}>
          <BlogSection
            author={author}
            promptPage={promptPage}
            blogPage={blogPage}
            postsResponsePromise={postsResponsePromise}
          />
        </Suspense>
      </div>
    </main>
  );
}

async function PromptSection({
  author,
  promptPage,
  blogPage,
  promptsResponsePromise,
}: {
  author: ResolvedAuthor;
  promptPage: number;
  blogPage: number;
  promptsResponsePromise: Promise<PromptListResponse>;
}) {
  const promptsResponse = await promptsResponsePromise;
  const promptTotalPages = Math.max(1, Math.ceil(promptsResponse.total / PROMPT_PAGE_SIZE));

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[1.4rem] text-[#0f1116] sm:text-[1.6rem]">
            Prompt library
          </h2>
          <p className="mt-1 text-[0.92rem] text-[#6a7280]">
            Public prompt packs shared by this creator.
          </p>
        </div>
        <Link
          href={`/author/${author.slug}/archive`}
          className="inline-flex h-[42px] items-center justify-center rounded-full bg-[#d5ea52] px-5 text-[0.95rem] font-medium text-black transition-colors hover:bg-[#c7dc43]"
        >
          View all prompts
        </Link>
      </div>

      {promptsResponse.items.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[#d6dbe5] px-6 py-8 text-[0.9rem] text-[#7a8292]">
          No public prompts yet.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {promptsResponse.items.map((prompt) => (
            <PromptCardUI key={prompt.id} prompt={prompt} />
          ))}
        </div>
      )}

      {promptTotalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: promptTotalPages }, (_, index) => index + 1).map((pageNumber) => (
            <Link
              key={`prompt-page-${pageNumber}`}
              href={`/author/${author.slug}?promptPage=${pageNumber}${blogPage > 1 ? `&blogPage=${blogPage}` : ''}`}
              className={`h-9 w-9 rounded-full border text-center text-[0.9rem] leading-[2.2rem] ${
                pageNumber === promptPage
                  ? 'border-[#111111] bg-[#111111] text-white'
                  : 'border-[#d8dce2] text-[#101010] hover:border-[#101010]'
              }`}
            >
              {pageNumber}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

async function BlogSection({
  author,
  promptPage,
  blogPage,
  postsResponsePromise,
}: {
  author: ResolvedAuthor;
  promptPage: number;
  blogPage: number;
  postsResponsePromise: Promise<PostListResponse>;
}) {
  const postsResponse = await postsResponsePromise;
  const blogTotalPages = Math.max(1, Math.ceil(postsResponse.total / BLOG_PAGE_SIZE));

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[1.4rem] text-[#0f1116] sm:text-[1.6rem]">
            Blog posts
          </h2>
          <p className="mt-1 text-[0.92rem] text-[#6a7280]">
            Long-form posts and guides from this author.
          </p>
        </div>
        <Link
          href="/blog"
          className="inline-flex h-[42px] items-center justify-center rounded-full bg-[#d5ea52] px-5 text-[0.95rem] font-medium text-black transition-colors hover:bg-[#c7dc43]"
        >
          View all posts
        </Link>
      </div>

      {postsResponse.items.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[#d6dbe5] px-6 py-8 text-[0.9rem] text-[#7a8292]">
          No posts yet.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {postsResponse.items.map((post) => (
            <PostCardUI
              key={post.id}
              href={`/blog/${post.slug}`}
              imageUrl={post.image}
              readTime={estimateReadTime(post.excerpt || post.content)}
              title={post.title}
            />
          ))}
        </div>
      )}

      {blogTotalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: blogTotalPages }, (_, index) => index + 1).map((pageNumber) => (
            <Link
              key={`blog-page-${pageNumber}`}
              href={`/author/${author.slug}?blogPage=${pageNumber}${promptPage > 1 ? `&promptPage=${promptPage}` : ''}`}
              className={`h-9 w-9 rounded-full border text-center text-[0.9rem] leading-[2.2rem] ${
                pageNumber === blogPage
                  ? 'border-[#111111] bg-[#111111] text-white'
                  : 'border-[#d8dce2] text-[#101010] hover:border-[#101010]'
              }`}
            >
              {pageNumber}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PromptSectionSkeleton() {
  return (
    <section className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-5 w-48 animate-pulse rounded bg-[#eef1f5]" />
      <div className="h-4 w-72 animate-pulse rounded bg-[#f2f4f8]" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={`prompt-skeleton-${index + 1}`}
            className="h-[280px] animate-pulse rounded-[24px] border border-[#e6e9f2] bg-[#f8fafc]"
          />
        ))}
      </div>
    </section>
  );
}

function BlogSectionSkeleton() {
  return (
    <section className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-5 w-40 animate-pulse rounded bg-[#eef1f5]" />
      <div className="h-4 w-80 animate-pulse rounded bg-[#f2f4f8]" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={`blog-skeleton-${index + 1}`}
            className="h-[260px] animate-pulse rounded-[22px] border border-[#e6e9f2] bg-[#f8fafc]"
          />
        ))}
      </div>
    </section>
  );
}
