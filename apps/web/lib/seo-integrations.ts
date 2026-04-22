export const SEO_INTEGRATION_SCOPES = ['development', 'staging', 'production'] as const;

export type SeoIntegrationScope = (typeof SEO_INTEGRATION_SCOPES)[number];

export type SeoIntegrationSettings = {
  scope: SeoIntegrationScope;
  googleSiteVerification: string | null;
  bingSiteVerification: string | null;
  gaMeasurementId: string | null;
  googleAdsTagId: string | null;
  adsensePublisherId: string | null;
  clarityProjectId: string | null;
  customHeadScriptUrls: string[];
  customHeadInlineScript: string | null;
  customHeadInlineStyle: string | null;
  customBodyStartInlineScript: string | null;
  customBodyEndInlineScript: string | null;
};

export type SeoIntegrationScriptBundle = {
  googleSiteVerification: string | null;
  bingSiteVerification: string | null;
  adsensePublisherId: string | null;
  gtagLoaderSrc: string | null;
  gtagInitScript: string | null;
  adsenseLoaderSrc: string | null;
  clarityInitScript: string | null;
  customHeadScriptUrls: string[];
  customHeadInlineScript: string | null;
  customHeadInlineStyle: string | null;
  customBodyStartInlineScript: string | null;
  customBodyEndInlineScript: string | null;
};

export const DEFAULT_SEO_INTEGRATION_SETTINGS: SeoIntegrationSettings = {
  scope: 'development',
  googleSiteVerification: null,
  bingSiteVerification: null,
  gaMeasurementId: null,
  googleAdsTagId: null,
  adsensePublisherId: null,
  clarityProjectId: null,
  customHeadScriptUrls: [],
  customHeadInlineScript: null,
  customHeadInlineStyle: null,
  customBodyStartInlineScript: null,
  customBodyEndInlineScript: null,
};
const DEFAULT_ADSENSE_PUBLISHER_ID = 'ca-pub-9138814143617371';

const BLOCKED_INLINE_SCRIPT_FRAGMENTS = [
  '<script',
  '</script',
  '<iframe',
  '<object',
  '<embed',
  '<link',
  '<meta',
  'document.write',
  'innerhtml=',
];

function cleanNullableText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function sanitizeInlineScriptForRuntime(value: unknown): string | null {
  const normalized = cleanNullableText(value, 8000);
  if (!normalized) return null;

  const withoutWrapperTags = normalized
    .replace(/^<script\b[^>]*>/i, '')
    .replace(/<\/script>$/i, '')
    .trim();

  if (!withoutWrapperTags) return null;

  const lower = withoutWrapperTags.toLowerCase();
  if (BLOCKED_INLINE_SCRIPT_FRAGMENTS.some((fragment) => lower.includes(fragment))) {
    return null;
  }

  return withoutWrapperTags;
}

function sanitizeInlineStyleForRuntime(value: unknown): string | null {
  const normalized = cleanNullableText(value, 8000);
  if (!normalized) return null;

  const withoutWrapperTags = normalized
    .replace(/^<style\b[^>]*>/i, '')
    .replace(/<\/style>$/i, '')
    .trim();

  if (!withoutWrapperTags) return null;

  const lower = withoutWrapperTags.toLowerCase();
  if (
    ['<script', '</script', '<iframe', '<object', '<embed', '<link', '<meta'].some((fragment) =>
      lower.includes(fragment),
    )
  ) {
    return null;
  }

  return withoutWrapperTags;
}

export function resolveSeoIntegrationScope(
  explicitValue?: string | null,
  nodeEnv?: string | null,
): SeoIntegrationScope {
  const explicit = explicitValue?.trim().toLowerCase();
  if (explicit && SEO_INTEGRATION_SCOPES.includes(explicit as SeoIntegrationScope)) {
    return explicit as SeoIntegrationScope;
  }
  const normalizedNodeEnv = nodeEnv?.trim().toLowerCase();
  if (
    normalizedNodeEnv &&
    SEO_INTEGRATION_SCOPES.includes(normalizedNodeEnv as SeoIntegrationScope)
  ) {
    return normalizedNodeEnv as SeoIntegrationScope;
  }
  return nodeEnv === 'production' ? 'production' : 'development';
}

function normalizeHttpsUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const urls = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:') continue;
      urls.add(parsed.toString());
    } catch {
      continue;
    }
  }
  return [...urls];
}

export function normalizeSeoIntegrationSettings(
  value: unknown,
  fallbackScope: SeoIntegrationScope,
): SeoIntegrationSettings {
  if (!value || typeof value !== 'object') {
    return {
      ...DEFAULT_SEO_INTEGRATION_SETTINGS,
      scope: fallbackScope,
    };
  }

  const payload = value as Partial<SeoIntegrationSettings>;
  const rawScope = typeof payload.scope === 'string' ? payload.scope.trim().toLowerCase() : '';
  const scope = SEO_INTEGRATION_SCOPES.includes(rawScope as SeoIntegrationScope)
    ? (rawScope as SeoIntegrationScope)
    : fallbackScope;

  return {
    scope,
    googleSiteVerification: cleanNullableText(payload.googleSiteVerification, 191),
    bingSiteVerification: cleanNullableText(payload.bingSiteVerification, 191),
    gaMeasurementId: cleanNullableText(payload.gaMeasurementId, 64)?.toUpperCase() ?? null,
    googleAdsTagId: cleanNullableText(payload.googleAdsTagId, 64)?.toUpperCase() ?? null,
    adsensePublisherId: cleanNullableText(payload.adsensePublisherId, 64)?.toLowerCase() ?? null,
    clarityProjectId: cleanNullableText(payload.clarityProjectId, 64),
    customHeadScriptUrls: normalizeHttpsUrls(payload.customHeadScriptUrls),
    customHeadInlineScript: sanitizeInlineScriptForRuntime(payload.customHeadInlineScript),
    customHeadInlineStyle: sanitizeInlineStyleForRuntime(payload.customHeadInlineStyle),
    customBodyStartInlineScript: sanitizeInlineScriptForRuntime(
      payload.customBodyStartInlineScript,
    ),
    customBodyEndInlineScript: sanitizeInlineScriptForRuntime(payload.customBodyEndInlineScript),
  };
}

function safeGaMeasurementId(value: string | null): string | null {
  if (!value) return null;
  return /^G-[A-Z0-9]+$/i.test(value) ? value.toUpperCase() : null;
}

function safeGoogleAdsTagId(value: string | null): string | null {
  if (!value) return null;
  return /^AW-\d+$/i.test(value) ? value.toUpperCase() : null;
}

function safeAdsensePublisherId(value: string | null): string | null {
  if (!value) return null;
  return /^ca-pub-\d{6,}$/i.test(value) ? value.toLowerCase() : null;
}

function safeClarityProjectId(value: string | null): string | null {
  if (!value) return null;
  return /^[a-z0-9]+$/i.test(value) ? value : null;
}

export function buildSeoIntegrationScriptBundle(
  settings: SeoIntegrationSettings,
): SeoIntegrationScriptBundle {
  const gaMeasurementId = safeGaMeasurementId(settings.gaMeasurementId);
  const googleAdsTagId = safeGoogleAdsTagId(settings.googleAdsTagId);
  const adsensePublisherId =
    safeAdsensePublisherId(settings.adsensePublisherId) ?? DEFAULT_ADSENSE_PUBLISHER_ID;
  const clarityProjectId = safeClarityProjectId(settings.clarityProjectId);
  const gtagPrimaryId = gaMeasurementId || googleAdsTagId;

  const gtagInitScript = gtagPrimaryId
    ? [
        'window.dataLayer = window.dataLayer || [];',
        'function gtag(){dataLayer.push(arguments);}',
        "gtag('js', new Date());",
        ...(gaMeasurementId ? [`gtag('config', '${gaMeasurementId}');`] : []),
        ...(googleAdsTagId ? [`gtag('config', '${googleAdsTagId}');`] : []),
      ].join('\n')
    : null;

  const clarityInitScript = clarityProjectId
    ? [
        '(function(c,l,a,r,i,t,y){',
        'c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};',
        't=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;',
        'y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);',
        `})(window, document, 'clarity', 'script', '${clarityProjectId}');`,
      ].join('')
    : null;

  return {
    googleSiteVerification: cleanNullableText(settings.googleSiteVerification, 191),
    bingSiteVerification: cleanNullableText(settings.bingSiteVerification, 191),
    adsensePublisherId,
    gtagLoaderSrc: gtagPrimaryId
      ? `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gtagPrimaryId)}`
      : null,
    gtagInitScript,
    adsenseLoaderSrc: adsensePublisherId
      ? `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsensePublisherId)}`
      : null,
    clarityInitScript,
    customHeadScriptUrls: normalizeHttpsUrls(settings.customHeadScriptUrls),
    customHeadInlineScript: sanitizeInlineScriptForRuntime(settings.customHeadInlineScript),
    customHeadInlineStyle: sanitizeInlineStyleForRuntime(settings.customHeadInlineStyle),
    customBodyStartInlineScript: sanitizeInlineScriptForRuntime(
      settings.customBodyStartInlineScript,
    ),
    customBodyEndInlineScript: sanitizeInlineScriptForRuntime(settings.customBodyEndInlineScript),
  };
}
