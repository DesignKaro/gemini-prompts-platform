import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePagination } from '../../common/utils/pagination';

type RedirectRuleInput = {
  sourcePath?: string;
  destinationPath?: string;
  isPermanent?: boolean;
  isActive?: boolean;
};

type RedirectRuleRecord = {
  id: string;
  sourcePath: string;
  destinationPath: string;
  isPermanent: boolean;
  isActive: boolean;
  hitCount: number;
  lastHitAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class RedirectRulesService {
  constructor(private readonly prisma: PrismaService) {}

  private get redirectRuleDelegate() {
    return (this.prisma as PrismaService & {
      redirectRule: {
        findMany: (args: Record<string, unknown>) => Promise<RedirectRuleRecord[]>;
        count: (args: Record<string, unknown>) => Promise<number>;
        create: (args: Record<string, unknown>) => Promise<RedirectRuleRecord>;
        findUnique: (args: Record<string, unknown>) => Promise<RedirectRuleRecord | null>;
        update: (args: Record<string, unknown>) => Promise<RedirectRuleRecord>;
        findFirst: (args: Record<string, unknown>) => Promise<RedirectRuleRecord | null>;
        delete: (args: Record<string, unknown>) => Promise<RedirectRuleRecord>;
      };
    }).redirectRule;
  }

  async list(options: { skip?: number; take?: number; search?: string }) {
    const { skip, take } = normalizePagination(options.skip, options.take);
    const search = options.search?.trim();
    const where = search
      ? {
          OR: [
            { sourcePath: { contains: search } },
            { destinationPath: { contains: search } },
          ],
        }
      : undefined;

    const [items, total] = await this.prisma.$transaction([
      this.redirectRuleDelegate.findMany({
        where,
        skip,
        take,
        orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      }),
      this.redirectRuleDelegate.count({ where }),
    ]);

    return { items, total };
  }

  async create(input: RedirectRuleInput) {
    const sourcePath = this.normalizeSourcePath(input.sourcePath);
    const destinationPath = this.normalizeDestinationPath(input.destinationPath);

    if (sourcePath === destinationPath) {
      throw new BadRequestException('Redirect source and destination cannot be the same.');
    }

    return this.redirectRuleDelegate.create({
      data: {
        sourcePath,
        destinationPath,
        isPermanent: input.isPermanent ?? true,
        isActive: input.isActive ?? true,
      },
    });
  }

  async update(id: string, input: RedirectRuleInput) {
    const current = await this.redirectRuleDelegate.findUnique({ where: { id } });
    if (!current) {
      throw new BadRequestException('Redirect rule not found.');
    }

    const sourcePath =
      input.sourcePath !== undefined
        ? this.normalizeSourcePath(input.sourcePath)
        : current.sourcePath;
    const destinationPath =
      input.destinationPath !== undefined
        ? this.normalizeDestinationPath(input.destinationPath)
        : current.destinationPath;

    if (sourcePath === destinationPath) {
      throw new BadRequestException('Redirect source and destination cannot be the same.');
    }

    return this.redirectRuleDelegate.update({
      where: { id },
      data: {
        sourcePath,
        destinationPath,
        isPermanent: input.isPermanent ?? current.isPermanent,
        isActive: input.isActive ?? current.isActive,
      },
    });
  }

  async remove(id: string) {
    return this.redirectRuleDelegate.delete({ where: { id } });
  }

  async resolve(path: string) {
    const normalizedPath = this.normalizeSourcePath(path);
    const rule = await this.redirectRuleDelegate.findFirst({
      where: {
        sourcePath: normalizedPath,
        isActive: true,
      },
    });

    if (!rule) {
      return null;
    }

    await this.redirectRuleDelegate.update({
      where: { id: rule.id },
      data: {
        hitCount: { increment: 1 },
        lastHitAt: new Date(),
      },
    });

    return {
      destinationPath: rule.destinationPath,
      isPermanent: rule.isPermanent,
    };
  }

  private normalizeSourcePath(value?: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new BadRequestException('Source path is required.');
    }
    if (/^https?:\/\//i.test(trimmed)) {
      throw new BadRequestException('Source path must be a relative path.');
    }

    const normalized = this.normalizeRelativePath(trimmed);
    if (normalized.includes('#')) {
      throw new BadRequestException(
        'Source path cannot include hash fragments because fragments are not sent in HTTP requests.',
      );
    }

    return normalized;
  }

  private normalizeDestinationPath(value?: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new BadRequestException('Destination path is required.');
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    return this.normalizeRelativePath(trimmed);
  }

  private normalizeRelativePath(value: string) {
    const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
    const [pathPart = '/', queryAndHash = ''] = withLeadingSlash.split(/(?=[?#])/);
    const collapsedPath = pathPart.replace(/\/{2,}/g, '/');
    const normalizedPath =
      collapsedPath.length > 1 && collapsedPath.endsWith('/')
        ? collapsedPath.slice(0, -1)
        : collapsedPath;

    return `${normalizedPath}${queryAndHash}`;
  }
}
