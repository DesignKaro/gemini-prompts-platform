#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_BASE_URL = 'https://geminiprompts.io';
const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const BASELINE_FILE_PATH = path.join(process.cwd(), 'scripts/pagespeed-baseline.json');
const WRITE_BASELINE = process.argv.includes('--write-baseline');
const baseUrl = (process.env.PSI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
const strategy = process.env.PSI_STRATEGY || 'mobile';
const pagespeedApiKey = process.env.PAGESPEED_API_KEY || '';

const THRESHOLDS = {
  scoreMin: Number(process.env.PSI_SCORE_MIN || 80),
  lcpMax: Number(process.env.PSI_LCP_MAX || 2500),
  inpMax: Number(process.env.PSI_INP_MAX || 200),
  clsMax: Number(process.env.PSI_CLS_MAX || 0.1),
  tbtMax: Number(process.env.PSI_TBT_MAX || 300),
};

const REGRESSION_BUDGET = {
  scoreDropMax: Number(process.env.PSI_REGRESSION_SCORE_DROP_MAX || 3),
  lcpIncreaseMax: Number(process.env.PSI_REGRESSION_LCP_INCREASE_MAX || 300),
  inpIncreaseMax: Number(process.env.PSI_REGRESSION_INP_INCREASE_MAX || 60),
  clsIncreaseMax: Number(process.env.PSI_REGRESSION_CLS_INCREASE_MAX || 0.03),
  tbtIncreaseMax: Number(process.env.PSI_REGRESSION_TBT_INCREASE_MAX || 100),
};

function isPositiveFinite(value) {
  return Number.isFinite(value) && value > 0;
}

function toNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractLocUrls(xml) {
  const locRegex = /<loc>(.*?)<\/loc>/gims;
  const urls = [];
  let match = locRegex.exec(xml);
  while (match) {
    urls.push(decodeXmlEntities((match[1] || '').trim()));
    match = locRegex.exec(xml);
  }
  return urls;
}

function normalizeUrl(inputUrl) {
  try {
    const url = new URL(inputUrl);
    url.hash = '';
    return url.toString().replace(/\/+$/, '') || `${url.origin}/`;
  } catch {
    return inputUrl.replace(/\/+$/, '');
  }
}

function relativePathFromUrl(absoluteUrl) {
  try {
    const url = new URL(absoluteUrl);
    return `${url.pathname}${url.search}` || '/';
  } catch {
    return absoluteUrl;
  }
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url}`);
  }
  return response.text();
}

async function firstUrlFromSitemap(url, filterFn) {
  try {
    const xml = await fetchText(url);
    const urls = extractLocUrls(xml);
    return urls.find(filterFn) || null;
  } catch {
    return null;
  }
}

async function discoverBenchmarkUrls() {
  const homeUrl = `${baseUrl}/`;
  const promptsUrl = `${baseUrl}/prompts`;
  const categoryUrl =
    (await firstUrlFromSitemap(`${baseUrl}/category-sitemap.xml`, (url) =>
      /\/category\/[^/]+\/?$/.test(url),
    )) ||
    (await firstUrlFromSitemap(`${baseUrl}/sitemap.xml`, (url) => {
      const path = relativePathFromUrl(url);
      return /^\/(category\/[^/]+|[^/?#]+)$/.test(path) && path !== '/prompts';
    })) ||
    `${baseUrl}/category`;

  const promptDetailUrl =
    (await firstUrlFromSitemap(`${baseUrl}/prompt-sitemap.xml`, (url) =>
      /\/[^/]+\/[^/]+\/?$/.test(relativePathFromUrl(url)),
    )) || `${baseUrl}/prompts`;

  const blogDetailUrl =
    (await firstUrlFromSitemap(`${baseUrl}/post-sitemap.xml`, (url) =>
      /\/blog\/[^/]+\/?$/.test(relativePathFromUrl(url)),
    )) || `${baseUrl}/blog`;

  return [
    { id: 'home', label: 'Home', url: normalizeUrl(homeUrl) },
    { id: 'prompts', label: 'Prompts', url: normalizeUrl(promptsUrl) },
    { id: 'category', label: 'Category detail', url: normalizeUrl(categoryUrl) },
    { id: 'promptDetail', label: 'Prompt detail', url: normalizeUrl(promptDetailUrl) },
    { id: 'blogDetail', label: 'Blog detail', url: normalizeUrl(blogDetailUrl) },
  ];
}

function getAuditMetric(audits, key) {
  return toNumber(audits?.[key]?.numericValue);
}

async function runPageSpeed(url) {
  const endpoint = new URL(PSI_ENDPOINT);
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('strategy', strategy);
  endpoint.searchParams.set('category', 'PERFORMANCE');
  if (pagespeedApiKey) {
    endpoint.searchParams.set('key', pagespeedApiKey);
  }

  const response = await fetch(endpoint.toString());
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`PSI request failed (${response.status}) for ${url}: ${body.slice(0, 280)}`);
  }

  const payload = await response.json();
  const lighthouseResult = payload?.lighthouseResult ?? {};
  const audits = lighthouseResult?.audits ?? {};
  const rawScore = toNumber(lighthouseResult?.categories?.performance?.score);

  const score = rawScore === null ? null : Math.round(rawScore * 100);
  const lcp = getAuditMetric(audits, 'largest-contentful-paint');
  const inp =
    getAuditMetric(audits, 'interaction-to-next-paint') ??
    getAuditMetric(audits, 'experimental-interaction-to-next-paint');
  const cls = getAuditMetric(audits, 'cumulative-layout-shift');
  const tbt = getAuditMetric(audits, 'total-blocking-time');
  const totalByteWeight = getAuditMetric(audits, 'total-byte-weight');
  const mainThreadWork = getAuditMetric(audits, 'mainthread-work-breakdown');

  return {
    fetchedAt: new Date().toISOString(),
    score,
    lcp,
    inp,
    cls,
    tbt,
    totalByteWeight,
    mainThreadWork,
  };
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_FILE_PATH)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(BASELINE_FILE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function formatMetric(value, digits = 0) {
  if (!Number.isFinite(value)) return 'n/a';
  return Number(value).toFixed(digits);
}

function printSummary(benchmarks, metricsByRoute) {
  console.log(`\n[psi] Strategy: ${strategy} | Base URL: ${baseUrl}`);
  console.log('[psi] Benchmark results:');
  for (const benchmark of benchmarks) {
    const metric = metricsByRoute[benchmark.id];
    if (!metric) continue;
    console.log(
      `  - ${benchmark.label.padEnd(14)} score=${formatMetric(metric.score)} lcp=${formatMetric(
        metric.lcp,
      )} inp=${formatMetric(metric.inp)} cls=${formatMetric(metric.cls, 3)} tbt=${formatMetric(
        metric.tbt,
      )}`,
    );
  }
}

function checkAbsoluteThresholds(routeId, metric, failures) {
  if (metric.score === null || metric.score < THRESHOLDS.scoreMin) {
    failures.push(
      `[${routeId}] score ${formatMetric(metric.score)} is below minimum ${THRESHOLDS.scoreMin}`,
    );
  }
  if (isPositiveFinite(metric.lcp) && metric.lcp > THRESHOLDS.lcpMax) {
    failures.push(`[${routeId}] LCP ${formatMetric(metric.lcp)} exceeds ${THRESHOLDS.lcpMax}`);
  }
  if (isPositiveFinite(metric.inp) && metric.inp > THRESHOLDS.inpMax) {
    failures.push(`[${routeId}] INP ${formatMetric(metric.inp)} exceeds ${THRESHOLDS.inpMax}`);
  }
  if (isPositiveFinite(metric.cls) && metric.cls > THRESHOLDS.clsMax) {
    failures.push(`[${routeId}] CLS ${formatMetric(metric.cls, 3)} exceeds ${THRESHOLDS.clsMax}`);
  }
  if (isPositiveFinite(metric.tbt) && metric.tbt > THRESHOLDS.tbtMax) {
    failures.push(`[${routeId}] TBT ${formatMetric(metric.tbt)} exceeds ${THRESHOLDS.tbtMax}`);
  }
}

function checkRegression(routeId, metric, baselineMetric, failures) {
  if (!baselineMetric) return;

  const scoreDrop = (baselineMetric.score ?? metric.score ?? 0) - (metric.score ?? 0);
  if (scoreDrop > REGRESSION_BUDGET.scoreDropMax) {
    failures.push(
      `[${routeId}] score dropped by ${formatMetric(scoreDrop)} (max ${REGRESSION_BUDGET.scoreDropMax})`,
    );
  }

  const lcpIncrease = (metric.lcp ?? 0) - (baselineMetric.lcp ?? 0);
  if (
    isPositiveFinite(metric.lcp) &&
    isPositiveFinite(baselineMetric.lcp) &&
    lcpIncrease > REGRESSION_BUDGET.lcpIncreaseMax
  ) {
    failures.push(
      `[${routeId}] LCP increased by ${formatMetric(lcpIncrease)} (max ${REGRESSION_BUDGET.lcpIncreaseMax})`,
    );
  }

  const inpIncrease = (metric.inp ?? 0) - (baselineMetric.inp ?? 0);
  if (
    isPositiveFinite(metric.inp) &&
    isPositiveFinite(baselineMetric.inp) &&
    inpIncrease > REGRESSION_BUDGET.inpIncreaseMax
  ) {
    failures.push(
      `[${routeId}] INP increased by ${formatMetric(inpIncrease)} (max ${REGRESSION_BUDGET.inpIncreaseMax})`,
    );
  }

  const clsIncrease = (metric.cls ?? 0) - (baselineMetric.cls ?? 0);
  if (
    isPositiveFinite(metric.cls) &&
    isPositiveFinite(baselineMetric.cls) &&
    clsIncrease > REGRESSION_BUDGET.clsIncreaseMax
  ) {
    failures.push(
      `[${routeId}] CLS increased by ${formatMetric(clsIncrease, 3)} (max ${REGRESSION_BUDGET.clsIncreaseMax})`,
    );
  }

  const tbtIncrease = (metric.tbt ?? 0) - (baselineMetric.tbt ?? 0);
  if (
    isPositiveFinite(metric.tbt) &&
    isPositiveFinite(baselineMetric.tbt) &&
    tbtIncrease > REGRESSION_BUDGET.tbtIncreaseMax
  ) {
    failures.push(
      `[${routeId}] TBT increased by ${formatMetric(tbtIncrease)} (max ${REGRESSION_BUDGET.tbtIncreaseMax})`,
    );
  }
}

async function main() {
  const benchmarks = await discoverBenchmarkUrls();
  const metricsByRoute = {};

  for (const benchmark of benchmarks) {
    metricsByRoute[benchmark.id] = await runPageSpeed(benchmark.url);
  }

  printSummary(benchmarks, metricsByRoute);

  if (WRITE_BASELINE) {
    const baselinePayload = {
      generatedAt: new Date().toISOString(),
      baseUrl,
      strategy,
      routes: Object.fromEntries(
        benchmarks.map((benchmark) => [
          benchmark.id,
          {
            label: benchmark.label,
            url: benchmark.url,
            ...metricsByRoute[benchmark.id],
          },
        ]),
      ),
    };
    fs.writeFileSync(BASELINE_FILE_PATH, `${JSON.stringify(baselinePayload, null, 2)}\n`, 'utf8');
    console.log(`\n[psi] Baseline written to ${BASELINE_FILE_PATH}`);
    return;
  }

  const baseline = loadBaseline();
  const failures = [];

  for (const benchmark of benchmarks) {
    const metric = metricsByRoute[benchmark.id];
    checkAbsoluteThresholds(benchmark.id, metric, failures);
    const baselineMetric = baseline?.routes?.[benchmark.id] ?? null;
    checkRegression(benchmark.id, metric, baselineMetric, failures);
  }

  if (failures.length > 0) {
    console.error('\n[psi] Guardrail failures:');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  console.log('\n[psi] Guardrails passed.');
}

main().catch((error) => {
  console.error('[psi] Failed to execute guardrail:', error);
  process.exit(1);
});
