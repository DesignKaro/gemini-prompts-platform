import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PostCardUI } from '../../components/post-card';
import { PromptCardServer } from '../../components/prompt-card-server';
import { SeoSchemaScripts } from '../../components/seo-schema-script';
import { Skeleton } from '../../components/ui/skeleton';
import {
  estimateReadTime,
  getPostList,
  getPromptList,
  getTagDetail,
} from '../../../lib/public-content';
import { buildMetadata, getNormalizedBaseUrl, getSeoSettings } from '../../../lib/seo';
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildItemListSchema,
  buildPostItemListEntries,
  buildPromptItemListEntries,
  buildWebPageSchema,
} from '../../../lib/structured-data';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagDetail(slug);
  const settings = await getSeoSettings();

  if (!tag) {
    return buildMetadata({
      title: 'Tag Not Found',
      description: 'The requested tag could not be found.',
      path: '/tag',
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `#${tag.name}`,
    description: tag.description || `Browse prompts and posts tagged with ${tag.name}.`,
    path: `/tag/${tag.slug}`,
    noIndex: settings.noindexTagPages,
  });
}

function TagDetailPageFallback() {
  return (
    <main className="page-shell bg-white">
      <div className="page-container space-y-12">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <nav aria-label="Breadcrumb" className="text-[0.9rem] text-[#8b8f99]">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="transition-colors hover:text-[#101010]">
                    Home
                  </Link>
                </li>
                <li className="text-[#c0c6d1]">/</li>
                <li>
                  <Link href="/tag" className="transition-colors hover:text-[#101010]">
                    Tags
                  </Link>
                </li>
              </ol>
            </nav>
            <Skeleton className="mt-4 h-14 w-[min(26rem,90%)] rounded-[14px]" />
            <Skeleton className="mt-3 h-6 w-[min(36rem,95%)] rounded-full" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[1.6rem] font-medium tracking-[-0.02em] text-[#0b0f18]">
                Tagged prompts
              </h2>
              <p className="mt-2 text-[1rem] leading-[1.7] text-[#5f6773]">
                Published prompts that carry this tag.
              </p>
            </div>
            <Link
              href="/tag"
              className="inline-flex items-center rounded-full bg-[#d5ea52] px-5 py-2.5 text-[0.95rem] font-medium text-black transition-all hover:translate-y-[-1px] hover:opacity-95"
            >
              View prompt archive
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <article key={`tag-prompt-skeleton-${index}`} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-[24px]" />
                <Skeleton className="h-5 w-full rounded-full" />
                <Skeleton className="h-5 w-[82%] rounded-full" />
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[1.6rem] font-medium tracking-[-0.02em] text-[#0b0f18]">
                Tagged posts
              </h2>
              <p className="mt-2 text-[1rem] leading-[1.7] text-[#5f6773]">
                Editorial posts and guides with this tag.
              </p>
            </div>
            <Link
              href="/blog"
              className="inline-flex items-center rounded-full bg-[#d5ea52] px-5 py-2.5 text-[0.95rem] font-medium text-black transition-all hover:translate-y-[-1px] hover:opacity-95"
            >
              View all posts
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <article key={`tag-post-skeleton-${index}`} className="space-y-3">
                <Skeleton className="aspect-[16/9] w-full rounded-[20px]" />
                <Skeleton className="h-6 w-full rounded-full" />
                <Skeleton className="h-6 w-[82%] rounded-full" />
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

async function TagDetailPageContent({ params }: PageProps) {
  const { slug } = await params;
  const seoSettings = await getSeoSettings();
  const baseUrl = getNormalizedBaseUrl(seoSettings);
  const tag = await getTagDetail(slug);

  if (!tag) {
    notFound();
  }

  const [promptsResponse, postsResponse] = await Promise.all([
    getPromptList({ tag: tag.slug, take: 12, sort: 'latest' }),
    getPostList({ tag: tag.slug, take: 6, sort: 'latest' }),
  ]);
  const pageUrl = `${baseUrl}/tag/${tag.slug}`;
  const shouldNoIndex = seoSettings.noindexTagPages;

  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: `#${tag.name}`,
        description: tag.description || `Browse prompts and posts tagged with ${tag.name}.`,
        keywords: [tag.name],
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Tags', item: `${baseUrl}/tag` },
          { name: tag.name, item: pageUrl },
        ],
        pageUrl,
      ),
    },
    {
      family: 'collection' as const,
      schema: buildCollectionPageSchema({
        url: pageUrl,
        name: `${tag.name} tagged content`,
        description: tag.description || undefined,
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: `${tag.name} prompts`,
        idSuffix: 'tag-prompts',
        items: buildPromptItemListEntries(promptsResponse.items, baseUrl),
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: `${tag.name} posts`,
        idSuffix: 'tag-posts',
        items: buildPostItemListEntries(postsResponse.items, baseUrl, 'blog'),
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <main className="page-shell bg-white">
      <SeoSchemaScripts items={schemaItems} noIndex={shouldNoIndex} />

      <div className="page-container space-y-12">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <nav aria-label="Breadcrumb" className="text-[0.9rem] text-[#8b8f99]">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="transition-colors hover:text-[#101010]">
                    Home
                  </Link>
                </li>
                <li className="text-[#c0c6d1]">/</li>
                <li>
                  <Link href="/tag" className="transition-colors hover:text-[#101010]">
                    Tags
                  </Link>
                </li>
                <li className="text-[#c0c6d1]">/</li>
                <li className="font-medium text-[#101010]">{tag.name}</li>
              </ol>
            </nav>

            <h1 className="section-heading-medium mt-4 text-[2.6rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[3.2rem]">
              #{tag.name}
            </h1>
            <p className="mt-3 max-w-[620px] text-[1.05rem] leading-[1.7] text-[#5f6773]">
              {tag.description || `Prompts and posts tagged with ${tag.name}.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[0.9rem] text-[#4b525e]">
            <span className="rounded-full bg-[#f1f4f8] px-4 py-2">{tag.promptCount} prompts</span>
            <span className="rounded-full bg-[#f1f4f8] px-4 py-2">{tag.postCount} posts</span>
          </div>
        </div>

        {promptsResponse.items.length > 0 ? (
          <section>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[1.6rem] font-medium tracking-[-0.02em] text-[#0b0f18]">
                  Tagged prompts
                </h2>
                <p className="mt-2 text-[1rem] leading-[1.7] text-[#5f6773]">
                  Published prompts that carry this tag.
                </p>
              </div>
              <Link
                href={`/tag/${tag.slug}/archive`}
                className="inline-flex items-center rounded-full bg-[#d5ea52] px-5 py-2.5 text-[0.95rem] font-medium text-black transition-all hover:translate-y-[-1px] hover:opacity-95"
              >
                View prompt archive
              </Link>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {promptsResponse.items.map((prompt) => (
                <PromptCardServer key={prompt.id} prompt={prompt} />
              ))}
            </div>
          </section>
        ) : null}

        {postsResponse.items.length > 0 ? (
          <section>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[1.6rem] font-medium tracking-[-0.02em] text-[#0b0f18]">
                  Tagged posts
                </h2>
                <p className="mt-2 text-[1rem] leading-[1.7] text-[#5f6773]">
                  Editorial posts and guides with this tag.
                </p>
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center rounded-full bg-[#d5ea52] px-5 py-2.5 text-[0.95rem] font-medium text-black transition-all hover:translate-y-[-1px] hover:opacity-95"
              >
                View all posts
              </Link>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default function TagDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<TagDetailPageFallback />}>
      <TagDetailPageContent params={params} />
    </Suspense>
  );
}
