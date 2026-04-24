import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import {
  cleanAdsensePublisherId,
  cleanAdsenseSlot,
  getAdsenseManualSlot,
  readAdsensePublisherIdFromDom,
} from '../lib/adsense';
import { AdsenseManualUnit } from '../app/components/adsense-manual-unit';

class MockIntersectionObserver {
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.callback(
      [
        {
          isIntersecting: true,
          intersectionRatio: 1,
          target,
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRect: target.getBoundingClientRect(),
          rootBounds: null,
          time: Date.now(),
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }

  disconnect() {}

  unobserve() {}

  takeRecords() {
    return [];
  }
}

describe('adsense helpers', () => {
  const originalPromptInlineSlot = process.env.NEXT_PUBLIC_ADSENSE_SLOT_PROMPT_INLINE;

  beforeEach(() => {
    cleanup();
    document.head.innerHTML = '';
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    cleanup();
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_PROMPT_INLINE = originalPromptInlineSlot;
    vi.unstubAllGlobals();
  });

  it('sanitizes publisher ids and slot ids', () => {
    expect(cleanAdsensePublisherId('ca-pub-9138814143617371')).toBe('ca-pub-9138814143617371');
    expect(cleanAdsensePublisherId('pub-9138814143617371')).toBeNull();
    expect(cleanAdsenseSlot('1234567890')).toBe('1234567890');
    expect(cleanAdsenseSlot('abc123')).toBeNull();
  });

  it('reads the publisher id from the adsense meta tag', () => {
    document.head.innerHTML =
      '<meta name="google-adsense-account" content="ca-pub-9138814143617371" />';

    expect(readAdsensePublisherIdFromDom(document)).toBe('ca-pub-9138814143617371');
  });

  it('returns a sanitized manual slot from env', () => {
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_PROMPT_INLINE = ' 1234567890 ';

    expect(getAdsenseManualSlot('promptInline')).toBe('1234567890');
  });

  it('falls back to the site default manual slot when env is not configured', () => {
    delete process.env.NEXT_PUBLIC_ADSENSE_SLOT_PROMPT_INLINE;

    expect(getAdsenseManualSlot('promptInline')).toBe('9399622723');
  });

  it('initializes a manual ad when the slot is configured and visible', async () => {
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_PROMPT_INLINE = '1234567890';
    document.head.innerHTML =
      '<meta name="google-adsense-account" content="ca-pub-9138814143617371" />';

    const push = vi.fn();
    Object.defineProperty(window, 'adsbygoogle', {
      configurable: true,
      writable: true,
      value: { push },
    });

    render(
      <AdsenseManualUnit
        slotName="promptInline"
        format="fluid"
        layout="in-article"
        reserveHeightClassName="min-h-[280px]"
      />,
    );

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Advertisement')).toBeInTheDocument();
    expect(document.querySelector('ins.adsbygoogle')).toHaveAttribute('data-ad-slot', '1234567890');
    expect(document.querySelector('ins.adsbygoogle')).toHaveAttribute(
      'data-ad-client',
      'ca-pub-9138814143617371',
    );
  });
});
