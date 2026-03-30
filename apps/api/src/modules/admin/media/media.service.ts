import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { normalizePagination } from '../../../common/utils/pagination';

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

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
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
    const url = data.url?.trim();
    if (!url) {
      throw new BadRequestException('Media URL is required.');
    }

    const created = await this.prisma.mediaAsset.create({
      data: {
        title: data.title ?? null,
        url,
        storageKey: data.storageKey ?? null,
        mime: data.mime ?? null,
        size: data.size ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
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

    const updated = await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        title: data.title,
        url: data.url?.trim(),
        storageKey: data.storageKey,
        mime: data.mime,
        size: data.size,
        width: data.width,
        height: data.height,
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
