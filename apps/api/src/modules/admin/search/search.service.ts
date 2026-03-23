import { Injectable } from '@nestjs/common';
import { MediaStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../../auth/auth.service';
import type { AuthUser } from '../../auth/types/auth-user.type';

type SuggestionResponse = {
  categories: Array<{ id: string; label: string; slug?: string }>;
  tags: Array<{ id: string; label: string; slug?: string }>;
  prompts: Array<{ id: string; label: string; status?: string | null }>;
  posts: Array<{ id: string; label: string; status?: string | null; format?: string | null }>;
  media: Array<{ id: string; label: string; url?: string | null }>;
};

type SearchResultsResponse = {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    stats?: { posts: number; prompts: number };
    updatedAt?: string;
    createdAt?: string;
  }>;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    usage?: number;
    updatedAt?: string;
    createdAt?: string;
  }>;
  prompts: Array<{
    id: string;
    title: string;
    status?: string | null;
    updatedAt?: string;
    createdAt?: string;
    primaryCategory?: { id: string; name: string } | null;
    categories?: Array<{ id: string; name: string }>;
  }>;
  posts: Array<{
    id: string;
    title: string;
    status?: string | null;
    postFormat?: string | null;
    updatedAt?: string;
    createdAt?: string;
  }>;
  media: Array<{
    id: string;
    title?: string | null;
    url?: string | null;
    mime?: string | null;
    size?: number | null;
    createdAt?: string;
  }>;
};

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  private async resolvePermissions(user: AuthUser): Promise<string[]> {
    if (user.permissions && user.permissions.length > 0) {
      return user.permissions;
    }
    const resolved = await this.authService.resolvePermissions(user.sub, user.role, user.email);
    return resolved.permissions ?? [];
  }

  async getSuggestions(user: AuthUser, search: string, take: number): Promise<SuggestionResponse> {
    const term = search.trim();
    if (!term) {
      return { categories: [], tags: [], prompts: [], posts: [], media: [] };
    }

    const limit = Number.isFinite(take) ? Math.max(1, Math.min(take, 8)) : 4;
    const permissions = await this.resolvePermissions(user);
    const isSuperadmin = user.role === UserRole.SUPERADMIN;
    const hasAny = (list: string[]) =>
      isSuperadmin || list.some((permission) => permissions.includes(permission));

    const canCategories = hasAny(['categories:read', 'categories:manage']);
    const canTags = hasAny(['tags:read', 'tags:manage']);
    const canPrompts = hasAny(['prompts:read', 'prompts:manage']);
    const canPosts = hasAny(['posts:read', 'posts:manage']);
    const canMedia = hasAny(['media:read', 'media:manage']);

    const tasks: Array<Promise<unknown>> = [];
    const results: SuggestionResponse = {
      categories: [],
      tags: [],
      prompts: [],
      posts: [],
      media: [],
    };

    if (canCategories) {
      tasks.push(
        this.prisma.category
          .findMany({
            where: {
              deletedAt: null,
              OR: [{ name: { contains: term } }, { slug: { contains: term } }],
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            select: { id: true, name: true, slug: true },
          })
          .then((items) => {
            results.categories = items.map((item) => ({
              id: item.id,
              label: item.name,
              slug: item.slug,
            }));
          }),
      );
    }

    if (canTags) {
      tasks.push(
        this.prisma.tag
          .findMany({
            where: {
              deletedAt: null,
              OR: [{ name: { contains: term } }, { slug: { contains: term } }],
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            select: { id: true, name: true, slug: true },
          })
          .then((items) => {
            results.tags = items.map((item) => ({
              id: item.id,
              label: item.name,
              slug: item.slug,
            }));
          }),
      );
    }

    if (canPrompts) {
      tasks.push(
        this.prisma.prompt
          .findMany({
            where: {
              deletedAt: null,
              OR: [{ title: { contains: term } }, { description: { contains: term } }],
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            select: { id: true, title: true, status: true },
          })
          .then((items) => {
            results.prompts = items.map((item) => ({
              id: item.id,
              label: item.title,
              status: item.status,
            }));
          }),
      );
    }

    if (canPosts) {
      tasks.push(
        this.prisma.post
          .findMany({
            where: {
              deletedAt: null,
              OR: [{ title: { contains: term } }, { excerpt: { contains: term } }],
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            select: { id: true, title: true, status: true, postFormat: true },
          })
          .then((items) => {
            results.posts = items.map((item) => ({
              id: item.id,
              label: item.title,
              status: item.status,
              format: item.postFormat,
            }));
          }),
      );
    }

    if (canMedia) {
      tasks.push(
        this.prisma.mediaAsset
          .findMany({
            where: {
              deletedAt: null,
              status: MediaStatus.ACTIVE,
              OR: [{ title: { contains: term } }, { url: { contains: term } }],
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            select: { id: true, title: true, url: true },
          })
          .then((items) => {
            results.media = items.map((item) => ({
              id: item.id,
              label: item.title ?? item.url,
              url: item.url,
            }));
          }),
      );
    }

    if (tasks.length === 0) {
      return results;
    }

    await Promise.all(tasks);
    return results;
  }

  async getResults(user: AuthUser, search: string, take: number): Promise<SearchResultsResponse> {
    const term = search.trim();
    if (!term) {
      return { categories: [], tags: [], prompts: [], posts: [], media: [] };
    }

    const limit = Number.isFinite(take) ? Math.max(1, Math.min(take, 50)) : 20;
    const permissions = await this.resolvePermissions(user);
    const isSuperadmin = user.role === UserRole.SUPERADMIN;
    const hasAny = (list: string[]) =>
      isSuperadmin || list.some((permission) => permissions.includes(permission));

    const canCategories = hasAny(['categories:read', 'categories:manage']);
    const canTags = hasAny(['tags:read', 'tags:manage']);
    const canPrompts = hasAny(['prompts:read', 'prompts:manage']);
    const canPosts = hasAny(['posts:read', 'posts:manage']);
    const canMedia = hasAny(['media:read', 'media:manage']);

    const results: SearchResultsResponse = {
      categories: [],
      tags: [],
      prompts: [],
      posts: [],
      media: [],
    };

    const tasks: Array<Promise<void>> = [];

    if (canCategories) {
      tasks.push(
        this.prisma.category
          .findMany({
            where: {
              deletedAt: null,
              OR: [{ name: { contains: term } }, { slug: { contains: term } }],
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            include: { _count: { select: { prompts: true, posts: true } } },
          })
          .then((items) => {
            results.categories = items.map((item) => ({
              id: item.id,
              name: item.name,
              slug: item.slug,
              stats: { prompts: item._count.prompts, posts: item._count.posts },
              updatedAt: item.updatedAt.toISOString(),
              createdAt: item.createdAt.toISOString(),
            }));
          }),
      );
    }

    if (canTags) {
      tasks.push(
        this.prisma.tag
          .findMany({
            where: {
              deletedAt: null,
              OR: [{ name: { contains: term } }, { slug: { contains: term } }],
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            include: { _count: { select: { prompts: true, posts: true } } },
          })
          .then((items) => {
            results.tags = items.map((item) => ({
              id: item.id,
              name: item.name,
              slug: item.slug,
              usage: item._count.prompts + item._count.posts,
              updatedAt: item.updatedAt.toISOString(),
              createdAt: item.createdAt.toISOString(),
            }));
          }),
      );
    }

    if (canPrompts) {
      tasks.push(
        this.prisma.prompt
          .findMany({
            where: {
              deletedAt: null,
              OR: [{ title: { contains: term } }, { description: { contains: term } }],
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            select: {
              id: true,
              title: true,
              status: true,
              updatedAt: true,
              createdAt: true,
              primaryCategory: { select: { id: true, name: true } },
              categories: { select: { id: true, name: true } },
            },
          })
          .then((items) => {
            results.prompts = items.map((item) => ({
              id: item.id,
              title: item.title,
              status: item.status,
              updatedAt: item.updatedAt.toISOString(),
              createdAt: item.createdAt.toISOString(),
              primaryCategory: item.primaryCategory,
              categories: item.categories,
            }));
          }),
      );
    }

    if (canPosts) {
      tasks.push(
        this.prisma.post
          .findMany({
            where: {
              deletedAt: null,
              OR: [{ title: { contains: term } }, { excerpt: { contains: term } }],
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            select: {
              id: true,
              title: true,
              status: true,
              postFormat: true,
              updatedAt: true,
              createdAt: true,
            },
          })
          .then((items) => {
            results.posts = items.map((item) => ({
              id: item.id,
              title: item.title,
              status: item.status,
              postFormat: item.postFormat,
              updatedAt: item.updatedAt.toISOString(),
              createdAt: item.createdAt.toISOString(),
            }));
          }),
      );
    }

    if (canMedia) {
      tasks.push(
        this.prisma.mediaAsset
          .findMany({
            where: {
              deletedAt: null,
              status: MediaStatus.ACTIVE,
              OR: [{ title: { contains: term } }, { url: { contains: term } }],
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
              id: true,
              title: true,
              url: true,
              mime: true,
              size: true,
              createdAt: true,
            },
          })
          .then((items) => {
            results.media = items.map((item) => ({
              id: item.id,
              title: item.title,
              url: item.url,
              mime: item.mime,
              size: item.size,
              createdAt: item.createdAt.toISOString(),
            }));
          }),
      );
    }

    if (tasks.length === 0) {
      return results;
    }

    await Promise.all(tasks);
    return results;
  }
}
