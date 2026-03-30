type ResolveApiBaseUrlOptions = {
  includeAuthApiUrl?: boolean;
  includeApiUrl?: boolean;
  includePublicApiUrl?: boolean;
  fallbackUrls?: string[];
};

function normalizeApiBaseUrl(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === '/') {
    return null;
  }

  const normalized = trimmed.replace(/\/+$/, '');
  return normalized.length > 0 ? normalized : null;
}

export function resolveApiBaseUrls(options: ResolveApiBaseUrlOptions = {}): string[] {
  const includeAuthApiUrl = options.includeAuthApiUrl ?? true;
  const includeApiUrl = options.includeApiUrl ?? true;
  const includePublicApiUrl = options.includePublicApiUrl ?? true;

  const fallbackUrls =
    options.fallbackUrls && options.fallbackUrls.length > 0
      ? options.fallbackUrls
      : ['http://127.0.0.1:4000', 'http://localhost:4000'];

  const candidates = [
    includeAuthApiUrl ? process.env.AUTH_API_URL : undefined,
    includeApiUrl ? process.env.API_URL : undefined,
    includePublicApiUrl ? process.env.NEXT_PUBLIC_API_URL : undefined,
    ...fallbackUrls,
  ];

  const unique = new Set<string>();
  for (const candidate of candidates) {
    const normalized = normalizeApiBaseUrl(candidate);
    if (!normalized) continue;
    unique.add(normalized);
  }

  return [...unique];
}

export function resolveApiBaseUrl(options: ResolveApiBaseUrlOptions = {}): string {
  const [first] = resolveApiBaseUrls(options);
  return first ?? 'http://127.0.0.1:4000';
}
