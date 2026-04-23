'use client';

import { useEffect, useId, useState } from 'react';

const WORD_LIMIT = 100;

function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

type CategoryDescriptionPreviewProps = {
  text: string;
  categoryName: string;
};

export function CategoryDescriptionPreview({
  text,
  categoryName,
}: CategoryDescriptionPreviewProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const words = splitWords(text);
  const needsTruncate = words.length > WORD_LIMIT;
  const previewText = needsTruncate ? words.slice(0, WORD_LIMIT).join(' ') : text;

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!needsTruncate) {
    return (
      <p className="mt-3 max-w-full whitespace-pre-line text-[1.05rem] leading-[1.7] text-[#5f6773]">
        {text}
      </p>
    );
  }

  return (
    <>
      <div className="mt-3 max-w-full">
        <div className="relative">
          <p className="whitespace-pre-line text-[1.05rem] leading-[1.7] text-[#5f6773]">
            {previewText}
          </p>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent"
            aria-hidden
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex items-center rounded-full bg-[#d5ea52] px-5 py-2.5 text-[0.95rem] font-medium text-black transition-all hover:translate-y-[-1px] hover:opacity-95"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          Read more
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-3 py-6 sm:px-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="no-scrollbar relative max-h-[min(80vh,720px)] w-full max-w-[640px] overflow-y-auto rounded-[20px] bg-white p-6 shadow-2xl sm:rounded-[24px] sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[#e1e5ee] text-[#6a7280] transition-colors hover:border-[#0f1116] hover:text-[#0f1116]"
              aria-label="Close description"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <h2
              id={titleId}
              className="pr-10 text-[1.25rem] font-medium tracking-[-0.02em] text-[#0f1116] sm:text-[1.4rem]"
            >
              {categoryName}
            </h2>
            <p className="mt-4 whitespace-pre-line text-[1.05rem] leading-[1.7] text-[#5f6773]">
              {text}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
