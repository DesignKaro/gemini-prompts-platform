'use client';

import { useRef } from 'react';
import { useReportWebVitals } from 'next/web-vitals';

type RumMetricPayload = {
  name: string;
  value: number;
  id: string;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType: string;
  path: string;
  ts: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType: string;
  renderMode: 'server' | 'client' | 'mixed';
};

const RUM_SAMPLE_RATE = 0.5;

function sendRumMetric(payload: RumMetricPayload) {
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/rum', blob);
    return;
  }

  void fetch('/api/rum', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  });
}

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function WebVitalsReporter() {
  const sentMetricIdsRef = useRef(new Set<string>());

  useReportWebVitals((metric) => {
    if (Math.random() > RUM_SAMPLE_RATE) return;

    const dedupeKey = `${metric.name}:${metric.id}`;
    if (sentMetricIdsRef.current.has(dedupeKey)) return;
    sentMetricIdsRef.current.add(dedupeKey);

    sendRumMetric({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      rating: metric.rating,
      navigationType: metric.navigationType,
      path: window.location.pathname,
      ts: Date.now(),
      deviceType: getDeviceType(),
      connectionType:
        (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
          ?.effectiveType ?? 'unknown',
      renderMode: 'mixed',
    });
  });

  return null;
}
