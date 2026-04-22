'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { AuthorAvatar } from '../components/author-avatar';
import { ProgressiveImage } from '../components/progressive-image';

type RelatedPost = {
  id: string;
  title: string;
  tags: string[];
  image: string;
  author: string;
  avatar: string | null;
  avatarUpdatedAt?: string | null;
  date: string;
};

type CategoryPostsSliderProps = {
  posts: RelatedPost[];
};

export default function CategoryPostsSlider({ posts }: CategoryPostsSliderProps) {
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const scrollPosts = (direction: 'prev' | 'next') => {
    const slider = sliderRef.current;
    if (!slider) {
      return;
    }

    const firstCard = slider.querySelector<HTMLElement>('[data-recent-card]');
    const sliderStyles = window.getComputedStyle(slider);
    const gap = Number.parseFloat(sliderStyles.columnGap || sliderStyles.gap || '0');
    const scrollAmount = firstCard
      ? firstCard.offsetWidth + gap
      : Math.round(slider.clientWidth * 0.86);

    slider.scrollBy({
      left: direction === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="overflow-hidden rounded-[34px] bg-[#f6f7f9] px-5 py-8 sm:px-7 sm:py-10 lg:px-8 lg:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="section-heading-medium text-[2rem] leading-[1.15] tracking-[-0.04em] text-[#111111] sm:text-[2.45rem] lg:text-[2.9rem]">
          <span className="text-[#111111]">More posts.</span>{' '}
          <span className="text-[#687082]">You may also be interested in.</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/blog"
            className="rounded-full border border-[#d5d8de] bg-white px-4 py-2 text-[0.9rem] text-[#111111] transition-colors duration-300 hover:border-[#111111] hover:bg-[#111111] hover:text-white sm:px-5 sm:py-2.5 sm:text-[0.96rem]"
          >
            Explore more
          </Link>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              aria-label="Previous posts"
              onClick={() => scrollPosts('prev')}
              className="flex h-[56px] w-[56px] items-center justify-center rounded-full border border-[#d5d8de] text-[#111111] transition-colors duration-300 hover:border-[#111111]"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
                <path
                  d="M15 5.5 8.5 12 15 18.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next posts"
              onClick={() => scrollPosts('next')}
              className="flex h-[56px] w-[56px] items-center justify-center rounded-full border border-[#d5d8de] text-[#111111] transition-colors duration-300 hover:border-[#111111]"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
                <path
                  d="M9 5.5 15.5 12 9 18.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        ref={sliderRef}
        className="no-scrollbar mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:gap-5"
      >
        {posts.map((post) => (
          <article
            key={post.id}
            data-recent-card
            className="relative w-[320px] shrink-0 snap-start overflow-hidden rounded-[22px] border border-[#d8dce2] bg-white sm:w-[360px]"
          >
            <div className="relative aspect-video w-full overflow-hidden">
              <ProgressiveImage
                src={post.image}
                alt={post.title}
                fill
                sizes="(max-width: 640px) 320px, 360px"
                className="object-cover"
              />
              <span className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/10 text-white backdrop-blur-sm">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                  <path
                    d="M14.5 9.5h2.6a3.4 3.4 0 0 1 0 6.8h-2.6"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M9.5 14.5H6.9a3.4 3.4 0 1 1 0-6.8h2.6"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M8.9 12h6.2"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </span>
            </div>

            <div className="relative z-10 -mt-8 px-4 pb-5 sm:px-5 sm:pb-6">
              <div className="rounded-[20px] border border-[#e3e5ea] bg-[#f7f7f8f2] p-5 backdrop-blur-[2px] sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={`${post.id}-${tag}`}
                        className="rounded-full bg-[#e8eaee] px-3 py-1.5 text-[0.95rem] leading-none text-[#171a20]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eaecf0] text-[#4a5568]">
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                        <path
                          d="M12 20.2S4.5 15.6 4.5 10.2a4.2 4.2 0 0 1 7.2-3 4.2 4.2 0 0 1 7.2 3c0 5.4-7.5 10-7.5 10Z"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                    </span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eaecf0] text-[#4a5568]">
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                        <path
                          d="M7.6 4.8h8.8a1.6 1.6 0 0 1 1.6 1.6v12.8L12 15.8l-6 3.4V6.4a1.6 1.6 0 0 1 1.6-1.6Z"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                    </span>
                  </div>
                </div>

                <h3 className="mt-4 text-[1.5rem] leading-[1.12] tracking-[-0.02em] text-[#101217] sm:text-[1.65rem]">
                  {post.title}
                </h3>

                <div className="mt-5 flex items-center gap-3">
                  <AuthorAvatar
                    name={post.author}
                    avatarUrl={post.avatar}
                    avatarUpdatedAt={post.avatarUpdatedAt}
                    className="h-11 w-11"
                    initialClassName="text-[0.86rem]"
                  />
                  <p className="text-[1.08rem] leading-none text-[#161a22]">{post.author}</p>
                </div>

                <p className="mt-3 text-[1rem] leading-none text-[#5f6778]">{post.date}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
