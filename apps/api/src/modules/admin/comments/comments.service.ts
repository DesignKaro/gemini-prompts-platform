import { Injectable, NotFoundException } from '@nestjs/common';
import { CommentStatus, CommentTargetType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { normalizePagination } from '../../../common/utils/pagination';

export type CommentCreateInput = {
  targetType: CommentTargetType;
  targetId: string;
  content: string;
  status?: CommentStatus;
};

export type CommentUpdateInput = {
  content?: string;
  status?: CommentStatus;
};

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(options: {
    skip?: number;
    take?: number;
    search?: string;
    status?: CommentStatus;
    targetType?: CommentTargetType;
    targetId?: string;
  }) {
    const where: Prisma.CommentWhereInput = { deletedAt: null };

    if (options.status) {
      where.status = options.status;
    }
    if (options.targetType) {
      where.targetType = options.targetType;
    }
    if (options.targetId) {
      where.targetId = options.targetId;
    }
    if (options.search) {
      where.OR = [
        { content: { contains: options.search } },
        { author: { name: { contains: options.search } } },
        { author: { email: { contains: options.search } } },
      ];
    }

    const { skip, take } = normalizePagination(options.skip, options.take);

    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.comment.count({ where }),
    ]);

    const promptIds = items
      .filter((comment) => comment.targetType === 'PROMPT')
      .map((comment) => comment.targetId);
    const postIds = items
      .filter((comment) => comment.targetType === 'POST')
      .map((comment) => comment.targetId);

    const [prompts, posts] = await Promise.all([
      promptIds.length
        ? this.prisma.prompt.findMany({
            where: { id: { in: promptIds } },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      postIds.length
        ? this.prisma.post.findMany({
            where: { id: { in: postIds } },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
    ]);

    const promptMap = new Map(prompts.map((prompt) => [prompt.id, prompt.title]));
    const postMap = new Map(posts.map((post) => [post.id, post.title]));

    return {
      items: items.map((comment) => ({
        ...comment,
        targetTitle:
          comment.targetType === 'PROMPT'
            ? (promptMap.get(comment.targetId) ?? null)
            : (postMap.get(comment.targetId) ?? null),
      })),
      total,
    };
  }

  async findOne(id: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    if (!comment || comment.deletedAt) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  async create(actorId: string, data: CommentCreateInput) {
    const created = await this.prisma.comment.create({
      data: {
        authorId: actorId,
        targetType: data.targetType,
        targetId: data.targetId,
        content: data.content,
        status: data.status ?? 'PENDING',
      },
    });

    await this.auditService.log({
      actorId,
      action: 'CREATE',
      targetType: 'COMMENT',
      targetId: created.id,
      metadata: { targetType: data.targetType, targetId: data.targetId },
    });

    return created;
  }

  async reply(actorId: string, parentId: string, content: string) {
    const parent = await this.prisma.comment.findUnique({ where: { id: parentId } });
    if (!parent || parent.deletedAt) {
      throw new NotFoundException('Comment not found');
    }

    const created = await this.prisma.comment.create({
      data: {
        authorId: actorId,
        targetType: parent.targetType,
        targetId: parent.targetId,
        parentId,
        content,
        status: 'APPROVED',
      },
    });

    await this.auditService.log({
      actorId,
      action: 'CREATE',
      targetType: 'COMMENT',
      targetId: created.id,
      metadata: { parentId },
    });

    return created;
  }

  async update(actorId: string, id: string, data: CommentUpdateInput) {
    const existing = await this.prisma.comment.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Comment not found');
    }

    const updated = await this.prisma.comment.update({
      where: { id },
      data: {
        content: data.content ?? undefined,
        status: data.status ?? undefined,
        moderatedById: data.status ? actorId : undefined,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'UPDATE',
      targetType: 'COMMENT',
      targetId: id,
      metadata: { status: data.status },
    });

    return updated;
  }

  async remove(actorId: string, id: string) {
    const existing = await this.prisma.comment.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Comment not found');
    }

    const deletedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.comment.update({
        where: { id },
        data: {
          deletedAt,
          status: 'TRASH',
          moderatedById: actorId,
        },
      }),
      this.prisma.comment.updateMany({
        where: { parentId: id },
        data: {
          deletedAt,
          status: 'TRASH',
          moderatedById: actorId,
        },
      }),
    ]);

    await this.auditService.log({
      actorId,
      action: 'DELETE',
      targetType: 'COMMENT',
      targetId: id,
    });

    return { id };
  }
}
