import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
  galleryImageUrls?: string[] | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoFocusKeyword?: string | null;
  seoCanonicalUrl?: string | null;
  seoNoIndex?: boolean;
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

  private normalizeGalleryImageUrls(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0)
      .slice(0, 5);
  }

  private normalizeGalleryImageInput(
    value?: string[] | null,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return Prisma.DbNull;
    }

    const normalized = value
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .slice(0, 5);

    return normalized.length > 0 ? normalized : Prisma.DbNull;
  }

  private async hydratePromptImages<
    T extends { featuredImageUrl?: string | null; galleryImageUrls?: Prisma.JsonValue | null },
  >(
    items: T[],
  ): Promise<Array<T & { featuredImageRef?: string | null; galleryImageRefs?: string[] }>> {
    const ids = new Set<string>();

    for (const item of items) {
      const featuredRefId = this.extractMediaRef(item.featuredImageUrl ?? null);
      if (featuredRefId) {
        ids.add(featuredRefId);
      }

      const galleryRefs = this.normalizeGalleryImageUrls(item.galleryImageUrls);
      for (const galleryRef of galleryRefs) {
        const refId = this.extractMediaRef(galleryRef);
        if (refId) {
          ids.add(refId);
        }
      }
    }

    const assetMap =
      ids.size > 0
        ? new Map(
            (
              await this.prisma.mediaAsset.findMany({
                where: { id: { in: Array.from(ids) } },
                select: { id: true, url: true },
              })
            ).map((asset) => [asset.id, asset.url]),
          )
        : new Map<string, string>();

    return items.map((item) => {
      const rawFeatured = item.featuredImageUrl ?? null;
      const featuredRefId = this.extractMediaRef(rawFeatured);
      const galleryRefs = this.normalizeGalleryImageUrls(item.galleryImageUrls);
      const hydratedGallery = galleryRefs
        .map((entry) => {
          const refId = this.extractMediaRef(entry);
          if (!refId) {
            return entry;
          }
          return assetMap.get(refId) ?? null;
        })
        .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);

      return {
        ...item,
        featuredImageUrl: featuredRefId ? (assetMap.get(featuredRefId) ?? null) : rawFeatured,
        featuredImageRef: featuredRefId ? rawFeatured : null,
        galleryImageUrls: hydratedGallery,
        galleryImageRefs: galleryRefs,
      } as T & { featuredImageRef?: string | null; galleryImageRefs?: string[] };
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
      where: { id: { in: lookupIds }, deletedAt: null },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((item) => item.id));
    const invalidIds = lookupIds.filter((id) => !existingIds.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `One or more categories are invalid or deleted: ${invalidIds.join(', ')}`,
      );
    }

    return {
      categoryIds: uniqueIds,
      primaryCategoryId: primaryCategoryId ?? null,
    };
  }

  private async resolveTagIds(tagIds?: string[]) {
    const uniqueIds = Array.from(new Set((tagIds ?? []).filter(Boolean)));
    if (uniqueIds.length === 0) return [];
    const existing = await this.prisma.tag.findMany({
      where: { id: { in: uniqueIds }, deletedAt: null },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((item) => item.id));
    const invalidIds = uniqueIds.filter((id) => !existingIds.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `One or more tags are invalid or deleted: ${invalidIds.join(', ')}`,
      );
    }

    return uniqueIds;
  }

  private async getFallbackCategoryId() {
    const category = await this.prisma.category.upsert({
      where: { slug: 'uncategorized' },
      update: {
        name: 'Uncategorized',
        deletedAt: null,
      },
      create: {
        name: 'Uncategorized',
        slug: 'uncategorized',
        description: 'Fallback category for uncategorized content.',
        sortOrder: 0,
      },
      select: { id: true },
    });

    return category.id;
  }

  private async getFallbackTagId() {
    const tag = await this.prisma.tag.upsert({
      where: { slug: 'default' },
      update: {
        name: 'Default',
        deletedAt: null,
        color: null,
      },
      create: {
        name: 'Default',
        slug: 'default',
        color: null,
      },
      select: { id: true },
    });

    return tag.id;
  }

  private async ensureCategoryDefaults(
    value: { categoryIds: string[]; primaryCategoryId: string | null },
    applyDefaults: boolean,
  ) {
    let categoryIds = [...value.categoryIds];
    let primaryCategoryId = value.primaryCategoryId;

    if (!applyDefaults) {
      return { categoryIds, primaryCategoryId };
    }

    if (categoryIds.length === 0 && !primaryCategoryId) {
      const fallbackCategoryId = await this.getFallbackCategoryId();
      return {
        categoryIds: [fallbackCategoryId],
        primaryCategoryId: fallbackCategoryId,
      };
    }

    if (!primaryCategoryId && categoryIds.length > 0) {
      primaryCategoryId = categoryIds[0] ?? null;
    }

    if (primaryCategoryId && !categoryIds.includes(primaryCategoryId)) {
      categoryIds = [primaryCategoryId, ...categoryIds];
    }

    return {
      categoryIds: Array.from(new Set(categoryIds)),
      primaryCategoryId,
    };
  }

  private async ensureTagDefaults(tagIds: string[], applyDefaults: boolean) {
    const uniqueTagIds = Array.from(new Set(tagIds));

    if (!applyDefaults) {
      return uniqueTagIds;
    }

    if (uniqueTagIds.length > 0) {
      return uniqueTagIds;
    }

    const fallbackTagId = await this.getFallbackTagId();
    return [fallbackTagId];
  }

  private resolvePublicationStateForCreate(input: {
    status?: PromptStatus;
    scheduledAt?: string | Date | null;
  }) {
    const status = input.status ?? 'DRAFT';
    const scheduledAt =
      status === 'SCHEDULED' && input.scheduledAt ? new Date(input.scheduledAt) : null;

    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Invalid scheduled date.');
    }

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
      if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
        throw new BadRequestException('Invalid scheduled date.');
      }
    }

    if (nextStatus === 'PUBLISHED' || nextStatus === 'DRAFT' || nextStatus === 'ARCHIVED') {
      scheduledAt = null;
    }

    let publishedAt = current.publishedAt;
    if (nextStatus === 'PUBLISHED') {
      publishedAt =
        current.status === 'PUBLISHED' ? (current.publishedAt ?? new Date()) : new Date();
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

    const hydrated = await this.hydratePromptImages(items);
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
    const [hydrated] = await this.hydratePromptImages([prompt]);
    return hydrated;
  }

  async create(authorId: string, data: PromptCreateInput) {
    const title = data.title?.trim();
    const slug = data.slug?.trim();
    if (!title) {
      throw new BadRequestException('Prompt title is required.');
    }
    if (!slug) {
      throw new BadRequestException('Prompt slug is required.');
    }
    if (!data.content?.trim()) {
      throw new BadRequestException('Prompt content is required.');
    }

    const [resolvedCategoryResult, resolvedTagIds] = await Promise.all([
      this.resolveCategoryIds(data.categoryIds, data.primaryCategoryId),
      this.resolveTagIds(data.tagIds),
    ]);
    const [categoryResult, tagIds] = await Promise.all([
      this.ensureCategoryDefaults(resolvedCategoryResult, true),
      this.ensureTagDefaults(resolvedTagIds, true),
    ]);
    const publicationState = this.resolvePublicationStateForCreate({
      status: data.status,
      scheduledAt: data.scheduledAt,
    });

    const createData: Prisma.PromptCreateInput = {
        author: { connect: { id: authorId } },
        title,
        slug,
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
        galleryImageUrls: this.normalizeGalleryImageInput(data.galleryImageUrls) ?? Prisma.DbNull,
        metaTitle: data.metaTitle ?? null,
        metaDescription: data.metaDescription ?? null,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        seoFocusKeyword: data.seoFocusKeyword ?? null,
        seoCanonicalUrl: data.seoCanonicalUrl ?? null,
        seoNoIndex: data.seoNoIndex ?? false,
        scheduledAt: publicationState.scheduledAt,
        publishedAt: publicationState.publishedAt,
        primaryCategory: categoryResult.primaryCategoryId
          ? { connect: { id: categoryResult.primaryCategoryId } }
          : undefined,
        categories: categoryResult.categoryIds.length
          ? { connect: categoryResult.categoryIds.map((id) => ({ id })) }
          : undefined,
        tags: tagIds.length ? { connect: tagIds.map((id) => ({ id })) } : undefined,
    };

    const created = await this.prisma.prompt.create({
      data: createData,
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
    if (data.title !== undefined && !data.title.trim()) {
      throw new BadRequestException('Prompt title cannot be empty.');
    }
    if (data.slug !== undefined && !data.slug.trim()) {
      throw new BadRequestException('Prompt slug cannot be empty.');
    }
    if (data.content !== undefined && !data.content.trim()) {
      throw new BadRequestException('Prompt content cannot be empty.');
    }

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

    const [resolvedCategoryResult, resolvedTagIds] = await Promise.all([
      this.resolveCategoryIds(data.categoryIds, data.primaryCategoryId),
      this.resolveTagIds(data.tagIds),
    ]);
    const [categoryResult, tagIds] = await Promise.all([
      this.ensureCategoryDefaults(
        resolvedCategoryResult,
        data.categoryIds !== undefined || data.primaryCategoryId !== undefined,
      ),
      this.ensureTagDefaults(resolvedTagIds, data.tagIds !== undefined),
    ]);
    const publicationState = this.resolvePublicationStateForUpdate(current, {
      status: data.status,
      scheduledAt: data.scheduledAt,
    });

    const updateData: Prisma.PromptUpdateInput = {
        title: data.title?.trim(),
        slug: data.slug?.trim(),
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
        galleryImageUrls:
          data.galleryImageUrls === undefined
            ? undefined
            : this.normalizeGalleryImageInput(data.galleryImageUrls),
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        seoFocusKeyword: data.seoFocusKeyword,
        seoCanonicalUrl: data.seoCanonicalUrl,
        seoNoIndex: data.seoNoIndex,
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
    };

    const updated = await this.prisma.prompt.update({
      where: { id },
      data: updateData,
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
    if (!Object.values(PromptStatus).includes(status)) {
      throw new BadRequestException('Invalid prompt status.');
    }

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
