#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Installing workspace dependencies..."
npm install

echo "Setting up git hooks..."
npm run prepare

echo "Done."
echo "Run: npm run dev"
