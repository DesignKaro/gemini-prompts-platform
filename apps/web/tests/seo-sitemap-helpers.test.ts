// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getBaseUrl, getNormalizedBaseUrl } from '../lib/seo';
import { renderSitemapIndex, renderSitemapUrlSet } from '../lib/sitemap';

describe('seo base url helpers', () => {
  it('prefers canonicalBaseUrl when provided', () => {
    expect(getBaseUrl({ canonicalBaseUrl: 'https://Example.com/path/' })).toBe(
      'https://example.com/path',
    );
    expect(getNormalizedBaseUrl({ canonicalBaseUrl: 'https://Example.com/path/' })).toBe(
      'https://example.com/path',
    );
  });
});

describe('sitemap xml render helpers', () => {
  it('renders urlset xml with escaped values', () => {
    const xml = renderSitemapUrlSet([
      {
        loc: 'https://example.com/?a=1&b=2',
        lastmod: '2026-03-28T10:00:00.000Z',
      },
    ]);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://example.com/?a=1&amp;b=2</loc>');
    expect(xml).toContain('<lastmod>2026-03-28T10:00:00.000Z</lastmod>');
  });

  it('renders sitemapindex xml with child sitemaps', () => {
    const xml = renderSitemapIndex([
      {
        key: 'page',
        path: '/page-sitemap.xml',
        url: 'https://example.com/page-sitemap.xml',
        enabled: true,
        entries: [{ loc: 'https://example.com/' }],
        lastmod: '2026-03-28T10:00:00.000Z',
      },
      {
        key: 'prompt',
        path: '/prompt-sitemap.xml',
        url: 'https://example.com/prompt-sitemap.xml?x=1&y=2',
        enabled: true,
        entries: [{ loc: 'https://example.com/prompts' }],
      },
    ]);

    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://example.com/page-sitemap.xml</loc>');
    expect(xml).toContain('<lastmod>2026-03-28T10:00:00.000Z</lastmod>');
    expect(xml).toContain('<loc>https://example.com/prompt-sitemap.xml?x=1&amp;y=2</loc>');
  });
});
