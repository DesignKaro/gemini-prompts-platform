'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AdsenseManualSlotName,
  getAdsenseManualSlot,
  getDefaultAdsensePublisherId,
  readAdsensePublisherIdFromDom,
} from '../../lib/adsense';

declare global {
  interface Window {
    adsbygoogle?: { push: (value: Record<string, never>) => number } | unknown[];
  }
}

type AdsenseManualUnitProps = {
  slotName: AdsenseManualSlotName;
  className?: string;
  reserveHeightClassName?: string;
  format?: 'auto' | 'fluid' | 'autorelaxed';
  layout?: 'in-article';
  fullWidthResponsive?: boolean;
  label?: string;
};

function joinClasses(...values: Array<string | null | undefined | false>) {
  return values.filter(Boolean).join(' ');
}

export function AdsenseManualUnit({
  slotName,
  className,
  reserveHeightClassName = 'min-h-[250px]',
  format = 'auto',
  layout,
  fullWidthResponsive = true,
  label = 'Advertisement',
}: AdsenseManualUnitProps) {
  const slot = getAdsenseManualSlot(slotName);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const adRef = useRef<HTMLModElement | null>(null);
  const [publisherId, setPublisherId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setPublisherId(
      readAdsensePublisherIdFromDom(typeof document !== 'undefined' ? document : null) ??
        getDefaultAdsensePublisherId(),
    );
  }, []);

  useEffect(() => {
    if (!slot || !containerRef.current) {
      return undefined;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px 0px' },
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [publisherId, slot]);

  useEffect(() => {
    if (!slot || !publisherId || !isVisible || !adRef.current) {
      return;
    }

    if (adRef.current.getAttribute('data-adsbygoogle-status')) {
      return;
    }

    try {
      const queue =
        window.adsbygoogle && 'push' in window.adsbygoogle
          ? window.adsbygoogle
          : (window.adsbygoogle = []);

      queue.push({});
    } catch {
      // Ignore initialization errors so page content remains usable.
    }
  }, [isVisible, publisherId, slot]);

  if (!slot || !publisherId) {
    return null;
  }

  return (
    <section ref={containerRef} className={className} aria-label={label}>
      <div className="overflow-hidden rounded-[24px] border border-[#e6e9f2] bg-[#f8fafc] px-4 py-4 sm:px-5">
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[#7b8392]">
          {label}
        </p>
        <div className={joinClasses('mt-3 w-full', reserveHeightClassName)}>
          {isVisible ? (
            <ins
              ref={adRef}
              className={joinClasses('adsbygoogle block w-full', reserveHeightClassName)}
              style={{ display: 'block' }}
              data-ad-client={publisherId}
              data-ad-slot={slot}
              data-ad-format={format}
              data-ad-layout={layout}
              data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
            />
          ) : (
            <div
              aria-hidden="true"
              className={joinClasses(
                'w-full rounded-[18px] border border-dashed border-[#d7dde8] bg-white/70',
                reserveHeightClassName,
              )}
            />
          )}
        </div>
      </div>
    </section>
  );
}
