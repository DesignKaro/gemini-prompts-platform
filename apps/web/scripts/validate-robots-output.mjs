#!/usr/bin/env node

const baseUrl = (process.env.PSI_BASE_URL || 'https://geminiprompts.io').replace(/\/+$/, '');
const robotsUrl = `${baseUrl}/robots.txt`;
const validDirectives = new Set([
  'user-agent',
  'allow',
  'disallow',
  'sitemap',
  'host',
  'crawl-delay',
]);

const response = await fetch(robotsUrl);
if (!response.ok) {
  throw new Error(
    `[robots-check] Failed to fetch robots.txt (${response.status}) from ${robotsUrl}`,
  );
}

const content = await response.text();
const lines = content
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((line) => !line.startsWith('#'));

const invalidLines = lines.filter((line) => {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex <= 0) return true;
  const directive = line.slice(0, separatorIndex).trim().toLowerCase();
  return !validDirectives.has(directive);
});

if (invalidLines.length > 0) {
  console.error('[robots-check] Invalid robots directives found:');
  for (const invalidLine of invalidLines) {
    console.error(`  - ${invalidLine}`);
  }
  process.exit(1);
}

console.log(`[robots-check] robots.txt valid (${robotsUrl}).`);
