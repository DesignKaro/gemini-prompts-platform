const API_BASE_URL =
  process.env.API_URL?.replace(/\/$/, '') ??
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  'http://localhost:4000';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

export function normalizeAvatarUrl(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith('/')) {
    return `${API_BASE_URL}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' && !LOCAL_HOSTNAMES.has(parsed.hostname)) {
      parsed.protocol = 'https:';
    }
    return parsed.toString();
  } catch {
    return `${API_BASE_URL}/${trimmed.replace(/^\/+/, '')}`;
  }
}

export function buildAvatarSrc(value?: string | null, updatedAt?: string | null): string | null {
  const normalized = normalizeAvatarUrl(value);
  if (!normalized || !updatedAt || normalized.startsWith('data:')) {
    return normalized;
  }
  return `${normalized}${normalized.includes('?') ? '&' : '?'}v=${encodeURIComponent(updatedAt)}`;
}

export function getInitial(value?: string | null): string {
  const normalized = value?.trim();
  if (!normalized) return 'U';
  return normalized.slice(0, 1).toUpperCase();
}
