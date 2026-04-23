import { buildMetadata, getSeoSettings } from '../../lib/seo';
import { SeoSchemaScripts } from '../components/seo-schema-script';
import { buildBreadcrumbSchema, buildWebPageSchema } from '../../lib/structured-data';
import { getNormalizedBaseUrl } from '../../lib/seo';
import { HelpCenterClient } from './help-center-client';

export async function generateMetadata() {
  const settings = await getSeoSettings();

  return buildMetadata({
    title: 'Help Center',
    description: 'Search support resources, product guides, and account help for Gemini Prompts.',
    path: '/help',
    noIndex: settings.noindexStaticPages,
  });
}

export default async function HelpPage() {
  const settings = await getSeoSettings();
  const baseUrl = getNormalizedBaseUrl(settings);
  const pageUrl = `${baseUrl}/help`;
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: 'Help Center',
        description:
          'Search support resources, product guides, and account help for Gemini Prompts.',
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Help', item: pageUrl },
        ],
        pageUrl,
      ),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <main className="page-shell-tight bg-white">
      <SeoSchemaScripts items={schemaItems} noIndex={settings.noindexStaticPages} />
      <HelpCenterClient />
    </main>
  );
}
