import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CommentStatus,
  CommentTargetType,
  EngagementEventType,
  MembershipPlan,
  Prisma,
  PromptStatus,
  PromptVisibility,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import type { Env } from '@/config/env.validation';
import { normalizePagination } from '../../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import type { VerifyMembershipCheckoutDto } from './dto/verify-membership-checkout.dto';
import type {
  AuthorFollowResponse,
  ContentViewResponse,
  FollowedAuthorListResponse,
  PromptCommentCreateResponse,
  PromptCommentLikeResponse,
  PromptCommentListResponse,
  PromptInteractionStatusResponse,
  PromptLikeResponse,
  PromptSaveResponse,
} from './types/prompt-interactions.type';
import type {
  MembershipCheckoutCycle,
  MembershipCheckoutOrderResponse,
  MembershipCheckoutVerifyResponse,
} from './types/membership-checkout.type';

type PromptListOptions = {
  skip?: number;
  take?: number;
  search?: string;
  categorySlug?: string;
  tagSlug?: string;
  authorSlug?: string;
  authorId?: string;
  authorIds?: string[];
  publishedFrom?: string;
  publishedTo?: string;
  includeTags?: boolean;
  visibility?: PromptVisibility;
  sort?: 'latest' | 'popular' | 'trending';
};

type PostListOptions = {
  skip?: number;
  take?: number;
  search?: string;
  categorySlug?: string;
  tagSlug?: string;
  authorSlug?: string;
  authorId?: string;
  visibility?: PromptVisibility;
  includeContent?: boolean;
  includeTags?: boolean;
  sort?: 'latest' | 'popular';
};

type TaxonomyListOptions = {
  skip?: number;
  take?: number;
  sort?: 'name' | 'popular';
};

type PromptCommentListOptions = {
  skip?: number;
  take?: number;
};

type PrismaClientLike = Prisma.TransactionClient | PrismaService;
type PublicViewer = AuthUser | undefined;
type PublicVisibilityMode = 'published' | 'viewer' | 'discover';

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

type RazorpayPaymentResponse = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
};

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);
  private readonly mediaRefPrefix = 'media:';
  private readonly inlineImageDataUrlPattern =
    /^data:image\/(?:avif|gif|jpeg|jpg|png|webp);base64,[a-z0-9+/=\s]+$/i;
  private readonly inlineImageDataMaxLength = 1_500_000;
  private readonly interactionIpSecret: string;
  private readonly razorpayKeyId: string;
  private readonly razorpayKeySecret: string;
  private readonly razorpayApiBaseUrl: string;
  private contactSubmissionTableBootstrapInFlight: Promise<void> | null = null;
  private readonly viewDedupWindowMs = 24 * 60 * 60 * 1000;
  private readonly membershipPricing = {
    monthly: { amountMinor: 1200, amountMajor: 12, currency: 'USD' },
    yearly: { amountMinor: 9900, amountMajor: 99, currency: 'USD' },
  } as const;
  private readonly crawlerUserAgentPattern =
    /(bot|crawler|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discordbot|linkedinbot|twitterbot|headless)/i;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>,
  ) {
    this.interactionIpSecret = this.configService.getOrThrow('JWT_SECRET', { infer: true });
    this.razorpayKeyId = this.configService.getOrThrow('RAZORPAY_KEY_ID', { infer: true });
    this.razorpayKeySecret = this.configService.getOrThrow('RAZORPAY_KEY_SECRET', { infer: true });
    this.razorpayApiBaseUrl = this.configService
      .getOrThrow('RAZORPAY_API_BASE_URL', { infer: true })
      .replace(/\/$/, '');
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private resolveAuthorSlug(author: { id?: string; handle?: string | null; name?: string | null }) {
    if (author.handle) return author.handle;
    if (author.name) return this.slugify(author.name);
    return author.id ?? 'author';
  }

  private extractMediaRef(value?: string | null): string | null {
    if (!value || !value.startsWith(this.mediaRefPrefix)) return null;
    const id = value.slice(this.mediaRefPrefix.length).trim();
    return id || null;
  }

  private sanitizePublicMediaUrl(value?: string | null, maxLength = 4_096): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    if (normalized.startsWith('data:')) {
      if (!this.inlineImageDataUrlPattern.test(normalized)) {
        return null;
      }

      if (normalized.length > this.inlineImageDataMaxLength) {
        return null;
      }

      return normalized;
    }

    if (normalized.length > maxLength) {
      return null;
    }

    return normalized;
  }

  private normalizeGalleryImageUrls(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => this.sanitizePublicMediaUrl(typeof entry === 'string' ? entry : null))
      .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
      .slice(0, 5);
  }

  private async hydrateMediaRefs<T extends Record<string, unknown>>(
    items: T[],
    field: string,
  ): Promise<T[]> {
    const ids = new Set<string>();

    for (const item of items) {
      const raw = typeof item[field] === 'string' ? (item[field] as string) : null;
      const refId = this.extractMediaRef(raw);
      if (refId) ids.add(refId);
    }

    if (ids.size === 0) {
      return items;
    }

    const assets = await this.prisma.mediaAsset.findMany({
      where: { id: { in: Array.from(ids) } },
      select: { id: true, url: true },
    });

    const assetMap = new Map(assets.map((asset) => [asset.id, asset.url]));

    return items.map((item) => {
      const raw = typeof item[field] === 'string' ? (item[field] as string) : null;
      const refId = this.extractMediaRef(raw);
      if (!refId) return item;
      return {
        ...item,
        [field]: assetMap.get(refId) ?? null,
      };
    });
  }

  private async hydrateSingleMediaRef<T extends Record<string, unknown>>(
    item: T,
    field: string,
  ): Promise<T> {
    const hydrated = await this.hydrateMediaRefs([item], field);
    return hydrated[0] ?? item;
  }

  private async hydrateGalleryImageRefs<T extends { galleryImageUrls?: Prisma.JsonValue | null }>(
    items: T[],
  ): Promise<Array<T & { galleryImageUrls: string[] }>> {
    const normalizedItems = items.map((item) => ({
      item,
      gallery: this.normalizeGalleryImageUrls(item.galleryImageUrls),
    }));
    const ids = new Set<string>();

    for (const { gallery } of normalizedItems) {
      for (const imageUrl of gallery) {
        const refId = this.extractMediaRef(imageUrl);
        if (refId) {
          ids.add(refId);
        }
      }
    }

    const assetMap =
      ids.size > 0
        ? new Map(
            (
              await this.prisma.mediaAsset.findMany({
                where: { id: { in: Array.from(ids) } },
                select: { id: true, url: true },
              })
            ).map((asset) => [asset.id, asset.url]),
          )
        : new Map<string, string>();

    return normalizedItems.map(({ item, gallery }) => ({
      ...item,
      galleryImageUrls: gallery
        .map((imageUrl) => {
          const refId = this.extractMediaRef(imageUrl);
          if (!refId) {
            return imageUrl;
          }
          return assetMap.get(refId) ?? null;
        })
        .filter(
          (imageUrl): imageUrl is string => typeof imageUrl === 'string' && imageUrl.length > 0,
        ),
    }));
  }

  private async hydrateSingleGalleryImageRef<
    T extends { galleryImageUrls?: Prisma.JsonValue | null },
  >(item: T): Promise<T & { galleryImageUrls: string[] }> {
    const hydrated = await this.hydrateGalleryImageRefs([item]);
    return hydrated[0] ?? { ...item, galleryImageUrls: [] };
  }

  private async hydrateAuthorAvatarRefs<
    T extends { author?: { avatarUrl?: string | null } | null },
  >(items: T[]): Promise<T[]> {
    const ids = new Set<string>();

    for (const item of items) {
      const refId = this.extractMediaRef(item.author?.avatarUrl ?? null);
      if (refId) ids.add(refId);
    }

    if (ids.size === 0) {
      return items;
    }

    const assets = await this.prisma.mediaAsset.findMany({
      where: { id: { in: Array.from(ids) } },
      select: { id: true, url: true },
    });

    const assetMap = new Map(assets.map((asset) => [asset.id, asset.url]));

    return items.map((item) => {
      const refId = this.extractMediaRef(item.author?.avatarUrl ?? null);
      if (!refId || !item.author) return item;

      return {
        ...item,
        author: {
          ...item.author,
          avatarUrl: assetMap.get(refId) ?? null,
        },
      };
    });
  }

  private async hydrateSingleAuthorAvatarRef<
    T extends { author?: { avatarUrl?: string | null } | null },
  >(item: T): Promise<T> {
    const hydrated = await this.hydrateAuthorAvatarRefs([item]);
    return hydrated[0] ?? item;
  }

  private async getCommentCounts(targetType: CommentTargetType, targetIds: string[]) {
    const uniqueIds = Array.from(new Set(targetIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return new Map<string, number>();
    }

    const rows = await this.prisma.comment.groupBy({
      by: ['targetId'],
      where: {
        targetType,
        targetId: { in: uniqueIds },
        status: CommentStatus.APPROVED,
        parentId: null,
        deletedAt: null,
      },
      _count: { _all: true },
    });

    return new Map(rows.map((row) => [row.targetId, row._count._all]));
  }

  private buildPublicPromptWhereById(
    promptId: string,
    viewer?: PublicViewer,
    visibilityMode: PublicVisibilityMode = 'viewer',
  ): Prisma.PromptWhereInput {
    const where = this.buildPublicPromptWhere({}, viewer, visibilityMode);
    const filters = Array.isArray(where.AND) ? where.AND : [];

    return {
      AND: [...filters, { id: promptId }],
    };
  }

  private async findPublicPromptSnapshot(
    promptId: string,
    prismaClient: PrismaClientLike = this.prisma,
    viewer?: PublicViewer,
    visibilityMode: PublicVisibilityMode = 'viewer',
  ) {
    const resolvedViewer = await this.resolveViewerForExclusiveAccess(viewer, prismaClient);
    const prompt = await prismaClient.prompt.findFirst({
      where: this.buildPublicPromptWhereById(promptId, resolvedViewer, visibilityMode),
      select: {
        id: true,
        viewCount: true,
        likeCount: true,
        saveCount: true,
      },
    });

    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    return prompt;
  }

  private buildPublicPostWhereById(
    postId: string,
    viewer?: PublicViewer,
    visibilityMode: PublicVisibilityMode = 'viewer',
  ): Prisma.PostWhereInput {
    const where = this.buildPublicPostWhere({}, viewer, visibilityMode);
    const filters = Array.isArray(where.AND) ? where.AND : [];

    return {
      AND: [...filters, { id: postId }],
    };
  }

  private async findPublicPostSnapshot(
    postId: string,
    prismaClient: PrismaClientLike = this.prisma,
    viewer?: PublicViewer,
    visibilityMode: PublicVisibilityMode = 'viewer',
  ) {
    const resolvedViewer = await this.resolveViewerForExclusiveAccess(viewer, prismaClient);
    const post = await prismaClient.post.findFirst({
      where: this.buildPublicPostWhereById(postId, resolvedViewer, visibilityMode),
      select: { id: true, viewCount: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  private async findPublicCommentSnapshot(
    commentId: string,
    prismaClient: PrismaClientLike = this.prisma,
    viewer?: PublicViewer,
  ) {
    const comment = await prismaClient.comment.findFirst({
      where: {
        id: commentId,
        deletedAt: null,
        status: CommentStatus.APPROVED,
      },
      select: {
        id: true,
        targetType: true,
        targetId: true,
        parentId: true,
        likeCount: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.targetType === CommentTargetType.PROMPT) {
      await this.findPublicPromptSnapshot(comment.targetId, prismaClient, viewer);
    } else {
      await this.findPublicPostSnapshot(comment.targetId, prismaClient, viewer);
    }

    return comment;
  }

  private async findFollowableAuthorSnapshot(
    authorId: string,
    prismaClient: PrismaClientLike = this.prisma,
  ) {
    const author = await prismaClient.user.findFirst({
      where: {
        id: authorId,
        handle: { not: null },
        suspendedAt: null,
      },
      select: { id: true },
    });

    if (!author) {
      throw new NotFoundException('Author not found');
    }

    return author;
  }

  private async resolveAuthorIdBySlug(
    authorSlug: string,
    prismaClient: PrismaClientLike = this.prisma,
  ): Promise<string | null> {
    const normalized = authorSlug.trim();
    if (!normalized) return null;

    const author = await prismaClient.user.findFirst({
      where: { handle: normalized },
      select: { id: true },
    });

    return author?.id ?? null;
  }

  private normalizePromptIds(promptIds: string[]) {
    return Array.from(
      new Set(
        promptIds.map((promptId) => promptId.trim()).filter((promptId) => promptId.length > 0),
      ),
    );
  }

  private async getViewerLikedCommentIds(
    commentIds: string[],
    ipAddress?: string,
    userId?: string,
  ) {
    const uniqueCommentIds = Array.from(
      new Set(commentIds.map((id) => id.trim()).filter((id) => id.length > 0)),
    );
    if (uniqueCommentIds.length === 0) {
      return new Set<string>();
    }

    const normalizedIp = ipAddress?.trim();
    const ipHash = normalizedIp ? this.createIpHash(normalizedIp) : null;

    let likedByUser: Array<{ commentId: string }> = [];
    let likedByIp: Array<{ commentId: string }> = [];

    if (userId && ipHash) {
      [likedByUser, likedByIp] = await Promise.all([
        this.prisma.commentLike.findMany({
          where: {
            userId,
            commentId: { in: uniqueCommentIds },
          },
          select: { commentId: true },
        }),
        this.prisma.commentLikeIp.findMany({
          where: {
            ipHash,
            commentId: { in: uniqueCommentIds },
          },
          select: { commentId: true },
        }),
      ]);
    } else if (userId) {
      likedByUser = await this.prisma.commentLike.findMany({
        where: {
          userId,
          commentId: { in: uniqueCommentIds },
        },
        select: { commentId: true },
      });
    } else if (ipHash) {
      likedByIp = await this.prisma.commentLikeIp.findMany({
        where: {
          ipHash,
          commentId: { in: uniqueCommentIds },
        },
        select: { commentId: true },
      });
    }

    return new Set([
      ...likedByUser.map((item) => item.commentId),
      ...likedByIp.map((item) => item.commentId),
    ]);
  }

  private createIpHash(ipAddress: string): string {
    return createHmac('sha256', this.interactionIpSecret).update(ipAddress).digest('hex');
  }

  private createViewerHash(identity: {
    ipAddress: string;
    userAgent?: string;
    userId?: string;
  }): string {
    const normalizedUserAgent = (identity.userAgent ?? '').trim().toLowerCase().slice(0, 256);
    const seed = identity.userId
      ? `user:${identity.userId}`
      : `anon:${this.createIpHash(identity.ipAddress)}:${normalizedUserAgent}`;
    return createHmac('sha256', this.interactionIpSecret).update(seed).digest('hex');
  }

  private isAutomatedUserAgent(userAgent?: string): boolean {
    if (!userAgent?.trim()) return false;
    return this.crawlerUserAgentPattern.test(userAgent);
  }

  private shouldCountView(lastViewedAt: Date | null | undefined, now: Date): boolean {
    if (!lastViewedAt) return true;
    return now.getTime() - lastViewedAt.getTime() >= this.viewDedupWindowMs;
  }

  private isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

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
    if (this.contactSubmissionTableBootstrapInFlight) {
      await this.contactSubmissionTableBootstrapInFlight;
      return;
    }

    this.contactSubmissionTableBootstrapInFlight = this.prisma
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
      await this.contactSubmissionTableBootstrapInFlight;
      this.logger.warn(
        'ContactSubmission table was missing and has been auto-created. Run SQL migrations to keep schema in sync.',
      );
    } finally {
      this.contactSubmissionTableBootstrapInFlight = null;
    }
  }

  private isDatabaseUnavailableError(error: unknown) {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return true;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(error.code)
    ) {
      return true;
    }

    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes("Can't reach database server") ||
      message.includes('Prisma connect timeout') ||
      message.includes('Connection pool timeout') ||
      message.includes('Server has closed the connection')
    );
  }

  private formatDatabaseErrorMessage(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.replace(/\s+/g, ' ').trim();
    const connectivityMessage = normalized.match(
      /Can't reach database server.*|Prisma connect timeout.*|Connection pool timeout.*/i,
    );
    return connectivityMessage?.[0] ?? normalized;
  }

  private async withDatabaseReadFallback<T>(
    operation: string,
    fallback: T,
    read: () => Promise<T>,
  ): Promise<T> {
    try {
      return await read();
    } catch (error) {
      if (!this.isDatabaseUnavailableError(error)) {
        throw error;
      }

      if (process.env.NODE_ENV === 'production') {
        throw error;
      }

      this.logger.warn(
        `Database unavailable while serving ${operation}. Returning fallback response. ${this.formatDatabaseErrorMessage(error)}`,
      );
      return fallback;
    }
  }

  private resolveMembershipPricing(cycle: MembershipCheckoutCycle) {
    return this.membershipPricing[cycle];
  }

  private resolveMembershipCycleFromTransaction(transaction: {
    status: string;
    amount: Prisma.Decimal | number | string;
    currency: string;
  }): MembershipCheckoutCycle {
    const normalizedStatus = transaction.status.toUpperCase();
    if (normalizedStatus.includes('YEARLY')) {
      return 'yearly';
    }
    if (normalizedStatus.includes('MONTHLY')) {
      return 'monthly';
    }

    const amount =
      typeof transaction.amount === 'number'
        ? transaction.amount
        : Number(
            typeof transaction.amount === 'string'
              ? transaction.amount
              : transaction.amount.toString(),
          );
    const currency = transaction.currency.toUpperCase();
    const yearly = this.resolveMembershipPricing('yearly');
    if (currency === yearly.currency && amount === yearly.amountMajor) {
      return 'yearly';
    }
    return 'monthly';
  }

  private createMembershipExpiryDate(cycle: MembershipCheckoutCycle, fromDate = new Date()): Date {
    const next = new Date(fromDate.getTime());
    if (cycle === 'yearly') {
      next.setFullYear(next.getFullYear() + 1);
      return next;
    }
    next.setMonth(next.getMonth() + 1);
    return next;
  }

  private createRazorpayReceipt(cycle: MembershipCheckoutCycle, userId: string) {
    const cycleCode = cycle === 'yearly' ? 'y' : 'm';
    const sanitizedUserId = userId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const userToken = (sanitizedUserId || 'user').slice(-10);
    const timestampToken = Date.now().toString(36);
    const randomToken = randomBytes(3).toString('hex');
    return `mem_${cycleCode}_${userToken}_${timestampToken}_${randomToken}`.slice(0, 40);
  }

  private getRazorpayAuthHeader() {
    const encoded = Buffer.from(`${this.razorpayKeyId}:${this.razorpayKeySecret}`).toString(
      'base64',
    );
    return `Basic ${encoded}`;
  }

  private async requestRazorpay<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.razorpayApiBaseUrl}${path}`, {
      ...init,
      headers: {
        authorization: this.getRazorpayAuthHeader(),
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
    });

    const payload = (await response.json().catch(() => null)) as
      | (T & { error?: { description?: string } })
      | { error?: { description?: string } }
      | null;

    if (!response.ok || !payload) {
      const message =
        payload && 'error' in payload && payload.error?.description
          ? payload.error.description
          : `Razorpay request failed with status ${response.status}.`;
      throw new BadRequestException(message);
    }

    return payload as T;
  }

  private publicPromptWindow(now: Date): Prisma.PromptWhereInput {
    return {
      OR: [{ publishedAt: { lte: now } }, { publishedAt: null }],
    };
  }

  private publicPostWindow(now: Date): Prisma.PostWhereInput {
    return {
      OR: [{ publishedAt: { lte: now } }, { publishedAt: null }],
    };
  }

  private canAccessExclusiveContent(viewer?: PublicViewer) {
    if (!viewer) {
      return false;
    }

    if (viewer.plan === MembershipPlan.PREMIUM) {
      return true;
    }

    return viewer.role === UserRole.ADMIN || viewer.role === UserRole.SUPERADMIN;
  }

  /**
   * Public endpoints can be hit with a valid but stale JWT right after checkout.
   * If the token says FREE, re-check the latest user access state once from DB
   * before applying exclusive-content visibility filters.
   */
  private async resolveViewerForExclusiveAccess(
    viewer?: PublicViewer,
    prismaClient: PrismaClientLike = this.prisma,
  ): Promise<PublicViewer> {
    if (!viewer) {
      return undefined;
    }

    if (viewer.suspendedAt) {
      return undefined;
    }

    if (this.canAccessExclusiveContent(viewer)) {
      return viewer;
    }

    const latestUser = await prismaClient.user.findUnique({
      where: { id: viewer.sub },
      select: {
        email: true,
        role: true,
        plan: true,
        suspendedAt: true,
      },
    });

    if (!latestUser || latestUser.suspendedAt) {
      return undefined;
    }

    if (latestUser.role === viewer.role && latestUser.plan === viewer.plan) {
      return viewer;
    }

    return {
      ...viewer,
      email: latestUser.email,
      role: latestUser.role,
      plan: latestUser.plan,
      suspendedAt: null,
    };
  }

  private isContentLocked(visibility: PromptVisibility, viewer?: PublicViewer) {
    return visibility === PromptVisibility.EXCLUSIVE && !this.canAccessExclusiveContent(viewer);
  }

  private buildPublicPromptWhere(
    options: Omit<PromptListOptions, 'skip' | 'take' | 'sort'>,
    viewer?: PublicViewer,
    visibilityMode: PublicVisibilityMode = 'viewer',
  ) {
    const now = new Date();
    const filters: Prisma.PromptWhereInput[] = [
      { deletedAt: null },
      { status: PromptStatus.PUBLISHED },
      this.publicPromptWindow(now),
    ];

    if (options.visibility) {
      filters.push({ visibility: options.visibility });
    } else if (visibilityMode === 'viewer' && !this.canAccessExclusiveContent(viewer)) {
      filters.push({ visibility: PromptVisibility.FREE });
    }

    if (options.search?.trim()) {
      const term = options.search.trim();
      filters.push({
        OR: [
          { title: { contains: term } },
          { description: { contains: term } },
          { content: { contains: term } },
        ],
      });
    }

    if (options.categorySlug) {
      filters.push({
        OR: [
          { primaryCategory: { slug: options.categorySlug } },
          { categories: { some: { slug: options.categorySlug } } },
        ],
      });
    }

    if (options.tagSlug) {
      filters.push({ tags: { some: { slug: options.tagSlug } } });
    }

    if (options.authorIds && options.authorIds.length > 0) {
      filters.push({ authorId: { in: options.authorIds } });
    } else if (options.authorId) {
      filters.push({ authorId: options.authorId });
    } else if (options.authorSlug) {
      filters.push({ author: { handle: options.authorSlug } });
    }

    const publishedAtFilter: Prisma.DateTimeFilter = {};
    if (options.publishedFrom?.trim()) {
      const publishedFrom = new Date(options.publishedFrom.trim());
      if (!Number.isNaN(publishedFrom.getTime())) {
        publishedAtFilter.gte = publishedFrom;
      }
    }
    if (options.publishedTo?.trim()) {
      const publishedTo = new Date(options.publishedTo.trim());
      if (!Number.isNaN(publishedTo.getTime())) {
        publishedAtFilter.lt = publishedTo;
      }
    }
    if (Object.keys(publishedAtFilter).length > 0) {
      filters.push({ publishedAt: publishedAtFilter });
    }

    return { AND: filters };
  }

  private buildPublicPostWhere(
    options: Omit<PostListOptions, 'skip' | 'take' | 'sort'>,
    viewer?: PublicViewer,
    visibilityMode: PublicVisibilityMode = 'viewer',
  ) {
    const now = new Date();
    const filters: Prisma.PostWhereInput[] = [
      { deletedAt: null },
      { status: PromptStatus.PUBLISHED },
      this.publicPostWindow(now),
    ];

    if (options.visibility) {
      filters.push({ visibility: options.visibility });
    } else if (visibilityMode === 'viewer' && !this.canAccessExclusiveContent(viewer)) {
      filters.push({ visibility: PromptVisibility.FREE });
    }

    if (options.search?.trim()) {
      const term = options.search.trim();
      filters.push({
        OR: [
          { title: { contains: term } },
          { excerpt: { contains: term } },
          { content: { contains: term } },
        ],
      });
    }

    if (options.categorySlug) {
      filters.push({
        OR: [
          { primaryCategory: { slug: options.categorySlug } },
          { categories: { some: { slug: options.categorySlug } } },
        ],
      });
    }

    if (options.tagSlug) {
      filters.push({ tags: { some: { slug: options.tagSlug } } });
    }

    if (options.authorId) {
      filters.push({ authorId: options.authorId });
    } else if (options.authorSlug) {
      filters.push({ author: { handle: options.authorSlug } });
    }

    return { AND: filters };
  }

  private getPromptOrderBy(
    sort?: PromptListOptions['sort'],
  ): Prisma.PromptOrderByWithRelationInput[] {
    if (sort === 'popular') {
      return [{ likeCount: 'desc' }, { viewCount: 'desc' }, { publishedAt: 'desc' }];
    }

    if (sort === 'trending') {
      return [{ viewCount: 'desc' }, { likeCount: 'desc' }, { publishedAt: 'desc' }];
    }

    return [{ publishedAt: 'desc' }, { updatedAt: 'desc' }];
  }

  private getPostOrderBy(sort?: PostListOptions['sort']): Prisma.PostOrderByWithRelationInput[] {
    if (sort === 'popular') {
      return [{ viewCount: 'desc' }, { commentCount: 'desc' }, { publishedAt: 'desc' }];
    }

    return [{ publishedAt: 'desc' }, { updatedAt: 'desc' }];
  }

  private compactText(value: string | null | undefined, maxChars: number): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return null;
    }

    if (normalized.length <= maxChars) {
      return normalized;
    }

    return `${normalized.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
  }

  private toAuthorSummary(author: {
    id: string;
    name: string | null;
    handle: string | null;
    profileTitle?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    avatarUpdatedAt?: Date | null;
  }) {
    const displayName = author.name || author.handle || 'Unknown author';
    const slug = this.resolveAuthorSlug(author);

    return {
      id: author.id,
      name: displayName,
      handle: author.handle,
      slug,
      profileTitle: author.profileTitle ?? null,
      bio: author.bio ?? null,
      avatarUrl: this.sanitizePublicMediaUrl(author.avatarUrl ?? null),
      avatarUpdatedAt: author.avatarUpdatedAt ? author.avatarUpdatedAt.toISOString() : null,
    };
  }

  private toPromptSummary(
    prompt: {
      id: string;
      slug: string;
      title: string;
      description: string | null;
      promptType: string;
      visibility: PromptVisibility;
      featuredImageUrl: string | null;
      metaTitle?: string | null;
      metaDescription?: string | null;
      galleryImageUrls?: Prisma.JsonValue | null;
      publishedAt: Date | null;
      updatedAt: Date;
      viewCount: number;
      likeCount: number;
      saveCount: number;
      seoNoIndex?: boolean | null;
      author: {
        id: string;
        name: string | null;
        handle: string | null;
        avatarUrl: string | null;
        avatarUpdatedAt: Date | null;
      };
      primaryCategory: { id: string; name: string; slug: string } | null;
      categories: Array<{ id: string; name: string; slug: string }>;
      tags?: Array<{ id: string; name: string; slug: string }>;
    },
    commentCount: number,
    viewer?: PublicViewer,
    options?: {
      compact?: boolean;
    },
  ) {
    const compact = options?.compact === true;
    const isLocked = this.isContentLocked(prompt.visibility, viewer);
    const galleryImages = this.normalizeGalleryImageUrls(prompt.galleryImageUrls).slice(
      0,
      compact ? 1 : 5,
    );
    return {
      id: prompt.id,
      slug: prompt.slug,
      title: prompt.title,
      description: compact ? this.compactText(prompt.description, 320) : prompt.description,
      metaTitle: prompt.metaTitle ?? null,
      metaDescription: compact
        ? this.compactText(prompt.metaDescription ?? null, 220)
        : (prompt.metaDescription ?? null),
      promptType: prompt.promptType,
      visibility: prompt.visibility,
      image: this.sanitizePublicMediaUrl(prompt.featuredImageUrl),
      galleryImages,
      publishedAt: prompt.publishedAt ? prompt.publishedAt.toISOString() : null,
      updatedAt: prompt.updatedAt.toISOString(),
      viewCount: prompt.viewCount,
      likeCount: prompt.likeCount,
      saveCount: prompt.saveCount,
      commentCount,
      seoNoIndex: prompt.seoNoIndex ?? false,
      isLocked,
      requiresMembership: prompt.visibility === PromptVisibility.EXCLUSIVE,
      author: this.toAuthorSummary(prompt.author),
      primaryCategory: prompt.primaryCategory,
      categories: compact ? prompt.categories.slice(0, 3) : prompt.categories,
      tags: compact ? (prompt.tags ?? []).slice(0, 8) : (prompt.tags ?? []),
    };
  }

  private toPostSummary(
    post: {
      id: string;
      slug: string;
      title: string;
      excerpt: string | null;
      content?: string | null;
      postType: string;
      postFormat: string;
      visibility: PromptVisibility;
      featuredImageUrl: string | null;
      metaTitle?: string | null;
      metaDescription?: string | null;
      publishedAt: Date | null;
      updatedAt: Date;
      viewCount: number;
      seoNoIndex?: boolean | null;
      author: {
        id: string;
        name: string | null;
        handle: string | null;
        avatarUrl: string | null;
        avatarUpdatedAt: Date | null;
      };
      primaryCategory: { id: string; name: string; slug: string } | null;
      categories: Array<{ id: string; name: string; slug: string }>;
      tags?: Array<{ id: string; name: string; slug: string }>;
    },
    commentCount: number,
    viewer?: PublicViewer,
    options?: {
      compact?: boolean;
    },
  ) {
    const compact = options?.compact === true;
    const isLocked = this.isContentLocked(post.visibility, viewer);
    const compactedContent = compact ? this.compactText(post.content ?? '', 1_200) : post.content;
    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: compact ? this.compactText(post.excerpt, 320) : post.excerpt,
      metaTitle: post.metaTitle ?? null,
      metaDescription: compact
        ? this.compactText(post.metaDescription ?? null, 220)
        : (post.metaDescription ?? null),
      content: isLocked ? null : (compactedContent ?? ''),
      postType: post.postType,
      postFormat: post.postFormat,
      visibility: post.visibility,
      image: this.sanitizePublicMediaUrl(post.featuredImageUrl),
      publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
      updatedAt: post.updatedAt.toISOString(),
      viewCount: post.viewCount,
      commentCount,
      seoNoIndex: post.seoNoIndex ?? false,
      isLocked,
      requiresMembership: post.visibility === PromptVisibility.EXCLUSIVE,
      author: this.toAuthorSummary(post.author),
      primaryCategory: post.primaryCategory,
      categories: compact ? post.categories.slice(0, 3) : post.categories,
      tags: compact ? (post.tags ?? []).slice(0, 8) : (post.tags ?? []),
    };
  }

  async getPrompts(options: PromptListOptions, viewer?: PublicViewer) {
    return this.withDatabaseReadFallback(
      'GET /api/public/prompts',
      { items: [], total: 0 },
      async () => {
        const resolvedViewer = await this.resolveViewerForExclusiveAccess(viewer);
        const { skip, take } = normalizePagination(options.skip, options.take);
        const includeTags = options.includeTags ?? false;
        const resolvedAuthorIds = Array.from(
          new Set(
            (options.authorIds ?? [])
              .map((authorId) => authorId.trim())
              .filter((authorId) => authorId.length > 0),
          ),
        );
        let resolvedOptions: PromptListOptions = {
          ...options,
          authorIds: resolvedAuthorIds.length > 0 ? resolvedAuthorIds : undefined,
        };

        if (
          (!resolvedOptions.authorIds || resolvedOptions.authorIds.length === 0) &&
          resolvedOptions.authorSlug &&
          !resolvedOptions.authorId
        ) {
          const authorId = await this.resolveAuthorIdBySlug(resolvedOptions.authorSlug);
          if (!authorId) {
            return { items: [], total: 0 };
          }
          resolvedOptions = {
            ...options,
            authorSlug: undefined,
            authorId,
          };
        }

        const where = this.buildPublicPromptWhere(resolvedOptions, resolvedViewer, 'discover');
        const promptSelect: Prisma.PromptSelect = {
          id: true,
          slug: true,
          title: true,
          description: true,
          promptType: true,
          visibility: true,
          featuredImageUrl: true,
          metaTitle: true,
          metaDescription: true,
          galleryImageUrls: true,
          publishedAt: true,
          updatedAt: true,
          viewCount: true,
          likeCount: true,
          saveCount: true,
          seoNoIndex: true,
          author: {
            select: {
              id: true,
              name: true,
              handle: true,
              avatarUrl: true,
              avatarUpdatedAt: true,
            },
          },
          primaryCategory: { select: { id: true, name: true, slug: true } },
          categories: { select: { id: true, name: true, slug: true } },
          ...(includeTags ? { tags: { select: { id: true, name: true, slug: true } } } : {}),
        };

        const [items, total] = await this.prisma.$transaction([
          this.prisma.prompt.findMany({
            where,
            skip,
            take,
            orderBy: this.getPromptOrderBy(options.sort),
            select: promptSelect,
          }),
          this.prisma.prompt.count({ where }),
        ]);

        const hydratedWithImages = await this.hydrateMediaRefs(items, 'featuredImageUrl');
        const hydratedWithGallery = await this.hydrateGalleryImageRefs(hydratedWithImages);
        const hydrated = await this.hydrateAuthorAvatarRefs(hydratedWithGallery);
        const commentCounts = await this.getCommentCounts(
          CommentTargetType.PROMPT,
          hydrated.map((item) => item.id),
        );

        return {
          items: hydrated.map((prompt) =>
            this.toPromptSummary(prompt, commentCounts.get(prompt.id) ?? 0, resolvedViewer, {
              compact: true,
            }),
          ),
          total,
        };
      },
    );
  }

  async getPrompt(slug: string, viewer?: PublicViewer) {
    const resolvedViewer = await this.resolveViewerForExclusiveAccess(viewer);
    const where = this.buildPublicPromptWhere({}, resolvedViewer, 'published');
    const prompt = await this.prisma.prompt.findFirst({
      where: {
        ...where,
        AND: [...((where.AND as Prisma.PromptWhereInput[]) ?? []), { slug }],
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            handle: true,
            profileTitle: true,
            bio: true,
            avatarUrl: true,
            avatarUpdatedAt: true,
          },
        },
        primaryCategory: { select: { id: true, name: true, slug: true } },
        categories: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    const hydratedPromptImage = await this.hydrateSingleMediaRef(prompt, 'featuredImageUrl');
    const hydratedPromptGallery = await this.hydrateSingleGalleryImageRef(hydratedPromptImage);
    const hydratedPrompt = await this.hydrateSingleAuthorAvatarRef(hydratedPromptGallery);
    const promptSeo = prompt as typeof prompt & {
      seoFocusKeyword?: string | null;
      seoCanonicalUrl?: string | null;
      seoNoIndex?: boolean | null;
    };
    const commentCountMap = await this.getCommentCounts(CommentTargetType.PROMPT, [prompt.id]);
    const baseCategory = prompt.primaryCategory?.slug ?? prompt.categories[0]?.slug ?? null;
    const isLocked = this.isContentLocked(prompt.visibility, resolvedViewer);

    const relatedResponse = await this.getPrompts(
      {
        take: 3,
        categorySlug: baseCategory ?? undefined,
        visibility:
          prompt.visibility === PromptVisibility.EXCLUSIVE ? PromptVisibility.EXCLUSIVE : undefined,
        sort: 'trending',
      },
      resolvedViewer,
    );

    return {
      ...this.toPromptSummary(hydratedPrompt, commentCountMap.get(prompt.id) ?? 0, resolvedViewer),
      content: isLocked ? null : prompt.content,
      metaTitle: prompt.metaTitle ?? null,
      metaDescription: prompt.metaDescription ?? null,
      seoTitle: prompt.seoTitle ?? null,
      seoDescription: prompt.seoDescription ?? null,
      seoFocusKeyword: promptSeo.seoFocusKeyword ?? null,
      seoCanonicalUrl: promptSeo.seoCanonicalUrl ?? null,
      seoNoIndex: promptSeo.seoNoIndex ?? false,
      relatedPrompts: relatedResponse.items.filter((item) => item.id !== prompt.id).slice(0, 3),
    };
  }

  async trackPromptView(
    promptId: string,
    ipAddress: string,
    userAgent?: string,
    userId?: string,
  ): Promise<ContentViewResponse> {
    const normalizedIp = ipAddress.trim();
    if (!normalizedIp) {
      throw new BadRequestException('Unable to resolve client IP.');
    }

    if (this.isAutomatedUserAgent(userAgent)) {
      const prompt = await this.findPublicPromptSnapshot(
        promptId,
        this.prisma,
        undefined,
        'published',
      );
      return {
        counted: false,
        viewCount: prompt.viewCount,
      };
    }

    const viewerHash = this.createViewerHash({
      ipAddress: normalizedIp,
      userAgent,
      userId,
    });
    const now = new Date();
    let counted = false;
    let viewCount = 0;

    await this.prisma.$transaction(async (tx) => {
      const prompt = await this.findPublicPromptSnapshot(promptId, tx, undefined, 'published');
      viewCount = prompt.viewCount;

      const existingView = await tx.promptView.findUnique({
        where: {
          promptId_viewerHash: {
            promptId: prompt.id,
            viewerHash,
          },
        },
        select: {
          userId: true,
          lastViewedAt: true,
        },
      });

      const shouldCount = this.shouldCountView(existingView?.lastViewedAt, now);

      if (existingView) {
        const updateData: Prisma.PromptViewUpdateInput = {
          lastViewedAt: now,
        };

        if (shouldCount) {
          updateData.viewCount = { increment: 1 };
        }

        if (!existingView.userId && userId) {
          updateData.user = { connect: { id: userId } };
        }

        await tx.promptView.update({
          where: {
            promptId_viewerHash: {
              promptId: prompt.id,
              viewerHash,
            },
          },
          data: updateData,
        });
      } else {
        await tx.promptView.create({
          data: {
            promptId: prompt.id,
            viewerHash,
            userId,
            firstViewedAt: now,
            lastViewedAt: now,
            viewCount: 1,
          },
        });
      }

      if (shouldCount) {
        const updatedPrompt = await tx.prompt.update({
          where: { id: prompt.id },
          data: {
            viewCount: { increment: 1 },
          },
          select: { viewCount: true },
        });

        await tx.engagementEvent.create({
          data: {
            promptId: prompt.id,
            userId: userId ?? null,
            eventType: EngagementEventType.VIEW,
          },
        });

        counted = true;
        viewCount = updatedPrompt.viewCount;
      }
    });

    return {
      counted,
      viewCount,
    };
  }

  async getPromptInteractionStatus(
    promptIds: string[],
    ipAddress?: string,
    userId?: string,
  ): Promise<PromptInteractionStatusResponse> {
    const uniquePromptIds = this.normalizePromptIds(promptIds).slice(0, 100);
    const fallback = {
      items: uniquePromptIds.map((promptId) => ({
        promptId,
        likedByIp: false,
        savedByUser: false,
      })),
    };

    if (uniquePromptIds.length === 0) {
      return fallback;
    }

    return this.withDatabaseReadFallback(
      'POST /api/public/prompts/interactions/status',
      fallback,
      async () => {
        const publicPromptWhere = this.buildPublicPromptWhere({}, undefined, 'published');
        const publicPromptFilters = Array.isArray(publicPromptWhere.AND)
          ? publicPromptWhere.AND
          : [];

        const publicPrompts = await this.prisma.prompt.findMany({
          where: {
            AND: [...publicPromptFilters, { id: { in: uniquePromptIds } }],
          },
          select: { id: true },
        });

        const publicPromptIds = publicPrompts.map((prompt) => prompt.id);
        const publicPromptIdSet = new Set(publicPromptIds);
        const ipHash = ipAddress?.trim() ? this.createIpHash(ipAddress.trim()) : null;

        let userLikes: Array<{ promptId: string }> = [];
        let ipLikes: Array<{ promptId: string }> = [];
        let userSaves: Array<{ promptId: string }> = [];

        if (ipHash && userId) {
          [userLikes, ipLikes, userSaves] = await this.prisma.$transaction([
            this.prisma.promptLike.findMany({
              where: {
                promptId: { in: publicPromptIds },
                userId,
              },
              select: { promptId: true },
            }),
            this.prisma.promptLikeIp.findMany({
              where: {
                promptId: { in: publicPromptIds },
                ipHash,
              },
              select: { promptId: true },
            }),
            this.prisma.savedPrompt.findMany({
              where: {
                promptId: { in: publicPromptIds },
                userId,
              },
              select: { promptId: true },
            }),
          ]);
        } else if (ipHash) {
          ipLikes = await this.prisma.promptLikeIp.findMany({
            where: {
              promptId: { in: publicPromptIds },
              ipHash,
            },
            select: { promptId: true },
          });
        } else if (userId) {
          [userLikes, userSaves] = await this.prisma.$transaction([
            this.prisma.promptLike.findMany({
              where: {
                promptId: { in: publicPromptIds },
                userId,
              },
              select: { promptId: true },
            }),
            this.prisma.savedPrompt.findMany({
              where: {
                promptId: { in: publicPromptIds },
                userId,
              },
              select: { promptId: true },
            }),
          ]);
        }

        const userLikeSet = new Set(userLikes.map((item) => item.promptId));
        const ipLikeSet = new Set(ipLikes.map((item) => item.promptId));
        const userSaveSet = new Set(userSaves.map((item) => item.promptId));

        return {
          items: uniquePromptIds.map((promptId) => ({
            promptId,
            likedByIp: publicPromptIdSet.has(promptId)
              ? userLikeSet.has(promptId) || ipLikeSet.has(promptId)
              : false,
            savedByUser: publicPromptIdSet.has(promptId) ? userSaveSet.has(promptId) : false,
          })),
        };
      },
    );
  }

  async likePrompt(
    promptId: string,
    ipAddress?: string,
    userAgent?: string,
    userId?: string,
  ): Promise<PromptLikeResponse> {
    const normalizedIp = ipAddress?.trim();
    if (!normalizedIp) {
      throw new BadRequestException('Unable to resolve client IP.');
    }

    if (this.isAutomatedUserAgent(userAgent)) {
      throw new BadRequestException('Likes are unavailable for automated traffic.');
    }

    const ipHash = this.createIpHash(normalizedIp);
    let alreadyLiked = false;
    let likeCount = 0;

    await this.prisma.$transaction(async (tx) => {
      const prompt = await this.findPublicPromptSnapshot(promptId, tx, undefined, 'published');
      likeCount = prompt.likeCount;

      if (userId) {
        const [existingUserLike, existingIpLike] = await Promise.all([
          tx.promptLike.findUnique({
            where: {
              promptId_userId: {
                promptId: prompt.id,
                userId,
              },
            },
            select: { promptId: true },
          }),
          tx.promptLikeIp.findUnique({
            where: {
              promptId_ipHash: {
                promptId: prompt.id,
                ipHash,
              },
            },
            select: { promptId: true },
          }),
        ]);

        if (existingUserLike) {
          alreadyLiked = true;
          if (!existingIpLike) {
            try {
              await tx.promptLikeIp.create({
                data: {
                  promptId: prompt.id,
                  ipHash,
                },
              });
            } catch (error) {
              if (!this.isUniqueConstraintError(error)) {
                throw error;
              }
            }
          }
          const latestPrompt = await tx.prompt.findUnique({
            where: { id: prompt.id },
            select: { likeCount: true },
          });
          likeCount = latestPrompt?.likeCount ?? likeCount;
          return;
        }

        try {
          await tx.promptLike.create({
            data: {
              promptId: prompt.id,
              userId,
            },
          });
        } catch (error) {
          if (!this.isUniqueConstraintError(error)) {
            throw error;
          }
          alreadyLiked = true;
        }

        if (alreadyLiked) {
          const latestPrompt = await tx.prompt.findUnique({
            where: { id: prompt.id },
            select: { likeCount: true },
          });
          likeCount = latestPrompt?.likeCount ?? likeCount;
          return;
        }

        if (existingIpLike) {
          alreadyLiked = true;
          return;
        }

        try {
          await tx.promptLikeIp.create({
            data: {
              promptId: prompt.id,
              ipHash,
            },
          });
        } catch (error) {
          if (this.isUniqueConstraintError(error)) {
            alreadyLiked = true;
            const latestPrompt = await tx.prompt.findUnique({
              where: { id: prompt.id },
              select: { likeCount: true },
            });
            likeCount = latestPrompt?.likeCount ?? likeCount;
            return;
          }
          throw error;
        }

        const updatedPrompt = await tx.prompt.update({
          where: { id: prompt.id },
          data: { likeCount: { increment: 1 } },
          select: { likeCount: true },
        });
        likeCount = updatedPrompt.likeCount;
        return;
      }

      try {
        await tx.promptLikeIp.create({
          data: {
            promptId: prompt.id,
            ipHash,
          },
        });

        const updatedPrompt = await tx.prompt.update({
          where: { id: prompt.id },
          data: { likeCount: { increment: 1 } },
          select: { likeCount: true },
        });
        likeCount = updatedPrompt.likeCount;
      } catch (error) {
        if (this.isUniqueConstraintError(error)) {
          alreadyLiked = true;
          const latestPrompt = await tx.prompt.findUnique({
            where: { id: prompt.id },
            select: { likeCount: true },
          });
          likeCount = latestPrompt?.likeCount ?? likeCount;
        } else {
          throw error;
        }
      }
    });

    return {
      liked: true,
      alreadyLiked,
      likeCount,
    };
  }

  async savePrompt(promptId: string, user: AuthUser): Promise<PromptSaveResponse> {
    let saveCount = 0;

    await this.prisma.$transaction(async (tx) => {
      const prompt = await this.findPublicPromptSnapshot(promptId, tx, user, 'published');
      saveCount = prompt.saveCount;

      try {
        await tx.savedPrompt.create({
          data: {
            promptId: prompt.id,
            userId: user.sub,
          },
        });

        const updatedPrompt = await tx.prompt.update({
          where: { id: prompt.id },
          data: {
            saveCount: { increment: 1 },
          },
          select: { saveCount: true },
        });
        saveCount = updatedPrompt.saveCount;
      } catch (error) {
        if (this.isUniqueConstraintError(error)) {
          const latestPrompt = await tx.prompt.findUnique({
            where: { id: prompt.id },
            select: { saveCount: true },
          });
          saveCount = latestPrompt?.saveCount ?? saveCount;
        } else {
          throw error;
        }
      }
    });

    return {
      saved: true,
      saveCount,
    };
  }

  async sharePrompt(promptId: string, userId?: string | null) {
    await this.prisma.$transaction(async (tx) => {
      const prompt = await this.findPublicPromptSnapshot(promptId, tx, undefined, 'published');
      await tx.engagementEvent.create({
        data: {
          promptId: prompt.id,
          userId: userId ?? null,
          eventType: EngagementEventType.SHARE,
        },
      });
    });

    return { tracked: true };
  }

  async unsavePrompt(promptId: string, user: AuthUser): Promise<PromptSaveResponse> {
    let saveCount = 0;

    await this.prisma.$transaction(async (tx) => {
      const prompt = await this.findPublicPromptSnapshot(promptId, tx, user, 'published');
      saveCount = prompt.saveCount;

      const deleted = await tx.savedPrompt.deleteMany({
        where: {
          promptId: prompt.id,
          userId: user.sub,
        },
      });

      if (deleted.count > 0) {
        await tx.prompt.updateMany({
          where: {
            id: prompt.id,
            saveCount: { gt: 0 },
          },
          data: {
            saveCount: { decrement: 1 },
          },
        });
      }

      const latestPrompt = await tx.prompt.findUnique({
        where: { id: prompt.id },
        select: { saveCount: true },
      });
      saveCount = latestPrompt?.saveCount ?? 0;
    });

    return {
      saved: false,
      saveCount,
    };
  }

  async getPromptComments(
    promptId: string,
    options: PromptCommentListOptions,
    ipAddress?: string,
    userId?: string,
    viewer?: PublicViewer,
  ): Promise<PromptCommentListResponse> {
    await this.findPublicPromptSnapshot(promptId, this.prisma, viewer, 'published');
    const { skip, take } = normalizePagination(options.skip, options.take);

    const approvedWhere: Prisma.CommentWhereInput = {
      targetType: CommentTargetType.PROMPT,
      targetId: promptId,
      status: CommentStatus.APPROVED,
      deletedAt: null,
    };
    const approvedTotalWhere: Prisma.CommentWhereInput = {
      ...approvedWhere,
      parentId: null,
    };
    const parentWhere: Prisma.CommentWhereInput = {
      ...approvedWhere,
      parentId: null,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where: parentWhere,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              handle: true,
              profileTitle: true,
              bio: true,
              avatarUrl: true,
              avatarUpdatedAt: true,
            },
          },
          replies: {
            where: {
              status: CommentStatus.APPROVED,
              deletedAt: null,
            },
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  handle: true,
                  profileTitle: true,
                  bio: true,
                  avatarUrl: true,
                  avatarUpdatedAt: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.comment.count({ where: approvedTotalWhere }),
    ]);

    const hydratedParents = await this.hydrateAuthorAvatarRefs(items);
    const allReplies = hydratedParents.flatMap((comment) => comment.replies);
    const hydratedReplies = await this.hydrateAuthorAvatarRefs(allReplies);
    const hydratedReplyMap = new Map(hydratedReplies.map((reply) => [reply.id, reply]));
    const hydrated = hydratedParents.map((comment) => ({
      ...comment,
      replies: comment.replies.map((reply) => hydratedReplyMap.get(reply.id) ?? reply),
    }));

    const likedCommentIds = await this.getViewerLikedCommentIds(
      hydrated.flatMap((comment) => [comment.id, ...comment.replies.map((reply) => reply.id)]),
      ipAddress,
      userId,
    );

    return {
      items: hydrated.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        status: comment.status as 'APPROVED' | 'PENDING',
        likeCount: comment.likeCount,
        likedByViewer: likedCommentIds.has(comment.id),
        replyCount: comment.replies.length,
        author: comment.author ? this.toAuthorSummary(comment.author) : null,
        replies: comment.replies.map((reply) => ({
          id: reply.id,
          content: reply.content,
          createdAt: reply.createdAt.toISOString(),
          status: reply.status as 'APPROVED' | 'PENDING',
          likeCount: reply.likeCount,
          likedByViewer: likedCommentIds.has(reply.id),
          author: reply.author ? this.toAuthorSummary(reply.author) : null,
        })),
      })),
      total,
    };
  }

  async getPostComments(
    postId: string,
    options: PromptCommentListOptions,
    ipAddress?: string,
    userId?: string,
    viewer?: PublicViewer,
  ): Promise<PromptCommentListResponse> {
    await this.findPublicPostSnapshot(postId, this.prisma, viewer, 'published');
    const { skip, take } = normalizePagination(options.skip, options.take);

    const approvedWhere: Prisma.CommentWhereInput = {
      targetType: CommentTargetType.POST,
      targetId: postId,
      status: CommentStatus.APPROVED,
      deletedAt: null,
    };
    const approvedTotalWhere: Prisma.CommentWhereInput = {
      ...approvedWhere,
      parentId: null,
    };
    const parentWhere: Prisma.CommentWhereInput = {
      ...approvedWhere,
      parentId: null,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where: parentWhere,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              handle: true,
              profileTitle: true,
              bio: true,
              avatarUrl: true,
              avatarUpdatedAt: true,
            },
          },
          replies: {
            where: {
              status: CommentStatus.APPROVED,
              deletedAt: null,
            },
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  handle: true,
                  profileTitle: true,
                  bio: true,
                  avatarUrl: true,
                  avatarUpdatedAt: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.comment.count({ where: approvedTotalWhere }),
    ]);

    const hydratedParents = await this.hydrateAuthorAvatarRefs(items);
    const allReplies = hydratedParents.flatMap((comment) => comment.replies);
    const hydratedReplies = await this.hydrateAuthorAvatarRefs(allReplies);
    const hydratedReplyMap = new Map(hydratedReplies.map((reply) => [reply.id, reply]));
    const hydrated = hydratedParents.map((comment) => ({
      ...comment,
      replies: comment.replies.map((reply) => hydratedReplyMap.get(reply.id) ?? reply),
    }));

    const likedCommentIds = await this.getViewerLikedCommentIds(
      hydrated.flatMap((comment) => [comment.id, ...comment.replies.map((reply) => reply.id)]),
      ipAddress,
      userId,
    );

    return {
      items: hydrated.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        status: comment.status as 'APPROVED' | 'PENDING',
        likeCount: comment.likeCount,
        likedByViewer: likedCommentIds.has(comment.id),
        replyCount: comment.replies.length,
        author: comment.author ? this.toAuthorSummary(comment.author) : null,
        replies: comment.replies.map((reply) => ({
          id: reply.id,
          content: reply.content,
          createdAt: reply.createdAt.toISOString(),
          status: reply.status as 'APPROVED' | 'PENDING',
          likeCount: reply.likeCount,
          likedByViewer: likedCommentIds.has(reply.id),
          author: reply.author ? this.toAuthorSummary(reply.author) : null,
        })),
      })),
      total,
    };
  }

  async createPromptComment(
    promptId: string,
    user: AuthUser,
    content: string,
    parentId?: string,
  ): Promise<PromptCommentCreateResponse> {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      throw new BadRequestException('Comment content is required.');
    }

    await this.findPublicPromptSnapshot(promptId, this.prisma, user);
    const normalizedParentId = parentId?.trim();
    let validatedParentId: string | null = null;

    if (normalizedParentId) {
      const parentComment = await this.prisma.comment.findFirst({
        where: {
          id: normalizedParentId,
          targetType: CommentTargetType.PROMPT,
          targetId: promptId,
          parentId: null,
          status: CommentStatus.APPROVED,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!parentComment) {
        throw new BadRequestException('Parent comment not found.');
      }

      validatedParentId = parentComment.id;
    }

    await this.prisma.comment.create({
      data: {
        authorId: user.sub,
        targetType: CommentTargetType.PROMPT,
        targetId: promptId,
        parentId: validatedParentId,
        content: normalizedContent,
        status: CommentStatus.PENDING,
      },
    });

    return {
      submitted: true,
      status: 'PENDING',
      parentId: validatedParentId,
    };
  }

  async createPostComment(
    postId: string,
    user: AuthUser,
    content: string,
    parentId?: string,
  ): Promise<PromptCommentCreateResponse> {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      throw new BadRequestException('Comment content is required.');
    }

    await this.findPublicPostSnapshot(postId, this.prisma, user);
    const normalizedParentId = parentId?.trim();
    let validatedParentId: string | null = null;

    if (normalizedParentId) {
      const parentComment = await this.prisma.comment.findFirst({
        where: {
          id: normalizedParentId,
          targetType: CommentTargetType.POST,
          targetId: postId,
          parentId: null,
          status: CommentStatus.APPROVED,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!parentComment) {
        throw new BadRequestException('Parent comment not found.');
      }

      validatedParentId = parentComment.id;
    }

    await this.prisma.comment.create({
      data: {
        authorId: user.sub,
        targetType: CommentTargetType.POST,
        targetId: postId,
        parentId: validatedParentId,
        content: normalizedContent,
        status: CommentStatus.PENDING,
      },
    });

    return {
      submitted: true,
      status: 'PENDING',
      parentId: validatedParentId,
    };
  }

  async likeComment(
    commentId: string,
    ipAddress?: string,
    userAgent?: string,
    userId?: string,
    viewer?: PublicViewer,
  ): Promise<PromptCommentLikeResponse> {
    const normalizedIp = ipAddress?.trim();
    if (!userId && !normalizedIp) {
      throw new BadRequestException('Unable to resolve viewer identity.');
    }

    if (this.isAutomatedUserAgent(userAgent)) {
      throw new BadRequestException('Likes are unavailable for automated traffic.');
    }

    const ipHash = normalizedIp ? this.createIpHash(normalizedIp) : null;
    let liked = false;
    let likeCount = 0;

    await this.prisma.$transaction(async (tx) => {
      const comment = await this.findPublicCommentSnapshot(commentId, tx, viewer);
      likeCount = comment.likeCount;

      if (userId) {
        const [existingUserLike, existingIpLike] = await Promise.all([
          tx.commentLike.findUnique({
            where: {
              commentId_userId: {
                commentId: comment.id,
                userId,
              },
            },
            select: { commentId: true },
          }),
          ipHash
            ? tx.commentLikeIp.findUnique({
                where: {
                  commentId_ipHash: {
                    commentId: comment.id,
                    ipHash,
                  },
                },
                select: { commentId: true },
              })
            : Promise.resolve(null),
        ]);

        const existingLikeCount =
          Number(Boolean(existingUserLike)) + Number(Boolean(existingIpLike));

        if (existingLikeCount > 0) {
          if (existingUserLike) {
            await tx.commentLike.delete({
              where: {
                commentId_userId: {
                  commentId: comment.id,
                  userId,
                },
              },
            });
          }

          if (existingIpLike && ipHash) {
            await tx.commentLikeIp.delete({
              where: {
                commentId_ipHash: {
                  commentId: comment.id,
                  ipHash,
                },
              },
            });
          }

          for (let index = 0; index < existingLikeCount; index += 1) {
            await tx.comment.updateMany({
              where: {
                id: comment.id,
                likeCount: { gt: 0 },
              },
              data: {
                likeCount: { decrement: 1 },
              },
            });
          }

          const latestComment = await tx.comment.findUnique({
            where: { id: comment.id },
            select: { likeCount: true },
          });
          likeCount = latestComment?.likeCount ?? 0;
          liked = false;
        } else {
          let created = false;
          try {
            await tx.commentLike.create({
              data: {
                commentId: comment.id,
                userId,
              },
            });
            created = true;
          } catch (error) {
            if (!this.isUniqueConstraintError(error)) {
              throw error;
            }
          }

          if (created) {
            const updatedComment = await tx.comment.update({
              where: { id: comment.id },
              data: {
                likeCount: { increment: 1 },
              },
              select: { likeCount: true },
            });
            likeCount = updatedComment.likeCount;
          }

          liked = true;
        }
      } else {
        const resolvedIpHash = ipHash;
        if (!resolvedIpHash) {
          throw new BadRequestException('Unable to resolve client IP.');
        }

        const existing = await tx.commentLikeIp.findUnique({
          where: {
            commentId_ipHash: {
              commentId: comment.id,
              ipHash: resolvedIpHash,
            },
          },
          select: { commentId: true },
        });

        if (existing) {
          await tx.commentLikeIp.delete({
            where: {
              commentId_ipHash: {
                commentId: comment.id,
                ipHash: resolvedIpHash,
              },
            },
          });

          await tx.comment.updateMany({
            where: {
              id: comment.id,
              likeCount: { gt: 0 },
            },
            data: {
              likeCount: { decrement: 1 },
            },
          });

          liked = false;
        } else {
          let created = false;
          try {
            await tx.commentLikeIp.create({
              data: {
                commentId: comment.id,
                ipHash: resolvedIpHash,
              },
            });
            created = true;
          } catch (error) {
            if (!this.isUniqueConstraintError(error)) {
              throw error;
            }
          }

          if (created) {
            await tx.comment.update({
              where: { id: comment.id },
              data: {
                likeCount: { increment: 1 },
              },
            });
          }

          liked = true;
        }
      }

      const latestComment = await tx.comment.findUnique({
        where: { id: comment.id },
        select: { likeCount: true },
      });
      likeCount = latestComment?.likeCount ?? likeCount;
    });

    return {
      liked,
      likeCount,
    };
  }

  async getAuthorFollowStatus(authorId: string, followerId: string): Promise<AuthorFollowResponse> {
    await this.findFollowableAuthorSnapshot(authorId);

    if (authorId === followerId) {
      const followerCount = await this.prisma.authorFollow.count({ where: { authorId } });
      return {
        following: false,
        followerCount,
      };
    }

    const [follow, followerCount] = await this.prisma.$transaction([
      this.prisma.authorFollow.findUnique({
        where: {
          followerId_authorId: {
            followerId,
            authorId,
          },
        },
        select: { authorId: true },
      }),
      this.prisma.authorFollow.count({ where: { authorId } }),
    ]);

    return {
      following: Boolean(follow),
      followerCount,
    };
  }

  async getFollowedAuthors(followerId: string): Promise<FollowedAuthorListResponse> {
    const follows = await this.prisma.authorFollow.findMany({
      where: {
        followerId,
        author: {
          handle: { not: null },
          suspendedAt: null,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            handle: true,
            avatarUrl: true,
            avatarUpdatedAt: true,
          },
        },
      },
    });

    const authoredItems = follows.map((follow) => ({
      ...follow.author,
      followedAt: follow.createdAt,
    }));

    const hydrated = await this.hydrateMediaRefs(authoredItems, 'avatarUrl');

    return {
      items: hydrated.map((author) => ({
        id: author.id,
        name: author.name || author.handle || 'Unknown author',
        slug: this.resolveAuthorSlug(author),
        avatarUrl: this.sanitizePublicMediaUrl(author.avatarUrl ?? null),
        avatarUpdatedAt: author.avatarUpdatedAt ? author.avatarUpdatedAt.toISOString() : null,
        followedAt: author.followedAt.toISOString(),
      })),
    };
  }

  async followAuthor(authorId: string, followerId: string): Promise<AuthorFollowResponse> {
    if (authorId === followerId) {
      throw new BadRequestException('You cannot follow your own profile.');
    }

    let followerCount = 0;

    await this.prisma.$transaction(async (tx) => {
      await this.findFollowableAuthorSnapshot(authorId, tx);

      try {
        await tx.authorFollow.create({
          data: {
            authorId,
            followerId,
          },
        });
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }
      }

      followerCount = await tx.authorFollow.count({ where: { authorId } });
    });

    return {
      following: true,
      followerCount,
    };
  }

  async unfollowAuthor(authorId: string, followerId: string): Promise<AuthorFollowResponse> {
    if (authorId === followerId) {
      throw new BadRequestException('You cannot unfollow your own profile.');
    }

    let followerCount = 0;

    await this.prisma.$transaction(async (tx) => {
      await this.findFollowableAuthorSnapshot(authorId, tx);

      await tx.authorFollow.deleteMany({
        where: {
          authorId,
          followerId,
        },
      });

      followerCount = await tx.authorFollow.count({ where: { authorId } });
    });

    return {
      following: false,
      followerCount,
    };
  }

  async getPosts(options: PostListOptions, viewer?: PublicViewer) {
    return this.withDatabaseReadFallback(
      'GET /api/public/posts',
      { items: [], total: 0 },
      async () => {
        const resolvedViewer = await this.resolveViewerForExclusiveAccess(viewer);
        const { skip, take } = normalizePagination(options.skip, options.take);
        const includeContent = options.includeContent ?? false;
        const includeTags = options.includeTags ?? false;
        let resolvedOptions = options;

        if (options.authorSlug && !options.authorId) {
          const authorId = await this.resolveAuthorIdBySlug(options.authorSlug);
          if (!authorId) {
            return { items: [], total: 0 };
          }
          resolvedOptions = {
            ...options,
            authorSlug: undefined,
            authorId,
          };
        }

        const where = this.buildPublicPostWhere(resolvedOptions, resolvedViewer, 'discover');
        const postSelect: Prisma.PostSelect = {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          postType: true,
          postFormat: true,
          visibility: true,
          featuredImageUrl: true,
          metaTitle: true,
          metaDescription: true,
          publishedAt: true,
          updatedAt: true,
          viewCount: true,
          seoNoIndex: true,
          ...(includeContent ? { content: true } : {}),
          author: {
            select: {
              id: true,
              name: true,
              handle: true,
              avatarUrl: true,
              avatarUpdatedAt: true,
            },
          },
          primaryCategory: { select: { id: true, name: true, slug: true } },
          categories: { select: { id: true, name: true, slug: true } },
          ...(includeTags ? { tags: { select: { id: true, name: true, slug: true } } } : {}),
        };

        const [items, total] = await this.prisma.$transaction([
          this.prisma.post.findMany({
            where,
            skip,
            take,
            orderBy: this.getPostOrderBy(options.sort),
            select: postSelect,
          }),
          this.prisma.post.count({ where }),
        ]);

        const hydratedWithImages = await this.hydrateMediaRefs(items, 'featuredImageUrl');
        const hydrated = await this.hydrateAuthorAvatarRefs(hydratedWithImages);
        const commentCounts = await this.getCommentCounts(
          CommentTargetType.POST,
          hydrated.map((item) => item.id),
        );

        return {
          items: hydrated.map((post) =>
            this.toPostSummary(post, commentCounts.get(post.id) ?? 0, resolvedViewer, {
              compact: true,
            }),
          ),
          total,
        };
      },
    );
  }

  async getPost(slug: string, viewer?: PublicViewer) {
    const resolvedViewer = await this.resolveViewerForExclusiveAccess(viewer);
    const where = this.buildPublicPostWhere({}, resolvedViewer, 'published');
    const post = await this.prisma.post.findFirst({
      where: {
        ...where,
        AND: [...((where.AND as Prisma.PostWhereInput[]) ?? []), { slug }],
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            handle: true,
            profileTitle: true,
            bio: true,
            avatarUrl: true,
            avatarUpdatedAt: true,
          },
        },
        primaryCategory: { select: { id: true, name: true, slug: true } },
        categories: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const hydratedPostImage = await this.hydrateSingleMediaRef(post, 'featuredImageUrl');
    const hydratedPost = await this.hydrateSingleAuthorAvatarRef(hydratedPostImage);
    const postSeo = post as typeof post & {
      seoFocusKeyword?: string | null;
      seoCanonicalUrl?: string | null;
      seoNoIndex?: boolean | null;
    };
    const commentCountMap = await this.getCommentCounts(CommentTargetType.POST, [post.id]);
    const baseCategory = post.primaryCategory?.slug ?? post.categories[0]?.slug ?? null;
    const isLocked = this.isContentLocked(post.visibility, resolvedViewer);

    const relatedResponse = await this.getPosts(
      {
        take: 3,
        categorySlug: baseCategory ?? undefined,
        visibility:
          post.visibility === PromptVisibility.EXCLUSIVE ? PromptVisibility.EXCLUSIVE : undefined,
        sort: 'popular',
      },
      resolvedViewer,
    );

    return {
      ...this.toPostSummary(hydratedPost, commentCountMap.get(post.id) ?? 0, resolvedViewer),
      content: isLocked ? null : post.content,
      metaTitle: post.metaTitle ?? null,
      metaDescription: post.metaDescription ?? null,
      seoTitle: post.seoTitle ?? null,
      seoDescription: post.seoDescription ?? null,
      seoFocusKeyword: postSeo.seoFocusKeyword ?? null,
      seoCanonicalUrl: postSeo.seoCanonicalUrl ?? null,
      seoNoIndex: postSeo.seoNoIndex ?? false,
      relatedPosts: relatedResponse.items.filter((item) => item.id !== post.id).slice(0, 3),
    };
  }

  async trackPostView(
    postId: string,
    ipAddress: string,
    userAgent?: string,
    userId?: string,
  ): Promise<ContentViewResponse> {
    const normalizedIp = ipAddress.trim();
    if (!normalizedIp) {
      throw new BadRequestException('Unable to resolve client IP.');
    }

    if (this.isAutomatedUserAgent(userAgent)) {
      const post = await this.findPublicPostSnapshot(postId, this.prisma, undefined, 'published');
      return {
        counted: false,
        viewCount: post.viewCount,
      };
    }

    const viewerHash = this.createViewerHash({
      ipAddress: normalizedIp,
      userAgent,
      userId,
    });
    const now = new Date();
    let counted = false;
    let viewCount = 0;

    await this.prisma.$transaction(async (tx) => {
      const post = await this.findPublicPostSnapshot(postId, tx, undefined, 'published');
      viewCount = post.viewCount;

      const existingView = await tx.postView.findUnique({
        where: {
          postId_viewerHash: {
            postId: post.id,
            viewerHash,
          },
        },
        select: {
          userId: true,
          lastViewedAt: true,
        },
      });

      const shouldCount = this.shouldCountView(existingView?.lastViewedAt, now);

      if (existingView) {
        const updateData: Prisma.PostViewUpdateInput = {
          lastViewedAt: now,
        };

        if (shouldCount) {
          updateData.viewCount = { increment: 1 };
        }

        if (!existingView.userId && userId) {
          updateData.user = { connect: { id: userId } };
        }

        await tx.postView.update({
          where: {
            postId_viewerHash: {
              postId: post.id,
              viewerHash,
            },
          },
          data: updateData,
        });
      } else {
        await tx.postView.create({
          data: {
            postId: post.id,
            viewerHash,
            userId,
            firstViewedAt: now,
            lastViewedAt: now,
            viewCount: 1,
          },
        });
      }

      if (shouldCount) {
        const updatedPost = await tx.post.update({
          where: { id: post.id },
          data: {
            viewCount: { increment: 1 },
          },
          select: { viewCount: true },
        });

        counted = true;
        viewCount = updatedPost.viewCount;
      }
    });

    return {
      counted,
      viewCount,
    };
  }

  async getCategories(options: TaxonomyListOptions, viewer?: PublicViewer) {
    return this.withDatabaseReadFallback(
      'GET /api/public/categories',
      { items: [], total: 0 },
      async () => {
        const resolvedViewer = await this.resolveViewerForExclusiveAccess(viewer);
        const { skip, take } = normalizePagination(options.skip, options.take ?? 48);
        const where: Prisma.CategoryWhereInput = { deletedAt: null };

        const [categories, total] = await Promise.all([
          this.prisma.category.findMany({
            where,
            skip,
            take,
            orderBy:
              options.sort === 'popular'
                ? [{ sortOrder: 'asc' }, { name: 'asc' }]
                : [{ sortOrder: 'asc' }, { name: 'asc' }],
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              imageUrl: true,
            },
          }),
          this.prisma.category.count({ where }),
        ]);

        const hydrated = await this.hydrateMediaRefs(categories, 'imageUrl');
        const { promptCountMap, postCountMap } = await this.getCategoryUsageMaps(
          hydrated.map((category) => category.id),
          resolvedViewer,
        );

        const mapped = hydrated.map((category) => {
          const promptCount = promptCountMap.get(category.id) ?? 0;
          const postCount = postCountMap.get(category.id) ?? 0;
          return {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description,
            imageUrl: this.sanitizePublicMediaUrl(category.imageUrl),
            promptCount,
            postCount,
            totalCount: promptCount + postCount,
          };
        });

        if (options.sort === 'popular') {
          mapped.sort((a, b) => b.totalCount - a.totalCount || a.name.localeCompare(b.name));
        }

        return {
          items: mapped,
          total,
        };
      },
    );
  }

  private async getCategoryUsageMaps(
    categoryIds: string[],
    viewer?: PublicViewer,
    visibilityMode: PublicVisibilityMode = 'discover',
  ) {
    const resolvedViewer = await this.resolveViewerForExclusiveAccess(viewer);
    const uniqueCategoryIds = Array.from(new Set(categoryIds.filter(Boolean)));
    const promptCountMap = new Map<string, number>();
    const postCountMap = new Map<string, number>();

    if (uniqueCategoryIds.length === 0) {
      return { promptCountMap, postCountMap };
    }

    const now = new Date();
    const includeExclusive =
      visibilityMode !== 'viewer' || this.canAccessExclusiveContent(resolvedViewer);
    const categoryIdSql = Prisma.join(
      uniqueCategoryIds.map((categoryId) => Prisma.sql`${categoryId}`),
    );
    const visibilityFilter = includeExclusive
      ? Prisma.sql``
      : Prisma.sql`AND p.visibility = ${PromptVisibility.FREE}`;

    let promptRows: Array<{ categoryId: string; total: bigint | number }> = [];
    let postRows: Array<{ categoryId: string; total: bigint | number }> = [];

    try {
      [promptRows, postRows] = await Promise.all([
        this.prisma.$queryRaw<Array<{ categoryId: string; total: bigint | number }>>(Prisma.sql`
          SELECT usage.categoryId AS categoryId, COUNT(DISTINCT usage.contentId) AS total
          FROM (
            SELECT p.primaryCategoryId AS categoryId, p.id AS contentId
            FROM \`Prompt\` p
            WHERE p.primaryCategoryId IS NOT NULL
              AND p.primaryCategoryId IN (${categoryIdSql})
              AND p.deletedAt IS NULL
              AND p.status = ${PromptStatus.PUBLISHED}
              AND (p.publishedAt <= ${now} OR p.publishedAt IS NULL)
              ${visibilityFilter}

            UNION ALL

            SELECT pc.A AS categoryId, p.id AS contentId
            FROM \`_PromptCategories\` pc
            INNER JOIN \`Prompt\` p ON p.id = pc.B
            WHERE pc.A IN (${categoryIdSql})
              AND p.deletedAt IS NULL
              AND p.status = ${PromptStatus.PUBLISHED}
              AND (p.publishedAt <= ${now} OR p.publishedAt IS NULL)
              ${visibilityFilter}
          ) AS usage
          GROUP BY usage.categoryId
        `),
        this.prisma.$queryRaw<Array<{ categoryId: string; total: bigint | number }>>(Prisma.sql`
          SELECT usage.categoryId AS categoryId, COUNT(DISTINCT usage.contentId) AS total
          FROM (
            SELECT p.primaryCategoryId AS categoryId, p.id AS contentId
            FROM \`Post\` p
            WHERE p.primaryCategoryId IS NOT NULL
              AND p.primaryCategoryId IN (${categoryIdSql})
              AND p.deletedAt IS NULL
              AND p.status = ${PromptStatus.PUBLISHED}
              AND (p.publishedAt <= ${now} OR p.publishedAt IS NULL)
              ${visibilityFilter}

            UNION ALL

            SELECT pc.A AS categoryId, p.id AS contentId
            FROM \`_PostCategories\` pc
            INNER JOIN \`Post\` p ON p.id = pc.B
            WHERE pc.A IN (${categoryIdSql})
              AND p.deletedAt IS NULL
              AND p.status = ${PromptStatus.PUBLISHED}
              AND (p.publishedAt <= ${now} OR p.publishedAt IS NULL)
              ${visibilityFilter}
          ) AS usage
          GROUP BY usage.categoryId
        `),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to compute category usage stats with raw SQL; falling back to Prisma aggregation. ${message}`,
      );
      return this.getCategoryUsageMapsWithPrisma(uniqueCategoryIds, resolvedViewer, visibilityMode);
    }

    for (const row of promptRows) {
      const total = typeof row.total === 'bigint' ? Number(row.total) : Number(row.total);
      if (Number.isFinite(total) && total > 0) {
        promptCountMap.set(row.categoryId, total);
      }
    }

    for (const row of postRows) {
      const total = typeof row.total === 'bigint' ? Number(row.total) : Number(row.total);
      if (Number.isFinite(total) && total > 0) {
        postCountMap.set(row.categoryId, total);
      }
    }

    return { promptCountMap, postCountMap };
  }

  private async getCategoryUsageMapsWithPrisma(
    categoryIds: string[],
    viewer?: PublicViewer,
    visibilityMode: PublicVisibilityMode = 'discover',
  ) {
    const uniqueCategoryIds = Array.from(new Set(categoryIds.filter(Boolean)));
    const promptCountMap = new Map<string, number>();
    const postCountMap = new Map<string, number>();

    if (uniqueCategoryIds.length === 0) {
      return { promptCountMap, postCountMap };
    }

    const categoryIdSet = new Set(uniqueCategoryIds);

    const [prompts, posts] = await Promise.all([
      this.prisma.prompt.findMany({
        where: {
          AND: [
            this.buildPublicPromptWhere({}, viewer, visibilityMode),
            {
              OR: [
                { primaryCategoryId: { in: uniqueCategoryIds } },
                { categories: { some: { id: { in: uniqueCategoryIds } } } },
              ],
            },
          ],
        },
        select: {
          id: true,
          primaryCategoryId: true,
          categories: { where: { id: { in: uniqueCategoryIds } }, select: { id: true } },
        },
      }),
      this.prisma.post.findMany({
        where: {
          AND: [
            this.buildPublicPostWhere({}, viewer, visibilityMode),
            {
              OR: [
                { primaryCategoryId: { in: uniqueCategoryIds } },
                { categories: { some: { id: { in: uniqueCategoryIds } } } },
              ],
            },
          ],
        },
        select: {
          id: true,
          primaryCategoryId: true,
          categories: { where: { id: { in: uniqueCategoryIds } }, select: { id: true } },
        },
      }),
    ]);

    const promptUsage = new Map<string, Set<string>>();
    for (const prompt of prompts) {
      const attachedCategoryIds = new Set<string>();

      if (prompt.primaryCategoryId && categoryIdSet.has(prompt.primaryCategoryId)) {
        attachedCategoryIds.add(prompt.primaryCategoryId);
      }

      for (const category of prompt.categories) {
        attachedCategoryIds.add(category.id);
      }

      for (const categoryId of attachedCategoryIds) {
        const set = promptUsage.get(categoryId) ?? new Set<string>();
        set.add(prompt.id);
        promptUsage.set(categoryId, set);
      }
    }

    for (const [categoryId, contentIds] of promptUsage.entries()) {
      promptCountMap.set(categoryId, contentIds.size);
    }

    const postUsage = new Map<string, Set<string>>();
    for (const post of posts) {
      const attachedCategoryIds = new Set<string>();

      if (post.primaryCategoryId && categoryIdSet.has(post.primaryCategoryId)) {
        attachedCategoryIds.add(post.primaryCategoryId);
      }

      for (const category of post.categories) {
        attachedCategoryIds.add(category.id);
      }

      for (const categoryId of attachedCategoryIds) {
        const set = postUsage.get(categoryId) ?? new Set<string>();
        set.add(post.id);
        postUsage.set(categoryId, set);
      }
    }

    for (const [categoryId, contentIds] of postUsage.entries()) {
      postCountMap.set(categoryId, contentIds.size);
    }

    return { promptCountMap, postCountMap };
  }

  async getCategory(slug: string, viewer?: PublicViewer) {
    const resolvedViewer = await this.resolveViewerForExclusiveAccess(viewer);
    const category = await this.prisma.category.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const hydratedCategory = await this.hydrateSingleMediaRef(category, 'imageUrl');
    const { promptCountMap, postCountMap } = await this.getCategoryUsageMaps(
      [hydratedCategory.id],
      resolvedViewer,
    );
    const promptCount = promptCountMap.get(hydratedCategory.id) ?? 0;
    const postCount = postCountMap.get(hydratedCategory.id) ?? 0;

    return {
      id: hydratedCategory.id,
      name: hydratedCategory.name,
      slug: hydratedCategory.slug,
      description: hydratedCategory.description,
      imageUrl: this.sanitizePublicMediaUrl(hydratedCategory.imageUrl),
      promptCount,
      postCount,
      totalCount: promptCount + postCount,
    };
  }

  async getTags(options: TaxonomyListOptions, viewer?: PublicViewer) {
    return this.withDatabaseReadFallback(
      'GET /api/public/tags',
      { items: [], total: 0 },
      async () => {
        const resolvedViewer = await this.resolveViewerForExclusiveAccess(viewer);
        const take = Number.isFinite(options.take)
          ? Math.max(1, Math.min(options.take ?? 100, 200))
          : 100;
        const publicPromptWhere = this.buildPublicPromptWhere({}, resolvedViewer, 'discover');
        const publicPostWhere = this.buildPublicPostWhere({}, resolvedViewer, 'discover');

        const tags = await this.prisma.tag.findMany({
          where: {
            deletedAt: null,
          },
          take,
          orderBy: options.sort === 'name' ? [{ name: 'asc' }] : [{ name: 'asc' }],
          include: {
            _count: {
              select: {
                prompts: { where: publicPromptWhere },
                posts: { where: publicPostWhere },
              },
            },
          },
        });

        const mapped = tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          color: tag.color,
          promptCount: tag._count.prompts,
          postCount: tag._count.posts,
          usage: tag._count.prompts + tag._count.posts,
        }));

        if (options.sort === 'popular') {
          mapped.sort((a, b) => b.usage - a.usage || a.name.localeCompare(b.name));
        }

        return {
          items: mapped,
          total: mapped.length,
        };
      },
    );
  }

  async getTag(slug: string, viewer?: PublicViewer) {
    const resolvedViewer = await this.resolveViewerForExclusiveAccess(viewer);
    const publicPromptWhere = this.buildPublicPromptWhere({}, resolvedViewer, 'discover');
    const publicPostWhere = this.buildPublicPostWhere({}, resolvedViewer, 'discover');
    const tag = await this.prisma.tag.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            prompts: { where: publicPromptWhere },
            posts: { where: publicPostWhere },
          },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      color: tag.color,
      promptCount: tag._count.prompts,
      postCount: tag._count.posts,
      usage: tag._count.prompts + tag._count.posts,
      description: `Prompts and posts tagged with ${tag.name}.`,
    };
  }

  async getAuthors(options: TaxonomyListOptions, viewer?: PublicViewer) {
    return this.withDatabaseReadFallback(
      'GET /api/public/authors',
      { items: [], total: 0 },
      async () => {
        const resolvedViewer = await this.resolveViewerForExclusiveAccess(viewer);
        const take = Number.isFinite(options.take)
          ? Math.max(1, Math.min(options.take ?? 48, 100))
          : 48;
        const publicPromptWhere = this.buildPublicPromptWhere({}, resolvedViewer, 'discover');
        const publicPostWhere = this.buildPublicPostWhere({}, resolvedViewer, 'discover');

        const authors = await this.prisma.user.findMany({
          where: {
            handle: { not: null },
            suspendedAt: null,
            OR: [{ prompts: { some: publicPromptWhere } }, { posts: { some: publicPostWhere } }],
          },
          take,
          orderBy: options.sort === 'name' ? [{ name: 'asc' }] : [{ createdAt: 'desc' }],
          include: {
            _count: {
              select: {
                prompts: { where: publicPromptWhere },
                posts: { where: publicPostWhere },
                followers: true,
              },
            },
          },
        });

        const hydratedAuthors = await this.hydrateMediaRefs(authors, 'avatarUrl');

        const mapped = hydratedAuthors.map((author) => ({
          ...this.toAuthorSummary(author),
          promptCount: author._count.prompts,
          postCount: author._count.posts,
          followerCount: author._count.followers,
          totalCount: author._count.prompts + author._count.posts,
        }));

        if (options.sort === 'popular') {
          mapped.sort((a, b) => b.totalCount - a.totalCount || a.name.localeCompare(b.name));
        }

        return {
          items: mapped,
          total: mapped.length,
        };
      },
    );
  }

  async getAuthor(slug: string, viewer?: PublicViewer) {
    const resolvedViewer = await this.resolveViewerForExclusiveAccess(viewer);
    const publicPromptWhere = this.buildPublicPromptWhere({}, resolvedViewer, 'discover');
    const publicPostWhere = this.buildPublicPostWhere({}, resolvedViewer, 'discover');

    const author = await this.prisma.user.findFirst({
      where: {
        handle: slug,
        suspendedAt: null,
      },
      select: {
        id: true,
        name: true,
        handle: true,
        profileTitle: true,
        bio: true,
        avatarUrl: true,
        avatarUpdatedAt: true,
        _count: {
          select: {
            prompts: { where: publicPromptWhere },
            posts: { where: publicPostWhere },
            followers: true,
          },
        },
      },
    });

    if (!author) {
      throw new NotFoundException('Author not found');
    }

    const promptCount = author._count.prompts;
    const postCount = author._count.posts;
    const followerCount = author._count.followers;

    if (promptCount === 0 && postCount === 0) {
      throw new NotFoundException('Author not found');
    }

    const hydratedAuthor = await this.hydrateSingleMediaRef(author, 'avatarUrl');

    return {
      ...this.toAuthorSummary(hydratedAuthor),
      promptCount,
      postCount,
      followerCount,
      totalCount: promptCount + postCount,
    };
  }

  async search(query: string, take: number, viewer?: PublicViewer) {
    const resolvedViewer = await this.resolveViewerForExclusiveAccess(viewer);
    const term = query.trim();
    const limit = Number.isFinite(take) ? Math.max(1, Math.min(take, 12)) : 8;
    const taxonomyLimit = Math.min(limit, 12);
    const tagLimit = Math.min(limit * 2, 24);

    if (!term || term.length < 2) {
      return {
        query: term,
        prompts: [],
        posts: [],
        categories: [],
        tags: [],
        authors: [],
      };
    }

    const normalizedTerm = term.toLowerCase();
    const publicPromptWhere = this.buildPublicPromptWhere({}, resolvedViewer, 'discover');
    const publicPostWhere = this.buildPublicPostWhere({}, resolvedViewer, 'discover');

    const [prompts, posts, categoryMatches, tagMatches, authorMatches] = await Promise.all([
      this.getPrompts({ search: term, take: limit, sort: 'latest' }, resolvedViewer),
      this.getPosts({ search: term, take: limit, sort: 'latest' }, resolvedViewer),
      this.prisma.category.findMany({
        where: {
          deletedAt: null,
          OR: [{ name: { contains: term } }, { slug: { contains: term } }],
        },
        take: taxonomyLimit,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          imageUrl: true,
        },
      }),
      this.prisma.tag.findMany({
        where: {
          deletedAt: null,
          OR: [{ name: { contains: term } }, { slug: { contains: term } }],
        },
        take: tagLimit,
        orderBy: [{ name: 'asc' }],
        include: {
          _count: {
            select: {
              prompts: { where: publicPromptWhere },
              posts: { where: publicPostWhere },
            },
          },
        },
      }),
      this.prisma.user.findMany({
        where: {
          AND: [
            { handle: { not: null } },
            { suspendedAt: null },
            {
              OR: [{ name: { contains: term } }, { handle: { contains: term } }],
            },
            {
              OR: [{ prompts: { some: publicPromptWhere } }, { posts: { some: publicPostWhere } }],
            },
          ],
        },
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          _count: {
            select: {
              prompts: { where: publicPromptWhere },
              posts: { where: publicPostWhere },
              followers: true,
            },
          },
        },
      }),
    ]);

    const hydratedCategories = await this.hydrateMediaRefs(categoryMatches, 'imageUrl');
    const { promptCountMap, postCountMap } = await this.getCategoryUsageMaps(
      hydratedCategories.map((category) => category.id),
      resolvedViewer,
    );
    const categories = hydratedCategories
      .map((category) => {
        const promptCount = promptCountMap.get(category.id) ?? 0;
        const postCount = postCountMap.get(category.id) ?? 0;
        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          imageUrl: this.sanitizePublicMediaUrl(category.imageUrl),
          promptCount,
          postCount,
          totalCount: promptCount + postCount,
        };
      })
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aScore =
          Number(aName.startsWith(normalizedTerm)) * 2 + Number(aName === normalizedTerm);
        const bScore =
          Number(bName.startsWith(normalizedTerm)) * 2 + Number(bName === normalizedTerm);
        return bScore - aScore || b.totalCount - a.totalCount || a.name.localeCompare(b.name);
      })
      .slice(0, taxonomyLimit);

    const tags = tagMatches
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color,
        promptCount: tag._count.prompts,
        postCount: tag._count.posts,
        usage: tag._count.prompts + tag._count.posts,
      }))
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aScore =
          Number(aName.startsWith(normalizedTerm)) * 2 + Number(aName === normalizedTerm);
        const bScore =
          Number(bName.startsWith(normalizedTerm)) * 2 + Number(bName === normalizedTerm);
        return bScore - aScore || b.usage - a.usage || a.name.localeCompare(b.name);
      })
      .slice(0, tagLimit);

    const hydratedAuthors = await this.hydrateMediaRefs(authorMatches, 'avatarUrl');
    const authors = hydratedAuthors
      .map((author) => ({
        ...this.toAuthorSummary(author),
        promptCount: author._count.prompts,
        postCount: author._count.posts,
        followerCount: author._count.followers,
        totalCount: author._count.prompts + author._count.posts,
      }))
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aHandle = (a.handle ?? '').toLowerCase();
        const bHandle = (b.handle ?? '').toLowerCase();
        const aScore =
          Number(aName.startsWith(normalizedTerm) || aHandle.startsWith(normalizedTerm)) * 2 +
          Number(aName === normalizedTerm || aHandle === normalizedTerm);
        const bScore =
          Number(bName.startsWith(normalizedTerm) || bHandle.startsWith(normalizedTerm)) * 2 +
          Number(bName === normalizedTerm || bHandle === normalizedTerm);
        return bScore - aScore || b.totalCount - a.totalCount || a.name.localeCompare(b.name);
      })
      .slice(0, limit);

    return {
      query: term,
      prompts: prompts.items,
      posts: posts.items,
      categories,
      tags,
      authors,
    };
  }

  async createMembershipCheckoutOrder(
    user: AuthUser,
    cycle: MembershipCheckoutCycle,
  ): Promise<MembershipCheckoutOrderResponse> {
    const pricing = this.resolveMembershipPricing(cycle);
    const receipt = this.createRazorpayReceipt(cycle, user.sub);
    const order = await this.requestRazorpay<RazorpayOrderResponse>('/v1/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: pricing.amountMinor,
        currency: pricing.currency,
        receipt,
        notes: {
          userId: user.sub,
          plan: MembershipPlan.PREMIUM,
          cycle,
        },
      }),
    });

    await this.prisma.transaction.upsert({
      where: {
        providerRef: order.id,
      },
      create: {
        userId: user.sub,
        amount: pricing.amountMajor,
        currency: (order.currency || pricing.currency).toUpperCase(),
        provider: 'RAZORPAY',
        providerRef: order.id,
        status: `CREATED_${cycle.toUpperCase()}`,
      },
      update: {
        amount: pricing.amountMajor,
        currency: (order.currency || pricing.currency).toUpperCase(),
        status: `CREATED_${cycle.toUpperCase()}`,
      },
    });

    return {
      keyId: this.razorpayKeyId,
      orderId: order.id,
      amount: order.amount,
      currency: (order.currency || pricing.currency).toUpperCase(),
      cycle,
      plan: 'PREMIUM',
    };
  }

  async verifyMembershipCheckout(
    user: AuthUser,
    input: VerifyMembershipCheckoutDto,
  ): Promise<MembershipCheckoutVerifyResponse> {
    const razorpayOrderId = input.razorpayOrderId?.trim();
    const razorpayPaymentId = input.razorpayPaymentId?.trim();
    const razorpaySignature = input.razorpaySignature?.trim();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new BadRequestException('Missing payment verification fields.');
    }

    const transaction = await this.prisma.transaction.findFirst({
      where: {
        userId: user.sub,
        provider: 'RAZORPAY',
        providerRef: razorpayOrderId,
      },
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Checkout order not found.');
    }

    const cycle = this.resolveMembershipCycleFromTransaction(transaction);
    const alreadyPaid = transaction.status.toUpperCase().startsWith('PAID_');

    const expectedSignature = createHmac('sha256', this.razorpayKeySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      if (!alreadyPaid) {
        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: `FAILED_SIGNATURE_${cycle.toUpperCase()}` },
        });
      }
      throw new BadRequestException('Invalid payment signature.');
    }

    if (alreadyPaid) {
      const activeSubscription = await this.prisma.subscription.findFirst({
        where: {
          userId: user.sub,
          plan: MembershipPlan.PREMIUM,
          status: SubscriptionStatus.ACTIVE,
        },
        orderBy: [{ endAt: 'desc' }, { createdAt: 'desc' }],
        select: { endAt: true },
      });

      const fallbackEndAt = this.createMembershipExpiryDate(cycle);
      const activeUntil = activeSubscription?.endAt ?? fallbackEndAt;

      return {
        verified: true,
        alreadyProcessed: true,
        plan: 'PREMIUM',
        cycle,
        activeUntil: activeUntil.toISOString(),
      };
    }

    const payment = await this.requestRazorpay<RazorpayPaymentResponse>(
      `/v1/payments/${encodeURIComponent(razorpayPaymentId)}`,
    );

    if (payment.order_id !== razorpayOrderId) {
      throw new BadRequestException('Payment does not match checkout order.');
    }

    const paymentStatus = payment.status.toLowerCase();
    if (paymentStatus !== 'captured' && paymentStatus !== 'authorized') {
      throw new BadRequestException('Payment is not captured yet. Please retry in a few seconds.');
    }

    const now = new Date();
    const endAt = this.createMembershipExpiryDate(cycle, now);

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: `PAID_${cycle.toUpperCase()}`,
          currency: (payment.currency || transaction.currency).toUpperCase(),
        },
      });

      await tx.subscription.updateMany({
        where: {
          userId: user.sub,
          status: SubscriptionStatus.ACTIVE,
        },
        data: {
          status: SubscriptionStatus.EXPIRED,
          endAt: now,
        },
      });

      await tx.subscription.upsert({
        where: {
          providerRef: payment.id,
        },
        create: {
          userId: user.sub,
          plan: MembershipPlan.PREMIUM,
          status: SubscriptionStatus.ACTIVE,
          provider: 'RAZORPAY',
          providerRef: payment.id,
          startAt: now,
          endAt,
        },
        update: {
          userId: user.sub,
          plan: MembershipPlan.PREMIUM,
          status: SubscriptionStatus.ACTIVE,
          provider: 'RAZORPAY',
          startAt: now,
          endAt,
          canceledAt: null,
        },
      });

      await tx.user.update({
        where: { id: user.sub },
        data: {
          plan: MembershipPlan.PREMIUM,
        },
      });
    });

    return {
      verified: true,
      alreadyProcessed: false,
      plan: 'PREMIUM',
      cycle,
      activeUntil: endAt.toISOString(),
    };
  }

  async createNewsletterSubmission(input: { email: string; source: string; pagePath?: string }) {
    const email = input.email?.trim().toLowerCase();
    const source = input.source?.trim();
    const pagePath = input.pagePath?.trim() || null;

    if (!email) {
      throw new BadRequestException('Email is required.');
    }

    if (!source) {
      throw new BadRequestException('Source is required.');
    }

    const existingSubmission = await this.prisma.newsletterSubmission.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        source: true,
        pagePath: true,
        createdAt: true,
      },
    });

    if (existingSubmission) {
      return {
        ok: true,
        alreadySubscribed: true,
        message: 'This email is already subscribed.',
        item: existingSubmission,
      };
    }

    let submission: {
      id: string;
      email: string;
      source: string;
      pagePath: string | null;
      createdAt: Date;
    };

    try {
      submission = await this.prisma.newsletterSubmission.create({
        data: {
          email,
          source,
          pagePath,
        },
        select: {
          id: true,
          email: true,
          source: true,
          pagePath: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const duplicateSubmission = await this.prisma.newsletterSubmission.findFirst({
          where: { email },
          select: {
            id: true,
            email: true,
            source: true,
            pagePath: true,
            createdAt: true,
          },
        });

        if (duplicateSubmission) {
          return {
            ok: true,
            alreadySubscribed: true,
            message: 'This email is already subscribed.',
            item: duplicateSubmission,
          };
        }
      }

      throw error;
    }

    return {
      ok: true,
      alreadySubscribed: false,
      message: 'Subscribed successfully. Thanks for joining.',
      item: submission,
    };
  }

  async createContactSubmission(input: {
    name: string;
    email: string;
    subject: string;
    message: string;
    source: string;
    pagePath?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    type ContactSubmissionResponseItem = {
      id: string;
      name: string;
      email: string;
      subject: string;
      status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'SPAM';
      source: string;
      pagePath: string | null;
      createdAt: Date;
    };

    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const subject = input.subject?.trim();
    const message = input.message?.trim();
    const source = input.source?.trim();
    const pagePath = input.pagePath?.trim() || null;
    const ipAddress = input.ipAddress?.trim().slice(0, 191) || null;
    const userAgent = input.userAgent?.trim().slice(0, 512) || null;

    if (!name) {
      throw new BadRequestException('Name is required.');
    }

    if (!email) {
      throw new BadRequestException('Email is required.');
    }

    if (!subject) {
      throw new BadRequestException('Subject is required.');
    }

    if (!message) {
      throw new BadRequestException('Message is required.');
    }

    if (!source) {
      throw new BadRequestException('Source is required.');
    }

    const createSubmission = async () => {
      const duplicateWindowStart = new Date(Date.now() - 10 * 60 * 1000);
      const existingRows = await this.prisma.$queryRaw<ContactSubmissionResponseItem[]>(Prisma.sql`
        SELECT
          id,
          name,
          email,
          subject,
          status,
          source,
          pagePath,
          createdAt
        FROM \`ContactSubmission\`
        WHERE email = ${email}
          AND message = ${message}
          AND createdAt >= ${duplicateWindowStart}
        ORDER BY createdAt DESC
        LIMIT 1
      `);
      const existingSubmission = existingRows[0];

      if (existingSubmission) {
        return {
          ok: true,
          alreadySubmitted: true,
          message: 'Message already received. We will get back to you soon.',
          item: existingSubmission,
        };
      }

      const submissionId = randomUUID();

      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO \`ContactSubmission\` (
          id,
          name,
          email,
          subject,
          message,
          status,
          source,
          pagePath,
          ipAddress,
          userAgent,
          createdAt,
          updatedAt
        ) VALUES (
          ${submissionId},
          ${name},
          ${email},
          ${subject},
          ${message},
          ${'NEW'},
          ${source},
          ${pagePath},
          ${ipAddress},
          ${userAgent},
          NOW(3),
          NOW(3)
        )
      `);

      const createdRows = await this.prisma.$queryRaw<ContactSubmissionResponseItem[]>(Prisma.sql`
        SELECT
          id,
          name,
          email,
          subject,
          status,
          source,
          pagePath,
          createdAt
        FROM \`ContactSubmission\`
        WHERE id = ${submissionId}
        LIMIT 1
      `);
      const submission = createdRows[0];

      if (!submission) {
        throw new BadRequestException('Unable to store your message right now.');
      }

      return {
        ok: true,
        alreadySubmitted: false,
        message: 'Message submitted successfully. We will get back to you soon.',
        item: submission,
      };
    };

    try {
      return await createSubmission();
    } catch (error) {
      if (!this.isMissingContactSubmissionTableError(error)) {
        throw error;
      }

      await this.ensureContactSubmissionTableExists();
      return createSubmission();
    }
  }

  async getHome(viewer?: PublicViewer) {
    const resolvedViewer = await this.resolveViewerForExclusiveAccess(viewer);
    const [categories, latestPrompts, trendingPrompts, latestPosts, popularTags] =
      await Promise.all([
        this.getCategories({ take: 12, sort: 'popular' }, resolvedViewer),
        this.getPrompts({ take: 8, sort: 'latest' }, resolvedViewer),
        this.getPrompts({ take: 8, sort: 'trending' }, resolvedViewer),
        this.getPosts({ take: 6, sort: 'latest', includeTags: true }, resolvedViewer),
        this.getTags({ take: 20, sort: 'popular' }, resolvedViewer),
      ]);

    return {
      categories: categories.items,
      latestPrompts: latestPrompts.items,
      trendingPrompts: trendingPrompts.items,
      latestPosts: latestPosts.items,
      popularTags: popularTags.items,
    };
  }
}
