import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
      where.OR = [{ name: { contains: options.search } }, { slug: { contains: options.search } }];
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
    const name = data.name?.trim();
    const slug = data.slug?.trim();
    if (!name) {
      throw new BadRequestException('Tag name is required.');
    }
    if (!slug) {
      throw new BadRequestException('Tag slug is required.');
    }

    const tag = await this.prisma.tag.create({
      data: {
        name,
        slug,
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
    if (data.name !== undefined && !data.name.trim()) {
      throw new BadRequestException('Tag name cannot be empty.');
    }
    if (data.slug !== undefined && !data.slug.trim()) {
      throw new BadRequestException('Tag slug cannot be empty.');
    }

    const tag = await this.prisma.tag.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        slug: data.slug?.trim(),
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
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    const removedTag = await this.prisma.$transaction(async (tx) => {
      const fallbackTag = await tx.tag.upsert({
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
      });

      if (fallbackTag.id === id) {
        throw new BadRequestException('Cannot delete the fallback Default tag.');
      }

      const promptsWithTag = await tx.prompt.findMany({
        where: { tags: { some: { id } } },
        select: { id: true, tags: { where: { id: fallbackTag.id }, select: { id: true } } },
      });

      for (const prompt of promptsWithTag) {
        await tx.prompt.update({
          where: { id: prompt.id },
          data: {
            tags: {
              disconnect: { id },
              ...(prompt.tags.length === 0 ? { connect: { id: fallbackTag.id } } : {}),
            },
          },
        });
      }

      const postsWithTag = await tx.post.findMany({
        where: { tags: { some: { id } } },
        select: { id: true, tags: { where: { id: fallbackTag.id }, select: { id: true } } },
      });

      for (const post of postsWithTag) {
        await tx.post.update({
          where: { id: post.id },
          data: {
            tags: {
              disconnect: { id },
              ...(post.tags.length === 0 ? { connect: { id: fallbackTag.id } } : {}),
            },
          },
        });
      }

      const collabsWithTag = await tx.collab.findMany({
        where: { tags: { some: { id } } },
        select: { id: true, tags: { where: { id: fallbackTag.id }, select: { id: true } } },
      });

      for (const collab of collabsWithTag) {
        await tx.collab.update({
          where: { id: collab.id },
          data: {
            tags: {
              disconnect: { id },
              ...(collab.tags.length === 0 ? { connect: { id: fallbackTag.id } } : {}),
            },
          },
        });
      }

      return tx.tag.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });

    await this.auditService.log({
      actorId,
      action: 'DELETE',
      targetType: 'TAG',
      targetId: id,
    });

    return removedTag;
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
