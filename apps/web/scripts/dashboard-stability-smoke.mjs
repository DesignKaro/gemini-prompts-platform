#!/usr/bin/env node

import crypto from 'node:crypto';

const apiBase = (process.env.DASHBOARD_SMOKE_API_BASE || 'http://127.0.0.1:4000/api').replace(
  /\/$/,
  '',
);
const token = process.env.DASHBOARD_SMOKE_TOKEN;

if (!token) {
  console.error(
    'Missing DASHBOARD_SMOKE_TOKEN. Provide a dashboard admin bearer token for smoke checks.',
  );
  process.exit(1);
}

const cleanupTasks = [];
const startedAt = Date.now();

function randomSuffix() {
  return crypto.randomBytes(4).toString('hex');
}

function messageFromPayload(payload) {
  if (!payload) return null;
  if (typeof payload === 'string') return payload.trim() || null;
  if (Array.isArray(payload?.message)) {
    const joined = payload.message
      .map((entry) => String(entry).trim())
      .filter(Boolean)
      .join('. ');
    return joined || null;
  }
  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }
  return null;
}

async function request(action, path, options = {}) {
  const method = options.method || 'GET';
  const expectedStatuses = options.expectedStatuses || [200];
  const headers = {
    Authorization: `Bearer ${token}`,
    'x-request-id': `smoke-${randomSuffix()}`,
    'x-dashboard-action': action,
    ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
    ...(options.headers || {}),
  };

  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const contentType = response.headers.get('content-type') || '';
  const payload =
    response.status === 204
      ? null
      : contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => null);

  if (!expectedStatuses.includes(response.status)) {
    const requestId = response.headers.get('x-request-id') || payload?.requestId || 'n/a';
    const message = messageFromPayload(payload) || response.statusText || 'Request failed';
    throw new Error(
      `[${action}] expected status ${expectedStatuses.join(', ')} but got ${
        response.status
      }. ${message} (requestId=${requestId})`,
    );
  }

  return payload;
}

async function run() {
  console.log(`[dashboard-smoke] starting against ${apiBase}`);

  await request('unauthorized.admin.analytics', '/admin/analytics?range=30', {
    expectedStatuses: [401],
    headers: { Authorization: '' },
  });

  await request('analytics.read', '/admin/analytics?range=30');
  await request('activity.read', '/admin/activity?take=5');
  await request('categories.read', '/admin/categories?take=5');
  await request('tags.read', '/admin/tags?take=5');
  await request('prompts.read', '/admin/prompts?take=5');
  await request('posts.read', '/admin/posts?take=5');
  await request('media.read', '/admin/media?take=5');
  await request('comments.read', '/admin/comments?take=5');
  await request('users.read', '/admin/users?take=5');
  await request('roles.read', '/admin/roles');
  await request('search.suggestions', '/admin/search-suggestions?search=smoke&take=3');
  await request('search.results', '/admin/search?search=smoke&take=3');
  const profileSummary = await request('profile.summary', '/auth/profile/summary');

  const categorySlug = `smoke-category-${randomSuffix()}`;
  const category = await request('categories.create', '/admin/categories', {
    method: 'POST',
    body: {
      name: `Smoke Category ${randomSuffix()}`,
      slug: categorySlug,
      description: 'Smoke category',
    },
  });
  cleanupTasks.push(() =>
    request('cleanup.categories.delete', `/admin/categories/${category.id}`, { method: 'DELETE' }),
  );

  await request('categories.update', `/admin/categories/${category.id}`, {
    method: 'PATCH',
    body: { description: 'Smoke category updated' },
  });
  await request('categories.delete', `/admin/categories/${category.id}`, { method: 'DELETE' });
  await request('categories.restore', `/admin/categories/${category.id}/restore`, {
    method: 'PATCH',
  });

  const tagSlug = `smoke-tag-${randomSuffix()}`;
  const tag = await request('tags.create', '/admin/tags', {
    method: 'POST',
    body: {
      name: `Smoke Tag ${randomSuffix()}`,
      slug: tagSlug,
      color: '#334155',
    },
  });
  cleanupTasks.push(() =>
    request('cleanup.tags.delete', `/admin/tags/${tag.id}`, { method: 'DELETE' }),
  );

  await request('tags.update', `/admin/tags/${tag.id}`, {
    method: 'PATCH',
    body: { color: '#0f172a' },
  });
  await request('tags.delete', `/admin/tags/${tag.id}`, { method: 'DELETE' });
  await request('tags.restore', `/admin/tags/${tag.id}/restore`, { method: 'PATCH' });

  const duplicateCategorySlug = `smoke-dup-category-${randomSuffix()}`;
  const duplicateCategory = await request('categories.create.dup-base', '/admin/categories', {
    method: 'POST',
    body: {
      name: `Dup Category ${randomSuffix()}`,
      slug: duplicateCategorySlug,
    },
  });
  cleanupTasks.push(() =>
    request('cleanup.categories.dup-delete', `/admin/categories/${duplicateCategory.id}`, {
      method: 'DELETE',
    }),
  );
  await request('categories.conflict', '/admin/categories', {
    method: 'POST',
    body: {
      name: `Dup Category Second ${randomSuffix()}`,
      slug: duplicateCategorySlug,
    },
    expectedStatuses: [409],
  });

  await request('categories.invalid.body', '/admin/categories', {
    method: 'POST',
    body: {},
    expectedStatuses: [400],
  });
  await request('categories.invalid.query', '/admin/categories?take=abc', {
    expectedStatuses: [400],
  });

  const prompt = await request('prompts.create', '/admin/prompts', {
    method: 'POST',
    body: {
      title: `Smoke Prompt ${randomSuffix()}`,
      slug: `smoke-prompt-${randomSuffix()}`,
      content: 'Smoke prompt content',
      promptType: 'CONTENT',
      status: 'DRAFT',
      visibility: 'FREE',
      primaryCategoryId: category.id,
      categoryIds: [category.id],
      tagIds: [tag.id],
    },
  });
  cleanupTasks.push(() =>
    request('cleanup.prompts.delete', `/admin/prompts/${prompt.id}`, { method: 'DELETE' }),
  );

  await request('prompts.update', `/admin/prompts/${prompt.id}`, {
    method: 'PATCH',
    body: { title: `Smoke Prompt Updated ${randomSuffix()}` },
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await request(`prompts.loop.status.${attempt + 1}`, `/admin/prompts/${prompt.id}/status`, {
      method: 'PATCH',
      body: { status: attempt % 2 === 0 ? 'DRAFT' : 'PUBLISHED' },
    });
  }
  await request('prompts.status', `/admin/prompts/${prompt.id}/status`, {
    method: 'PATCH',
    body: { status: 'PUBLISHED' },
  });
  await request('prompts.status.invalid', `/admin/prompts/${prompt.id}/status`, {
    method: 'PATCH',
    body: { status: 'INVALID_STATUS' },
    expectedStatuses: [400],
  });
  await request('prompts.delete', `/admin/prompts/${prompt.id}`, { method: 'DELETE' });
  await request('prompts.restore', `/admin/prompts/${prompt.id}/restore`, { method: 'PATCH' });

  const post = await request('posts.create', '/admin/posts', {
    method: 'POST',
    body: {
      title: `Smoke Post ${randomSuffix()}`,
      slug: `smoke-post-${randomSuffix()}`,
      content: 'Smoke post content',
      status: 'DRAFT',
      visibility: 'FREE',
      postType: 'POST',
      postFormat: 'STANDARD',
      primaryCategoryId: category.id,
      categoryIds: [category.id],
      tagIds: [tag.id],
    },
  });
  cleanupTasks.push(() =>
    request('cleanup.posts.delete', `/admin/posts/${post.id}`, { method: 'DELETE' }),
  );

  await request('posts.update', `/admin/posts/${post.id}`, {
    method: 'PATCH',
    body: { title: `Smoke Post Updated ${randomSuffix()}` },
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await request(`posts.loop.status.${attempt + 1}`, `/admin/posts/${post.id}`, {
      method: 'PATCH',
      body: { status: attempt % 2 === 0 ? 'DRAFT' : 'PUBLISHED' },
    });
  }
  await request('posts.delete', `/admin/posts/${post.id}`, { method: 'DELETE' });
  await request('posts.restore', `/admin/posts/${post.id}/restore`, { method: 'PATCH' });

  const media = await request('media.create', '/admin/media', {
    method: 'POST',
    body: {
      title: `Smoke Media ${randomSuffix()}`,
      url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6V8mQAAAAASUVORK5CYII=',
      mime: 'image/png',
    },
  });
  cleanupTasks.push(() =>
    request('cleanup.media.delete', `/admin/media/${media.id}`, { method: 'DELETE' }),
  );

  await request('media.update', `/admin/media/${media.id}`, {
    method: 'PATCH',
    body: { title: `Smoke Media Updated ${randomSuffix()}` },
  });
  await request('media.delete', `/admin/media/${media.id}`, { method: 'DELETE' });
  await request('media.restore', `/admin/media/${media.id}/restore`, { method: 'PATCH' });

  const comment = await request('comments.create', '/admin/comments', {
    method: 'POST',
    body: {
      targetType: 'PROMPT',
      targetId: prompt.id,
      content: `Smoke comment ${randomSuffix()}`,
      status: 'PENDING',
    },
  });
  cleanupTasks.push(() =>
    request('cleanup.comments.delete', `/admin/comments/${comment.id}`, { method: 'DELETE' }),
  );

  await request('comments.reply', `/admin/comments/${comment.id}/reply`, {
    method: 'POST',
    body: { content: `Smoke reply ${randomSuffix()}` },
  });
  await request('comments.update', `/admin/comments/${comment.id}`, {
    method: 'PATCH',
    body: { status: 'APPROVED' },
  });
  await request('comments.delete', `/admin/comments/${comment.id}`, { method: 'DELETE' });

  const permissions = await request('roles.permissions', '/admin/roles/permissions');
  const permissionCodes = Array.isArray(permissions)
    ? permissions.map((permission) => permission.code).filter(Boolean)
    : [];
  const role = await request('roles.create', '/admin/roles', {
    method: 'POST',
    body: {
      name: `Smoke Role ${randomSuffix()}`,
      description: 'Smoke test role',
      permissionCodes: permissionCodes.slice(0, 2),
    },
  });
  cleanupTasks.push(() =>
    request('cleanup.roles.delete', `/admin/roles/${role.id}`, { method: 'DELETE' }),
  );
  await request('roles.update', `/admin/roles/${role.id}`, {
    method: 'PATCH',
    body: { description: 'Smoke role updated' },
  });

  const user = await request('users.create', '/admin/users', {
    method: 'POST',
    body: {
      name: `Smoke User ${randomSuffix()}`,
      email: `smoke-user-${randomSuffix()}@example.com`,
      password: 'SmokePass123!',
      role: 'USER',
      roleIds: [role.id],
    },
  });
  cleanupTasks.push(() =>
    request('cleanup.users.delete', `/admin/users/${user.id}`, { method: 'DELETE' }),
  );

  await request('users.update', `/admin/users/${user.id}`, {
    method: 'PATCH',
    body: { role: 'USER' },
  });
  await request('users.roles.update', `/admin/users/${user.id}/roles`, {
    method: 'PATCH',
    body: { roleIds: [role.id] },
  });
  await request('users.suspend', `/admin/users/${user.id}/suspend`, { method: 'PATCH' });
  await request('users.activate', `/admin/users/${user.id}/activate`, { method: 'PATCH' });
  await request('users.delete', `/admin/users/${user.id}`, { method: 'DELETE' });

  await request('roles.delete', `/admin/roles/${role.id}`, { method: 'DELETE' });

  const profileUser = profileSummary?.user ?? {};
  await request('profile.update', '/auth/profile', {
    method: 'PATCH',
    body: {
      name: profileUser.name || '',
      ...(profileUser.handle ? { handle: profileUser.handle } : {}),
      profileTitle: profileUser.profileTitle || '',
      bio: profileUser.bio || '',
      focusTags: Array.isArray(profileUser.focusTags) ? profileUser.focusTags : [],
      avatarUrl: profileUser.avatarUrl || null,
    },
  });

  console.log(`[dashboard-smoke] passed in ${Date.now() - startedAt}ms`);
}

run()
  .catch(async (error) => {
    console.error(`[dashboard-smoke] failed: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const task of cleanupTasks.reverse()) {
      try {
        await task();
      } catch {
        // Cleanup should be best-effort to avoid hiding primary smoke failures.
      }
    }
  });
