export const SEO_INTEGRATION_SCOPES = ['development', 'staging', 'production'] as const;

export type SeoIntegrationScope = (typeof SEO_INTEGRATION_SCOPES)[number];

export function normalizeSeoIntegrationScope(value?: string | null): SeoIntegrationScope | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return SEO_INTEGRATION_SCOPES.includes(normalized as SeoIntegrationScope)
    ? (normalized as SeoIntegrationScope)
    : null;
}

export function resolveSeoIntegrationScope(
  value?: string | null,
  nodeEnv?: string | null,
): SeoIntegrationScope {
  const explicit = normalizeSeoIntegrationScope(value);
  if (explicit) {
    return explicit;
  }

  const normalizedNodeEnv = normalizeSeoIntegrationScope(nodeEnv);
  if (normalizedNodeEnv) {
    return normalizedNodeEnv;
  }

  return nodeEnv === 'production' ? 'production' : 'development';
}
