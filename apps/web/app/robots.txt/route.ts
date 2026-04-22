import { AI_BOT_USER_AGENTS, getBaseUrl, getSeoSettingsFresh } from '../../lib/seo';

const ROBOTS_CONTENT_TYPE = 'text/plain; charset=utf-8';
const ROBOTS_CACHE_CONTROL = 'public, max-age=0, s-maxage=300, stale-while-revalidate=600';
const ROBOTS_GENERATOR_HEADER = 'next-app-route-2026-03-31';
const VALID_ROBOTS_DIRECTIVES = new Set([
  'user-agent',
  'allow',
  'disallow',
  'sitemap',
  'host',
  'crawl-delay',
]);

function getHostValue(baseUrl: string) {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

export const dynamic = 'force-dynamic';

function sanitizeAdditionalRobotsRules(rules: string[]) {
  return rules
    .flatMap((rawRule) =>
      rawRule
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .filter((rule) => {
      if (rule.startsWith('#')) return true;
      const separatorIndex = rule.indexOf(':');
      if (separatorIndex <= 0) return false;
      const directive = rule.slice(0, separatorIndex).trim().toLowerCase();
      return VALID_ROBOTS_DIRECTIVES.has(directive);
    });
}

function sanitizeRenderedRobotsLines(lines: string[]) {
  return lines.filter((line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return true;
    if (trimmed.startsWith('#')) return true;
    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex <= 0) return false;
    const directive = trimmed.slice(0, separatorIndex).trim().toLowerCase();
    return VALID_ROBOTS_DIRECTIVES.has(directive);
  });
}

function hasDirective(rule: string, directive: string) {
  const separatorIndex = rule.indexOf(':');
  if (separatorIndex <= 0) return false;
  return rule.slice(0, separatorIndex).trim().toLowerCase() === directive;
}

export async function GET() {
  try {
    const settings = await getSeoSettingsFresh();
    const customRobotsText = settings.robotsCustomText?.trim();
    if (customRobotsText) {
      return new Response(settings.robotsCustomText, {
        headers: {
          'Content-Type': ROBOTS_CONTENT_TYPE,
          'Cache-Control': ROBOTS_CACHE_CONTROL,
          'X-GP-Robots-Generator': ROBOTS_GENERATOR_HEADER,
        },
      });
    }

    const baseUrl = getBaseUrl(settings);
    const lines: string[] = ['User-agent: *'];

    if (settings.robotsSiteIndex) {
      lines.push('Allow: /');
      for (const path of settings.robotsDisallowPaths) {
        lines.push(`Disallow: ${path}`);
      }
    } else {
      lines.push('Disallow: /');
    }

    if (settings.robotsBlockAiBots) {
      for (const userAgent of AI_BOT_USER_AGENTS) {
        lines.push('', `User-agent: ${userAgent}`, 'Disallow: /');
      }
    }

    const safeAdditionalRules = sanitizeAdditionalRobotsRules(settings.robotsAdditionalRules);
    const hasCustomSitemap = safeAdditionalRules.some((rule) => hasDirective(rule, 'sitemap'));
    const hasCustomHost = safeAdditionalRules.some((rule) => hasDirective(rule, 'host'));
    if (safeAdditionalRules.length > 0) {
      lines.push('', ...safeAdditionalRules);
    }

    const generatedFooter: string[] = [];
    if (!hasCustomSitemap) {
      generatedFooter.push(`Sitemap: ${baseUrl}/sitemap.xml`);
    }
    if (!hasCustomHost) {
      generatedFooter.push(`Host: ${getHostValue(baseUrl)}`);
    }
    if (generatedFooter.length > 0) {
      lines.push('', ...generatedFooter);
    }

    const safeRenderedLines = sanitizeRenderedRobotsLines(lines);

    return new Response(safeRenderedLines.join('\n'), {
      headers: {
        'Content-Type': ROBOTS_CONTENT_TYPE,
        'Cache-Control': ROBOTS_CACHE_CONTROL,
        'X-GP-Robots-Generator': ROBOTS_GENERATOR_HEADER,
      },
    });
  } catch (error) {
    console.warn('[robots] Failed to render robots.txt', error);
    return new Response('User-agent: *\nDisallow: /\n', {
      headers: {
        'Content-Type': ROBOTS_CONTENT_TYPE,
        'Cache-Control': ROBOTS_CACHE_CONTROL,
        'X-GP-Robots-Generator': ROBOTS_GENERATOR_HEADER,
      },
    });
  }
}
