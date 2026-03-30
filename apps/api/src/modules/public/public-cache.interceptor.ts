import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { Observable, map } from 'rxjs';

const NO_STORE_VALUE = 'private, no-store, max-age=0';

function normalizePath(pathname?: string | null): string {
  if (!pathname) return '/';
  const withoutQuery = pathname.split('?')[0] ?? pathname;
  if (!withoutQuery) return '/';
  return withoutQuery.endsWith('/') && withoutQuery.length > 1
    ? withoutQuery.slice(0, -1)
    : withoutQuery;
}

function resolveCacheControl(pathname: string): string | null {
  if (pathname === '/api/public/home') {
    return 'public, max-age=60, stale-while-revalidate=300';
  }

  if (pathname === '/api/public/search') {
    return 'public, max-age=30, stale-while-revalidate=90';
  }

  if (
    pathname === '/api/public/prompts' ||
    pathname === '/api/public/posts' ||
    pathname === '/api/public/categories' ||
    pathname === '/api/public/tags' ||
    pathname === '/api/public/authors'
  ) {
    return 'public, max-age=120, stale-while-revalidate=300';
  }

  if (/^\/api\/public\/prompts\/[^/]+$/.test(pathname)) {
    return 'public, max-age=180, stale-while-revalidate=600';
  }

  if (/^\/api\/public\/posts\/[^/]+$/.test(pathname)) {
    return 'public, max-age=180, stale-while-revalidate=600';
  }

  if (/^\/api\/public\/categories\/[^/]+$/.test(pathname)) {
    return 'public, max-age=300, stale-while-revalidate=900';
  }

  if (/^\/api\/public\/tags\/[^/]+$/.test(pathname)) {
    return 'public, max-age=300, stale-while-revalidate=900';
  }

  if (/^\/api\/public\/authors\/[^/]+$/.test(pathname)) {
    const slug = pathname.split('/').at(-1) ?? '';
    if (slug === 'following' || slug === 'follow') {
      return null;
    }
    return 'public, max-age=180, stale-while-revalidate=600';
  }

  return null;
}

function mergeVary(existing: string | number | string[] | undefined, value: string): string {
  const existingValues = Array.isArray(existing)
    ? existing.join(',')
    : typeof existing === 'string'
      ? existing
      : typeof existing === 'number'
        ? String(existing)
        : '';

  const values = new Set(
    `${existingValues},${value}`
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );

  return Array.from(values).join(', ');
}

function createWeakETag(payload: unknown): string {
  const serialized = JSON.stringify(payload ?? null);
  const hash = createHash('sha1').update(serialized).digest('base64url');
  return `W/"${hash}"`;
}

@Injectable()
export class PublicCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const pathname = normalizePath(request.originalUrl || request.url);
    const method = request.method.toUpperCase();
    const hasAuthorizationHeader = Boolean(request.headers.authorization);
    const cacheControl = method === 'GET' ? resolveCacheControl(pathname) : null;

    if (!cacheControl || hasAuthorizationHeader) {
      response.setHeader('Cache-Control', NO_STORE_VALUE);
      response.setHeader(
        'Vary',
        mergeVary(response.getHeader('Vary'), 'Authorization, Accept-Encoding'),
      );
      return next.handle();
    }

    response.setHeader('Cache-Control', cacheControl);
    response.setHeader('Vary', mergeVary(response.getHeader('Vary'), 'Accept-Encoding'));

    return next.handle().pipe(
      map((payload) => {
        response.setHeader('ETag', createWeakETag(payload));
        return payload;
      }),
    );
  }
}
