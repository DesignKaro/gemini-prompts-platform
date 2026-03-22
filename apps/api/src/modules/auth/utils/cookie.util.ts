export function readCookie(cookieHeader: string | undefined, cookieName: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  const segments = cookieHeader.split(';');
  for (const segment of segments) {
    const [key, ...valueParts] = segment.trim().split('=');
    if (key !== cookieName) {
      continue;
    }

    const value = valueParts.join('=').trim();
    if (!value) {
      return undefined;
    }

    return decodeURIComponent(value);
  }

  return undefined;
}
