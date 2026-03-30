import { createXmlResponse, getSitemapSection, renderSitemapUrlSet } from '../../lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const section = await getSitemapSection('author');
    return createXmlResponse(renderSitemapUrlSet(section.entries));
  } catch (error) {
    console.warn('[sitemap] Failed to render author sitemap', error);
    return createXmlResponse(renderSitemapUrlSet([]));
  }
}
