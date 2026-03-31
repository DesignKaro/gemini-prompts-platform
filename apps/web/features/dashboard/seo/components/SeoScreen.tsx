'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ActionError } from '@/app/components/dashboard/action-error';
import { useAdminApi } from '@/app/components/dashboard/use-admin-api';
import {
  DEFAULT_DASHBOARD_SEO_INTEGRATIONS,
  DEFAULT_DASHBOARD_SEO_SETTINGS,
} from '../api';
import {
  SEO_INTEGRATION_SCOPES,
  type SeoIntegrationScope,
} from '@/lib/seo-integrations';
import { isProtectedSuperadminEmail } from '@/lib/utils/permissions';
import type {
  DashboardSeoIntegrationSettings,
  DashboardSeoIntegrationSettingsUpdateInput,
  DashboardSeoSettings,
  DashboardSeoSettingsUpdateInput,
  RedirectRule,
  SeoSection,
} from '../types';

const SEO_NAV_BASE: Array<{ href: string; label: string; section: SeoSection }> = [
  { href: '/dashboard/seo', label: 'Overview', section: 'overview' },
  { href: '/dashboard/seo/settings', label: 'Meta Defaults', section: 'settings' },
  { href: '/dashboard/seo/robots', label: 'Robots.txt', section: 'robots' },
  { href: '/dashboard/seo/sitemap', label: 'Sitemap.xml', section: 'sitemap' },
  { href: '/dashboard/seo/social', label: 'Social & Schema', section: 'social' },
  { href: '/dashboard/seo/redirects', label: 'Redirects', section: 'redirects' },
];

const AI_BOT_USER_AGENTS = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'CCBot',
  'PerplexityBot',
  'Bytespider',
  'anthropic-ai',
];
const ROBOTS_PREVIEW_BASE_URL = 'https://geminiprompts.io';

function normalizeRobotsPreviewBaseUrl(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return ROBOTS_PREVIEW_BASE_URL;
  }

  try {
    const normalized = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    return new URL(normalized).origin;
  } catch {
    return ROBOTS_PREVIEW_BASE_URL;
  }
}

function getRobotsPreviewHost(baseUrl: string) {
  try {
    return new URL(baseUrl).host;
  } catch {
    return new URL(ROBOTS_PREVIEW_BASE_URL).host;
  }
}

function hasRobotsDirective(rule: string, directive: string) {
  const separatorIndex = rule.indexOf(':');
  if (separatorIndex <= 0) return false;
  return rule.slice(0, separatorIndex).trim().toLowerCase() === directive;
}

function formatUpdatedAt(value?: string) {
  if (!value) return 'Not saved yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not saved yet';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildRobotsPreview(
  settings: DashboardSeoSettings,
  robotsDisallowPaths: string[],
  robotsAdditionalRules: string[],
) {
  const baseUrl = normalizeRobotsPreviewBaseUrl(settings.canonicalBaseUrl);
  const rules = [
    'User-agent: *',
    ...(settings.robotsSiteIndex ? ['Allow: /'] : []),
    ...(settings.robotsSiteIndex ? robotsDisallowPaths.map((path) => `Disallow: ${path}`) : ['Disallow: /']),
  ];

  if (settings.robotsBlockAiBots) {
    for (const userAgent of AI_BOT_USER_AGENTS) {
      rules.push('', `User-agent: ${userAgent}`, 'Disallow: /');
    }
  }

  if (robotsAdditionalRules.length > 0) {
    rules.push('', ...robotsAdditionalRules);
  }

  const hasCustomSitemap = robotsAdditionalRules.some((rule) => hasRobotsDirective(rule, 'sitemap'));
  const hasCustomHost = robotsAdditionalRules.some((rule) => hasRobotsDirective(rule, 'host'));
  if (!hasCustomSitemap || !hasCustomHost) {
    rules.push('');
    if (!hasCustomSitemap) {
      rules.push(`Sitemap: ${baseUrl}/sitemap.xml`);
    }
    if (!hasCustomHost) {
      rules.push(`Host: ${getRobotsPreviewHost(baseUrl)}`);
    }
  }

  return rules.join('\n');
}

function buildIntegrationsSnippetPreview(settings: DashboardSeoIntegrationSettings): string {
  const lines: string[] = [];
  if (settings.gaMeasurementId) {
    lines.push(`GA4: ${settings.gaMeasurementId}`);
  }
  if (settings.googleAdsTagId) {
    lines.push(`Google Ads: ${settings.googleAdsTagId}`);
  }
  if (settings.adsensePublisherId) {
    lines.push(`AdSense: ${settings.adsensePublisherId}`);
  }
  if (settings.clarityProjectId) {
    lines.push(`Clarity: ${settings.clarityProjectId}`);
  }
  if (settings.customHeadScriptUrls.length > 0) {
    lines.push(`Custom head script URLs: ${settings.customHeadScriptUrls.length}`);
  }
  if (settings.customHeadInlineScript) {
    lines.push('Custom head inline script: enabled');
  }
  if (settings.customBodyStartInlineScript) {
    lines.push('Custom body-start inline script: enabled');
  }
  if (settings.customBodyEndInlineScript) {
    lines.push('Custom body-end inline script: enabled');
  }
  return lines.length > 0 ? lines.join('\n') : 'No integrations configured yet.';
}

export function SeoScreen({ section }: { section: SeoSection }) {
  const { data: session } = useSession();
  const { request: adminRequest } = useAdminApi();
  const isSuperadmin = isProtectedSuperadminEmail(session?.user?.email);
  const [settings, setSettings] = useState<DashboardSeoSettings>(DEFAULT_DASHBOARD_SEO_SETTINGS);
  const [robotsInput, setRobotsInput] = useState(
    DEFAULT_DASHBOARD_SEO_SETTINGS.robotsDisallowPaths.join('\n'),
  );
  const [robotsAdditionalRulesInput, setRobotsAdditionalRulesInput] = useState(
    DEFAULT_DASHBOARD_SEO_SETTINGS.robotsAdditionalRules.join('\n'),
  );
  const [organizationSameAsInput, setOrganizationSameAsInput] = useState(
    DEFAULT_DASHBOARD_SEO_SETTINGS.organizationSameAs.join('\n'),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [redirectRules, setRedirectRules] = useState<RedirectRule[]>([]);
  const [redirectSearch, setRedirectSearch] = useState('');
  const [redirectSourcePath, setRedirectSourcePath] = useState('');
  const [redirectDestinationPath, setRedirectDestinationPath] = useState('');
  const [redirectIsPermanent, setRedirectIsPermanent] = useState(true);
  const [redirectIsActive, setRedirectIsActive] = useState(true);
  const [integrationScope, setIntegrationScope] = useState<SeoIntegrationScope>('production');
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [integrationSaving, setIntegrationSaving] = useState(false);
  const [integrationSettings, setIntegrationSettings] = useState<DashboardSeoIntegrationSettings>(
    DEFAULT_DASHBOARD_SEO_INTEGRATIONS,
  );

  const seoNav = useMemo(
    () =>
      isSuperadmin
        ? [
            ...SEO_NAV_BASE,
            { href: '/dashboard/seo/integrations', label: 'Integrations', section: 'integrations' as const },
          ]
        : SEO_NAV_BASE,
    [isSuperadmin],
  );

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await adminRequest<DashboardSeoSettings>('/api/admin/seo', {
        actionName: 'admin.seo.settings.read',
      });
      setSettings({ ...DEFAULT_DASHBOARD_SEO_SETTINGS, ...payload });
      setRobotsInput(
        (payload.robotsDisallowPaths ?? DEFAULT_DASHBOARD_SEO_SETTINGS.robotsDisallowPaths).join(
          '\n',
        ),
      );
      setRobotsAdditionalRulesInput(
        (
          payload.robotsAdditionalRules ?? DEFAULT_DASHBOARD_SEO_SETTINGS.robotsAdditionalRules
        ).join('\n'),
      );
      setOrganizationSameAsInput(
        (payload.organizationSameAs ?? DEFAULT_DASHBOARD_SEO_SETTINGS.organizationSameAs).join(
          '\n',
        ),
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load SEO settings.');
    } finally {
      setLoading(false);
    }
  }, [adminRequest]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const loadRedirectRules = useCallback(async () => {
    try {
      const redirectsPayload = await adminRequest<{ items: RedirectRule[] }>(
        '/api/admin/seo/redirects?take=100',
        {
          actionName: 'admin.seo.redirects.list',
        },
      );
      setRedirectRules(redirectsPayload.items ?? []);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to load redirect rules.',
      );
    }
  }, [adminRequest]);

  useEffect(() => {
    if (section !== 'redirects') return;
    void loadRedirectRules();
  }, [loadRedirectRules, section]);

  const loadIntegrationSettings = useCallback(
    async (scope: SeoIntegrationScope) => {
      setIntegrationLoading(true);
      setError(null);
      setSaveMessage(null);
      try {
        const payload = await adminRequest<DashboardSeoIntegrationSettings>(
          `/api/admin/seo/integrations?scope=${encodeURIComponent(scope)}`,
          {
            actionName: 'admin.seo.integrations.read',
          },
        );
        setIntegrationSettings({
          ...DEFAULT_DASHBOARD_SEO_INTEGRATIONS,
          ...payload,
          scope,
          customHeadScriptUrls:
            payload.customHeadScriptUrls ?? DEFAULT_DASHBOARD_SEO_INTEGRATIONS.customHeadScriptUrls,
        });
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load integration settings.',
        );
      } finally {
        setIntegrationLoading(false);
      }
    },
    [adminRequest],
  );

  useEffect(() => {
    if (section !== 'integrations' || !isSuperadmin) return;
    void loadIntegrationSettings(integrationScope);
  }, [integrationScope, isSuperadmin, loadIntegrationSettings, section]);

  const updateIntegrationSetting = useCallback(
    <Key extends keyof DashboardSeoIntegrationSettings>(
      key: Key,
      value: DashboardSeoIntegrationSettings[Key],
    ) => {
      setIntegrationSettings((current) => ({ ...current, [key]: value }));
      setSaveMessage(null);
      setError(null);
    },
    [],
  );

  const saveIntegrationSettings = useCallback(async () => {
    setIntegrationSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const payloadInput: DashboardSeoIntegrationSettingsUpdateInput = {
        googleSiteVerification: integrationSettings.googleSiteVerification,
        bingSiteVerification: integrationSettings.bingSiteVerification,
        gaMeasurementId: integrationSettings.gaMeasurementId,
        googleAdsTagId: integrationSettings.googleAdsTagId,
        adsensePublisherId: integrationSettings.adsensePublisherId,
        clarityProjectId: integrationSettings.clarityProjectId,
        customHeadScriptUrls: integrationSettings.customHeadScriptUrls,
        customHeadInlineScript: integrationSettings.customHeadInlineScript,
        customBodyStartInlineScript: integrationSettings.customBodyStartInlineScript,
        customBodyEndInlineScript: integrationSettings.customBodyEndInlineScript,
      };
      const payload = await adminRequest<DashboardSeoIntegrationSettings>(
        `/api/admin/seo/integrations?scope=${encodeURIComponent(integrationScope)}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payloadInput),
          actionName: 'admin.seo.integrations.update',
        },
      );
      setIntegrationSettings({
        ...DEFAULT_DASHBOARD_SEO_INTEGRATIONS,
        ...payload,
        scope: integrationScope,
        customHeadScriptUrls:
          payload.customHeadScriptUrls ?? DEFAULT_DASHBOARD_SEO_INTEGRATIONS.customHeadScriptUrls,
      });
      setSaveMessage('Saved.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to save integration settings.',
      );
    } finally {
      setIntegrationSaving(false);
    }
  }, [adminRequest, integrationScope, integrationSettings]);

  const updateSetting = useCallback(
    <Key extends keyof DashboardSeoSettings>(key: Key, value: DashboardSeoSettings[Key]) => {
      setSettings((current) => ({ ...current, [key]: value }));
      setSaveMessage(null);
    },
    [],
  );

  const saveSettings = useCallback(
    async (partial?: Partial<DashboardSeoSettingsUpdateInput>) => {
      setSaving(true);
      setError(null);
      setSaveMessage(null);

      const settingsWithoutMeta = Object.fromEntries(
        Object.entries(settings).filter(([key]) => key !== 'updatedAt'),
      ) as DashboardSeoSettingsUpdateInput;
      const nextPayload: DashboardSeoSettingsUpdateInput = {
        ...settingsWithoutMeta,
        ...(partial ?? {}),
        robotsDisallowPaths: robotsInput
          .split('\n')
          .map((value) => value.trim())
          .filter(Boolean),
        robotsAdditionalRules: robotsAdditionalRulesInput
          .split('\n')
          .map((value) => value.trim())
          .filter(Boolean),
        organizationSameAs: organizationSameAsInput
          .split('\n')
          .map((value) => value.trim())
          .filter(Boolean),
      };

      try {
        const payload = await adminRequest<DashboardSeoSettings>('/api/admin/seo', {
          method: 'PATCH',
          body: JSON.stringify(nextPayload),
          actionName: 'admin.seo.settings.update',
        });
        setSettings({ ...DEFAULT_DASHBOARD_SEO_SETTINGS, ...payload });
        setRobotsInput(
          (payload.robotsDisallowPaths ?? DEFAULT_DASHBOARD_SEO_SETTINGS.robotsDisallowPaths).join(
            '\n',
          ),
        );
        setRobotsAdditionalRulesInput(
          (
            payload.robotsAdditionalRules ?? DEFAULT_DASHBOARD_SEO_SETTINGS.robotsAdditionalRules
          ).join('\n'),
        );
        setOrganizationSameAsInput(
          (payload.organizationSameAs ?? DEFAULT_DASHBOARD_SEO_SETTINGS.organizationSameAs).join(
            '\n',
          ),
        );
        setSaveMessage('Saved.');
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to save SEO settings.');
      } finally {
        setSaving(false);
      }
    },
    [adminRequest, organizationSameAsInput, robotsAdditionalRulesInput, robotsInput, settings],
  );

  const sitemapSections = useMemo<Array<[string, boolean]>>(
    () => [
      ['Pages', settings.sitemapIncludePages],
      ['Prompts', settings.sitemapIncludePrompts],
      ['Blog posts', settings.sitemapIncludePosts],
      ['Newsletter issues', settings.sitemapIncludeNewsletter],
      ['Tags', settings.sitemapIncludeTags],
      ['Categories', settings.sitemapIncludeCategories],
      ['Authors', settings.sitemapIncludeAuthors],
    ],
    [settings],
  );

  const sitemapFiles = useMemo(() => {
    const files: string[] = [];
    if (settings.sitemapIncludePages) files.push('/page-sitemap.xml');
    if (settings.sitemapIncludePrompts) files.push('/prompt-sitemap.xml');
    if (settings.sitemapIncludePosts && !settings.noindexBlogPostPages) files.push('/post-sitemap.xml');
    if (settings.sitemapIncludeNewsletter) files.push('/newsletter-sitemap.xml');
    if (settings.sitemapIncludeCategories && !settings.noindexCategoryPages) {
      files.push('/category-sitemap.xml');
    }
    if (settings.sitemapIncludeTags && !settings.noindexTagPages) files.push('/tag-sitemap.xml');
    if (settings.sitemapIncludeAuthors && !settings.noindexAuthorPages) {
      files.push('/author-sitemap.xml');
    }
    return files;
  }, [settings]);

  const filteredRedirectRules = useMemo(() => {
    const query = redirectSearch.trim().toLowerCase();
    if (!query) return redirectRules;
    return redirectRules.filter(
      (rule) =>
        rule.sourcePath.toLowerCase().includes(query) ||
        rule.destinationPath.toLowerCase().includes(query),
    );
  }, [redirectRules, redirectSearch]);

  const createRedirectRule = useCallback(async () => {
    const sourcePath = redirectSourcePath.trim();
    const destinationPath = redirectDestinationPath.trim();
    if (!sourcePath || !destinationPath) {
      setError('Source path and destination path are required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const created = await adminRequest<RedirectRule>('/api/admin/seo/redirects', {
        method: 'POST',
        body: JSON.stringify({
          sourcePath,
          destinationPath,
          isPermanent: redirectIsPermanent,
          isActive: redirectIsActive,
        }),
        actionName: 'admin.seo.redirects.create',
      });
      setRedirectRules((current) => [created, ...current]);
      setRedirectSourcePath('');
      setRedirectDestinationPath('');
      setRedirectIsPermanent(true);
      setRedirectIsActive(true);
      setSaveMessage('Redirect created.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create redirect.');
    } finally {
      setSaving(false);
    }
  }, [
    adminRequest,
    redirectDestinationPath,
    redirectIsActive,
    redirectIsPermanent,
    redirectSourcePath,
  ]);

  const updateRedirectRule = useCallback(
    async (rule: RedirectRule, patch: Partial<RedirectRule>) => {
      try {
        const updated = await adminRequest<RedirectRule>(`/api/admin/seo/redirects/${rule.id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
          actionName: 'admin.seo.redirects.update',
        });
        setRedirectRules((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to update redirect.');
      }
    },
    [adminRequest],
  );

  const removeRedirectRule = useCallback(
    async (ruleId: string) => {
      try {
        await adminRequest(`/api/admin/seo/redirects/${ruleId}`, {
          method: 'DELETE',
          actionName: 'admin.seo.redirects.delete',
        });
        setRedirectRules((current) => current.filter((item) => item.id !== ruleId));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to delete redirect.');
      }
    },
    [adminRequest],
  );

  const activeUpdatedAt =
    section === 'integrations' ? integrationSettings.updatedAt : settings.updatedAt;

  const retryCurrentSection = () => {
    if (section === 'integrations') {
      if (!isSuperadmin) return;
      void loadIntegrationSettings(integrationScope);
      return;
    }
    void loadSettings();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.85rem] font-semibold leading-tight text-[#0f1116]">SEO</h1>
          <p className="mt-1 text-[0.95rem] text-gray-500">
            Manage search appearance, crawl rules, sitemap coverage, and social sharing defaults.
          </p>
        </div>
        <div className="rounded-full border border-[#d9dfeb] bg-white px-4 py-2 text-[0.82rem] font-medium text-[#485264]">
          Updated {formatUpdatedAt(activeUpdatedAt)}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {seoNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 text-[0.85rem] font-medium transition-colors ${
              item.section === section
                ? 'bg-[#111111] text-white'
                : 'border border-[#d9dfeb] bg-white text-[#111111] hover:bg-[#f5f7fb]'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <ActionError error={error} onRetry={retryCurrentSection} />

      {saveMessage ? (
        <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[0.84rem] text-emerald-800">
          {saveMessage}
        </div>
      ) : null}

      {loading && section !== 'integrations' ? (
        <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-10 text-center text-[0.9rem] text-gray-500">
          Loading SEO settings...
        </div>
      ) : null}

      {!loading && section === 'integrations' && !isSuperadmin ? (
        <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-5 text-[0.9rem] text-amber-900">
          Integrations settings are restricted to the protected superadmin account.
        </div>
      ) : null}

      {!loading && section === 'overview' ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Site title" value={settings.siteTitle} />
            <SummaryCard label="Robots" value={settings.robotsSiteIndex ? 'Indexing on' : 'Indexing off'} />
            <SummaryCard label="Twitter card" value={settings.twitterCardType} />
            <SummaryCard
              label="Sitemap sections"
              value={String(sitemapSections.filter(([, enabled]) => enabled).length)}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
              <h2 className="text-[1.1rem] font-semibold text-[#0f1116]">Search appearance</h2>
              <dl className="mt-4 space-y-3 text-[0.9rem] text-[#4a5363]">
                <MetaRow label="Homepage title" value={settings.homepageTitle || settings.siteTitle} />
                <MetaRow
                  label="Homepage description"
                  value={settings.homepageDescription || settings.defaultMetaDescription}
                />
                <MetaRow
                  label="Default OG image"
                  value={settings.defaultOgImageUrl || 'Using site fallback icon'}
                />
                <MetaRow
                  label="Canonical base URL"
                  value={settings.canonicalBaseUrl || 'Using environment app URL'}
                />
              </dl>
            </div>

            <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
              <h2 className="text-[1.1rem] font-semibold text-[#0f1116]">Indexing rules</h2>
              <div className="mt-4 space-y-2 text-[0.88rem] text-[#4a5363]">
                <RulePill label="Search pages" enabled={!settings.noindexSearchPages} positiveLabel="Indexed" negativeLabel="Noindex" />
                <RulePill label="Paginated archives" enabled={!settings.noindexPaginatedArchives} positiveLabel="Indexed" negativeLabel="Noindex" />
                <RulePill label="Author archives" enabled={!settings.noindexAuthorPages} positiveLabel="Indexed" negativeLabel="Noindex" />
                <RulePill label="Tag archives" enabled={!settings.noindexTagPages} positiveLabel="Indexed" negativeLabel="Noindex" />
                <RulePill label="Category archives" enabled={!settings.noindexCategoryPages} positiveLabel="Indexed" negativeLabel="Noindex" />
                <RulePill label="Blog archive" enabled={!settings.noindexBlogArchivePages} positiveLabel="Indexed" negativeLabel="Noindex" />
                <RulePill label="Blog posts" enabled={!settings.noindexBlogPostPages} positiveLabel="Indexed" negativeLabel="Noindex" />
                <RulePill label="Static pages" enabled={!settings.noindexStaticPages} positiveLabel="Indexed" negativeLabel="Noindex" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && section === 'settings' ? (
        <div className="space-y-5">
          <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Site title">
                <input
                  value={settings.siteTitle}
                  onChange={(event) => updateSetting('siteTitle', event.target.value)}
                  className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                />
              </Field>
              <Field label="Title separator">
                <input
                  value={settings.titleSeparator}
                  onChange={(event) => updateSetting('titleSeparator', event.target.value)}
                  className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                />
              </Field>
            </div>

            <div className="mt-4 grid gap-4">
              <Field label="Default meta description">
                <textarea
                  value={settings.defaultMetaDescription}
                  onChange={(event) => updateSetting('defaultMetaDescription', event.target.value)}
                  rows={4}
                  className="rounded-xl border border-[#e3e8f3] px-3 py-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                />
              </Field>

              <Field label="Homepage SEO title">
                <input
                  value={settings.homepageTitle ?? ''}
                  onChange={(event) => updateSetting('homepageTitle', event.target.value || null)}
                  className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                />
              </Field>

              <Field label="Homepage meta description">
                <textarea
                  value={settings.homepageDescription ?? ''}
                  onChange={(event) =>
                    updateSetting('homepageDescription', event.target.value || null)
                  }
                  rows={4}
                  className="rounded-xl border border-[#e3e8f3] px-3 py-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                />
              </Field>

              <Field label="Canonical base URL">
                <input
                  value={settings.canonicalBaseUrl ?? ''}
                  onChange={(event) =>
                    updateSetting('canonicalBaseUrl', event.target.value.trim() || null)
                  }
                  placeholder="https://yourdomain.com"
                  className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
            <h2 className="text-[1.05rem] font-semibold text-[#0f1116]">Indexing defaults</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Toggle
                label="Noindex search pages"
                checked={settings.noindexSearchPages}
                onChange={(value) => updateSetting('noindexSearchPages', value)}
              />
              <Toggle
                label="Noindex paginated archives"
                checked={settings.noindexPaginatedArchives}
                onChange={(value) => updateSetting('noindexPaginatedArchives', value)}
              />
              <Toggle
                label="Noindex author pages"
                checked={settings.noindexAuthorPages}
                onChange={(value) => updateSetting('noindexAuthorPages', value)}
              />
              <Toggle
                label="Noindex tag pages"
                checked={settings.noindexTagPages}
                onChange={(value) => updateSetting('noindexTagPages', value)}
              />
              <Toggle
                label="Noindex category pages"
                checked={settings.noindexCategoryPages}
                onChange={(value) => updateSetting('noindexCategoryPages', value)}
              />
              <Toggle
                label="Noindex blog archive"
                checked={settings.noindexBlogArchivePages}
                onChange={(value) => updateSetting('noindexBlogArchivePages', value)}
              />
              <Toggle
                label="Noindex blog posts"
                checked={settings.noindexBlogPostPages}
                onChange={(value) => updateSetting('noindexBlogPostPages', value)}
              />
              <Toggle
                label="Noindex static pages"
                checked={settings.noindexStaticPages}
                onChange={(value) => updateSetting('noindexStaticPages', value)}
              />
            </div>
          </div>

          <SaveBar onSave={() => void saveSettings()} saving={saving} />
        </div>
      ) : null}

      {!loading && section === 'robots' ? (
        <div className="space-y-5">
          <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <Toggle
                label="Allow search indexing"
                checked={settings.robotsSiteIndex}
                onChange={(value) => updateSetting('robotsSiteIndex', value)}
              />
              <Toggle
                label="Allow crawler follow links"
                checked={settings.robotsSiteFollow}
                onChange={(value) => updateSetting('robotsSiteFollow', value)}
              />
              <Toggle
                label="Block common AI crawlers"
                checked={settings.robotsBlockAiBots}
                onChange={(value) => updateSetting('robotsBlockAiBots', value)}
              />
            </div>

            <div className="mt-4">
              <Field label="Disallow paths">
                <textarea
                  value={robotsInput}
                  onChange={(event) => {
                    setRobotsInput(event.target.value);
                    setSaveMessage(null);
                  }}
                  rows={8}
                  className="rounded-xl border border-[#e3e8f3] px-3 py-3 font-mono text-[0.86rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                />
              </Field>
              <p className="mt-2 text-[0.78rem] text-gray-500">One path per line, for example `/dashboard` or `/login`.</p>
            </div>

            <div className="mt-4">
              <Field label="Additional robots rules">
                <textarea
                  value={robotsAdditionalRulesInput}
                  onChange={(event) => {
                    setRobotsAdditionalRulesInput(event.target.value);
                    setSaveMessage(null);
                  }}
                  rows={6}
                  className="rounded-xl border border-[#e3e8f3] px-3 py-3 font-mono text-[0.86rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                />
              </Field>
              <p className="mt-2 text-[0.78rem] text-gray-500">
                Optional directives (one line each): `User-agent`, `Allow`, `Disallow`, `Sitemap`, `Host`, `Crawl-delay`.
                Add `Sitemap: https://your-domain/sitemap.xml` here to override the default sitemap line.
              </p>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
            <h2 className="text-[1.05rem] font-semibold text-[#0f1116]">Preview</h2>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-[#f7f9fc] p-4 text-[0.8rem] leading-6 text-[#17202f]">
              {buildRobotsPreview({
                ...settings,
                robotsDisallowPaths: robotsInput
                  .split('\n')
                  .map((value) => value.trim())
                  .filter(Boolean),
              },
              robotsInput
                .split('\n')
                .map((value) => value.trim())
                .filter(Boolean),
              robotsAdditionalRulesInput
                .split('\n')
                .map((value) => value.trim())
                .filter(Boolean))}
            </pre>
          </div>

          <SaveBar onSave={() => void saveSettings()} saving={saving} />
        </div>
      ) : null}

      {!loading && section === 'sitemap' ? (
        <div className="space-y-5">
          <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
            <h2 className="text-[1.05rem] font-semibold text-[#0f1116]">Include in sitemap</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Toggle
                label="Pages"
                checked={settings.sitemapIncludePages}
                onChange={(value) => updateSetting('sitemapIncludePages', value)}
              />
              <Toggle
                label="Prompts"
                checked={settings.sitemapIncludePrompts}
                onChange={(value) => updateSetting('sitemapIncludePrompts', value)}
              />
              <Toggle
                label="Blog posts"
                checked={settings.sitemapIncludePosts}
                onChange={(value) => updateSetting('sitemapIncludePosts', value)}
              />
              <Toggle
                label="Newsletter issues"
                checked={settings.sitemapIncludeNewsletter}
                onChange={(value) => updateSetting('sitemapIncludeNewsletter', value)}
              />
              <Toggle
                label="Tags"
                checked={settings.sitemapIncludeTags}
                onChange={(value) => updateSetting('sitemapIncludeTags', value)}
              />
              <Toggle
                label="Categories"
                checked={settings.sitemapIncludeCategories}
                onChange={(value) => updateSetting('sitemapIncludeCategories', value)}
              />
              <Toggle
                label="Authors"
                checked={settings.sitemapIncludeAuthors}
                onChange={(value) => updateSetting('sitemapIncludeAuthors', value)}
              />
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
            <h2 className="text-[1.05rem] font-semibold text-[#0f1116]">Coverage summary</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sitemapSections.map(([label, enabled]) => (
                <div
                  key={label}
                  className="rounded-[16px] border border-[#edf1f8] bg-[#f9fbff] px-4 py-3 text-[0.88rem] text-[#4a5363]"
                >
                  <div className="font-medium text-[#111111]">{label}</div>
                  <div className="mt-1">{enabled ? 'Included' : 'Excluded'}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
            <h2 className="text-[1.05rem] font-semibold text-[#0f1116]">Sitemap index preview</h2>
            <p className="mt-2 text-[0.84rem] text-gray-500">Main index: `/sitemap.xml`</p>
            <div className="mt-4 space-y-2">
              {sitemapFiles.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-[#d9dfeb] px-4 py-4 text-[0.85rem] text-[#6b7280]">
                  No sitemap files enabled.
                </div>
              ) : (
                sitemapFiles.map((filePath) => (
                  <div
                    key={filePath}
                    className="rounded-[12px] border border-[#edf1f8] bg-[#f9fbff] px-3 py-2 font-mono text-[0.8rem] text-[#334155]"
                  >
                    {filePath}
                  </div>
                ))
              )}
            </div>
          </div>

          <SaveBar onSave={() => void saveSettings()} saving={saving} />
        </div>
      ) : null}

      {!loading && section === 'social' ? (
        <div className="space-y-5">
          <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
            <div className="grid gap-4">
              <Field label="Default Open Graph image URL">
                <input
                  value={settings.defaultOgImageUrl ?? ''}
                  onChange={(event) => updateSetting('defaultOgImageUrl', event.target.value || null)}
                  placeholder="https://example.com/og-image.jpg"
                  className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                />
              </Field>

              <Field label="Default Open Graph image alt">
                <input
                  value={settings.defaultOgImageAlt ?? ''}
                  onChange={(event) => updateSetting('defaultOgImageAlt', event.target.value || null)}
                  className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                />
              </Field>

              <Field label="Twitter card type">
                <select
                  value={settings.twitterCardType}
                  onChange={(event) =>
                    updateSetting(
                      'twitterCardType',
                      event.target.value as DashboardSeoSettings['twitterCardType'],
                    )
                  }
                  className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                >
                  <option value="summary_large_image">Summary Large Image</option>
                  <option value="summary">Summary</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
            <h2 className="text-[1.05rem] font-semibold text-[#0f1116]">Schema defaults</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Toggle
                label="Organization schema"
                checked={settings.schemaOrganizationEnabled}
                onChange={(value) => updateSetting('schemaOrganizationEnabled', value)}
              />
              <Toggle
                label="Website schema"
                checked={settings.schemaWebsiteEnabled}
                onChange={(value) => updateSetting('schemaWebsiteEnabled', value)}
              />
              <Toggle
                label="WebPage schema"
                checked={settings.schemaWebPageEnabled}
                onChange={(value) => updateSetting('schemaWebPageEnabled', value)}
              />
              <Toggle
                label="FAQ schema"
                checked={settings.schemaFaqEnabled}
                onChange={(value) => updateSetting('schemaFaqEnabled', value)}
              />
              <Toggle
                label="Collection & ItemList schema"
                checked={settings.schemaCollectionEnabled}
                onChange={(value) => updateSetting('schemaCollectionEnabled', value)}
              />
              <Toggle
                label="Article schema"
                checked={settings.schemaArticleEnabled}
                onChange={(value) => updateSetting('schemaArticleEnabled', value)}
              />
              <Toggle
                label="Profile schema"
                checked={settings.schemaProfileEnabled}
                onChange={(value) => updateSetting('schemaProfileEnabled', value)}
              />
              <Toggle
                label="Breadcrumb schema"
                checked={settings.schemaBreadcrumbEnabled}
                onChange={(value) => updateSetting('schemaBreadcrumbEnabled', value)}
              />
              <Toggle
                label="Prompt schema"
                checked={settings.schemaPromptEnabled}
                onChange={(value) => updateSetting('schemaPromptEnabled', value)}
              />
              <Toggle
                label="Search schema"
                checked={settings.schemaSearchEnabled}
                onChange={(value) => updateSetting('schemaSearchEnabled', value)}
              />
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
            <h2 className="text-[1.05rem] font-semibold text-[#0f1116]">Organization profile</h2>
            <div className="mt-4 grid gap-4">
              <Field label="Organization name">
                <input
                  value={settings.organizationName ?? ''}
                  onChange={(event) => updateSetting('organizationName', event.target.value || null)}
                  className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                />
              </Field>
              <Field label="Organization logo URL">
                <input
                  value={settings.organizationLogoUrl ?? ''}
                  onChange={(event) => updateSetting('organizationLogoUrl', event.target.value || null)}
                  placeholder="https://example.com/logo.png"
                  className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                />
              </Field>
              <Field label="Organization social links (one per line)">
                <textarea
                  value={organizationSameAsInput}
                  onChange={(event) => {
                    setOrganizationSameAsInput(event.target.value);
                    setSaveMessage(null);
                  }}
                  rows={4}
                  className="rounded-xl border border-[#e3e8f3] px-3 py-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
            <h2 className="text-[1.05rem] font-semibold text-[#0f1116]">Search verification</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Google verification token">
                <input
                  value={settings.googleSiteVerification ?? ''}
                  onChange={(event) =>
                    updateSetting('googleSiteVerification', event.target.value || null)
                  }
                  className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                />
              </Field>
              <Field label="Bing verification token">
                <input
                  value={settings.bingSiteVerification ?? ''}
                  onChange={(event) => updateSetting('bingSiteVerification', event.target.value || null)}
                  className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                />
              </Field>
            </div>
          </div>

          <SaveBar onSave={() => void saveSettings()} saving={saving} />
        </div>
      ) : null}

      {!loading && section === 'integrations' && isSuperadmin ? (
        <div className="space-y-5">
          <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
            <h2 className="text-[1.05rem] font-semibold text-[#0f1116]">Environment scope</h2>
            <p className="mt-2 text-[0.84rem] text-gray-500">
              Configure separate integrations for development, staging, and production.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,280px)_auto] md:items-end">
              <Field label="Scope">
                <select
                  value={integrationScope}
                  onChange={(event) => {
                    const value = event.target.value as SeoIntegrationScope;
                    setIntegrationScope(value);
                    setSaveMessage(null);
                    setError(null);
                  }}
                  className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                >
                  {SEO_INTEGRATION_SCOPES.map((scope) => (
                    <option key={scope} value={scope}>
                      {scope.charAt(0).toUpperCase()}
                      {scope.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
              <button
                type="button"
                onClick={() => void loadIntegrationSettings(integrationScope)}
                disabled={integrationLoading}
                className="h-11 rounded-full border border-[#d9dfeb] px-5 text-[0.85rem] font-medium text-[#111111] transition-colors hover:bg-[#f5f7fb] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {integrationLoading ? 'Loading...' : 'Reload'}
              </button>
            </div>
          </div>

          {!integrationLoading ? (
            <>
              <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
                <h2 className="text-[1.05rem] font-semibold text-[#0f1116]">Verification tokens</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Google Search Console token">
                    <input
                      value={integrationSettings.googleSiteVerification ?? ''}
                      onChange={(event) =>
                        updateIntegrationSetting(
                          'googleSiteVerification',
                          event.target.value.trim() || null,
                        )
                      }
                      className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                    />
                  </Field>
                  <Field label="Bing verification token">
                    <input
                      value={integrationSettings.bingSiteVerification ?? ''}
                      onChange={(event) =>
                        updateIntegrationSetting(
                          'bingSiteVerification',
                          event.target.value.trim() || null,
                        )
                      }
                      className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
                <h2 className="text-[1.05rem] font-semibold text-[#0f1116]">Analytics & Ads</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="GA4 measurement ID (G-XXXX)">
                    <input
                      value={integrationSettings.gaMeasurementId ?? ''}
                      onChange={(event) =>
                        updateIntegrationSetting(
                          'gaMeasurementId',
                          event.target.value.trim() || null,
                        )
                      }
                      className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                    />
                  </Field>
                  <Field label="Google Ads gtag ID (AW-XXXX)">
                    <input
                      value={integrationSettings.googleAdsTagId ?? ''}
                      onChange={(event) =>
                        updateIntegrationSetting(
                          'googleAdsTagId',
                          event.target.value.trim() || null,
                        )
                      }
                      className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                    />
                  </Field>
                  <Field label="AdSense publisher ID (ca-pub-...)">
                    <input
                      value={integrationSettings.adsensePublisherId ?? ''}
                      onChange={(event) =>
                        updateIntegrationSetting(
                          'adsensePublisherId',
                          event.target.value.trim() || null,
                        )
                      }
                      className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                    />
                  </Field>
                  <Field label="Microsoft Clarity project ID">
                    <input
                      value={integrationSettings.clarityProjectId ?? ''}
                      onChange={(event) =>
                        updateIntegrationSetting(
                          'clarityProjectId',
                          event.target.value.trim() || null,
                        )
                      }
                      className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
                <h2 className="text-[1.05rem] font-semibold text-[#0f1116]">Custom scripts</h2>
                <div className="mt-4 grid gap-4">
                  <Field label="Custom head script URLs (one per line, https only)">
                    <textarea
                      rows={4}
                      value={integrationSettings.customHeadScriptUrls.join('\n')}
                      onChange={(event) =>
                        updateIntegrationSetting(
                          'customHeadScriptUrls',
                          event.target.value
                            .split('\n')
                            .map((value) => value.trim())
                            .filter(Boolean),
                        )
                      }
                      className="rounded-xl border border-[#e3e8f3] px-3 py-3 text-[0.9rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                    />
                  </Field>
                  <Field label="Custom head inline script">
                    <textarea
                      rows={4}
                      value={integrationSettings.customHeadInlineScript ?? ''}
                      onChange={(event) =>
                        updateIntegrationSetting(
                          'customHeadInlineScript',
                          event.target.value.trim() || null,
                        )
                      }
                      className="rounded-xl border border-[#e3e8f3] px-3 py-3 font-mono text-[0.84rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                    />
                  </Field>
                  <Field label="Custom body-start inline script">
                    <textarea
                      rows={4}
                      value={integrationSettings.customBodyStartInlineScript ?? ''}
                      onChange={(event) =>
                        updateIntegrationSetting(
                          'customBodyStartInlineScript',
                          event.target.value.trim() || null,
                        )
                      }
                      className="rounded-xl border border-[#e3e8f3] px-3 py-3 font-mono text-[0.84rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                    />
                  </Field>
                  <Field label="Custom body-end inline script">
                    <textarea
                      rows={4}
                      value={integrationSettings.customBodyEndInlineScript ?? ''}
                      onChange={(event) =>
                        updateIntegrationSetting(
                          'customBodyEndInlineScript',
                          event.target.value.trim() || null,
                        )
                      }
                      className="rounded-xl border border-[#e3e8f3] px-3 py-3 font-mono text-[0.84rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
                <h2 className="text-[1.05rem] font-semibold text-[#0f1116]">Snippet preview</h2>
                <pre className="mt-4 overflow-x-auto rounded-xl bg-[#f7f9fc] p-4 text-[0.82rem] leading-6 text-[#17202f]">
                  {buildIntegrationsSnippetPreview(integrationSettings)}
                </pre>
              </div>

              <SaveBar onSave={() => void saveIntegrationSettings()} saving={integrationSaving} />
            </>
          ) : (
            <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-10 text-center text-[0.9rem] text-gray-500">
              Loading integrations settings...
            </div>
          )}
        </div>
      ) : null}

      {!loading && section === 'redirects' ? (
        <div className="space-y-5">
          <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
            <h2 className="text-[1.05rem] font-semibold text-[#0f1116]">Create redirect</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Source path">
                <input
                  value={redirectSourcePath}
                  onChange={(event) => setRedirectSourcePath(event.target.value)}
                  placeholder="/old-url"
                  className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                />
              </Field>
              <Field label="Destination path">
                <input
                  value={redirectDestinationPath}
                  onChange={(event) => setRedirectDestinationPath(event.target.value)}
                  placeholder="/new-url or https://example.com/new-url"
                  className="h-11 rounded-xl border border-[#e3e8f3] px-3 text-[0.92rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Toggle
                label="Permanent (301)"
                checked={redirectIsPermanent}
                onChange={setRedirectIsPermanent}
              />
              <Toggle
                label="Active"
                checked={redirectIsActive}
                onChange={setRedirectIsActive}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void createRedirectRule()}
                disabled={saving}
                className="rounded-full bg-[#111111] px-5 py-2.5 text-[0.86rem] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Create redirect'}
              </button>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[1.05rem] font-semibold text-[#0f1116]">Redirect rules</h2>
              <input
                value={redirectSearch}
                onChange={(event) => setRedirectSearch(event.target.value)}
                placeholder="Search redirects"
                className="h-10 rounded-xl border border-[#e3e8f3] px-3 text-[0.86rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
              />
            </div>

            <div className="mt-4 space-y-3">
              {filteredRedirectRules.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-[#d9dfeb] px-4 py-5 text-[0.88rem] text-[#6b7280]">
                  No redirect rules yet.
                </div>
              ) : (
                filteredRedirectRules.map((rule) => (
                  <div key={rule.id} className="rounded-[16px] border border-[#edf1f8] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-mono text-[0.82rem] text-[#111111]">{rule.sourcePath}</div>
                        <div className="font-mono text-[0.8rem] text-[#4b5563]">{rule.destinationPath}</div>
                        <div className="flex flex-wrap gap-2 pt-1 text-[0.72rem] text-[#6b7280]">
                          <span className="rounded-full bg-[#f3f4f6] px-2 py-1">
                            {rule.isPermanent ? '301 Permanent' : '302 Temporary'}
                          </span>
                          <span className="rounded-full bg-[#f3f4f6] px-2 py-1">
                            {rule.hitCount} hits
                          </span>
                          <span className="rounded-full bg-[#f3f4f6] px-2 py-1">
                            {rule.isActive ? 'Active' : 'Paused'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void updateRedirectRule(rule, { isActive: !rule.isActive })
                          }
                          className="rounded-full border border-[#d9dfeb] px-3 py-1.5 text-[0.76rem] font-medium text-[#111111] hover:bg-[#f5f7fb]"
                        >
                          {rule.isActive ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void updateRedirectRule(rule, { isPermanent: !rule.isPermanent })
                          }
                          className="rounded-full border border-[#d9dfeb] px-3 py-1.5 text-[0.76rem] font-medium text-[#111111] hover:bg-[#f5f7fb]"
                        >
                          Make {rule.isPermanent ? '302' : '301'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeRedirectRule(rule.id)}
                          className="rounded-full border border-red-200 px-3 py-1.5 text-[0.76rem] font-medium text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#e8ecf4] bg-white p-4">
      <div className="text-[0.78rem] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-[1rem] font-semibold text-[#0f1116]">{value}</div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.75rem] font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-[#111111]">{value}</dd>
    </div>
  );
}

function RulePill({
  label,
  enabled,
  positiveLabel,
  negativeLabel,
}: {
  label: string;
  enabled: boolean;
  positiveLabel: string;
  negativeLabel: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[14px] border border-[#edf1f8] bg-[#f9fbff] px-3 py-2">
      <span>{label}</span>
      <span className={`rounded-full px-2.5 py-1 text-[0.75rem] font-medium ${enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
        {enabled ? positiveLabel : negativeLabel}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[0.78rem] font-semibold uppercase tracking-wide text-gray-500">
      {label}
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-[14px] border border-[#edf1f8] bg-[#f9fbff] px-4 py-3 text-[0.9rem] text-[#111111]">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#111111]"
      />
    </label>
  );
}

function SaveBar({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-full bg-[#111111] px-5 py-2.5 text-[0.86rem] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Save changes'}
      </button>
    </div>
  );
}
