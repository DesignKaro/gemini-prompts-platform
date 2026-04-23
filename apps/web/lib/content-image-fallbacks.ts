const PROMPT_IMAGE_FALLBACKS = [
  'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200',
];

const POST_IMAGE_FALLBACKS = [
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
  'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
  'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
];

export const CATEGORY_IMAGE_FALLBACK =
  'https://media.geminiprompts.io/gemini_prompts/media/2026/03/a3835e04888835117f5a4b41fbca7ee2.avif';

function normalizeImage(value?: string | null) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  // Media placeholders should be resolved server-side before reaching the UI.
  if (normalized.startsWith('media:')) {
    return null;
  }

  return normalized;
}

function hashKey(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickDeterministicFallback(key: string, fallbacks: string[]) {
  const safeKey = key.trim() || 'default';
  const hashed = hashKey(safeKey);
  return fallbacks[hashed % fallbacks.length] ?? fallbacks[0]!;
}

export function resolvePromptImage(image?: string | null, key?: string | null) {
  return (
    normalizeImage(image) ?? pickDeterministicFallback(key?.trim() || '', PROMPT_IMAGE_FALLBACKS)
  );
}

export function resolvePostImage(image?: string | null, key?: string | null) {
  return (
    normalizeImage(image) ?? pickDeterministicFallback(key?.trim() || '', POST_IMAGE_FALLBACKS)
  );
}

export function resolveCategoryImage(image?: string | null, key?: string | null) {
  // Keep `key` in the API for call-site compatibility, even with a single shared fallback.
  void key;
  return normalizeImage(image) ?? CATEGORY_IMAGE_FALLBACK;
}
