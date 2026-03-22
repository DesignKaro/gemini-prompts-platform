import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { normalizePagination } from '../../../common/utils/pagination';
import {
  ImagePromptMode,
  Prisma,
  PromptStatus,
  PromptType,
  PromptVisibility,
  WebsitePromptKind,
} from '@prisma/client';

export type PromptCreateInput = {
  title: string;
  slug: string;
  description?: string | null;
  content: string;
  promptType: PromptType;
  imageMode?: ImagePromptMode | null;
  websitePromptKind?: WebsitePromptKind | null;
  websiteComponent?: string | null;
  websiteFeature?: string | null;
  visibility?: PromptVisibility;
  status?: PromptStatus;
  featuredImageUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  scheduledAt?: string | Date | null;
  primaryCategoryId?: string | null;
  categoryIds?: string[];
  tagIds?: string[];
};

export type PromptUpdateInput = Partial<PromptCreateInput>;

@Injectable()
export class PromptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private readonly mediaRefPrefix = 'media:';

  private extractMediaRef(value?: string | null): string | null {
    if (!value) return null;
    if (!value.startsWith(this.mediaRefPrefix)) return null;
    const id = value.slice(this.mediaRefPrefix.length).trim();
    return id || null;
  }

  private async hydrateFeaturedImages<T extends { featuredImageUrl?: string | null }>(
    items: T[],
  ): Promise<Array<T & { featuredImageRef?: string | null }>> {
    const ids = new Set<string>();
    for (const item of items) {
      const refId = this.extractMediaRef(item.featuredImageUrl ?? null);
      if (refId) ids.add(refId);
    }

    if (ids.size === 0) return items as Array<T & { featuredImageRef?: string | null }>;

    const assets = await this.prisma.mediaAsset.findMany({
      where: { id: { in: Array.from(ids) } },
      select: { id: true, url: true },
    });

    const assetMap = new Map(assets.map((asset) => [asset.id, asset.url]));

    return items.map((item) => {
      const raw = item.featuredImageUrl ?? null;
      const refId = this.extractMediaRef(raw);
      if (!refId) return item as T & { featuredImageRef?: string | null };
      return {
        ...item,
        featuredImageUrl: assetMap.get(refId) ?? null,
        featuredImageRef: raw,
      } as T & { featuredImageRef?: string | null };
    });
  }

  private async resolveCategoryIds(categoryIds?: string[], primaryCategoryId?: string | null) {
    const uniqueIds = Array.from(new Set((categoryIds ?? []).filter(Boolean)));
    const lookupIds = primaryCategoryId
      ? Array.from(new Set([...uniqueIds, primaryCategoryId]))
      : uniqueIds;
    if (lookupIds.length === 0) {
      return { categoryIds: uniqueIds, primaryCategoryId: primaryCategoryId ?? null };
    }
    const existing = await this.prisma.category.findMany({
      where: { id: { in: lookupIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((item) => item.id));
    return {
      categoryIds: uniqueIds.filter((id) => existingIds.has(id)),
      primaryCategoryId: primaryCategoryId && existingIds.has(primaryCategoryId) ? primaryCategoryId : null,
    };
  }

  private async resolveTagIds(tagIds?: string[]) {
    const uniqueIds = Array.from(new Set((tagIds ?? []).filter(Boolean)));
    if (uniqueIds.length === 0) return [];
    const existing = await this.prisma.tag.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((item) => item.id));
    return uniqueIds.filter((id) => existingIds.has(id));
  }

  private resolvePublicationStateForCreate(input: {
    status?: PromptStatus;
    scheduledAt?: string | Date | null;
  }) {
    const status = input.status ?? 'DRAFT';
    const scheduledAt =
      status === 'SCHEDULED' && input.scheduledAt ? new Date(input.scheduledAt) : null;
    const publishedAt = status === 'PUBLISHED' ? new Date() : null;

    return {
      status,
      scheduledAt,
      publishedAt,
    };
  }

  private resolvePublicationStateForUpdate(
    current: {
      status: PromptStatus;
      publishedAt: Date | null;
      scheduledAt: Date | null;
    },
    input: {
      status?: PromptStatus;
      scheduledAt?: string | Date | null;
    },
  ) {
    const nextStatus = input.status ?? current.status;
    const shouldUpdateStatus = input.status !== undefined;
    const shouldUpdateSchedule = input.scheduledAt !== undefined || shouldUpdateStatus;

    let scheduledAt = current.scheduledAt;
    if (input.scheduledAt !== undefined) {
      scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    }

    if (nextStatus === 'PUBLISHED' || nextStatus === 'DRAFT' || nextStatus === 'ARCHIVED') {
      scheduledAt = null;
    }

    let publishedAt = current.publishedAt;
    if (nextStatus === 'PUBLISHED') {
      publishedAt = current.status === 'PUBLISHED' ? current.publishedAt ?? new Date() : new Date();
    } else if (nextStatus === 'DRAFT' || nextStatus === 'SCHEDULED') {
      publishedAt = null;
    }

    return {
      status: shouldUpdateStatus ? nextStatus : undefined,
      scheduledAt: shouldUpdateSchedule ? scheduledAt : undefined,
      publishedAt: shouldUpdateStatus ? publishedAt : undefined,
    };
  }

  async findAll(options: {
    skip?: number;
    take?: number;
    search?: string;
    status?: PromptStatus;
    visibility?: PromptVisibility;
    categoryId?: string;
    tagId?: string;
    sort?: 'recent' | 'views' | 'az';
    trash?: boolean;
  }) {
    const where: Prisma.PromptWhereInput = {};
    if (options.search) {
      where.OR = [
        { title: { contains: options.search } },
        { description: { contains: options.search } },
      ];
    }
    if (options.status) {
      where.status = options.status;
    }
    if (options.visibility) {
      where.visibility = options.visibility;
    }
    if (options.categoryId) {
      where.categories = { some: { id: options.categoryId } };
    }
    if (options.tagId) {
      where.tags = { some: { id: options.tagId } };
    }
    if (options.trash) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    const orderBy: Prisma.PromptOrderByWithRelationInput =
      options.sort === 'az'
        ? { title: 'asc' }
        : options.sort === 'views'
          ? { viewCount: 'desc' }
          : { updatedAt: 'desc' };

    const { skip, take } = normalizePagination(options.skip, options.take);

    const [items, total] = await Promise.all([
      this.prisma.prompt.findMany({
        where,
        skip,
        take,
        include: {
          author: { select: { name: true, handle: true } },
          primaryCategory: { select: { id: true, name: true, slug: true } },
          categories: true,
          tags: true,
        },
        orderBy,
      }),
      this.prisma.prompt.count({ where }),
    ]);

    const hydrated = await this.hydrateFeaturedImages(items);
    return { items: hydrated, total };
  }

  async findOne(id: string) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id },
      include: {
        author: true,
        categories: true,
        tags: true,
        primaryCategory: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!prompt) throw new NotFoundException('Prompt not found');
    const [hydrated] = await this.hydrateFeaturedImages([prompt]);
    return hydrated;
  }

  async create(authorId: string, data: PromptCreateInput) {
    const [categoryResult, tagIds] = await Promise.all([
      this.resolveCategoryIds(data.categoryIds, data.primaryCategoryId),
      this.resolveTagIds(data.tagIds),
    ]);
    const publicationState = this.resolvePublicationStateForCreate({
      status: data.status,
      scheduledAt: data.scheduledAt,
    });

    const created = await this.prisma.prompt.create({
      data: {
        author: { connect: { id: authorId } },
        title: data.title,
        slug: data.slug,
        description: data.description ?? null,
        content: data.content,
        promptType: data.promptType,
        imageMode: data.imageMode ?? null,
        websitePromptKind: data.websitePromptKind ?? null,
        websiteComponent: data.websiteComponent ?? null,
        websiteFeature: data.websiteFeature ?? null,
        visibility: data.visibility ?? 'FREE',
        status: publicationState.status,
        featuredImageUrl: data.featuredImageUrl ?? null,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        scheduledAt: publicationState.scheduledAt,
        publishedAt: publicationState.publishedAt,
        primaryCategory: categoryResult.primaryCategoryId
          ? { connect: { id: categoryResult.primaryCategoryId } }
          : undefined,
        categories: categoryResult.categoryIds.length
          ? { connect: categoryResult.categoryIds.map((id) => ({ id })) }
          : undefined,
        tags: tagIds.length ? { connect: tagIds.map((id) => ({ id })) } : undefined,
      },
    });

    await this.auditService.log({
      actorId: authorId,
      action: 'CREATE',
      targetType: 'PROMPT',
      targetId: created.id,
      metadata: { title: created.title },
    });

    return created;
  }

  async update(actorId: string, id: string, data: PromptUpdateInput) {
    const current = await this.prisma.prompt.findUnique({
      where: { id },
      select: {
        status: true,
        publishedAt: true,
        scheduledAt: true,
      },
    });

    if (!current) {
      throw new NotFoundException('Prompt not found');
    }

    const [categoryResult, tagIds] = await Promise.all([
      this.resolveCategoryIds(data.categoryIds, data.primaryCategoryId),
      this.resolveTagIds(data.tagIds),
    ]);
    const publicationState = this.resolvePublicationStateForUpdate(current, {
      status: data.status,
      scheduledAt: data.scheduledAt,
    });

    const updated = await this.prisma.prompt.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        content: data.content,
        promptType: data.promptType,
        imageMode: data.imageMode,
        websitePromptKind: data.websitePromptKind,
        websiteComponent: data.websiteComponent,
        websiteFeature: data.websiteFeature,
        visibility: data.visibility,
        status: publicationState.status,
        featuredImageUrl: data.featuredImageUrl,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        scheduledAt: publicationState.scheduledAt,
        publishedAt: publicationState.publishedAt,
        primaryCategory:
          data.primaryCategoryId === undefined
            ? undefined
            : categoryResult.primaryCategoryId
              ? { connect: { id: categoryResult.primaryCategoryId } }
              : { disconnect: true },
        categories: data.categoryIds
          ? { set: categoryResult.categoryIds.map((cid) => ({ id: cid })) }
          : undefined,
        tags: data.tagIds ? { set: tagIds.map((tid) => ({ id: tid })) } : undefined,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'UPDATE',
      targetType: 'PROMPT',
      targetId: updated.id,
      metadata: { title: updated.title },
    });

    return updated;
  }

  async updateStatus(actorId: string, id: string, status: PromptStatus) {
    const current = await this.prisma.prompt.findUnique({
      where: { id },
      select: {
        status: true,
        publishedAt: true,
        scheduledAt: true,
      },
    });

    if (!current) {
      throw new NotFoundException('Prompt not found');
    }

    const publicationState = this.resolvePublicationStateForUpdate(current, { status });
    const updated = await this.prisma.prompt.update({
      where: { id },
      data: {
        status: publicationState.status,
        publishedAt: publicationState.publishedAt,
        scheduledAt: publicationState.scheduledAt,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'UPDATE',
      targetType: 'PROMPT',
      targetId: id,
      metadata: { status },
    });

    return updated;
  }

  async remove(actorId: string, id: string) {
    const removed = await this.prisma.prompt.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });

    await this.auditService.log({
      actorId,
      action: 'DELETE',
      targetType: 'PROMPT',
      targetId: id,
    });

    return removed;
  }

  async restore(actorId: string, id: string) {
    const restored = await this.prisma.prompt.update({
      where: { id },
      data: { deletedAt: null, status: 'DRAFT', scheduledAt: null, publishedAt: null },
    });

    await this.auditService.log({
      actorId,
      action: 'RESTORE',
      targetType: 'PROMPT',
      targetId: id,
    });

    return restored;
  }
}
