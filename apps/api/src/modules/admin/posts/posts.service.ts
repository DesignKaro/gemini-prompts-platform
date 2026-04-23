import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { normalizePagination } from '../../../common/utils/pagination';
import { Prisma, PostFormat, PostType, PromptStatus, PromptVisibility } from '@prisma/client';
import { MediaStorageService } from '../../media-storage/media-storage.service';

export type PostCreateInput = {
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  status?: PromptStatus;
  visibility?: PromptVisibility;
  postType?: PostType;
  postFormat?: PostFormat;
  featuredImageUrl?: string | null;
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

export type PostUpdateInput = Partial<PostCreateInput>;

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly mediaStorageService: MediaStorageService,
  ) {}

  private readonly mediaRefPrefix = 'media:';

  private extractMediaRef(value?: string | null): string | null {
    if (!value) return null;
    if (!value.startsWith(this.mediaRefPrefix)) return null;
    const id = value.slice(this.mediaRefPrefix.length).trim();
    return id || null;
  }

  private async buildPostMediaUsageRows(
    targetId: string,
    featuredImageUrl?: string | null,
  ): Promise<Prisma.MediaUsageCreateManyInput[]> {
    const normalized = featuredImageUrl?.trim();
    if (!normalized) {
      return [];
    }

    const refId = this.extractMediaRef(normalized);
    const assetId =
      refId ??
      (
        await this.prisma.mediaAsset.findFirst({
          where: { url: normalized },
          select: { id: true },
        })
      )?.id;

    if (!assetId) {
      return [];
    }

    return [
      {
        assetId,
        targetType: 'POST',
        targetId,
        field: 'featuredImageUrl',
      },
    ];
  }

  private async syncPostMediaUsage(targetId: string, featuredImageUrl?: string | null) {
    const rows = await this.buildPostMediaUsageRows(targetId, featuredImageUrl);

    await this.prisma.mediaUsage.deleteMany({
      where: {
        targetType: 'POST',
        targetId,
      },
    });

    if (rows.length === 0) {
      return;
    }

    await this.prisma.mediaUsage.createMany({
      data: rows,
    });
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

  private normalizePostType(value?: PostType | null): PostType | undefined {
    if (!value) return undefined;
    return Object.values(PostType).includes(value) ? value : undefined;
  }

  private normalizePostFormat(value?: PostFormat | null): PostFormat | undefined {
    if (!value) return undefined;
    return Object.values(PostFormat).includes(value) ? value : undefined;
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
    const where: Prisma.PostWhereInput = {};
    if (options.search) {
      where.OR = [
        { title: { contains: options.search } },
        { excerpt: { contains: options.search } },
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

    const orderBy: Prisma.PostOrderByWithRelationInput =
      options.sort === 'az'
        ? { title: 'asc' }
        : options.sort === 'views'
          ? { viewCount: 'desc' }
          : { updatedAt: 'desc' };

    const { skip, take } = normalizePagination(options.skip, options.take);

    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
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
      this.prisma.post.count({ where }),
    ]);

    const hydrated = await this.hydrateFeaturedImages(items);
    return { items: hydrated, total };
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
        categories: true,
        tags: true,
        primaryCategory: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    const [hydrated] = await this.hydrateFeaturedImages([post]);
    return hydrated;
  }

  async create(authorId: string, data: PostCreateInput) {
    const title = data.title?.trim();
    const slug = data.slug?.trim();
    if (!title) {
      throw new BadRequestException('Post title is required.');
    }
    if (!slug) {
      throw new BadRequestException('Post slug is required.');
    }
    if (!data.content?.trim()) {
      throw new BadRequestException('Post content is required.');
    }
    if (data.status !== undefined && !Object.values(PromptStatus).includes(data.status)) {
      throw new BadRequestException('Invalid post status.');
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

    const hostedFeaturedImage = await this.mediaStorageService.maybeUploadImageDataUrl(
      data.featuredImageUrl,
      'posts',
    );
    const normalizedContent = (
      await this.mediaStorageService.replaceInlineImageDataUrls(data.content, 'editor')
    ).html;

    const createData: Prisma.PostCreateInput = {
      author: { connect: { id: authorId } },
      title,
      slug,
      excerpt: data.excerpt ?? null,
      content: normalizedContent,
      status: publicationState.status,
      visibility: data.visibility ?? 'FREE',
      postType: this.normalizePostType(data.postType) ?? 'POST',
      postFormat: this.normalizePostFormat(data.postFormat) ?? 'STANDARD',
      featuredImageUrl: hostedFeaturedImage ?? null,
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

    const created = await this.prisma.post.create({
      data: createData,
    });
    await this.syncPostMediaUsage(created.id, created.featuredImageUrl);

    await this.auditService.log({
      actorId: authorId,
      action: 'CREATE',
      targetType: 'POST',
      targetId: created.id,
      metadata: { title: created.title },
    });

    return created;
  }

  async update(actorId: string, id: string, data: PostUpdateInput) {
    if (data.title !== undefined && !data.title.trim()) {
      throw new BadRequestException('Post title cannot be empty.');
    }
    if (data.slug !== undefined && !data.slug.trim()) {
      throw new BadRequestException('Post slug cannot be empty.');
    }
    if (data.content !== undefined && !data.content.trim()) {
      throw new BadRequestException('Post content cannot be empty.');
    }
    if (data.status !== undefined && !Object.values(PromptStatus).includes(data.status)) {
      throw new BadRequestException('Invalid post status.');
    }

    const current = await this.prisma.post.findUnique({
      where: { id },
      select: {
        status: true,
        publishedAt: true,
        scheduledAt: true,
      },
    });

    if (!current) {
      throw new NotFoundException('Post not found');
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

    const hostedFeaturedImage =
      data.featuredImageUrl === undefined
        ? undefined
        : await this.mediaStorageService.maybeUploadImageDataUrl(data.featuredImageUrl, 'posts');
    const normalizedContent =
      data.content === undefined
        ? undefined
        : (await this.mediaStorageService.replaceInlineImageDataUrls(data.content, 'editor')).html;

    const updateData: Prisma.PostUpdateInput = {
      title: data.title?.trim(),
      slug: data.slug?.trim(),
      excerpt: data.excerpt,
      content: normalizedContent,
      status: publicationState.status,
      visibility: data.visibility,
      postType: this.normalizePostType(data.postType),
      postFormat: this.normalizePostFormat(data.postFormat),
      featuredImageUrl: hostedFeaturedImage,
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

    const updated = await this.prisma.post.update({
      where: { id },
      data: updateData,
    });
    await this.syncPostMediaUsage(updated.id, updated.featuredImageUrl);

    await this.auditService.log({
      actorId,
      action: 'UPDATE',
      targetType: 'POST',
      targetId: updated.id,
      metadata: { title: updated.title },
    });

    return updated;
  }

  async remove(actorId: string, id: string) {
    const removed = await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });

    await this.auditService.log({
      actorId,
      action: 'DELETE',
      targetType: 'POST',
      targetId: id,
    });

    return removed;
  }

  async restore(actorId: string, id: string) {
    const restored = await this.prisma.post.update({
      where: { id },
      data: { deletedAt: null, status: 'DRAFT', scheduledAt: null, publishedAt: null },
    });

    await this.auditService.log({
      actorId,
      action: 'RESTORE',
      targetType: 'POST',
      targetId: id,
    });

    return restored;
  }
}
