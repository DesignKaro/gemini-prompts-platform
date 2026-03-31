# PageSpeed Ops Runbook (Public Pages)

## 1) Capture and update baseline

Run once from a machine with internet access:

```bash
cd apps/web
PSI_BASE_URL=https://geminiprompts.io \
PAGESPEED_API_KEY=YOUR_KEY \
npm run perf:psi:baseline
```

This updates `apps/web/scripts/pagespeed-baseline.json`.

## 2) Guardrail checks

Local/manual check:

```bash
cd apps/web
PSI_BASE_URL=https://geminiprompts.io \
PAGESPEED_API_KEY=YOUR_KEY \
npm run perf:psi:check
```

CI also runs:

- bundle budget gate (`perf:budget`)
- mobile PSI gate (`perf:psi:check`)
- robots directive validation (`perf:robots:check`)

## 3) Weekly mobile RUM report

Required envs on production app:

- `RUM_LOG_FILE_PATH` (default `/tmp/gemini-prompts-rum.jsonl`)
- `RUM_REPORT_TOKEN` (recommended for report endpoint protection)

The weekly GitHub workflow calls:

```bash
npm run rum:weekly -w @gemini-prompts/web
```

using:

- `RUM_REPORT_BASE_URL`
- `RUM_REPORT_TOKEN`

## 4) Nginx performance tuning (public pages)

Enable compression:

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript application/xml image/svg+xml;
gzip_min_length 1024;

brotli on;
brotli_comp_level 5;
brotli_types text/plain text/css application/json application/javascript application/xml image/svg+xml;
```

Cache static assets:

```nginx
location ~* ^/_next/static/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}

location ~* \.(?:js|css|svg|png|jpg|jpeg|gif|webp|avif|woff2?)$ {
  add_header Cache-Control "public, max-age=2592000";
}
```

Cache Next image optimizer responses:

```nginx
location ~* ^/_next/image {
  add_header Cache-Control "public, max-age=86400, stale-while-revalidate=604800";
}
```

After config change:

```bash
nginx -t && systemctl reload nginx
```
