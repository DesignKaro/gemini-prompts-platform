import { Injectable } from '@nestjs/common';
import { AuditAction, AuditTargetType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizePagination } from '../../../common/utils/pagination';
import { ActivitySortOrder } from './dto/list-activity-query.dto';

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

  private normalizeSearchTerm(value?: string | null) {
    return value?.trim().replace(/\s+/g, ' ') || '';
  }

  private asAuditAction(value: string): AuditAction | null {
    return Object.values(AuditAction).includes(value as AuditAction) ? (value as AuditAction) : null;
  }

  private asAuditTargetType(value: string): AuditTargetType | null {
    return Object.values(AuditTargetType).includes(value as AuditTargetType)
      ? (value as AuditTargetType)
      : null;
  }

  async findAll(options: {
    skip?: number;
    take?: number;
    actorId?: string;
    search?: string;
    action?: AuditAction;
    targetType?: AuditTargetType;
    rangeDays?: number;
    sortOrder?: ActivitySortOrder;
  }) {
    const { skip, take } = normalizePagination(options.skip, options.take);
    const where: Prisma.AuditLogWhereInput = {};
    const normalizedSearch = this.normalizeSearchTerm(options.search);
    if (options.actorId) {
      where.actorId = options.actorId;
    }
    if (options.action) {
      where.action = options.action;
    }
    if (options.targetType) {
      where.targetType = options.targetType;
    }
    if (options.rangeDays) {
      const from = new Date();
      from.setDate(from.getDate() - Math.max(options.rangeDays - 1, 0));
      from.setHours(0, 0, 0, 0);
      where.createdAt = { gte: from };
    }
    if (normalizedSearch) {
      const normalizedEnumTerm = normalizedSearch.toUpperCase().replace(/\s+/g, '_');
      const matchedAction = this.asAuditAction(normalizedEnumTerm);
      const matchedTargetType = this.asAuditTargetType(normalizedEnumTerm);

      where.OR = [
        { actor: { name: { contains: normalizedSearch } } },
        { actor: { email: { contains: normalizedSearch } } },
        { targetId: { contains: normalizedSearch } },
        {
          metadata: {
            path: '$.title',
            string_contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          metadata: {
            path: '$.name',
            string_contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          metadata: {
            path: '$.status',
            string_contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          metadata: {
            path: '$.url',
            string_contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        ...(matchedAction ? [{ action: matchedAction }] : []),
        ...(matchedTargetType ? [{ targetType: matchedTargetType }] : []),
      ];
    }

    const cacheKey = JSON.stringify({
      skip,
      take,
      actorId: options.actorId,
      search: normalizedSearch,
      action: options.action,
      targetType: options.targetType,
      rangeDays: options.rangeDays,
      sortOrder: options.sortOrder ?? ActivitySortOrder.DESC,
    });
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: options.sortOrder ?? ActivitySortOrder.DESC },
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const payload = { items, total };
    this.cache.set(cacheKey, { value: payload, expiresAt: Date.now() + this.cacheTtlMs });
    return payload;
  }
}
