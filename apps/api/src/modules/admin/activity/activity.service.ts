import { Injectable } from '@nestjs/common';
import { AuditAction, AuditTargetType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizePagination } from '../../../common/utils/pagination';

type AuditLogWithActor = Prisma.AuditLogGetPayload<{
  include: { actor: { select: { id: true; name: true; email: true } } };
}>;

type ActivityCacheEntry = {
  expiresAt: number;
  value: { items: AuditLogWithActor[]; total: number };
};

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly cache = new Map<string, ActivityCacheEntry>();
  private readonly cacheTtlMs = 15_000;

  async findAll(options: {
    skip?: number;
    take?: number;
    actorId?: string;
    action?: AuditAction;
    targetType?: AuditTargetType;
  }) {
    const { skip, take } = normalizePagination(options.skip, options.take);
    const where: Prisma.AuditLogWhereInput = {};
    if (options.actorId) {
      where.actorId = options.actorId;
    }
    if (options.action) {
      where.action = options.action;
    }
    if (options.targetType) {
      where.targetType = options.targetType;
    }

    const cacheKey = JSON.stringify({ skip, take, actorId: options.actorId, action: options.action, targetType: options.targetType });
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const payload = { items, total };
    this.cache.set(cacheKey, { value: payload, expiresAt: Date.now() + this.cacheTtlMs });
    return payload;
  }
}
