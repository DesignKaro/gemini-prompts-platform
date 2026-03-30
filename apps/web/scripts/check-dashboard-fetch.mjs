#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const scanRoots = ['apps/web/app/dashboard', 'apps/web/features/dashboard'];
const allow = new Set([
  path.normalize('apps/web/app/components/dashboard/use-admin-api.ts'),
]);

const violations = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }

    if (!/\.(ts|tsx)$/.test(entry.name)) continue;

    const normalized = path.normalize(full);
    if (allow.has(normalized)) continue;

    const content = fs.readFileSync(full, 'utf8');
    if (content.includes('fetch(')) {
      violations.push(full);
    }
  }
}

for (const root of scanRoots) {
  walk(root);
}

if (violations.length > 0) {
  console.error('[dashboard-fetch] failed: raw fetch is not allowed in dashboard routes/features');
  for (const file of violations) {
    console.error(` - ${file}`);
  }
  process.exit(1);
}

console.log('[dashboard-fetch] passed');
