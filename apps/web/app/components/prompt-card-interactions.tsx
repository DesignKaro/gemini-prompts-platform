'use client';

import Link from 'next/link';
import { usePromptInteractions } from './prompt-interactions/use-prompt-interactions';

type PromptCardInteractionsProps = {
  promptId: string;
  promptHref: string;
  title: string;
  initialLikeCount: number;
  initialSaveCount: number;
  initialCommentCount: number;
  showReadTime?: boolean;
};

export function PromptCardInteractions({
  promptId,
  promptHref,
  title,
  initialLikeCount,
  initialSaveCount,
  initialCommentCount,
  showReadTime = true,
}: PromptCardInteractionsProps) {
  const {
    likeCount,
    commentCount,
    likedByIp,
    savedByUser,
    likePending,
    savePending,
    likePrompt,
    toggleSavePrompt,
  } = usePromptInteractions({
    promptId,
    initialLikeCount,
    initialSaveCount,
    initialCommentCount,
    syncAnonymousStatus: true,
  });

  return (
    <div className="mt-auto pt-5">
      <div className="flex items-center justify-between gap-4 text-[#374151]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void likePrompt()}
              disabled={likedByIp || likePending}
              aria-label={likedByIp ? 'Liked' : 'Like prompt'}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-[#4b5563] transition-colors ${
                likedByIp
                  ? 'bg-[#ffecef] text-[#e11d48] hover:bg-[#ffdfe5]'
                  : 'bg-[#f3f4f6] hover:bg-[#e5e7eb]'
              } disabled:cursor-not-allowed disabled:opacity-80`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
                <path
                  d="M12 20.2S4.5 15.6 4.5 10.2a4.2 4.2 0 0 1 7.2-3 4.2 4.2 0 0 1 7.2 3c0 5.4-7.5 10-7.5 10Z"
                  fill={likedByIp ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
            <span className="text-[0.92rem] font-[400] leading-none text-[#0f1118] sm:text-[0.95rem]">
              {likeCount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`${promptHref}#comments`}
              aria-label={`View comments for ${title}`}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-[#4b5563] transition-colors hover:bg-[#e5e7eb]"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
                <path
                  d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </Link>
            <span className="text-[0.92rem] font-[400] leading-none text-[#0f1118] sm:text-[0.95rem]">
              {commentCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showReadTime ? (
            <span className="text-[0.86rem] font-[400] leading-none text-[#445064] sm:text-[0.9rem]">
              3-4 minutes
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void toggleSavePrompt()}
            disabled={savePending}
            aria-label={savedByUser ? 'Unsave prompt' : 'Save prompt'}
            aria-pressed={savedByUser}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-[#4b5563] transition-colors ${
              savedByUser ? 'bg-[#111111] text-white' : 'bg-[#f3f4f6] hover:bg-[#e5e7eb]'
            } disabled:cursor-not-allowed disabled:opacity-80`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
              <path
                d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
                fill={savedByUser ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
