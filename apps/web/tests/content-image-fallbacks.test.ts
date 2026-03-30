import { describe, expect, it } from 'vitest';
import { resolvePromptImage } from '../lib/content-image-fallbacks';

describe('content image fallbacks', () => {
  it('keeps inline image data URLs', () => {
    const inlineImage = 'data:image/png;base64,aGVsbG8=';
    expect(resolvePromptImage(inlineImage, 'prompt-1')).toBe(inlineImage);
  });

  it('falls back for unresolved media refs', () => {
    const resolved = resolvePromptImage('media:asset_1', 'prompt-2');
    expect(typeof resolved).toBe('string');
    expect(resolved.startsWith('https://images.unsplash.com/')).toBe(true);
  });
});
