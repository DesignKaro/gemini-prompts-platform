import { createXmlResponse, getSitemapIndexXml, renderSitemapIndex } from '../../lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const xml = await getSitemapIndexXml();
    return createXmlResponse(xml);
  } catch (error) {
    console.warn('[sitemap] Failed to render sitemap index', error);
    return createXmlResponse(renderSitemapIndex([]));
  }
}
