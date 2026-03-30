import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizePagination } from '../../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';

type NewsletterSubmissionSort = 'recent' | 'oldest';

function parseDateBoundary(value: string, boundary: 'start' | 'end') {
  const trimmed = value.trim();
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  if (isDateOnly) {
    return new Date(`${trimmed}T${boundary === 'start' ? '00:00:00.000' : '23:59:59.999'}Z`);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: {
    skip?: number;
    take?: number;
    search?: string;
    source?: string;
    from?: string;
    to?: string;
    sort?: NewsletterSubmissionSort;
  }) {
    const { skip, take } = normalizePagination(options.skip, options.take);
    const where: Prisma.NewsletterSubmissionWhereInput = {};
    const searchTerm = options.search?.trim();
    const source = options.source?.trim();

    if (searchTerm) {
      where.OR = [
        { email: { contains: searchTerm } },
        { source: { contains: searchTerm } },
        { pagePath: { contains: searchTerm } },
      ];
    }

    if (source) {
      where.source = source;
    }

    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (options.from?.trim()) {
      const fromDate = parseDateBoundary(options.from, 'start');
      if (fromDate) {
        createdAtFilter.gte = fromDate;
      }
    }
    if (options.to?.trim()) {
      const toDate = parseDateBoundary(options.to, 'end');
      if (toDate) {
        createdAtFilter.lte = toDate;
      }
    }
    if (createdAtFilter.gte || createdAtFilter.lte) {
      where.createdAt = createdAtFilter;
    }

    const orderBy: Prisma.NewsletterSubmissionOrderByWithRelationInput = {
      createdAt: options.sort === 'oldest' ? 'asc' : 'desc',
    };

    const [items, total, sourceRows] = await Promise.all([
      this.prisma.newsletterSubmission.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          email: true,
          source: true,
          pagePath: true,
          createdAt: true,
        },
      }),
      this.prisma.newsletterSubmission.count({ where }),
      this.prisma.newsletterSubmission.findMany({
        distinct: ['source'],
        orderBy: { source: 'asc' },
        select: { source: true },
      }),
    ]);

    return {
      items,
      total,
      sources: sourceRows.map((row) => row.source),
    };
  }
}
