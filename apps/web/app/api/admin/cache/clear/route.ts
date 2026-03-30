import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { auth } from '@/auth';
import { hasAnyPermission, isSuperadminSession } from '@/lib/utils/permissions';
import { bumpPublicCacheVersion } from '@/lib/public-cache-version';
import { PUBLIC_CONTENT_CACHE_TAG } from '@/lib/public-content';

function canClearPublicCache(session: Awaited<ReturnType<typeof auth>>) {
  if (!session) {
    return false;
  }
  if (isSuperadminSession(session)) {
    return true;
  }
  return hasAnyPermission(session, [
    'prompts:manage',
    'posts:manage',
    'categories:manage',
    'tags:manage',
    'users:manage',
  ]);
}

export async function POST() {
  const session = await auth();
  if (!canClearPublicCache(session)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const version = bumpPublicCacheVersion();
  revalidateTag(PUBLIC_CONTENT_CACHE_TAG);
  revalidatePath('/', 'layout');

  return NextResponse.json({
    ok: true,
    message: 'Public site cache cleared.',
    cacheVersion: version,
    clearedAt: new Date().toISOString(),
  });
}
