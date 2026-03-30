import Image from 'next/image';
import Link from 'next/link';
import {
  formatDisplayDate,
  getPromptCategoryName,
  type PublicPrompt,
} from '../../lib/public-content';
import { resolvePromptImage } from '../../lib/content-image-fallbacks';
import { PromptCardInteractions } from './prompt-card-interactions';

type PromptCardServerProps = {
  prompt: PublicPrompt;
  showReadTime?: boolean;
};

export function PromptCardServer({ prompt, showReadTime = true }: PromptCardServerProps) {
  const categoryName = getPromptCategoryName(prompt);
  const categorySlug = prompt.primaryCategory?.slug || prompt.categories[0]?.slug || null;
  const isExclusive = prompt.visibility === 'EXCLUSIVE';
  const promptHref = categorySlug ? `/${categorySlug}/${prompt.slug}` : `/prompt/${prompt.slug}`;
  const dateSource = prompt.publishedAt || prompt.updatedAt;
  const dateLabel = formatDisplayDate(dateSource);
  const dateArchiveKey = dateSource
    ? (() => {
        const parsedDate = new Date(dateSource);
        if (Number.isNaN(parsedDate.getTime())) return null;
        return parsedDate.toISOString().slice(0, 10);
      })()
    : null;
  const dateArchiveHref = dateArchiveKey ? `/prompt/date/${dateArchiveKey}` : null;

  return (
    <article className="flex h-full flex-col rounded-[24px] bg-transparent">
      <div
        role="img"
        aria-label={prompt.title}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-[24px]"
      >
        <Image
          src={resolvePromptImage(prompt.image, prompt.slug || prompt.id)}
          alt={prompt.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          unoptimized
          className="object-cover"
        />
        <Link
          href={promptHref}
          aria-label={`Open prompt: ${prompt.title}`}
          className="absolute inset-0 z-10"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 z-[1] bg-gradient-to-b from-black/20 via-black/5 to-transparent"
        />
        {categorySlug ? (
          <Link
            href={`/${categorySlug}`}
            className="absolute left-4 top-4 z-20 inline-flex h-9 items-center rounded-full bg-white/95 px-4 text-[0.78rem] font-[500] leading-none text-[#0b0f18] transition-colors hover:bg-white"
          >
            {categoryName}
          </Link>
        ) : (
          <span className="absolute left-4 top-4 z-20 inline-flex h-9 items-center rounded-full bg-white/95 px-4 text-[0.78rem] font-[500] leading-none text-[#0b0f18]">
            {categoryName}
          </span>
        )}
        {isExclusive ? (
          <span className="absolute right-4 top-4 z-20 inline-flex h-9 items-center rounded-full bg-[#d5ea52] px-4 text-[0.78rem] font-[500] leading-none text-black">
            Exclusive
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-4 sm:px-2">
        <Link href={promptHref} className="block">
          <h3 className="text-[1.12rem] leading-[1.3] tracking-[-0.015em] text-[#0f1118] sm:text-[1.2rem]">
            {prompt.title}
          </h3>
        </Link>

        <div className="mt-3 flex items-center gap-3 text-[0.95rem] text-[#6b7382] sm:text-[1rem]">
          {dateArchiveHref && dateLabel ? (
            <Link
              href={dateArchiveHref}
              className="transition-colors hover:text-[#111827]"
              aria-label={`View prompts published on ${dateLabel}`}
            >
              {dateLabel}
            </Link>
          ) : (
            <span>{dateLabel}</span>
          )}
        </div>

        <PromptCardInteractions
          promptId={prompt.id}
          promptHref={promptHref}
          title={prompt.title}
          initialLikeCount={prompt.likeCount}
          initialSaveCount={prompt.saveCount}
          initialCommentCount={prompt.commentCount}
          showReadTime={showReadTime}
        />
      </div>
    </article>
  );
}
