import { buildMetadata, getSeoSettings } from '../../lib/seo';
import { SeoSchemaScripts } from '../components/seo-schema-script';
import { buildBreadcrumbSchema, buildWebPageSchema } from '../../lib/structured-data';
import { getNormalizedBaseUrl } from '../../lib/seo';

export async function generateMetadata() {
  const settings = await getSeoSettings();

  return buildMetadata({
    title: 'Help',
    description: 'Support resources, product guides, and help links for Gemini Prompts.',
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
        name: 'Help',
        description: 'Support resources, product guides, and help links for Gemini Prompts.',
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
      <div className="page-container-wide">
        <div className="rounded-[24px] border border-[#e6e9ef] bg-white p-6 shadow-[0_14px_34px_rgba(19,24,32,0.06)] sm:p-8">
          <h1 className="text-[2rem] leading-[1.1] text-[#10151f]">Help</h1>
          <p className="mt-3 text-[1rem] text-[#5e6677]">
            Need a hand? This area is reserved for help guides and support links.
          </p>
        </div>
      </div>
    </main>
  );
}
