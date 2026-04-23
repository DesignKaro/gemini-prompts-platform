#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const roots = ['apps/web/app/dashboard', 'apps/web/features/dashboard'];
const violations = [];
const routeViolations = [];

const allowedRouteImports = ['@/features/dashboard/', 'next/navigation', 'react'];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }

    if (entry.name === '.DS_Store') {
      violations.push(`${full} -> remove system artifact`);
    }

    if (/^page\s+\d+\.tsx$/.test(entry.name)) {
      violations.push(`${full} -> duplicate route artifact`);
    }
  }
}

function checkThinRoutePages() {
  const dashboardRoot = 'apps/web/app/dashboard';
  walkRoutePages(dashboardRoot);
}

function walkRoutePages(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkRoutePages(full);
      continue;
    }
    if (entry.name !== 'page.tsx') continue;
    verifyRoutePageImports(full);
  }
}

function verifyRoutePageImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const importMatches = Array.from(content.matchAll(/from\s+['"]([^'"]+)['"]/g)).map(
    (match) => match[1],
  );

  for (const importPath of importMatches) {
    const isAllowed = allowedRouteImports.some((allowed) => importPath.startsWith(allowed));
    if (!isAllowed) {
      routeViolations.push(`${filePath} -> disallowed import "${importPath}"`);
    }
  }
}

for (const root of roots) {
  walk(root);
}
checkThinRoutePages();

if (violations.length > 0 || routeViolations.length > 0) {
  console.error('[dashboard-structure] failed');
  for (const violation of violations) {
    console.error(` - ${violation}`);
  }
  for (const violation of routeViolations) {
    console.error(` - ${violation}`);
  }
  process.exit(1);
}

console.log('[dashboard-structure] passed');
