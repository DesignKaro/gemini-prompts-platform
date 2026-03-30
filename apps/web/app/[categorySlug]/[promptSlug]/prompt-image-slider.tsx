'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type PromptImageSliderProps = {
  title: string;
  images: string[];
};

export function PromptImageSlider({ title, images }: PromptImageSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = images.length;

  useEffect(() => {
    if (activeIndex >= total) {
      setActiveIndex(0);
    }
  }, [activeIndex, total]);

  if (total === 0) {
    return null;
  }

  const currentImage = images[activeIndex] ?? images[0] ?? null;
  if (!currentImage) {
    return null;
  }

  const hasMultipleImages = total > 1;

  return (
    <div className="mt-10">
      <div
        role="img"
        aria-label={`${title} cover`}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-[18px] border border-[#eceff5] bg-[#f5f7fb]"
      >
        <Image
          src={currentImage}
          alt={`${title} cover`}
          fill
          sizes="(max-width: 1024px) 100vw, 70vw"
          priority
          className="object-cover"
        />
      </div>

      {hasMultipleImages ? (
        <div className="mt-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={`prompt-image-thumb-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show image ${index + 1}`}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-[10px] border-2 transition-colors ${
                    isActive ? 'border-[#111111]' : 'border-[#dce2ee] hover:border-[#9aa5b7]'
                  }`}
                >
                  <Image
                    src={image}
                    alt={`${title} thumbnail ${index + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
