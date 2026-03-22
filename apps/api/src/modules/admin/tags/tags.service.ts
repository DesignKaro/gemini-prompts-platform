import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { normalizePagination } from '../../../common/utils/pagination';

export type TagCreateInput = {
  name: string;
  slug: string;
  color?: string | null;
};

export type TagUpdateInput = Partial<TagCreateInput>;

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(options: {
    skip?: number;
    take?: number;
    search?: string;
    trash?: boolean;
    sort?: 'recent' | 'name';
  }) {
    const where: Prisma.TagWhereInput = {};
    if (options.search) {
      where.OR = [
        { name: { contains: options.search } },
        { slug: { contains: options.search } },
      ];
    }
    if (options.trash) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    const orderBy: Prisma.TagOrderByWithRelationInput =
      options.sort === 'name' ? { name: 'asc' } : { createdAt: 'desc' };

    const { skip, take } = normalizePagination(options.skip, options.take);

    const [items, total] = await Promise.all([
      this.prisma.tag.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          _count: { select: { prompts: true, posts: true } },
        },
      }),
      this.prisma.tag.count({ where }),
    ]);

    return {
      items: items.map((tag) => ({
        ...tag,
        usage: tag._count.prompts + tag._count.posts,
      })),
      total,
    };
  }

  async findOne(id: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: { _count: { select: { prompts: true, posts: true } } },
    });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    return tag;
  }

  async create(actorId: string, data: TagCreateInput) {
    const tag = await this.prisma.tag.create({
      data: {
        name: data.name,
        slug: data.slug,
        color: data.color ?? null,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'CREATE',
      targetType: 'TAG',
      targetId: tag.id,
      metadata: { name: tag.name },
    });

    return tag;
  }

  async update(actorId: string, id: string, data: TagUpdateInput) {
    const tag = await this.prisma.tag.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        color: data.color ?? undefined,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'UPDATE',
      targetType: 'TAG',
      targetId: tag.id,
      metadata: { name: tag.name },
    });

    return tag;
  }

  async remove(actorId: string, id: string) {
    const tag = await this.prisma.tag.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      actorId,
      action: 'DELETE',
      targetType: 'TAG',
      targetId: id,
    });

    return tag;
  }

  async restore(actorId: string, id: string) {
    const tag = await this.prisma.tag.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditService.log({
      actorId,
      action: 'RESTORE',
      targetType: 'TAG',
      targetId: id,
    });

    return tag;
  }
}
