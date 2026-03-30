import { NextResponse } from 'next/server';
import { appendFile } from 'node:fs/promises';

type Rating = 'good' | 'needs-improvement' | 'poor';

type RumMetricPayload = {
  name?: string;
  value?: number;
  id?: string;
  rating?: Rating;
  navigationType?: string;
  path?: string;
  ts?: number;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  connectionType?: string;
  renderMode?: 'server' | 'client' | 'mixed';
};

const SLOW_METRIC_THRESHOLDS: Record<string, number> = {
  LCP: 2500,
  INP: 100,
  FID: 100,
  CLS: 0.1,
  FCP: 1800,
  TTFB: 800,
};
const RUM_ALERT_SAMPLE_SIZE = 30;
const RUM_ALERT_DEBOUNCE_MS = 5 * 60 * 1000;
const RUM_LOG_FILE_PATH = process.env.RUM_LOG_FILE_PATH || '/tmp/gemini-prompts-rum.jsonl';
const metricSamples = new Map<string, number[]>();
const lastAlertAt = new Map<string, number>();

function isValidRating(value: unknown): value is Rating {
  return value === 'good' || value === 'needs-improvement' || value === 'poor';
}

export async function POST(request: Request) {
  let payload: RumMetricPayload;
  try {
    payload = (await request.json()) as RumMetricPayload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const metricName = typeof payload.name === 'string' ? payload.name : null;
  const metricValue = typeof payload.value === 'number' ? payload.value : null;
  const metricId = typeof payload.id === 'string' ? payload.id : 'unknown';
  const rating = isValidRating(payload.rating) ? payload.rating : null;
  const path = typeof payload.path === 'string' ? payload.path : 'unknown';

  if (!metricName || metricValue === null || !rating) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const threshold = SLOW_METRIC_THRESHOLDS[metricName];
  const isAboveThreshold = typeof threshold === 'number' ? metricValue > threshold : false;
  const level = rating === 'poor' || isAboveThreshold ? 'warn' : 'log';
  const ts =
    typeof payload.ts === 'number' ? new Date(payload.ts).toISOString() : new Date().toISOString();
  const sampleKey = `${path}:${metricName}`;

  const samples = metricSamples.get(sampleKey) ?? [];
  samples.push(metricValue);
  if (samples.length > 200) {
    samples.shift();
  }
  metricSamples.set(sampleKey, samples);

  if (samples.length >= RUM_ALERT_SAMPLE_SIZE) {
    const sortedSamples = [...samples].sort((a, b) => a - b);
    const percentileIndex = Math.min(
      sortedSamples.length - 1,
      Math.floor(sortedSamples.length * 0.75),
    );
    const p75 = sortedSamples[percentileIndex] ?? metricValue;
    const now = Date.now();
    const previousAlertAt = lastAlertAt.get(sampleKey) ?? 0;

    if (
      typeof threshold === 'number' &&
      p75 > threshold &&
      now - previousAlertAt >= RUM_ALERT_DEBOUNCE_MS
    ) {
      lastAlertAt.set(sampleKey, now);
      console.warn(
        `[RUM_ALERT] ${metricName} p75=${p75} threshold=${threshold} path=${path} samples=${samples.length}`,
      );
    }
  }

  // Centralized RUM ingestion point for future forwarding to analytics tools.
  console[level](
    `[RUM] ${metricName}=${metricValue} rating=${rating} path=${path} id=${metricId} ts=${ts}`,
  );
  try {
    const line = JSON.stringify({
      name: metricName,
      value: metricValue,
      id: metricId,
      rating,
      navigationType: payload.navigationType ?? null,
      path,
      ts,
      threshold: threshold ?? null,
      isAboveThreshold,
      deviceType: payload.deviceType ?? null,
      connectionType: payload.connectionType ?? null,
      renderMode: payload.renderMode ?? null,
    });
    await appendFile(RUM_LOG_FILE_PATH, `${line}\n`, { encoding: 'utf8' });
  } catch (error) {
    console.warn('[RUM] Failed to persist metric:', error);
  }

  return NextResponse.json({ ok: true });
}
