import { NextResponse } from 'next/server';
import { appendFile, readFile } from 'node:fs/promises';

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
const RUM_REPORT_TOKEN = process.env.RUM_REPORT_TOKEN || '';
const metricSamples = new Map<string, number[]>();
const lastAlertAt = new Map<string, number>();

type RumLogRecord = {
  name: string;
  value: number;
  id: string;
  rating: Rating;
  navigationType: string | null;
  path: string;
  ts: string;
  threshold: number | null;
  isAboveThreshold: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop' | null;
  connectionType: string | null;
  renderMode: 'server' | 'client' | 'mixed' | null;
};

function isValidRating(value: unknown): value is Rating {
  return value === 'good' || value === 'needs-improvement' || value === 'poor';
}

function parseMetricTimestamp(value: unknown) {
  if (typeof value === 'string') {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function percentile(values: number[], ratio: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * ratio));
  return sorted[index] ?? null;
}

function summarizeRumRecords(
  records: RumLogRecord[],
  options: { windowDays: number; deviceType: 'mobile' | 'tablet' | 'desktop' | 'all' },
) {
  const now = Date.now();
  const cutoff = now - options.windowDays * 24 * 60 * 60 * 1000;
  const filtered = records.filter((record) => {
    const ts = parseMetricTimestamp(record.ts);
    if (ts === null || ts < cutoff) return false;
    if (options.deviceType === 'all') return true;
    return record.deviceType === options.deviceType;
  });

  const byMetric = new Map<string, RumLogRecord[]>();
  const byPathMetric = new Map<string, RumLogRecord[]>();

  for (const record of filtered) {
    const metricBucket = byMetric.get(record.name) ?? [];
    metricBucket.push(record);
    byMetric.set(record.name, metricBucket);

    const pathMetricKey = `${record.path}::${record.name}`;
    const pathMetricBucket = byPathMetric.get(pathMetricKey) ?? [];
    pathMetricBucket.push(record);
    byPathMetric.set(pathMetricKey, pathMetricBucket);
  }

  const metrics = Array.from(byMetric.entries())
    .map(([name, bucket]) => {
      const values = bucket.map((record) => record.value);
      const poorCount = bucket.filter((record) => record.rating === 'poor').length;
      return {
        name,
        samples: bucket.length,
        p75: percentile(values, 0.75),
        avg:
          bucket.length > 0 ? values.reduce((sum, value) => sum + value, 0) / bucket.length : null,
        poorRate: bucket.length > 0 ? poorCount / bucket.length : 0,
      };
    })
    .sort((a, b) => b.samples - a.samples);

  const pathSummaries = Array.from(byPathMetric.entries())
    .map(([pathMetricKey, bucket]) => {
      const [path, metric] = pathMetricKey.split('::');
      const values = bucket.map((record) => record.value);
      return {
        path,
        metric,
        samples: bucket.length,
        p75: percentile(values, 0.75),
      };
    })
    .sort((a, b) => b.samples - a.samples)
    .slice(0, 30);

  return {
    generatedAt: new Date().toISOString(),
    windowDays: options.windowDays,
    deviceType: options.deviceType,
    totalSamples: filtered.length,
    metrics,
    pathSummaries,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedToken = request.headers.get('x-rum-report-token') || '';
  if (RUM_REPORT_TOKEN && requestedToken !== RUM_REPORT_TOKEN) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const windowDaysRaw = Number(url.searchParams.get('windowDays') || '7');
  const windowDays =
    Number.isFinite(windowDaysRaw) && windowDaysRaw >= 1 && windowDaysRaw <= 30
      ? Math.floor(windowDaysRaw)
      : 7;
  const deviceTypeParam = (url.searchParams.get('deviceType') || 'mobile').toLowerCase();
  const deviceType: 'mobile' | 'tablet' | 'desktop' | 'all' =
    deviceTypeParam === 'tablet' || deviceTypeParam === 'desktop' || deviceTypeParam === 'all'
      ? deviceTypeParam
      : 'mobile';

  let fileContent = '';
  try {
    fileContent = await readFile(RUM_LOG_FILE_PATH, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      console.warn('[RUM] Failed to read log file for report:', error);
    }
    return NextResponse.json({
      ok: true,
      summary: {
        generatedAt: new Date().toISOString(),
        windowDays,
        deviceType,
        totalSamples: 0,
        metrics: [],
        pathSummaries: [],
      },
    });
  }

  const records: RumLogRecord[] = fileContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as RumLogRecord;
      } catch {
        return null;
      }
    })
    .filter((record): record is RumLogRecord => record !== null);

  const summary = summarizeRumRecords(records, { windowDays, deviceType });
  return NextResponse.json({ ok: true, summary });
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
