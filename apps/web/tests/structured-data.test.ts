// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  buildBreadcrumbSchema,
  buildItemListSchema,
  buildProfileSchemas,
  buildPromptSchema,
  buildSearchResultsSchema,
  getPromptPath,
} from '../lib/structured-data';

describe('structured-data helpers', () => {
  it('builds breadcrumb schema with ordered list items', () => {
    const schema = buildBreadcrumbSchema(
      [
        { name: 'Home', item: 'https://example.com/' },
        { name: 'Blog', item: 'https://example.com/blog' },
      ],
      'https://example.com/blog',
    );

    expect(schema?.['@type']).toBe('BreadcrumbList');
    expect(Array.isArray(schema?.itemListElement) ? schema?.itemListElement.length : 0).toBe(2);
  });

  it('builds creative work prompt schema from prompt data', () => {
    const schema = buildPromptSchema({
      url: 'https://example.com/design/hero-prompt',
      title: 'Hero prompt',
      description: 'Prompt description',
      authorName: 'Alex Doe',
      categoryName: 'Design',
      promptType: 'IMAGE',
      visibility: 'FREE',
      tags: ['landing page', 'ui'],
      image: 'https://example.com/image.jpg',
      publishedAt: '2026-03-29T00:00:00.000Z',
      updatedAt: '2026-03-29T04:00:00.000Z',
    });

    expect(schema?.['@type']).toBe('CreativeWork');
    expect(schema?.name).toBe('Hero prompt');
    expect(schema?.creator).toMatchObject({ '@type': 'Person', name: 'Alex Doe' });
  });

  it('builds search results schema with search action', () => {
    const schema = buildSearchResultsSchema({
      url: 'https://example.com/search?q=prompt',
      query: 'prompt',
      totalResults: 12,
    });

    expect(schema?.['@type']).toBe('SearchResultsPage');
    expect(schema?.potentialAction).toMatchObject({ '@type': 'SearchAction' });
    expect(schema).not.toHaveProperty('query');
  });

  it('filters invalid item list rows and keeps valid items', () => {
    const schema = buildItemListSchema({
      url: 'https://example.com/latest',
      name: 'Latest prompts',
      items: [
        { name: 'Prompt A', url: 'https://example.com/prompt-a' },
        { name: '', url: 'https://example.com/invalid' },
      ],
    });

    expect(schema?.['@type']).toBe('ItemList');
    expect(Array.isArray(schema?.itemListElement) ? schema?.itemListElement.length : 0).toBe(1);
  });

  it('returns both person and profile schemas for author pages', () => {
    const entries = buildProfileSchemas({
      profileUrl: 'https://example.com/u/alex',
      personName: 'Alex',
      description: 'Prompt creator',
      image: 'https://example.com/avatar.png',
      jobTitle: 'Creator',
    });

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.schema['@type'])).toEqual(['Person', 'ProfilePage']);
  });

  it('builds prompt path using category when available', () => {
    const withCategory = getPromptPath({
      slug: 'hero-prompt',
      primaryCategory: { slug: 'design' },
      categories: [],
    });
    const fallback = getPromptPath({
      slug: 'hero-prompt',
      primaryCategory: null,
      categories: [],
    });

    expect(withCategory).toBe('/design/hero-prompt');
    expect(fallback).toBe('/prompt/hero-prompt');
  });
});
