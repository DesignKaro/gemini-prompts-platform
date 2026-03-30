import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FaRegComment } from 'react-icons/fa6';
import { Suspense } from 'react';
import { auth } from '../../../auth';
import AISummarizeWidget from '../../components/ai-summarize-widget';
import { AuthorAvatar } from '../../components/author-avatar';
import { ContentViewTracker } from '../../components/content-view-tracker';
import { ExclusiveAccessCard } from '../../components/exclusive-access-card';
import { PostCardUI } from '../../components/post-card';
import { PromptWidgetHydrator } from '../../components/prompt-widget-hydrator';
import { SeoSchemaScripts } from '../../components/seo-schema-script';
import { SocialShareMenu } from '../../components/social-share-menu';
import { Skeleton } from '../../components/ui/skeleton';
import { BlogCommentsSection } from './blog-comments-section';
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

type TocHeading = {
  id: string;
  text: string;
  level: 2 | 3 | 4;
};

function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeTocSource(content: string) {
  // If heading tags already exist, use them directly.
  if (/<h[234][^>]*>/i.test(content)) {
    return content;
  }

  // Fallback for markdown-authored posts: convert ##/###/#### to heading tags.
  const normalized = content.replace(/\r\n?/g, '\n');
  return normalized.replace(/^(#{2,4})\s+(.+?)\s*$/gm, (_, hashes: string, title: string) => {
    const level = Math.min(4, Math.max(2, hashes.length));
    return `<h${level}>${title.trim()}</h${level}>`;
  });
}

function buildContentWithToc(content: string): { html: string; headings: TocHeading[] } {
  const headings: TocHeading[] = [];
  const seenIds = new Map<string, number>();
  const source = normalizeTocSource(content);

  const html = source.replace(
    /<h([234])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (fullMatch, levelRaw, attrs, innerHtml) => {
      const level = Number(levelRaw) as 2 | 3 | 4;
      const text = stripHtml(innerHtml).replace(/\s+/g, ' ').trim();

      if (!text) {
        return fullMatch;
      }

      const existingIdMatch = String(attrs).match(/\sid\s*=\s*["']([^"']+)["']/i);
      let id = existingIdMatch?.[1]?.trim() || '';

      if (!id) {
        const baseId = slugifyHeading(text) || 'section';
        const seen = seenIds.get(baseId) ?? 0;
        id = seen === 0 ? baseId : `${baseId}-${seen + 1}`;
        seenIds.set(baseId, seen + 1);
      }

      headings.push({ id, text, level });

      if (existingIdMatch) {
        return `<h${level}${attrs}>${innerHtml}</h${level}>`;
      }

      return `<h${level}${attrs} id="${id}">${innerHtml}</h${level}>`;
    },
  );

  return { html, headings };
}

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostDetail(slug);
  const settings = await getSeoSettings();

  if (!post) {
    return buildMetadata({
      title: 'Post Not Found',
      description: 'The requested blog post could not be found.',
      path: '/blog',
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
      'A published post synced from the Gemini Prompts dashboard.',
    path: `/blog/${post.slug}`,
    canonicalUrl: post.seoCanonicalUrl || undefined,
    image: post.image,
    type: 'article',
    noIndex: settings.noindexBlogPostPages || Boolean(post.seoNoIndex),
  });
}

function BlogPostPageFallback() {
  return (
    <main className="page-shell bg-white">
      <div className="page-container">
        <nav aria-label="Breadcrumb" className="text-[0.9rem] text-[#8b8f99]">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition-colors hover:text-[#101010]">
                Home
              </Link>
            </li>
            <li className="text-[#c0c6d1]">/</li>
            <li>
              <Link href="/blog" className="transition-colors hover:text-[#101010]">
                Blog
              </Link>
            </li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-8 sm:gap-10 lg:grid-cols-[1fr_340px] lg:items-start">
          <article className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-full" />
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
                <Skeleton className="h-10 w-10 rounded-full" />
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

async function BlogPostPageContent({ params }: PageProps) {
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
  const canonicalUrl = `${baseUrl}/blog/${encodeURIComponent(post.slug)}`;
  const categoryName = getPostCategoryName(post);
  const dateLabel = formatDisplayDate(post.publishedAt || post.updatedAt);
  const readingTime = estimateReadTime(post.content || post.excerpt || '');
  const excerpt = post.excerpt || stripHtml(post.content || '').slice(0, 200);
  const { html: postContentHtml, headings: tableOfContents } = post.content
    ? buildContentWithToc(post.content)
    : { html: '', headings: [] };
  const isSignedIn = Boolean(session?.user?.email);
  const isPremiumMember = session?.user?.plan === 'PREMIUM';
  const shouldNoIndex = seoSettings.noindexBlogPostPages || Boolean(post.seoNoIndex);

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
          { name: 'Blog', item: `${baseUrl}/blog` },
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
      <PromptWidgetHydrator />

      <div className="page-container">
        <nav aria-label="Breadcrumb" className="text-[0.9rem] text-[#8b8f99]">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition-colors hover:text-[#101010]">
                Home
              </Link>
            </li>
            <li className="text-[#c0c6d1]">/</li>
            <li>
              <Link href="/blog" className="transition-colors hover:text-[#101010]">
                Blog
              </Link>
            </li>
            <li className="text-[#c0c6d1]">/</li>
            <li className="font-medium text-[#101010]">{post.title}</li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-8 sm:gap-10 lg:grid-cols-[1fr_340px] lg:items-start">
          <article className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 text-[0.95rem] text-[#6b7382]">
              <span className="rounded-full bg-[#d5ea52] px-4 py-2 text-[0.9rem] font-medium text-[#101010]">
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
                <span className="inline-flex h-10 items-center gap-2 rounded-full border border-[#d8dce2] bg-white px-3.5 text-[0.9rem] text-[#4b5563]">
                  <span className="font-medium text-[#111827]">
                    {post.viewCount.toLocaleString()}
                  </span>
                </span>
                <a
                  href="#comments"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-[#d8dce2] bg-white px-3.5 text-[0.9rem] text-[#4b5563] transition-colors hover:border-[#101010] hover:text-[#111827]"
                  aria-label="Jump to comments"
                >
                  <FaRegComment aria-hidden="true" className="h-[15px] w-[15px] text-[#6b7280]" />
                  <span className="font-medium text-[#111827]">
                    {post.commentCount.toLocaleString()}
                  </span>
                </a>
                <SocialShareMenu
                  shareUrl={canonicalUrl}
                  shareText={`Check out ${post.title} on Gemini Prompts.`}
                />
              </div>
            </div>

            {post.image ? (
              <div className="mt-10 overflow-hidden rounded-[26px] border border-[#e6e9f2]">
                <div
                  role="img"
                  aria-label={`${post.title} cover`}
                  className="relative aspect-[16/9] w-full"
                >
                  <Image
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
                <ExclusiveAccessCard contentLabel="article" isSignedIn={isSignedIn} />
              </div>
            ) : (
              <div className="prose prose-gray mt-12 max-w-none text-[1rem] leading-[1.85] text-[#3f4550] [&_h2]:scroll-mt-28 [&_h3]:scroll-mt-28 [&_h4]:scroll-mt-28">
                {/* eslint-disable-next-line react/no-danger */}
                <div dangerouslySetInnerHTML={{ __html: postContentHtml }} />
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

            {!post.isLocked ? (
              <div className="mt-12">
                <BlogCommentsSection postId={post.id} initialCommentCount={post.commentCount} />
              </div>
            ) : null}

            {post.relatedPosts && post.relatedPosts.length > 0 ? (
              <section className="mt-12">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-[1.55rem] font-medium tracking-[-0.02em] text-[#0b0f18]">
                      Related posts
                    </h2>
                    <p className="mt-2 text-[1rem] leading-[1.75] text-[#5f6773]">
                      More live content from the same category.
                    </p>
                  </div>
                  <Link
                    href="/blog"
                    className="inline-flex h-[42px] items-center justify-center rounded-full bg-[#d5ea52] px-5 text-[0.95rem] font-medium text-[#111111] transition-colors hover:bg-[#c6dc45]"
                  >
                    View all
                  </Link>
                </div>

                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {post.relatedPosts.map((item) => (
                    <PostCardUI
                      key={item.id}
                      href={`/blog/${item.slug}`}
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
            {post.isLocked && !isPremiumMember ? (
              <ExclusiveAccessCard
                contentLabel="premium library"
                isSignedIn={isSignedIn}
                className="p-5"
              />
            ) : (
              <AISummarizeWidget />
            )}

            <section className="rounded-[20px] border border-[#e6e9f2] bg-white">
              <div className="px-5 py-4">
                <p className="text-[0.95rem] font-[500] text-[#0b0f18]">Table of contents</p>
              </div>
              <div className="h-px bg-[#e6e9f2]" />

              <div className="px-5 py-4">
                {!post.isLocked && tableOfContents.length > 0 ? (
                  <nav
                    aria-label="Table of contents"
                    className="no-scrollbar max-h-[280px] overflow-y-auto pr-1"
                  >
                    <ol className="space-y-2.5">
                      {tableOfContents.map((heading, index) => (
                        <li key={`${heading.id}-${index}`}>
                          <a
                            href={`#${heading.id}`}
                            className={`block rounded-[10px] px-2.5 py-2 text-[0.92rem] leading-[1.45] text-[#2f3643] transition-colors hover:bg-[#f5f7fb] hover:text-[#101010] ${
                              heading.level === 3
                                ? 'pl-4 text-[0.9rem] text-[#4b5563]'
                                : heading.level === 4
                                  ? 'pl-7 text-[0.88rem] text-[#667085]'
                                  : ''
                            }`}
                          >
                            {heading.text}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                ) : (
                  <p className="text-[0.88rem] leading-[1.6] text-[#7b8392]">
                    {post.isLocked
                      ? 'Upgrade to unlock the full article outline.'
                      : 'No section headings found in this article yet.'}
                  </p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function BlogPostPage({ params }: PageProps) {
  return (
    <Suspense fallback={<BlogPostPageFallback />}>
      <BlogPostPageContent params={params} />
    </Suspense>
  );
}
