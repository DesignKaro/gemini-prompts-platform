'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaFacebookF,
  FaLink,
  FaPinterestP,
  FaTelegram,
  FaThreads,
  FaXTwitter,
} from 'react-icons/fa6';
import { FiShare2 } from 'react-icons/fi';

type SocialShareMenuProps = {
  shareUrl: string;
  shareText: string;
  align?: 'left' | 'right';
  onShare?: () => void;
};

export function SocialShareMenu({
  shareUrl,
  shareText,
  align = 'right',
  onShare,
}: SocialShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const shareLinks = useMemo(() => {
    if (!shareUrl) return null;
    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      x: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
        shareText,
      )}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
        shareText,
      )}`,
      threads: `https://www.threads.net/intent/post?text=${encodeURIComponent(
        `${shareText} ${shareUrl}`,
      )}`,
      pinterest: `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(
        shareUrl,
      )}&description=${encodeURIComponent(shareText)}`,
    };
  }, [shareText, shareUrl]);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!copied) return;
    const timeoutId = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const openShare = (url: string | undefined) => {
    if (!url) return;
    onShare?.();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const menuPositionClass = align === 'left' ? 'left-0' : 'right-0';

  return (
    <div ref={containerRef} className="relative" data-share-menu>
      <button
        type="button"
        aria-label="Share post"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d8dce2] bg-white text-[#101010] transition-colors hover:border-[#101010]"
      >
        <FiShare2 aria-hidden="true" className="h-[17px] w-[17px]" />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className={`absolute ${menuPositionClass} top-[calc(100%+10px)] z-40 flex max-w-[min(calc(100vw-1.5rem),22rem)] flex-wrap items-center gap-2 rounded-[20px] border border-[#e6e9ef] bg-white px-3 py-2.5 shadow-[0_8px_20px_rgba(15,18,24,0.08)] sm:max-w-none sm:flex-nowrap`}
        >
          <button
            type="button"
            className="group relative flex h-9 w-9 items-center justify-center rounded-full bg-[#1877f2] text-white"
            aria-label="Share on Facebook"
            onClick={() => openShare(shareLinks?.facebook)}
          >
            <FaFacebookF className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-[#d9dde6] bg-white text-[#111111]"
            aria-label="Copy post link"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                onShare?.();
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            <FaLink className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-[#d9dde6] bg-white text-[#111111]"
            aria-label="Share on X"
            onClick={() => openShare(shareLinks?.x)}
          >
            <FaXTwitter className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="group relative flex h-9 w-9 items-center justify-center rounded-full bg-[#2aa4f4] text-white"
            aria-label="Share on Telegram"
            onClick={() => openShare(shareLinks?.telegram)}
          >
            <FaTelegram className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-[#d9dde6] bg-white text-[#111111]"
            aria-label="Share on Threads"
            onClick={() => openShare(shareLinks?.threads)}
          >
            <FaThreads className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="group relative flex h-9 w-9 items-center justify-center rounded-full bg-[#e60023] text-white"
            aria-label="Share on Pinterest"
            onClick={() => openShare(shareLinks?.pinterest)}
          >
            <FaPinterestP className="h-4 w-4" />
          </button>
          {copied ? (
            <span className="ml-1 rounded-full bg-[#0f1116] px-2.5 py-1 text-[0.72rem] text-white">
              Copied
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
