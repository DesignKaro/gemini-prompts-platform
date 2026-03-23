import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { normalizePagination } from '../../../common/utils/pagination';

export type CategoryCreateInput = {
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  imageUrl?: string | null;
  colorConfig?: Prisma.JsonValue | null;
  sortOrder?: number;
};

export type CategoryUpdateInput = Partial<CategoryCreateInput>;

@Injectable()
export class CategoriesService {
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
    const where: Prisma.CategoryWhereInput = {};
    if (options.search) {
      where.OR = [{ name: { contains: options.search } }, { slug: { contains: options.search } }];
    }
    if (options.trash) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    const orderBy: Prisma.CategoryOrderByWithRelationInput =
      options.sort === 'name' ? { name: 'asc' } : { createdAt: 'desc' };

    const { skip, take } = normalizePagination(options.skip, options.take);

    const [items, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          parent: { select: { id: true, name: true, slug: true } },
          _count: { select: { prompts: true, posts: true } },
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      items: items.map((category) => ({
        ...category,
        stats: {
          prompts: category._count.prompts,
          posts: category._count.posts,
        },
      })),
      total,
    };
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { prompts: true, posts: true } },
      },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async create(actorId: string, data: CategoryCreateInput) {
    const category = await this.prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        imageUrl: data.imageUrl ?? null,
        colorConfig: data.colorConfig ?? undefined,
        sortOrder: data.sortOrder ?? 0,
        parent: data.parentId ? { connect: { id: data.parentId } } : undefined,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'CREATE',
      targetType: 'CATEGORY',
      targetId: category.id,
      metadata: { name: category.name },
    });

    return category;
  }

  async update(actorId: string, id: string, data: CategoryUpdateInput) {
    const category = await this.prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? undefined,
        imageUrl: data.imageUrl ?? undefined,
        colorConfig: data.colorConfig ?? undefined,
        sortOrder: data.sortOrder ?? undefined,
        parent:
          data.parentId === undefined
            ? undefined
            : data.parentId
              ? { connect: { id: data.parentId } }
              : { disconnect: true },
      },
    });

    await this.auditService.log({
      actorId,
      action: 'UPDATE',
      targetType: 'CATEGORY',
      targetId: category.id,
      metadata: { name: category.name },
    });

    return category;
  }

  async remove(actorId: string, id: string) {
    const category = await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      actorId,
      action: 'DELETE',
      targetType: 'CATEGORY',
      targetId: id,
    });

    return category;
  }

  async restore(actorId: string, id: string) {
    const category = await this.prisma.category.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditService.log({
      actorId,
      action: 'RESTORE',
      targetType: 'CATEGORY',
      targetId: id,
    });

    return category;
  }
}
