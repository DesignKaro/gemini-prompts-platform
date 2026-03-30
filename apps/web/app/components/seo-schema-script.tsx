import { getSeoSettings, type SeoSettings } from '../../lib/seo';
import {
  sanitizeSchema,
  type SchemaFamily,
  type StructuredSchemaEntry,
} from '../../lib/structured-data';

export type SchemaToggleType = SchemaFamily;

type SeoSchemaScriptProps = {
  type: SchemaToggleType;
  schema: Record<string, unknown>;
  noIndex?: boolean;
};

export type RawSchemaInput = {
  family: SchemaFamily;
  schema: unknown;
};

type SeoSchemaScriptsProps = {
  items: RawSchemaInput[];
  noIndex?: boolean;
};

function isSchemaEnabled(settings: SeoSettings, type: SchemaToggleType) {
  switch (type) {
    case 'organization':
      return settings.schemaOrganizationEnabled;
    case 'website':
      return settings.schemaWebsiteEnabled;
    case 'webpage':
      return settings.schemaWebPageEnabled;
    case 'faq':
      return settings.schemaFaqEnabled;
    case 'collection':
      return settings.schemaCollectionEnabled;
    case 'article':
      return settings.schemaArticleEnabled;
    case 'profile':
      return settings.schemaProfileEnabled;
    case 'breadcrumb':
      return settings.schemaBreadcrumbEnabled;
    case 'prompt':
      return settings.schemaPromptEnabled;
    case 'search':
      return settings.schemaSearchEnabled;
    default:
      return false;
  }
}

function readSchemaIdentity(schema: Record<string, unknown>, index: number) {
  const schemaType = typeof schema['@type'] === 'string' ? schema['@type'] : `schema-${index}`;
  const schemaId = typeof schema['@id'] === 'string' ? schema['@id'] : null;
  return schemaId ? `${schemaType}:${schemaId}` : `${schemaType}:${index}`;
}

export function normalizeSchemaItems(items: RawSchemaInput[]) {
  const deduped = new Map<string, StructuredSchemaEntry>();

  for (const [index, item] of items.entries()) {
    if (!item.schema || typeof item.schema !== 'object' || Array.isArray(item.schema)) {
      continue;
    }
    const normalizedSchema = sanitizeSchema(item.schema as Record<string, unknown>);
    if (!normalizedSchema) {
      continue;
    }
    const key = readSchemaIdentity(normalizedSchema, index);
    if (!deduped.has(key)) {
      deduped.set(key, {
        family: item.family,
        schema: normalizedSchema,
      });
    }
  }

  return Array.from(deduped.values());
}

export async function SeoSchemaScripts({ items, noIndex = false }: SeoSchemaScriptsProps) {
  if (noIndex || items.length === 0) {
    return null;
  }

  const settings = await getSeoSettings();
  const normalizedItems = normalizeSchemaItems(items).filter((item) =>
    isSchemaEnabled(settings, item.family),
  );

  if (normalizedItems.length === 0) {
    return null;
  }

  return (
    <>
      {normalizedItems.map((item, index) => (
        <script
          key={readSchemaIdentity(item.schema, index)}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item.schema) }}
        />
      ))}
    </>
  );
}

export async function SeoSchemaScript({ type, schema, noIndex = false }: SeoSchemaScriptProps) {
  return <SeoSchemaScripts items={[{ family: type, schema }]} noIndex={noIndex} />;
}
