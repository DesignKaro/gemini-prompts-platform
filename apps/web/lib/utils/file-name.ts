export function getFileStem(fileName: string) {
  const normalized = fileName.trim();
  if (!normalized) {
    return '';
  }

  const lastSlash = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
  const lastDot = normalized.lastIndexOf('.');

  if (lastDot <= lastSlash + 1) {
    return normalized;
  }

  return normalized.slice(0, lastDot);
}
