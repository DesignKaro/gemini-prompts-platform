'use client';

import { useEffect, useRef } from 'react';
import { trackPostView, trackPromptView } from '../../lib/content-views';

type ContentViewTrackerProps = {
  target: 'prompt' | 'post';
  contentId: string;
  delayMs?: number;
};

export function ContentViewTracker({ target, contentId, delayMs = 1200 }: ContentViewTrackerProps) {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!contentId || hasTrackedRef.current) {
      return;
    }

    hasTrackedRef.current = true;
    const timeoutId = window.setTimeout(
      () => {
        if (target === 'prompt') {
          void trackPromptView(contentId);
          return;
        }

        void trackPostView(contentId);
      },
      Math.max(0, delayMs),
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [contentId, delayMs, target]);

  return null;
}
