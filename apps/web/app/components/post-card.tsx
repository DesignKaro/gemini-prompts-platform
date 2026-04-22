import type { ElementType } from 'react';
import Link from 'next/link';
import { resolvePostImage } from '../../lib/content-image-fallbacks';
import { ProgressiveImage } from './progressive-image';

type PostCardUIProps = {
  title: string;
  href: string;
  imageUrl?: string | null;
  imageFallbackKey?: string;
  readTime: string;
  className?: string;
  titleTag?: 'h2' | 'h3';
};

export function PostCardUI({
  title,
  href,
  imageUrl,
  imageFallbackKey,
  readTime,
  className,
  titleTag = 'h3',
}: PostCardUIProps) {
  const TitleTag = titleTag as ElementType;

  return (
    <article
      className={className ? `flex h-full flex-col ${className}` : 'flex h-full flex-col'}
      data-post-card
    >
      <Link
        href={href}
        className="group flex h-full flex-col rounded-[20px] border border-[#eceff4] bg-white p-2.5 transition-colors duration-300 hover:border-[#e1e6ee] hover:bg-[#f2f4f7]"
      >
        <div
          role="img"
          aria-label={`${title} featured`}
          className="relative aspect-[16/9] w-full overflow-hidden rounded-[20px]"
        >
          <ProgressiveImage
            src={resolvePostImage(imageUrl, imageFallbackKey || href || title)}
            alt={title}
            fill
            sizes="(max-width: 640px) 94vw, (max-width: 1024px) 46vw, 31vw"
            loading="lazy"
            decoding="async"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/12 via-transparent to-transparent transition-opacity duration-300 group-hover:opacity-70" />
        </div>

        <TitleTag className="ml-3 mt-4 text-[1.05rem] leading-[1.28] tracking-[-0.018em] text-[#0b0f18] sm:text-[1.15rem]">
          {title}
        </TitleTag>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2.5 pt-5">
          <span className="inline-flex rounded-[9px] bg-[#f2f4f7] px-2.5 py-1 text-[0.82rem] font-normal text-[#10141d]">
            {readTime}
          </span>
          <span className="inline-flex rounded-full bg-[#d5ea52] px-3 py-1 text-[0.78rem] font-normal text-[#0f1116] transition-colors duration-300 group-hover:bg-[#c6dc45]">
            Read more
          </span>
        </div>
      </Link>
    </article>
  );
}
