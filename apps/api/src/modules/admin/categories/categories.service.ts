import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  private async ensureParentExists(parentId: string) {
    const parent = await this.prisma.category.findFirst({
      where: { id: parentId, deletedAt: null },
      select: { id: true },
    });
    if (!parent) {
      throw new BadRequestException('Parent category does not exist or is deleted.');
    }
  }

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
    const name = data.name?.trim();
    const slug = data.slug?.trim();
    if (!name) {
      throw new BadRequestException('Category name is required.');
    }
    if (!slug) {
      throw new BadRequestException('Category slug is required.');
    }
    if (data.parentId) {
      await this.ensureParentExists(data.parentId);
    }

    const category = await this.prisma.category.create({
      data: {
        name,
        slug,
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
    if (data.name !== undefined && !data.name.trim()) {
      throw new BadRequestException('Category name cannot be empty.');
    }
    if (data.slug !== undefined && !data.slug.trim()) {
      throw new BadRequestException('Category slug cannot be empty.');
    }
    if (data.parentId === id) {
      throw new BadRequestException('A category cannot be its own parent.');
    }
    if (data.parentId) {
      await this.ensureParentExists(data.parentId);
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        slug: data.slug?.trim(),
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
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const removedCategory = await this.prisma.$transaction(async (tx) => {
      const fallbackCategory = await tx.category.upsert({
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
      });

      if (fallbackCategory.id === id) {
        throw new BadRequestException('Cannot delete the fallback Uncategorized category.');
      }

      await tx.prompt.updateMany({
        where: { primaryCategoryId: id },
        data: { primaryCategoryId: fallbackCategory.id },
      });

      await tx.post.updateMany({
        where: { primaryCategoryId: id },
        data: { primaryCategoryId: fallbackCategory.id },
      });

      const promptsWithCategory = await tx.prompt.findMany({
        where: { categories: { some: { id } } },
        select: { id: true, categories: { where: { id: fallbackCategory.id }, select: { id: true } } },
      });

      for (const prompt of promptsWithCategory) {
        await tx.prompt.update({
          where: { id: prompt.id },
          data: {
            categories: {
              disconnect: { id },
              ...(prompt.categories.length === 0 ? { connect: { id: fallbackCategory.id } } : {}),
            },
          },
        });
      }

      const postsWithCategory = await tx.post.findMany({
        where: { categories: { some: { id } } },
        select: { id: true, categories: { where: { id: fallbackCategory.id }, select: { id: true } } },
      });

      for (const post of postsWithCategory) {
        await tx.post.update({
          where: { id: post.id },
          data: {
            categories: {
              disconnect: { id },
              ...(post.categories.length === 0 ? { connect: { id: fallbackCategory.id } } : {}),
            },
          },
        });
      }

      const collabsWithCategory = await tx.collab.findMany({
        where: { categories: { some: { id } } },
        select: { id: true, categories: { where: { id: fallbackCategory.id }, select: { id: true } } },
      });

      for (const collab of collabsWithCategory) {
        await tx.collab.update({
          where: { id: collab.id },
          data: {
            categories: {
              disconnect: { id },
              ...(collab.categories.length === 0 ? { connect: { id: fallbackCategory.id } } : {}),
            },
          },
        });
      }

      return tx.category.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });

    await this.auditService.log({
      actorId,
      action: 'DELETE',
      targetType: 'CATEGORY',
      targetId: id,
    });

    return removedCategory;
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
