import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '../../../auth';
import AISummarizeWidget from '../../components/ai-summarize-widget';
import { AuthorAvatar } from '../../components/author-avatar';
import { ContentViewTracker } from '../../components/content-view-tracker';
import { ExclusiveAccessCard } from '../../components/exclusive-access-card';
import { PostCardUI } from '../../components/post-card';
import { ProgressiveImage } from '../../components/progressive-image';
import { SeoSchemaScripts } from '../../components/seo-schema-script';
import { Skeleton } from '../../components/ui/skeleton';
import {
  estimateReadTime,
  formatDisplayDate,
  getPostCategoryName,
  getPostDetail,
  stripHtml,
} from '../../../lib/public-content';
import { buildMetadata, getNormalizedBaseUrl, getSeoSettings } from '../../../lib/seo';
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildWebPageSchema,
} from '../../../lib/structured-data';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostDetail(slug);

  if (!post) {
    return buildMetadata({
      title: 'Issue Not Found',
      description: 'The requested newsletter issue could not be found.',
      path: '/newsletter',
      noIndex: true,
    });
  }

  return buildMetadata({
    title: post.metaTitle || post.seoTitle || post.title,
    description:
      post.metaDescription ||
      post.seoDescription ||
      post.excerpt ||
      stripHtml(post.content).slice(0, 160) ||
      'A published newsletter issue synced from the Gemini Prompts dashboard.',
    path: `/newsletter/${post.slug}`,
    canonicalUrl: post.seoCanonicalUrl || undefined,
    image: post.image,
    type: 'article',
    noIndex: Boolean(post.seoNoIndex),
  });
}

function NewsletterIssuePageFallback() {
  return (
    <main className="page-shell bg-white">
      <div className="page-container-reading">
        <nav aria-label="Breadcrumb" className="text-[0.9rem] text-[#8b8f99]">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition-colors hover:text-[#101010]">
                Home
              </Link>
            </li>
            <li className="text-[#c0c6d1]">/</li>
            <li>
              <Link href="/newsletter" className="transition-colors hover:text-[#101010]">
                Newsletter
              </Link>
            </li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-8 sm:gap-10 lg:grid-cols-[1fr_340px] lg:items-start">
          <article className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-5 w-32 rounded-full" />
            </div>
            <div className="mt-5 space-y-3">
              <Skeleton className="h-14 w-[min(48rem,95%)] rounded-[14px]" />
              <Skeleton className="h-14 w-[min(42rem,92%)] rounded-[14px]" />
            </div>
            <Skeleton className="mt-5 h-6 w-[min(46rem,95%)] rounded-full" />
            <Skeleton className="mt-2 h-6 w-[min(40rem,90%)] rounded-full" />
            <div className="mt-7 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28 rounded-full" />
                  <Skeleton className="h-3.5 w-24 rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-24 rounded-full" />
                <Skeleton className="h-10 w-24 rounded-full" />
              </div>
            </div>
            <Skeleton className="mt-10 aspect-[16/9] w-full rounded-[26px]" />
            <Skeleton className="mt-12 h-64 w-full rounded-[20px]" />
          </article>

          <aside className="space-y-5 lg:sticky lg:top-8">
            <Skeleton className="h-44 w-full rounded-[20px]" />
            <Skeleton className="h-64 w-full rounded-[20px]" />
          </aside>
        </div>
      </div>
    </main>
  );
}

async function NewsletterIssuePageContent({ params }: PageProps) {
  const { slug } = await params;
  const seoSettings = await getSeoSettings();
  const session = await auth();
  const post = await getPostDetail(slug, {
    accessToken: session?.apiAccessToken ?? null,
    noStore: Boolean(session?.apiAccessToken),
  });

  if (!post) {
    notFound();
  }

  const baseUrl = getNormalizedBaseUrl(seoSettings);
  const canonicalUrl = `${baseUrl}/newsletter/${encodeURIComponent(post.slug)}`;
  const categoryName = getPostCategoryName(post);
  const dateLabel = formatDisplayDate(post.publishedAt || post.updatedAt);
  const readingTime = estimateReadTime(post.content || post.excerpt || '');
  const excerpt = post.excerpt || stripHtml(post.content || '').slice(0, 200);
  const isSignedIn = Boolean(session?.user?.email);
  const isPremiumMember = session?.user?.plan === 'PREMIUM';
  const shouldNoIndex = Boolean(post.seoNoIndex);

  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: canonicalUrl,
        name: post.title,
        description: excerpt,
        keywords: [categoryName, ...post.tags.map((tag) => tag.name)],
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Newsletter', item: `${baseUrl}/newsletter` },
          { name: post.title, item: canonicalUrl },
        ],
        canonicalUrl,
      ),
    },
    {
      family: 'article' as const,
      schema: buildArticleSchema({
        url: canonicalUrl,
        title: post.title,
        description: excerpt,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        authorName: post.author.name,
        image: post.image,
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <main className="page-shell bg-white">
      <SeoSchemaScripts items={schemaItems} noIndex={shouldNoIndex} />
      <ContentViewTracker target="post" contentId={post.id} />

      <div className="page-container-reading">
        <nav aria-label="Breadcrumb" className="text-[0.9rem] text-[#8b8f99]">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition-colors hover:text-[#101010]">
                Home
              </Link>
            </li>
            <li className="text-[#c0c6d1]">/</li>
            <li>
              <Link href="/newsletter" className="transition-colors hover:text-[#101010]">
                Newsletter
              </Link>
            </li>
            <li className="text-[#c0c6d1]">/</li>
            <li className="font-medium text-[#101010]">{post.title}</li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-8 sm:gap-10 lg:grid-cols-[1fr_340px] lg:items-start">
          <article className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 text-[0.95rem] text-[#6b7382]">
              <span className="rounded-full border border-[#e1e5ee] bg-[#f8fafc] px-4 py-2 text-[0.9rem] font-medium text-[#0b0f18]">
                {categoryName}
              </span>
              <span
                className={`rounded-full px-4 py-2 text-[0.82rem] font-medium ${
                  post.visibility === 'EXCLUSIVE'
                    ? 'bg-[#d5ea52] text-black'
                    : 'bg-[#eef2f7] text-[#455065]'
                }`}
              >
                {post.visibility === 'EXCLUSIVE' ? 'Exclusive' : 'Free'}
              </span>
              <span aria-hidden="true" className="text-[#c0c6d1]">
                •
              </span>
              <time dateTime={post.publishedAt || post.updatedAt}>{dateLabel}</time>
              <span aria-hidden="true" className="text-[#c0c6d1]">
                •
              </span>
              <span>{readingTime}</span>
            </div>

            <h1 className="section-heading-medium mt-5 text-[2.3rem] leading-[1.05] tracking-[-0.05em] text-[#111118] sm:text-[2.9rem]">
              {post.title}
            </h1>
            <p className="mt-5 max-w-[46rem] text-[1.08rem] leading-[1.75] text-[#5f6773]">
              {excerpt}
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
              <Link href={`/u/${post.author.slug}`} className="flex items-center gap-3">
                <AuthorAvatar
                  name={post.author.name}
                  avatarUrl={post.author.avatarUrl}
                  avatarUpdatedAt={post.author.avatarUpdatedAt}
                  className="h-10 w-10"
                  initialClassName="text-[0.88rem]"
                />
                <div>
                  <p className="text-[0.95rem] font-[500] leading-none text-[#0f1118]">
                    {post.author.name}
                  </p>
                  <p className="mt-1 text-[0.86rem] leading-none text-[#6b7280]">
                    {post.author.profileTitle || 'Contributor'}
                  </p>
                </div>
              </Link>

              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                <a
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#d8dce2] bg-white px-4 text-[0.92rem] font-[500] text-[#101010] transition-colors hover:border-[#101010]"
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(canonicalUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Share
                </a>
                <a
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#d8dce2] bg-white px-4 text-[0.92rem] font-[500] text-[#101010] transition-colors hover:border-[#101010]"
                  href={canonicalUrl}
                >
                  Copy link
                </a>
              </div>
            </div>

            {post.image ? (
              <div className="mt-10 overflow-hidden rounded-[26px] border border-[#e6e9f2]">
                <div className="relative aspect-[16/9] w-full">
                  <ProgressiveImage
                    src={post.image}
                    alt={`${post.title} cover`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 70vw"
                    className="object-cover"
                  />
                </div>
              </div>
            ) : null}

            {post.isLocked && !isPremiumMember ? (
              <div className="mt-12">
                <ExclusiveAccessCard contentLabel="newsletter issue" isSignedIn={isSignedIn} />
              </div>
            ) : (
              <div className="prose prose-gray mt-12 max-w-none text-[1rem] leading-[1.85] text-[#3f4550]">
                {/* eslint-disable-next-line react/no-danger */}
                <div dangerouslySetInnerHTML={{ __html: post.content || '' }} />
              </div>
            )}

            {post.tags.length > 0 ? (
              <div className="mt-10 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/tag/${tag.slug}`}
                    className="rounded-full bg-[#f1f3f8] px-4 py-2 text-[0.88rem] text-[#2f3440] transition-colors hover:bg-[#e7ebf2]"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            ) : null}

            {post.relatedPosts && post.relatedPosts.length > 0 ? (
              <section className="mt-12">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-[1.55rem] font-medium tracking-[-0.02em] text-[#0b0f18]">
                      Related issues
                    </h2>
                    <p className="mt-2 text-[1rem] leading-[1.75] text-[#5f6773]">
                      More live content from the same category.
                    </p>
                  </div>
                  <Link
                    href="/newsletter"
                    className="text-[0.95rem] font-medium text-[#111111] transition-colors hover:text-[#4b5563]"
                  >
                    View all
                  </Link>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {post.relatedPosts.map((item) => (
                    <PostCardUI
                      key={item.id}
                      href={`/newsletter/${item.slug}`}
                      imageUrl={item.image}
                      readTime={estimateReadTime(item.excerpt || item.content)}
                      title={item.title}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </article>

          <aside className="space-y-5 lg:sticky lg:top-8">
            <div className="rounded-[20px] border border-[#e6e9f2] bg-white p-5">
              <p className="text-[0.92rem] font-medium text-[#0b0f18]">Issue stats</p>
              <div className="mt-4 space-y-3 text-[0.92rem] text-[#4b5563]">
                <div className="flex items-center justify-between gap-3">
                  <span>Views</span>
                  <span className="font-medium text-[#0f1118]">
                    {post.viewCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Comments</span>
                  <span className="font-medium text-[#0f1118]">{post.commentCount}</span>
                </div>
              </div>
            </div>

            {post.isLocked && !isPremiumMember ? (
              <ExclusiveAccessCard
                contentLabel="premium newsletter archive"
                isSignedIn={isSignedIn}
                className="p-5"
              />
            ) : (
              <AISummarizeWidget />
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function NewsletterIssuePage({ params }: PageProps) {
  return (
    <Suspense fallback={<NewsletterIssuePageFallback />}>
      <NewsletterIssuePageContent params={params} />
    </Suspense>
  );
}
