import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { normalizePagination } from '../../../common/utils/pagination';
import { MediaStorageService } from '../../media-storage/media-storage.service';

export type MediaCreateInput = {
  title?: string | null;
  url: string;
  storageKey?: string | null;
  mime?: string | null;
  size?: number | null;
  width?: number | null;
  height?: number | null;
  altText?: string | null;
  status?: MediaStatus;
};

export type MediaUpdateInput = Partial<MediaCreateInput>;
export type MediaUploadInput = {
  title?: string | null;
  altText?: string | null;
};

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly mediaStorageService: MediaStorageService,
  ) {}

  async findAll(options: {
    skip?: number;
    take?: number;
    search?: string;
    status?: MediaStatus;
    trash?: boolean;
    sort?: 'recent' | 'name';
  }) {
    const where: Prisma.MediaAssetWhereInput = {};
    if (options.search) {
      where.OR = [{ title: { contains: options.search } }, { url: { contains: options.search } }];
    }
    if (options.status) {
      where.status = options.status;
    }
    if (options.trash) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    const orderBy: Prisma.MediaAssetOrderByWithRelationInput =
      options.sort === 'name' ? { title: 'asc' } : { createdAt: 'desc' };

    const { skip, take } = normalizePagination(options.skip, options.take);

    const [items, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { uploadedBy: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
    if (!asset) {
      throw new NotFoundException('Media asset not found');
    }
    return asset;
  }

  async create(actorId: string, data: MediaCreateInput) {
    const urlInput = data.url?.trim();
    let url = urlInput ?? null;
    let storageKey = data.storageKey ?? null;
    let mime = data.mime ?? null;
    let size = data.size ?? null;
    let width = data.width ?? null;
    let height = data.height ?? null;

    if (url && this.mediaStorageService.isInlineImageDataUrl(url) && this.mediaStorageService.isEnabled()) {
      const stored = await this.mediaStorageService.uploadImageDataUrl({
        dataUrl: url,
        scope: 'media',
      });
      url = stored.publicUrl;
      storageKey = stored.storageKey;
      mime = stored.mime;
      size = stored.size;
      width = stored.width ?? null;
      height = stored.height ?? null;
    }

    if (!url) {
      throw new BadRequestException('Media URL is required.');
    }

    const created = await this.prisma.mediaAsset.create({
      data: {
        title: data.title ?? null,
        url,
        storageKey,
        mime,
        size,
        width,
        height,
        altText: data.altText ?? null,
        status: data.status ?? 'ACTIVE',
        uploadedById: actorId,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'CREATE',
      targetType: 'MEDIA',
      targetId: created.id,
      metadata: { url: created.url },
    });

    return created;
  }

  async update(actorId: string, id: string, data: MediaUpdateInput) {
    const existing = await this.prisma.mediaAsset.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Media asset not found');
    }

    if (data.url !== undefined && !data.url.trim()) {
      throw new BadRequestException('Media URL cannot be empty.');
    }

    let normalizedUrl = data.url === undefined ? undefined : data.url.trim();
    let normalizedStorageKey = data.storageKey;
    let normalizedMime = data.mime;
    let normalizedSize = data.size;
    let normalizedWidth = data.width;
    let normalizedHeight = data.height;

    if (
      typeof normalizedUrl === 'string' &&
      this.mediaStorageService.isInlineImageDataUrl(normalizedUrl) &&
      this.mediaStorageService.isEnabled()
    ) {
      const stored = await this.mediaStorageService.uploadImageDataUrl({
        dataUrl: normalizedUrl,
        scope: 'media',
      });
      normalizedUrl = stored.publicUrl;
      normalizedStorageKey = stored.storageKey;
      normalizedMime = stored.mime;
      normalizedSize = stored.size;
      normalizedWidth = stored.width ?? null;
      normalizedHeight = stored.height ?? null;
    }

    const updated = await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        title: data.title,
        url: normalizedUrl,
        storageKey: normalizedStorageKey,
        mime: normalizedMime,
        size: normalizedSize,
        width: normalizedWidth,
        height: normalizedHeight,
        altText: data.altText,
        status: data.status,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'UPDATE',
      targetType: 'MEDIA',
      targetId: id,
    });

    return updated;
  }

  async uploadFile(
    actorId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
    input: MediaUploadInput,
  ) {
    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new BadRequestException('A media file is required.');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are currently supported.');
    }

    const stored = await this.mediaStorageService.uploadBuffer({
      buffer: file.buffer,
      mime: file.mimetype,
      scope: 'media',
    });

    const created = await this.prisma.mediaAsset.create({
      data: {
        title: input.title?.trim() || file.originalname || null,
        url: stored.publicUrl,
        storageKey: stored.storageKey,
        mime: stored.mime,
        size: stored.size,
        width: stored.width ?? null,
        height: stored.height ?? null,
        altText: input.altText?.trim() || null,
        status: 'ACTIVE',
        uploadedById: actorId,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'CREATE',
      targetType: 'MEDIA',
      targetId: created.id,
      metadata: { url: created.url, storageKey: created.storageKey ?? null },
    });

    return created;
  }

  async remove(actorId: string, id: string) {
    const existing = await this.prisma.mediaAsset.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Media asset not found');
    }

    const removed = await this.prisma.mediaAsset.update({
      where: { id },
      data: { status: 'TRASH', deletedAt: new Date() },
    });

    await this.auditService.log({
      actorId,
      action: 'DELETE',
      targetType: 'MEDIA',
      targetId: id,
    });

    return removed;
  }

  async restore(actorId: string, id: string) {
    const existing = await this.prisma.mediaAsset.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Media asset not found');
    }

    const restored = await this.prisma.mediaAsset.update({
      where: { id },
      data: { status: 'ACTIVE', deletedAt: null },
    });

    await this.auditService.log({
      actorId,
      action: 'RESTORE',
      targetType: 'MEDIA',
      targetId: id,
    });

    return restored;
  }
}
