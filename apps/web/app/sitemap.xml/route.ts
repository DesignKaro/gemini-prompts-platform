import {
  createXmlResponse,
  getSitemapIndexSections,
  renderSitemapIndex,
} from '../../lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sections = await getSitemapIndexSections();
    return createXmlResponse(renderSitemapIndex(sections));
  } catch (error) {
    console.warn('[sitemap] Failed to render sitemap index', error);
    return createXmlResponse(renderSitemapIndex([]));
  }
}
