'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { DEFAULT_BLUR_DATA_URL } from '../../lib/image-placeholders';

type NextImageProps = ComponentProps<typeof Image>;

export type ProgressiveImageProps = Omit<NextImageProps, 'placeholder' | 'blurDataURL'> & {
  containerClassName?: string;
  showGlassLoading?: boolean;
  blurDataURL?: string;
};

export function ProgressiveImage({
  src,
  alt,
  className,
  containerClassName,
  fill,
  onLoad,
  onError,
  showGlassLoading = true,
  blurDataURL = DEFAULT_BLUR_DATA_URL,
  ...imageProps
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsLoaded(false);

    const frame = window.requestAnimationFrame(() => {
      const image = wrapperRef.current?.querySelector('img');
      if (image?.complete && (image.naturalWidth > 0 || image.currentSrc)) {
        setIsLoaded(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [src]);

  const imageClassName = [
    className,
    'transition-[filter,transform,opacity] duration-300 ease-out motion-reduce:transition-none',
    isLoaded ? 'scale-100 opacity-100 blur-0' : 'scale-[1.015] opacity-90 blur-[10px]',
  ]
    .filter(Boolean)
    .join(' ');

  const overlayClassName = [
    'pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out motion-reduce:transition-none',
    isLoaded || !showGlassLoading ? 'opacity-0' : 'opacity-100',
  ]
    .filter(Boolean)
    .join(' ');

  const wrapperClassName = [fill ? 'absolute inset-0' : 'relative block', containerClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={wrapperRef} className={wrapperClassName}>
      <Image
        {...imageProps}
        src={src}
        alt={alt}
        fill={fill}
        placeholder="blur"
        blurDataURL={blurDataURL}
        onLoad={(event) => {
          setIsLoaded(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          setIsLoaded(true);
          onError?.(event);
        }}
        className={imageClassName}
      />

      {showGlassLoading ? (
        <span
          aria-hidden="true"
          data-progressive-image-overlay=""
          data-state={isLoaded ? 'loaded' : 'loading'}
          className={overlayClassName}
        >
          <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0.16)_48%,rgba(232,236,243,0.12)_100%)] backdrop-blur-[10px]" />
          <span className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/32 via-white/14 to-transparent" />
        </span>
      ) : null}
    </div>
  );
}
