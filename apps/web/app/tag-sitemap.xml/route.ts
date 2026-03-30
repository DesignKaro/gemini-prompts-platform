import { createXmlResponse, getSitemapSection, renderSitemapUrlSet } from '../../lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const section = await getSitemapSection('tag');
    return createXmlResponse(renderSitemapUrlSet(section.entries));
  } catch (error) {
    console.warn('[sitemap] Failed to render tag sitemap', error);
    return createXmlResponse(renderSitemapUrlSet([]));
  }
}
