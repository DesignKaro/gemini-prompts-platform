import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '../../../auth';
import AISummarizeWidget from '../../components/ai-summarize-widget';
import { AuthorAvatar } from '../../components/author-avatar';
import { ContentViewTracker } from '../../components/content-view-tracker';
import { ExclusiveAccessCard } from '../../components/exclusive-access-card';
import { PromptCardUI } from '../../components/prompt-listing';
import {
  formatDisplayDate,
  getPromptDetail,
  getPromptCategoryName,
  stripHtml,
} from '../../../lib/public-content';
import {
  PromptMobileBar,
  PromptCommentsSection,
  PromptPrimaryActions,
  PromptVariableComposer,
} from './prompt-client';
import { PromptWidgetHydrator } from '../../components/prompt-widget-hydrator';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function humanizeVariable(key: string) {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const prompt = await getPromptDetail(slug);

  if (!prompt) {
    return {
      title: 'Prompt Not Found — Gemini Prompts',
    };
  }

  return {
    title: `${prompt.seoTitle || prompt.title} — Gemini Prompts`,
    description:
      prompt.seoDescription ||
      prompt.description ||
      'A published prompt synced from the Gemini Prompts dashboard.',
  };
}

export default async function PromptDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();
  const prompt = await getPromptDetail(slug, {
    accessToken: session?.apiAccessToken ?? null,
    noStore: Boolean(session?.apiAccessToken),
  });

  if (!prompt) {
    notFound();
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const canonicalUrl = `${baseUrl}/prompt/${encodeURIComponent(prompt.slug)}`;
  const promptText = prompt.isLocked ? '' : stripHtml(prompt.content || prompt.description || '');
  const categoryName = getPromptCategoryName(prompt);
  const dateLabel = formatDisplayDate(prompt.publishedAt || prompt.updatedAt);
  const hasHtmlContent = !prompt.isLocked && isHtmlContent(prompt.content || '');
  const templateVariables = prompt.isLocked ? [] : extractTemplateVariables(promptText);
  const isSignedIn = Boolean(session?.user?.email);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Prompts', item: `${baseUrl}/prompt` },
      { '@type': 'ListItem', position: 3, name: prompt.title, item: canonicalUrl },
    ],
  };

  const creativeWorkSchema = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: prompt.title,
    genre: 'Prompt',
    url: canonicalUrl,
    keywords: [
      categoryName,
      ...prompt.tags.map((tag) => tag.name),
      prompt.promptType,
      prompt.visibility,
    ],
    creator: { '@type': 'Person', name: prompt.author.name },
  };

  return (
    <main className="page-shell bg-white">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(creativeWorkSchema) }}
      />
      <ContentViewTracker target="prompt" contentId={prompt.id} />
      <PromptWidgetHydrator />

      {!prompt.isLocked ? (
        <PromptMobileBar title={prompt.title} promptText={promptText} shareUrl={canonicalUrl} />
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
              <Link href="/prompt" className="transition-colors hover:text-[#101010]">
                Prompts
              </Link>
            </li>
            <li className="text-[#c0c6d1]">/</li>
            <li className="font-medium text-[#101010]">{prompt.title}</li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-8 sm:gap-10 lg:grid-cols-[1fr_340px] lg:items-start">
          <article className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 text-[0.95rem] text-[#6b7382]">
              <span className="rounded-full bg-[#d5ea52] px-4 py-2 text-[0.9rem] font-medium text-[#111111]">
                {categoryName}
              </span>
              <span
                className={`rounded-full px-4 py-2 text-[0.82rem] font-medium ${
                  prompt.visibility === 'EXCLUSIVE'
                    ? 'bg-[#111111] text-white'
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
              {prompt.description || 'A live prompt synced from the dashboard.'}
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
              <Link
                href={`/author/${prompt.author.slug}`}
                className="flex items-center gap-3"
              >
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
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#111111] px-5 text-[0.92rem] font-medium text-white transition-colors hover:bg-black"
                >
                  Unlock with premium
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

            {prompt.image ? (
              <div className="mt-10 overflow-hidden rounded-[26px] border border-[#e6e9f2]">
                <div role="img" aria-label={`${prompt.title} cover`} className="relative aspect-[16/9] w-full">
                  <Image
                    src={prompt.image}
                    alt={`${prompt.title} cover`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 70vw"
                    className="object-cover"
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-12 space-y-10">
              <section className="scroll-mt-24">
                <h2 className="text-[1.55rem] font-medium tracking-[-0.02em] text-[#0b0f18]">
                  Prompt
                </h2>
                <p className="mt-4 text-[1.02rem] leading-[1.85] text-[#3f4550]">
                  Copy it directly or customize the placeholders before sending it to your model.
                </p>

                {prompt.isLocked ? (
                  <div className="mt-6">
                    <ExclusiveAccessCard contentLabel="prompt" isSignedIn={isSignedIn} />
                  </div>
                ) : hasHtmlContent ? (
                  <div
                    className="prose prose-gray mt-6 max-w-none rounded-[18px] border border-[#e6e9f2] bg-white p-6"
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: prompt.content || '' }}
                  />
                ) : (
                  <pre className="mt-6 overflow-x-auto rounded-[18px] bg-[#0b0f18] p-5 text-[0.92rem] leading-[1.7] text-[#f8fafc]">
                    <code>{promptText}</code>
                  </pre>
                )}
              </section>

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

              {!prompt.isLocked ? (
                <PromptCommentsSection
                  promptId={prompt.id}
                  initialCommentCount={prompt.commentCount}
                />
              ) : null}

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
                      href="/prompt"
                      className="inline-flex items-center rounded-full bg-[#d5ea52] px-5 py-2 text-[0.95rem] font-medium text-[#111111] transition-colors hover:bg-[#c5db42]"
                    >
                      View all
                    </Link>
                  </div>

                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    {prompt.relatedPrompts.map((item) => (
                      <PromptCardUI key={item.id} prompt={item} />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </article>

          <aside className="space-y-5 lg:sticky lg:top-8">
            <div className="rounded-[20px] border border-[#e6e9f2] bg-white p-5">
              <p className="text-[0.92rem] font-medium text-[#0b0f18]">At a glance</p>
              <div className="mt-4 space-y-3 text-[0.92rem] text-[#4b5563]">
                <div className="flex items-center justify-between gap-3">
                  <span>Type</span>
                  <span className="font-medium text-[#0f1118]">{prompt.promptType}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Views</span>
                  <span className="font-medium text-[#0f1118]">
                    {prompt.viewCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Likes</span>
                  <span className="font-medium text-[#0f1118]">
                    {prompt.likeCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Comments</span>
                  <span className="font-medium text-[#0f1118]">{prompt.commentCount}</span>
                </div>
              </div>
            </div>

            {prompt.isLocked ? (
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
