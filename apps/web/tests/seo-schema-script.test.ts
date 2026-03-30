// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { normalizeSchemaItems } from '../app/components/seo-schema-script';

describe('seo schema script normalization', () => {
  it('deduplicates schema entries using @type + @id', () => {
    const items = normalizeSchemaItems([
      {
        family: 'webpage',
        schema: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': 'https://example.com/#webpage',
          name: 'Example page',
        },
      },
      {
        family: 'webpage',
        schema: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': 'https://example.com/#webpage',
          name: 'Example page duplicate',
        },
      },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]?.schema['@id']).toBe('https://example.com/#webpage');
  });

  it('drops invalid schema values before render', () => {
    const items = normalizeSchemaItems([
      {
        family: 'website',
        schema: null,
      },
      {
        family: 'organization',
        schema: 'invalid',
      },
      {
        family: 'website',
        schema: {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          '@id': 'https://example.com/#website',
          url: 'https://example.com/',
          name: 'Example',
        },
      },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]?.family).toBe('website');
  });
});
