import { createHmac, timingSafeEqual } from 'node:crypto';

type JwtPrimitive = string | number | boolean | null | undefined;
type JwtPayloadValue = JwtPrimitive | JwtPrimitive[];
type JwtPayloadBase = Record<string, JwtPayloadValue>;

function base64urlEncode(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function base64urlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function signJwt<T extends JwtPayloadBase>(
  payload: T,
  secret: string,
  expiresInSeconds: number,
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const completePayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(completePayload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', secret).update(data).digest('base64url');

  return `${data}.${signature}`;
}

export function verifyJwt<T extends JwtPayloadBase>(token: string, secret: string): T {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format.');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error('Invalid token structure.');
  }

  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac('sha256', secret).update(data).digest('base64url');
  const incoming = Buffer.from(encodedSignature);
  const expected = Buffer.from(expectedSignature);

  if (incoming.length !== expected.length || !timingSafeEqual(incoming, expected)) {
    throw new Error('Invalid signature.');
  }

  const parsed = JSON.parse(base64urlDecode(encodedPayload)) as T & { exp?: number };
  if (!parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired.');
  }

  return parsed;
}
