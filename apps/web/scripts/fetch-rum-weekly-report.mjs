#!/usr/bin/env node

const baseUrl = (process.env.RUM_REPORT_BASE_URL || '').replace(/\/+$/, '');
const reportToken = process.env.RUM_REPORT_TOKEN || '';
const windowDays = Number(process.env.RUM_REPORT_WINDOW_DAYS || '7');
const deviceType = process.env.RUM_REPORT_DEVICE_TYPE || 'mobile';

if (!baseUrl) {
  console.log('[rum-weekly] Skipping: set RUM_REPORT_BASE_URL to enable weekly report collection.');
  process.exit(0);
}

const endpoint = new URL(`${baseUrl}/api/rum`);
endpoint.searchParams.set('windowDays', String(Number.isFinite(windowDays) ? windowDays : 7));
endpoint.searchParams.set('deviceType', deviceType);

const headers = reportToken ? { 'x-rum-report-token': reportToken } : {};

const response = await fetch(endpoint.toString(), { headers });
if (!response.ok) {
  const body = await response.text().catch(() => '');
  throw new Error(
    `[rum-weekly] Failed to fetch report (${response.status}): ${body.slice(0, 400)}`,
  );
}

const payload = await response.json();
const summary = payload?.summary;
if (!summary) {
  throw new Error('[rum-weekly] Missing summary in API response.');
}

const metricLines = (summary.metrics || [])
  .map((metric) => {
    const p75 =
      metric.p75 === null || metric.p75 === undefined ? 'n/a' : Number(metric.p75).toFixed(2);
    const avg =
      metric.avg === null || metric.avg === undefined ? 'n/a' : Number(metric.avg).toFixed(2);
    const poorRate = Number(metric.poorRate || 0) * 100;
    return `- ${metric.name}: p75=${p75}, avg=${avg}, samples=${metric.samples}, poor=${poorRate.toFixed(1)}%`;
  })
  .join('\n');

const topPathLines = (summary.pathSummaries || [])
  .slice(0, 12)
  .map((item) => {
    const p75 = item.p75 === null || item.p75 === undefined ? 'n/a' : Number(item.p75).toFixed(2);
    return `- ${item.path} · ${item.metric}: p75=${p75}, samples=${item.samples}`;
  })
  .join('\n');

const markdown = [
  `# Weekly RUM Report (${summary.deviceType}, ${summary.windowDays}d)`,
  '',
  `Generated at: ${summary.generatedAt}`,
  `Total samples: ${summary.totalSamples}`,
  '',
  '## Metric summary',
  metricLines || '- No samples in selected window.',
  '',
  '## Top path metrics',
  topPathLines || '- No path metrics available.',
  '',
].join('\n');

console.log(markdown);

if (process.env.GITHUB_STEP_SUMMARY) {
  await import('node:fs/promises').then(({ appendFile }) =>
    appendFile(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`, 'utf8'),
  );
}
