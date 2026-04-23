import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AuthorAvatar } from '../../components/author-avatar';
import { PostCardUI } from '../../components/post-card';
import { PromptCardServer } from '../../components/prompt-card-server';
import { AuthorFollowButton } from '../../components/author-follow-button';
import { SeoSchemaScripts } from '../../components/seo-schema-script';
import {
  estimateReadTime,
  getAuthorDetail,
  getPostList,
  getPromptList,
} from '../../../lib/public-content';
import { buildMetadata, getNormalizedBaseUrl, getSeoSettings } from '../../../lib/seo';
import {
  buildBreadcrumbSchema,
  buildItemListSchema,
  buildPostItemListEntries,
  buildProfileSchemas,
  buildPromptItemListEntries,
  buildWebPageSchema,
} from '../../../lib/structured-data';

type PageProps = {
  params: Promise<{
    handle: string;
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

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ handle }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const promptPage = Math.max(1, Number.parseInt(resolvedSearchParams?.promptPage ?? '1', 10) || 1);
  const blogPage = Math.max(1, Number.parseInt(resolvedSearchParams?.blogPage ?? '1', 10) || 1);
  const author = await getAuthorDetail(handle, { revalidateSeconds: revalidate });
  const settings = await getSeoSettings();

  if (!author) {
    return buildMetadata({
      title: 'Author Not Found',
      description: 'The requested author profile could not be found.',
      path: '/author',
      noIndex: true,
    });
  }

  const query = new URLSearchParams();
  if (promptPage > 1) {
    query.set('promptPage', String(promptPage));
  }
  if (blogPage > 1) {
    query.set('blogPage', String(blogPage));
  }
  const queryString = query.toString();
  const path = `/u/${author.handle || author.slug}${queryString ? `?${queryString}` : ''}`;

  return buildMetadata({
    title: author.name,
    description:
      author.bio || author.profileTitle || `Explore public prompts and posts from ${author.name}.`,
    path,
    image: author.avatarUrl,
    type: 'profile',
    noIndex:
      settings.noindexAuthorPages ||
      (settings.noindexPaginatedArchives && (promptPage > 1 || blogPage > 1)),
  });
}

function PublicProfilePageFallback() {
  return (
    <main className="page-shell bg-white font-normal">
      <div className="page-container space-y-12">
        <div className="rounded-[32px] border border-[#e2e6ee] bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-5">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 animate-pulse rounded-[22px] bg-[#eef1f5]" />
              <div>
                <div className="h-6 w-40 animate-pulse rounded bg-[#eef1f5]" />
                <div className="mt-2 h-4 w-32 animate-pulse rounded bg-[#f2f4f8]" />
                <div className="mt-2 h-3 w-24 animate-pulse rounded bg-[#f2f4f8]" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-28 animate-pulse rounded-full bg-[#f2f4f8]" />
              <div className="h-9 w-24 animate-pulse rounded-full bg-[#eef1f5]" />
            </div>
          </div>
          <div className="mt-5 h-4 w-[min(38rem,95%)] animate-pulse rounded bg-[#f2f4f8]" />
          <div className="mt-2 h-4 w-[min(34rem,90%)] animate-pulse rounded bg-[#f2f4f8]" />
        </div>

        <PromptSectionSkeleton />
        <BlogSectionSkeleton />
      </div>
    </main>
  );
}

async function PublicProfilePageContent({ params, searchParams }: PageProps) {
  const { handle } = await params;
  const seoSettings = await getSeoSettings();
  const resolvedSearchParams = await searchParams;
  const baseUrl = getNormalizedBaseUrl(seoSettings);
  const promptPage = Math.max(1, Number.parseInt(resolvedSearchParams?.promptPage ?? '1', 10) || 1);
  const blogPage = Math.max(1, Number.parseInt(resolvedSearchParams?.blogPage ?? '1', 10) || 1);
  const author = await getAuthorDetail(handle, { revalidateSeconds: revalidate });

  if (!author) {
    notFound();
  }

  const authorPath = author.handle || author.slug;
  const authorProfileUrl = `${baseUrl}/u/${authorPath}`;

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
  const [promptSchemaResponse, postSchemaResponse] = await Promise.all([
    promptsResponsePromise,
    postsResponsePromise,
  ]);
  const shouldNoIndex =
    seoSettings.noindexAuthorPages ||
    (seoSettings.noindexPaginatedArchives && (promptPage > 1 || blogPage > 1));

  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: authorProfileUrl,
        name: author.name,
        description: author.bio || author.profileTitle,
        keywords: [author.name, author.profileTitle || 'Prompt creator'],
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: author.name, item: authorProfileUrl },
        ],
        authorProfileUrl,
      ),
    },
    ...buildProfileSchemas({
      profileUrl: authorProfileUrl,
      personName: author.name,
      description: author.bio,
      image: author.avatarUrl,
      jobTitle: author.profileTitle,
    }),
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: authorProfileUrl,
        name: `${author.name} prompts`,
        idSuffix: 'author-prompts',
        items: buildPromptItemListEntries(promptSchemaResponse.items, baseUrl),
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: authorProfileUrl,
        name: `${author.name} posts`,
        idSuffix: 'author-posts',
        items: buildPostItemListEntries(postSchemaResponse.items, baseUrl, 'blog'),
      }),
    },
  ].filter(
    (
      entry,
    ): entry is
      | { family: 'webpage' | 'breadcrumb' | 'collection'; schema: Record<string, unknown> }
      | { family: 'profile'; schema: Record<string, unknown> } => Boolean(entry.schema),
  );

  return (
    <main className="page-shell bg-white font-normal">
      <SeoSchemaScripts items={schemaItems} noIndex={shouldNoIndex} />

      <div className="page-container space-y-12">
        <div className="rounded-[32px] border border-[#e2e6ee] bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-5">
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
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
              <div className="whitespace-nowrap rounded-full bg-[#f2f4f8] px-3 py-1.5 text-[0.78rem] text-[#606874] sm:px-4 sm:py-2 sm:text-[0.82rem]">
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
            promptsResponsePromise={Promise.resolve(promptSchemaResponse)}
          />
        </Suspense>

        <Suspense fallback={<BlogSectionSkeleton />}>
          <BlogSection
            author={author}
            promptPage={promptPage}
            blogPage={blogPage}
            postsResponsePromise={Promise.resolve(postSchemaResponse)}
          />
        </Suspense>
      </div>
    </main>
  );
}

export default function PublicProfilePage(props: PageProps) {
  return (
    <Suspense fallback={<PublicProfilePageFallback />}>
      <PublicProfilePageContent {...props} />
    </Suspense>
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
  const authorPath = author.handle || author.slug;
  const promptsResponse = await promptsResponsePromise;
  const promptTotalPages = Math.max(1, Math.ceil(promptsResponse.total / PROMPT_PAGE_SIZE));

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mt-1 text-[0.92rem] text-[#6a7280]">
            Public prompt packs shared by this creator.
          </p>
        </div>
        <Link
          href={`/u/${authorPath}/archive`}
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
            <PromptCardServer key={prompt.id} prompt={prompt} />
          ))}
        </div>
      )}

      {promptTotalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: promptTotalPages }, (_, index) => index + 1).map((pageNumber) => (
            <Link
              key={`prompt-page-${pageNumber}`}
              href={`/u/${authorPath}?promptPage=${pageNumber}${blogPage > 1 ? `&blogPage=${blogPage}` : ''}`}
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
  const authorPath = author.handle || author.slug;
  const postsResponse = await postsResponsePromise;
  const blogTotalPages = Math.max(1, Math.ceil(postsResponse.total / BLOG_PAGE_SIZE));

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[1.4rem] text-[#0f1116] sm:text-[1.6rem]">Blog posts</h2>
          <p className="mt-1 text-[0.92rem] text-[#6a7280]">
            Long-form posts and guides from this author.
          </p>
        </div>
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
              href={`/u/${authorPath}?blogPage=${pageNumber}${promptPage > 1 ? `&promptPage=${promptPage}` : ''}`}
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
