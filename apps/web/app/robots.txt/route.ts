import { AI_BOT_USER_AGENTS, getBaseUrl, getSeoSettings } from '../../lib/seo';

const ROBOTS_CONTENT_TYPE = 'text/plain; charset=utf-8';
const ROBOTS_CACHE_CONTROL = 'public, max-age=0, s-maxage=300, stale-while-revalidate=600';

function getHostValue(baseUrl: string) {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

export const revalidate = 300;

export async function GET() {
  try {
    const settings = await getSeoSettings();
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

    if (settings.robotsAdditionalRules.length > 0) {
      lines.push('', ...settings.robotsAdditionalRules);
    }

    lines.push('', `Sitemap: ${baseUrl}/sitemap.xml`, `Host: ${getHostValue(baseUrl)}`);

    return new Response(lines.join('\n'), {
      headers: {
        'Content-Type': ROBOTS_CONTENT_TYPE,
        'Cache-Control': ROBOTS_CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.warn('[robots] Failed to render robots.txt', error);
    return new Response('User-agent: *\nDisallow: /\n', {
      headers: {
        'Content-Type': ROBOTS_CONTENT_TYPE,
        'Cache-Control': ROBOTS_CACHE_CONTROL,
      },
    });
  }
}
