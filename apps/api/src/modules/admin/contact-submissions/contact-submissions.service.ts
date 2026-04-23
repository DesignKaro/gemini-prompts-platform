import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizePagination } from '../../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CONTACT_SUBMISSION_STATUSES,
  type ContactSubmissionStatus,
} from './contact-submission-status';

type ContactSubmissionSort = 'recent' | 'oldest';

type ContactSubmissionListRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  status: ContactSubmissionStatus;
  source: string;
  pagePath: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
};

type ContactSubmissionDetailRow = ContactSubmissionListRow & {
  message: string;
  internalNote: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  updatedAt: Date;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedByEmail: string | null;
};

function parseDateBoundary(value: string, boundary: 'start' | 'end') {
  const trimmed = value.trim();
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  if (isDateOnly) {
    return new Date(`${trimmed}T${boundary === 'start' ? '00:00:00.000' : '23:59:59.999'}Z`);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toSqlConditionList(
  options: Pick<
    Parameters<ContactSubmissionsService['findAll']>[0],
    'search' | 'status' | 'source' | 'from' | 'to'
  >,
) {
  const conditions: Prisma.Sql[] = [];

  const searchTerm = options.search?.trim();
  if (searchTerm) {
    const like = `%${searchTerm}%`;
    conditions.push(
      Prisma.sql`(
        name LIKE ${like}
        OR email LIKE ${like}
        OR subject LIKE ${like}
        OR message LIKE ${like}
        OR source LIKE ${like}
        OR pagePath LIKE ${like}
      )`,
    );
  }

  if (options.status) {
    conditions.push(Prisma.sql`status = ${options.status}`);
  }

  const source = options.source?.trim();
  if (source) {
    conditions.push(Prisma.sql`source = ${source}`);
  }

  if (options.from?.trim()) {
    const fromDate = parseDateBoundary(options.from, 'start');
    if (fromDate) {
      conditions.push(Prisma.sql`createdAt >= ${fromDate}`);
    }
  }

  if (options.to?.trim()) {
    const toDate = parseDateBoundary(options.to, 'end');
    if (toDate) {
      conditions.push(Prisma.sql`createdAt <= ${toDate}`);
    }
  }

  return conditions;
}

@Injectable()
export class ContactSubmissionsService {
  private tableBootstrapInFlight: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private isMissingContactSubmissionTableError(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    if (!['P2010', 'P2021'].includes(error.code)) {
      return false;
    }

    const rawCode =
      typeof error.meta?.code === 'string' || typeof error.meta?.code === 'number'
        ? String(error.meta.code)
        : '';
    if (rawCode === '1146') {
      return true;
    }

    const metaMessage = typeof error.meta?.message === 'string' ? error.meta.message : '';
    const message = `${error.message} ${metaMessage}`;
    return (
      /ContactSubmission/i.test(message) &&
      /(doesn't exist|does not exist|no such table|unknown table|table .+ not found)/i.test(message)
    );
  }

  private async ensureContactSubmissionTableExists() {
    if (this.tableBootstrapInFlight) {
      await this.tableBootstrapInFlight;
      return;
    }

    this.tableBootstrapInFlight = this.prisma
      .$executeRawUnsafe(
        `
      CREATE TABLE IF NOT EXISTS \`ContactSubmission\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`name\` VARCHAR(120) NOT NULL,
        \`email\` VARCHAR(320) NOT NULL,
        \`subject\` VARCHAR(160) NOT NULL,
        \`message\` TEXT NOT NULL,
        \`status\` ENUM('NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM') NOT NULL DEFAULT 'NEW',
        \`internalNote\` TEXT NULL,
        \`source\` VARCHAR(120) NOT NULL,
        \`pagePath\` VARCHAR(512) NULL,
        \`ipAddress\` VARCHAR(191) NULL,
        \`userAgent\` VARCHAR(512) NULL,
        \`reviewedById\` VARCHAR(191) NULL,
        \`reviewedAt\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`ContactSubmission_createdAt_idx\`(\`createdAt\`),
        INDEX \`ContactSubmission_status_idx\`(\`status\`),
        INDEX \`ContactSubmission_email_idx\`(\`email\`),
        INDEX \`ContactSubmission_source_idx\`(\`source\`),
        INDEX \`ContactSubmission_status_createdAt_idx\`(\`status\`, \`createdAt\`),
        INDEX \`ContactSubmission_reviewedById_idx\`(\`reviewedById\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `,
      )
      .then(() => undefined);

    try {
      await this.tableBootstrapInFlight;
    } finally {
      this.tableBootstrapInFlight = null;
    }
  }

  private async withContactSubmissionTableRecovery<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      if (!this.isMissingContactSubmissionTableError(error)) {
        throw error;
      }

      await this.ensureContactSubmissionTableExists();
      return operation();
    }
  }

  async findAll(options: {
    skip?: number;
    take?: number;
    search?: string;
    status?: ContactSubmissionStatus;
    source?: string;
    from?: string;
    to?: string;
    sort?: ContactSubmissionSort;
  }) {
    const { skip, take } = normalizePagination(options.skip, options.take);
    const conditions = toSqlConditionList(options);
    const whereClause =
      conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;
    const orderByClause =
      options.sort === 'oldest'
        ? Prisma.sql`ORDER BY createdAt ASC`
        : Prisma.sql`ORDER BY createdAt DESC`;

    return this.withContactSubmissionTableRecovery(async () => {
      const [items, totalRows, sourceRows] = await Promise.all([
        this.prisma.$queryRaw<ContactSubmissionListRow[]>(Prisma.sql`
          SELECT
            id,
            name,
            email,
            subject,
            status,
            source,
            pagePath,
            createdAt,
            reviewedAt
          FROM \`ContactSubmission\`
          ${whereClause}
          ${orderByClause}
          LIMIT ${take}
          OFFSET ${skip}
        `),
        this.prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
          SELECT COUNT(*) AS total
          FROM \`ContactSubmission\`
          ${whereClause}
        `),
        this.prisma.$queryRaw<Array<{ source: string }>>(Prisma.sql`
          SELECT DISTINCT source
          FROM \`ContactSubmission\`
          ORDER BY source ASC
        `),
      ]);

      const totalRaw = totalRows[0]?.total ?? 0;
      const total =
        typeof totalRaw === 'bigint'
          ? Number(totalRaw)
          : Number.isFinite(totalRaw)
            ? Number(totalRaw)
            : 0;

      return {
        items,
        total,
        statuses: CONTACT_SUBMISSION_STATUSES,
        sources: sourceRows.map((row) => row.source),
      };
    });
  }

  async findOne(id: string) {
    return this.withContactSubmissionTableRecovery(async () => {
      const rows = await this.prisma.$queryRaw<ContactSubmissionDetailRow[]>(Prisma.sql`
        SELECT
          cs.id,
          cs.name,
          cs.email,
          cs.subject,
          cs.message,
          cs.status,
          cs.internalNote,
          cs.source,
          cs.pagePath,
          cs.ipAddress,
          cs.userAgent,
          cs.createdAt,
          cs.updatedAt,
          cs.reviewedAt,
          cs.reviewedById,
          reviewer.name AS reviewedByName,
          reviewer.email AS reviewedByEmail
        FROM \`ContactSubmission\` cs
        LEFT JOIN \`User\` reviewer ON reviewer.id = cs.reviewedById
        WHERE cs.id = ${id}
        LIMIT 1
      `);

      const submission = rows[0];
      if (!submission) {
        throw new NotFoundException('Contact submission not found.');
      }

      return {
        id: submission.id,
        name: submission.name,
        email: submission.email,
        subject: submission.subject,
        message: submission.message,
        status: submission.status,
        internalNote: submission.internalNote,
        source: submission.source,
        pagePath: submission.pagePath,
        ipAddress: submission.ipAddress,
        userAgent: submission.userAgent,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        reviewedAt: submission.reviewedAt,
        reviewedBy: submission.reviewedById
          ? {
              id: submission.reviewedById,
              name: submission.reviewedByName,
              email: submission.reviewedByEmail ?? '',
            }
          : null,
      };
    });
  }

  async update(
    id: string,
    input: {
      status?: ContactSubmissionStatus;
      internalNote?: string | null;
      hasInternalNote?: boolean;
    },
    reviewerId: string,
  ) {
    const hasStatus = input.status !== undefined;
    const hasInternalNote = Boolean(input.hasInternalNote);

    if (!hasStatus && !hasInternalNote) {
      throw new BadRequestException('No updates were provided.');
    }

    const setClauses: Prisma.Sql[] = [
      Prisma.sql`reviewedAt = NOW(3)`,
      Prisma.sql`reviewedById = ${reviewerId}`,
    ];

    if (hasStatus && input.status) {
      setClauses.push(Prisma.sql`status = ${input.status}`);
    }

    if (hasInternalNote) {
      const normalizedNote =
        typeof input.internalNote === 'string' ? input.internalNote.trim() : input.internalNote;
      setClauses.push(
        normalizedNote && normalizedNote.length > 0
          ? Prisma.sql`internalNote = ${normalizedNote}`
          : Prisma.sql`internalNote = NULL`,
      );
    }

    return this.withContactSubmissionTableRecovery(async () => {
      const affectedRows = await this.prisma.$executeRaw(Prisma.sql`
        UPDATE \`ContactSubmission\`
        SET ${Prisma.join(setClauses, ', ')}
        WHERE id = ${id}
      `);

      if (!affectedRows) {
        throw new NotFoundException('Contact submission not found.');
      }

      return this.findOne(id);
    });
  }

  async remove(id: string) {
    return this.withContactSubmissionTableRecovery(async () => {
      const affectedRows = await this.prisma.$executeRaw(Prisma.sql`
        DELETE FROM \`ContactSubmission\`
        WHERE id = ${id}
      `);

      if (!affectedRows) {
        throw new NotFoundException('Contact submission not found.');
      }

      return { success: true };
    });
  }
}
