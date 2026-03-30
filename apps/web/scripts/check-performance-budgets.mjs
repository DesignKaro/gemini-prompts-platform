#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const webRoot = process.cwd();
const nextDir = path.join(webRoot, '.next');
const buildManifestPath = path.join(nextDir, 'build-manifest.json');
const appBuildManifestPath = path.join(nextDir, 'app-build-manifest.json');

const BUDGETS = {
  sharedLayoutJsBytes: 9_500 * 1024,
  homeRouteExclusiveJsBytes: 3_800 * 1024,
  promptsRouteExclusiveJsBytes: 1_500 * 1024,
  blogRouteExclusiveJsBytes: 1_500 * 1024,
  promptDetailRouteExclusiveJsBytes: 2_000 * 1024,
};

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sumExistingFiles(filePaths) {
  let total = 0;
  const unique = new Set(filePaths);
  for (const relPath of unique) {
    if (!relPath.endsWith('.js')) continue;
    const absPath = path.join(nextDir, relPath);
    if (!fs.existsSync(absPath)) continue;
    total += fs.statSync(absPath).size;
  }
  return total;
}

function formatBytes(value) {
  return `${(value / 1024).toFixed(1)} KiB`;
}

if (!fs.existsSync(buildManifestPath) || !fs.existsSync(appBuildManifestPath)) {
  console.error('Missing build manifests. Run `npm run build -w @gemini-prompts/web` first.');
  process.exit(1);
}

const buildManifest = loadJson(buildManifestPath);
const appBuildManifest = loadJson(appBuildManifestPath);

const sharedLayoutFiles = appBuildManifest.pages?.['/layout'] ?? buildManifest.rootMainFiles ?? [];
const sharedLayoutJsBytes = sumExistingFiles(sharedLayoutFiles);

const homeRouteFiles = appBuildManifest.pages?.['/page'] ?? [];
const homeRouteExclusiveJsBytes = sumExistingFiles(
  homeRouteFiles.filter((file) => !sharedLayoutFiles.includes(file)),
);

const promptsRouteFiles =
  appBuildManifest.pages?.['/prompts/page'] ?? appBuildManifest.pages?.['/prompt/page'] ?? [];
const promptsRouteExclusiveJsBytes = sumExistingFiles(
  promptsRouteFiles.filter((file) => !sharedLayoutFiles.includes(file)),
);

const blogRouteFiles = appBuildManifest.pages?.['/blog/page'] ?? [];
const blogRouteExclusiveJsBytes = sumExistingFiles(
  blogRouteFiles.filter((file) => !sharedLayoutFiles.includes(file)),
);

const promptDetailRouteFiles = appBuildManifest.pages?.['/[categorySlug]/[promptSlug]/page'] ?? [];
const promptDetailRouteExclusiveJsBytes = sumExistingFiles(
  promptDetailRouteFiles.filter((file) => !sharedLayoutFiles.includes(file)),
);

const checks = [
  {
    label: 'Shared layout JS',
    actual: sharedLayoutJsBytes,
    budget: BUDGETS.sharedLayoutJsBytes,
  },
  {
    label: 'Home route exclusive JS',
    actual: homeRouteExclusiveJsBytes,
    budget: BUDGETS.homeRouteExclusiveJsBytes,
  },
  {
    label: 'Prompts route exclusive JS',
    actual: promptsRouteExclusiveJsBytes,
    budget: BUDGETS.promptsRouteExclusiveJsBytes,
  },
  {
    label: 'Blog route exclusive JS',
    actual: blogRouteExclusiveJsBytes,
    budget: BUDGETS.blogRouteExclusiveJsBytes,
  },
  {
    label: 'Prompt detail route exclusive JS',
    actual: promptDetailRouteExclusiveJsBytes,
    budget: BUDGETS.promptDetailRouteExclusiveJsBytes,
  },
];

let hasFailure = false;
for (const check of checks) {
  const pass = check.actual <= check.budget;
  const status = pass ? 'PASS' : 'FAIL';
  console.log(
    `[perf-budget] ${status} ${check.label}: ${formatBytes(check.actual)} (budget ${formatBytes(
      check.budget,
    )})`,
  );
  if (!pass) hasFailure = true;
}

if (hasFailure) {
  console.error('[perf-budget] Performance budget check failed.');
  process.exit(1);
}

console.log('[perf-budget] All performance budgets passed.');
