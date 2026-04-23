import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '../../../auth';
import AISummarizeWidget from '../../components/ai-summarize-widget';
import { AuthorAvatar } from '../../components/author-avatar';
import { ContentViewTracker } from '../../components/content-view-tracker';
import { ExclusiveAccessCard } from '../../components/exclusive-access-card';
import { NewsletterSubscribeForm } from '../../components/newsletter-subscribe-form';
import { PromptCardServer } from '../../components/prompt-card-server';
import { SeoSchemaScripts } from '../../components/seo-schema-script';
import { Skeleton } from '../../components/ui/skeleton';
import {
  formatDisplayDate,
  getPromptDetail,
  getPromptCategoryName,
  stripHtml,
} from '../../../lib/public-content';
import { buildMetadata, getNormalizedBaseUrl, getSeoSettings } from '../../../lib/seo';
import {
  buildBreadcrumbSchema,
  buildPromptSchema,
  buildWebPageSchema,
} from '../../../lib/structured-data';
import {
  PromptMobileBar,
  PromptCommentsSection,
  PromptPrimaryActions,
  PromptVariableComposer,
} from './prompt-client';
import { PromptContentSection } from './prompt-content-section';
import { PromptWidgetHydrator } from '../../components/prompt-widget-hydrator';

type PageProps = {
  params: Promise<{
    categorySlug: string;
    promptSlug: string;
  }>;
};

function humanizeVariable(key: string) {
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractTemplateVariables(template: string) {
  const matches = Array.from(template.matchAll(/{{\s*([a-zA-Z0-9_-]+)\s*}}/g));
  const keys = Array.from(
    new Set(
      matches
        .map((match) => match[1])
        .filter((key): key is string => typeof key === 'string' && key.length > 0),
    ),
  );

  return keys.map((key) => ({
    key,
    label: humanizeVariable(key),
    placeholder: `Fill ${humanizeVariable(key).toLowerCase()}`,
  }));
}

function isHtmlContent(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function buildPromptImageSlides(prompt: { image: string | null; galleryImages?: string[] | null }) {
  const seen = new Set<string>();
  const ordered = [prompt.image, ...(prompt.galleryImages ?? [])];
  const slides: string[] = [];

  for (const image of ordered) {
    if (typeof image !== 'string' || image.trim().length === 0) {
      continue;
    }
    if (seen.has(image)) {
      continue;
    }
    seen.add(image);
    slides.push(image);
  }

  return slides;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { promptSlug } = await params;
  const prompt = await getPromptDetail(promptSlug);

  if (!prompt) {
    return buildMetadata({
      title: 'Prompt Not Found',
      description: 'The requested prompt could not be found.',
      path: '/',
      noIndex: true,
    });
  }

  const categorySlug =
    prompt.primaryCategory?.slug || prompt.categories[0]?.slug || 'uncategorized';
  const title = prompt.metaTitle || prompt.seoTitle || prompt.title;
  const description =
    prompt.metaDescription ||
    prompt.seoDescription ||
    (prompt.isLocked ? null : prompt.description) ||
    stripHtml(prompt.content || '').slice(0, 160) ||
    'A published prompt synced from the Gemini Prompts dashboard.';
  const image = prompt.image || prompt.galleryImages[0] || null;

  return buildMetadata({
    title,
    description,
    path: `/${categorySlug}/${prompt.slug}`,
    canonicalUrl: prompt.seoCanonicalUrl || undefined,
    image,
    noIndex: Boolean(prompt.seoNoIndex),
  });
}

function PromptDetailPageFallback() {
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
              <span className="font-medium text-[#101010]">Prompt</span>
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
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </div>
            <Skeleton className="mt-10 aspect-[16/9] w-full rounded-[26px]" />
            <Skeleton className="mt-12 h-64 w-full rounded-[20px]" />
          </article>

          <aside className="space-y-5 lg:sticky lg:top-8">
            <Skeleton className="h-48 w-full rounded-[20px]" />
            <Skeleton className="h-64 w-full rounded-[20px]" />
          </aside>
        </div>
      </div>
    </main>
  );
}

async function PromptDetailPageContent({ params }: PageProps) {
  const { promptSlug, categorySlug: requestedCategorySlug } = await params;
  const seoSettings = await getSeoSettings();
  const session = await auth();
  const prompt = await getPromptDetail(promptSlug, {
    accessToken: session?.apiAccessToken ?? null,
    noStore: Boolean(session?.apiAccessToken),
  });

  if (!prompt) {
    notFound();
  }

  const baseUrl = getNormalizedBaseUrl(seoSettings);
  const categorySlug =
    prompt.primaryCategory?.slug || prompt.categories[0]?.slug || 'uncategorized';
  if (requestedCategorySlug !== categorySlug) {
    permanentRedirect(`/${encodeURIComponent(categorySlug)}/${encodeURIComponent(prompt.slug)}`);
  }
  const canonicalUrl = `${baseUrl}/${categorySlug}/${prompt.slug}`;
  const promptText = prompt.isLocked ? '' : stripHtml(prompt.content || prompt.description || '');
  const categoryName = getPromptCategoryName(prompt);
  const dateLabel = formatDisplayDate(prompt.publishedAt || prompt.updatedAt);
  const hasHtmlContent = !prompt.isLocked && isHtmlContent(prompt.content || '');
  const templateVariables = prompt.isLocked ? [] : extractTemplateVariables(promptText);
  const isSignedIn = Boolean(session?.user?.email);
  const isPremiumMember = session?.user?.plan === 'PREMIUM';
  const promptImageSlides = buildPromptImageSlides(prompt);
  const shouldNoIndex = Boolean(prompt.seoNoIndex);

  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: canonicalUrl,
        name: prompt.title,
        description:
          prompt.description ||
          (prompt.isLocked
            ? 'Members-only prompt details are locked on this page.'
            : 'A published prompt synced from the Gemini Prompts dashboard.'),
        keywords: [
          categoryName,
          prompt.promptType,
          prompt.visibility,
          ...prompt.tags.map((tag) => tag.name),
        ],
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: categoryName, item: `${baseUrl}/${categorySlug}` },
          { name: prompt.title, item: canonicalUrl },
        ],
        canonicalUrl,
      ),
    },
    {
      family: 'prompt' as const,
      schema: buildPromptSchema({
        url: canonicalUrl,
        title: prompt.title,
        description: prompt.description,
        publishedAt: prompt.publishedAt,
        updatedAt: prompt.updatedAt,
        authorName: prompt.author.name,
        categoryName,
        promptType: prompt.promptType,
        visibility: prompt.visibility,
        tags: prompt.tags.map((tag) => tag.name),
        image: prompt.image || prompt.galleryImages[0] || null,
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <main className="page-shell bg-white">
      <SeoSchemaScripts items={schemaItems} noIndex={shouldNoIndex} />
      <ContentViewTracker target="prompt" contentId={prompt.id} />
      <PromptWidgetHydrator />

      {!prompt.isLocked ? (
        <PromptMobileBar
          promptId={prompt.id}
          title={prompt.title}
          promptText={promptText}
          shareUrl={canonicalUrl}
          initialLikeCount={prompt.likeCount}
          initialSaveCount={prompt.saveCount}
          initialCommentCount={prompt.commentCount}
        />
      ) : null}

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
              <Link href={`/${categorySlug}`} className="transition-colors hover:text-[#101010]">
                {categoryName}
              </Link>
            </li>
            <li className="text-[#c0c6d1]">/</li>
            <li className="font-medium text-[#101010]">{prompt.title}</li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-8 sm:gap-10 lg:grid-cols-[1fr_340px] lg:items-start">
          <article className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 text-[0.95rem] text-[#6b7382]">
              <span className="rounded-full bg-[#d5ea52] px-4 py-2 text-[0.9rem] font-medium text-black">
                {categoryName}
              </span>
              <span
                className={`rounded-full px-4 py-2 text-[0.82rem] font-medium ${
                  prompt.visibility === 'EXCLUSIVE'
                    ? 'bg-[#d5ea52] text-black'
                    : 'bg-[#eef2f7] text-[#455065]'
                }`}
              >
                {prompt.visibility === 'EXCLUSIVE' ? 'Exclusive' : 'Free'}
              </span>
              <span aria-hidden="true" className="text-[#c0c6d1]">
                •
              </span>
              <time dateTime={prompt.publishedAt || prompt.updatedAt}>Updated {dateLabel}</time>
            </div>

            <h1 className="section-heading-medium mt-5 text-[2.3rem] leading-[1.05] tracking-[-0.05em] text-[#111118] sm:text-[2.9rem]">
              {prompt.title}
            </h1>
            <p className="mt-5 max-w-[50rem] text-[1.08rem] leading-[1.75] text-[#5f6773]">
              {prompt.isLocked
                ? 'This prompt preview is visible to everyone. Unlock membership to read the full prompt details.'
                : prompt.description || 'A live prompt synced from the dashboard.'}
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
              <Link href={`/u/${prompt.author.slug}`} className="flex items-center gap-3">
                <AuthorAvatar
                  name={prompt.author.name}
                  avatarUrl={prompt.author.avatarUrl}
                  avatarUpdatedAt={prompt.author.avatarUpdatedAt}
                  className="h-10 w-10"
                  initialClassName="text-[0.88rem]"
                />
                <div>
                  <p className="text-[0.95rem] font-medium leading-none text-[#0f1118]">
                    {prompt.author.name}
                  </p>
                  <p className="mt-1 text-[0.86rem] leading-none text-[#6b7280]">
                    {prompt.author.profileTitle || 'Prompt creator'}
                  </p>
                </div>
              </Link>

              {prompt.isLocked ? (
                <Link
                  href="/membership"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#d5ea52] px-5 text-[0.92rem] font-medium text-black transition-colors hover:bg-[#c5db42]"
                >
                  Unlock Exclusive
                </Link>
              ) : (
                <PromptPrimaryActions
                  promptId={prompt.id}
                  title={prompt.title}
                  promptText={promptText}
                  shareUrl={canonicalUrl}
                  initialLikeCount={prompt.likeCount}
                  initialSaveCount={prompt.saveCount}
                  initialCommentCount={prompt.commentCount}
                />
              )}
            </div>

            <div className="mt-12 space-y-10">
              <PromptContentSection
                title={prompt.title}
                promptImageSlides={promptImageSlides}
                isLocked={prompt.isLocked}
                isSignedIn={isSignedIn}
                hasHtmlContent={hasHtmlContent}
                promptText={promptText}
                promptContent={prompt.content}
              />

              {!prompt.isLocked && templateVariables.length > 0 ? (
                <PromptVariableComposer template={promptText} variables={templateVariables} />
              ) : null}

              {prompt.tags.length > 0 ? (
                <section className="scroll-mt-24">
                  <h2 className="text-[1.55rem] font-medium tracking-[-0.02em] text-[#0b0f18]">
                    Tags
                  </h2>
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {prompt.tags.map((tag) => (
                      <Link
                        key={tag.id}
                        href={`/tag/${tag.slug}`}
                        className="rounded-full bg-[#f1f3f8] px-4 py-2 text-[0.88rem] text-[#2f3440] transition-colors hover:bg-[#e7ebf2]"
                      >
                        {tag.name}
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              <PromptCommentsSection
                promptId={prompt.id}
                initialCommentCount={prompt.commentCount}
                readOnly={prompt.isLocked}
              />

              {prompt.relatedPrompts && prompt.relatedPrompts.length > 0 ? (
                <section className="scroll-mt-24">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <h2 className="text-[1.55rem] font-medium tracking-[-0.02em] text-[#0b0f18]">
                        Related prompts
                      </h2>
                      <p className="mt-2 text-[1rem] leading-[1.75] text-[#5f6773]">
                        More live prompts from the same content graph.
                      </p>
                    </div>
                    <Link
                      href="/prompts"
                      className="inline-flex items-center rounded-full bg-[#d5ea52] px-5 py-2 text-[0.95rem] font-medium text-black transition-colors hover:bg-[#c5db42]"
                    >
                      View all
                    </Link>
                  </div>

                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    {prompt.relatedPrompts.map((item) => (
                      <PromptCardServer key={item.id} prompt={item} />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </article>

          <aside className="space-y-5 lg:sticky lg:top-8">
            <section className="relative overflow-hidden rounded-[24px] border border-[#2a3546] bg-[radial-gradient(120%_120%_at_0%_0%,#1a2a3f_0%,#101827_52%,#0a111d_100%)] p-6">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-[#d5ea52]/15 blur-2xl"
              />
              <p className="inline-flex rounded-full border border-[#33465f] bg-[#111c2c] px-3 py-1 text-[0.72rem] font-medium uppercase tracking-[0.12em] text-[#d9e6f2]">
                Newsletter
              </p>
              <h3 className="mt-4 text-[1.45rem] font-medium leading-[1.18] tracking-[-0.02em] text-[#f7fbff]">
                Get weekly prompt drops in your inbox.
              </h3>
              <p className="mt-2 text-[0.9rem] leading-[1.7] text-[#afc0d3]">
                One concise email with high-signal prompts and implementation notes.
              </p>
              <NewsletterSubscribeForm
                source="prompt_sidebar"
                inputId="prompt-sidebar-newsletter-email"
                className="mt-4"
                fieldGroupClassName="flex flex-col gap-2.5"
                inputClassName="h-12 w-full rounded-[14px] border border-[#30445f] bg-[#0e1827] px-4 text-[0.92rem] text-[#f5f8ff] outline-none transition placeholder:text-[#8596ad] focus:border-[#d5ea52] focus:ring-2 focus:ring-[#d5ea52]/25"
                buttonClassName="inline-flex h-12 items-center justify-center rounded-[14px] bg-white px-5 text-[0.98rem] font-semibold text-[#0d1420] transition-colors hover:bg-[#eef2f8]"
                successClassName="mt-2 text-[0.78rem] text-[#c7f9d9]"
                errorClassName="mt-2 text-[0.78rem] text-[#ffd4d4]"
              />
              <p className="mt-2 text-[0.78rem] text-[#8fa4ba]">Unsubscribe anytime.</p>
            </section>

            {prompt.isLocked && !isPremiumMember ? (
              <ExclusiveAccessCard
                contentLabel="premium library"
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

export default function PromptDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<PromptDetailPageFallback />}>
      <PromptDetailPageContent params={params} />
    </Suspense>
  );
}
