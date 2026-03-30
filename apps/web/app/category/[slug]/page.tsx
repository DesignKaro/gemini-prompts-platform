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
  getCategoryDetail,
  getPostList,
  getPromptList,
} from '../../../lib/public-content';
import { resolveCategoryImage } from '../../../lib/content-image-fallbacks';
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
  const [category, settings] = await Promise.all([getCategoryDetail(slug), getSeoSettings()]);

  if (!category) {
    return buildMetadata({
      title: 'Category Not Found',
      description: 'The requested category could not be found.',
      path: '/category',
      noIndex: true,
    });
  }

  return buildMetadata({
    title: category.name,
    description: category.description || `Browse prompts and posts published under ${category.name}.`,
    path: `/category/${category.slug}`,
    image: category.imageUrl,
    noIndex: settings.noindexCategoryPages,
  });
}

function CategoryDetailPageFallback() {
  return (
    <main className="page-shell bg-white">
      <div className="page-container space-y-12">
        <div className="grid gap-8 lg:grid-cols-[60%_1fr] lg:items-center">
          <div className="space-y-5">
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
                    <Link href="/category" className="transition-colors hover:text-[#101010]">
                      Categories
                    </Link>
                  </li>
                </ol>
              </nav>
              <Skeleton className="mt-4 h-14 w-[min(30rem,92%)] rounded-[14px]" />
              <Skeleton className="mt-3 h-6 w-[min(38rem,95%)] rounded-full" />
              <Skeleton className="mt-2 h-6 w-[min(34rem,90%)] rounded-full" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
          </div>
          <Skeleton className="aspect-[4/3] w-full rounded-[28px]" />
        </div>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[1.6rem] font-medium tracking-[-0.02em] text-[#0b0f18]">
                Latest prompts
              </h2>
              <p className="mt-2 text-[1rem] leading-[1.7] text-[#5f6773]">
                Recently published prompts in this category.
              </p>
            </div>
            <Link
              href="/prompts"
              className="inline-flex items-center rounded-full bg-[#d5ea52] px-5 py-2.5 text-[0.95rem] font-medium text-black transition-all hover:translate-y-[-1px] hover:opacity-95"
            >
              View all prompts
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <article key={`category-prompt-skeleton-${index}`} className="space-y-3">
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
                Category posts
              </h2>
              <p className="mt-2 text-[1rem] leading-[1.7] text-[#5f6773]">
                Editorial posts and guides tied to this category.
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
              <article key={`category-post-skeleton-${index}`} className="space-y-3">
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

async function CategoryDetailPageContent({ params }: PageProps) {
  const { slug } = await params;
  const seoSettings = await getSeoSettings();
  const baseUrl = getNormalizedBaseUrl(seoSettings);
  const category = await getCategoryDetail(slug);

  if (!category) {
    notFound();
  }

  const [promptsResponse, postsResponse] = await Promise.all([
    getPromptList({ category: category.slug, take: 12, sort: 'latest' }),
    getPostList({ category: category.slug, take: 6, sort: 'latest' }),
  ]);
  const pageUrl = `${baseUrl}/category/${category.slug}`;
  const shouldNoIndex = seoSettings.noindexCategoryPages;
  const categoryImageUrl = resolveCategoryImage(category.imageUrl, category.slug || category.id);

  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: category.name,
        description: category.description || `Browse prompts and posts published under ${category.name}.`,
        keywords: [category.name],
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Categories', item: `${baseUrl}/category` },
          { name: category.name, item: pageUrl },
        ],
        pageUrl,
      ),
    },
    {
      family: 'collection' as const,
      schema: buildCollectionPageSchema({
        url: pageUrl,
        name: category.name,
        description: category.description || undefined,
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: `${category.name} prompts`,
        idSuffix: 'category-prompts',
        items: buildPromptItemListEntries(promptsResponse.items, baseUrl),
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: `${category.name} posts`,
        idSuffix: 'category-posts',
        items: buildPostItemListEntries(postsResponse.items, baseUrl, 'blog'),
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <main className="page-shell bg-white">
      <SeoSchemaScripts items={schemaItems} noIndex={shouldNoIndex} />

      <div className="page-container space-y-12">
        <div className="grid gap-8 lg:grid-cols-[60%_1fr] lg:items-center">
          <div className="space-y-5">
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
                    <Link href="/category" className="transition-colors hover:text-[#101010]">
                      Categories
                    </Link>
                  </li>
                  <li className="text-[#c0c6d1]">/</li>
                  <li className="font-medium text-[#101010]">{category.name}</li>
                </ol>
              </nav>
              <h1 className="section-heading-medium mt-4 text-[2.6rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[3.2rem]">
                {category.name}
              </h1>
              <p className="mt-3 max-w-full whitespace-pre-line text-[1.05rem] leading-[1.7] text-[#5f6773]">
                {category.description || 'Live prompts and posts curated from the dashboard.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[0.9rem] text-[#4b525e]">
              <span className="rounded-full bg-[#f1f4f8] px-4 py-2">
                {category.promptCount} prompts
              </span>
              <span className="rounded-full bg-[#f1f4f8] px-4 py-2">
                {category.postCount} posts
              </span>
            </div>
          </div>

          <div
            role="img"
            aria-label={`${category.name} featured image`}
            className="aspect-[4/3] w-full rounded-[28px] bg-cover bg-center shadow-[0_20px_60px_rgba(15,17,22,0.08)]"
            style={{ backgroundImage: `url(${categoryImageUrl})` }}
          />
        </div>

        {promptsResponse.items.length > 0 ? (
          <section>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[1.6rem] font-medium tracking-[-0.02em] text-[#0b0f18]">
                  Latest prompts
                </h2>
                <p className="mt-2 text-[1rem] leading-[1.7] text-[#5f6773]">
                  Recently published prompts in this category.
                </p>
              </div>
              <Link
                href="/prompts"
                className="inline-flex items-center rounded-full bg-[#d5ea52] px-5 py-2.5 text-[0.95rem] font-medium text-black transition-all hover:translate-y-[-1px] hover:opacity-95"
              >
                View all prompts
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
                  Category posts
                </h2>
                <p className="mt-2 text-[1rem] leading-[1.7] text-[#5f6773]">
                  Editorial posts and guides tied to this category.
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

export default function CategoryDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<CategoryDetailPageFallback />}>
      <CategoryDetailPageContent params={params} />
    </Suspense>
  );
}
