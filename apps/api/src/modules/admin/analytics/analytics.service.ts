import { Injectable } from '@nestjs/common';
import { EngagementEventType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type TopEntity = { id: string; title: string; viewCount: number };

type AnalyticsOverview = {
  rangeDays: number;
  from: Date;
  to: Date;
  totals: {
    prompts: number;
    posts: number;
    users: number;
    comments: number;
    categories: number;
    tags: number;
    views: number;
    promptViews: number;
    postViews: number;
    revenue: number;
    newUsers: number;
  };
  engagement: {
    views: number;
    likes: number;
    saves: number;
    shares: number;
  };
  series: {
    labels: string[];
    views: number[];
  };
  topPrompts: TopEntity[];
  topPosts: TopEntity[];
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(rangeDays: number): Promise<AnalyticsOverview> {
    const cacheKey = `overview:${rangeDays}`;
    const now = Date.now();
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return cached.value;
      }
    }
    const to = new Date();
    const from = new Date(to);
    from.setDate(to.getDate() - Math.max(rangeDays - 1, 0));
    from.setHours(0, 0, 0, 0);

    const [
      promptCount,
      postCount,
      userCount,
      commentCount,
      categoryCount,
      tagCount,
      promptViewsTotal,
      postViewsTotal,
      newUsersCount,
      revenueTotal,
      engagementByType,
      topPrompts,
      topPosts,
      viewSeriesRows,
    ] = await Promise.all([
      this.prisma.prompt.count({ where: { deletedAt: null } }),
      this.prisma.post.count({ where: { deletedAt: null } }),
      this.prisma.user.count(),
      this.prisma.comment.count({ where: { deletedAt: null } }),
      this.prisma.category.count({ where: { deletedAt: null } }),
      this.prisma.tag.count({ where: { deletedAt: null } }),
      this.prisma.prompt.aggregate({ _sum: { viewCount: true } }),
      this.prisma.post.aggregate({ _sum: { viewCount: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: from } } }),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: from } },
      }),
      this.prisma.engagementEvent.groupBy({
        by: ['eventType'],
        where: { createdAt: { gte: from } },
        _count: { _all: true },
      }),
      this.prisma.prompt.findMany({
        where: { deletedAt: null },
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: { id: true, title: true, viewCount: true },
      }),
      this.prisma.post.findMany({
        where: { deletedAt: null },
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: { id: true, title: true, viewCount: true },
      }),
      this.prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
        SELECT DATE(createdAt) as day, COUNT(*) as count
        FROM EngagementEvent
        WHERE eventType = 'VIEW' AND createdAt >= ${from}
        GROUP BY day
        ORDER BY day ASC
      `,
    ]);

    const engagementMap = new Map<EngagementEventType, number>();
    for (const row of engagementByType) {
      engagementMap.set(row.eventType, row._count._all);
    }

    const seriesMap = new Map<string, number>();
    for (const row of viewSeriesRows) {
      const dayKey =
        typeof row.day === 'string' ? row.day : new Date(row.day).toISOString().slice(0, 10);
      seriesMap.set(dayKey, Number(row.count));
    }

    const seriesLabels: string[] = [];
    const seriesViews: number[] = [];
    for (let i = 0; i < Math.max(rangeDays, 1); i += 1) {
      const day = new Date(from);
      day.setDate(from.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      seriesLabels.push(key);
      seriesViews.push(seriesMap.get(key) ?? 0);
    }

    const payload = {
      rangeDays,
      from,
      to,
      totals: {
        prompts: promptCount,
        posts: postCount,
        users: userCount,
        comments: commentCount,
        categories: categoryCount,
        tags: tagCount,
        views: (promptViewsTotal._sum.viewCount ?? 0) + (postViewsTotal._sum.viewCount ?? 0),
        promptViews: promptViewsTotal._sum.viewCount ?? 0,
        postViews: postViewsTotal._sum.viewCount ?? 0,
        revenue: Number(revenueTotal._sum.amount ?? 0),
        newUsers: newUsersCount,
      },
      engagement: {
        views: engagementMap.get('VIEW') ?? 0,
        likes: engagementMap.get('LIKE') ?? 0,
        saves: engagementMap.get('SAVE') ?? 0,
        shares: engagementMap.get('SHARE') ?? 0,
      },
      series: {
        labels: seriesLabels,
        views: seriesViews,
      },
      topPrompts,
      topPosts,
    };

    this.cache.set(cacheKey, { value: payload, expiresAt: now + this.cacheTtlMs });
    return payload;
  }

  private readonly cache = new Map<string, { expiresAt: number; value: AnalyticsOverview }>();
  private readonly cacheTtlMs = 60_000;
}
