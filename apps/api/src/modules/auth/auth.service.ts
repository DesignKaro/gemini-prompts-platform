import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider, PromptStatus, PromptVisibility, UserRole } from '@prisma/client';
import type { MembershipPlan } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import type { Env } from '@/config/env.validation';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { GoogleExchangeDto } from './dto/google-exchange.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { AuthUser } from './types/auth-user.type';
import { signJwt, verifyJwt } from './utils/jwt.util';
import { hashPassword, verifyPassword } from './utils/password.util';
import { isProtectedSuperadminEmail } from './utils/superadmin.util';

export const REFRESH_COOKIE_NAME = 'gp_refresh_token';

type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  handle: string | null;
  profileTitle: string | null;
  bio: string | null;
  focusTags: string[] | null;
  avatarUrl: string | null;
  avatarUpdatedAt: string | null;
  suspendedAt: string | null;
  role: UserRole;
  plan: MembershipPlan;
  permissions: string[];
  roleNames: string[];
};

type ProfileSummary = {
  user: PublicUser;
  stats: {
    promptCount: number;
    savedCount: number;
    likedCount: number;
    audienceCount: number;
    plan: MembershipPlan;
  };
  recentActivity: Array<{
    type: 'SAVE' | 'LIKE' | 'CREATE';
    promptTitle: string | null;
    createdAt: string;
  }>;
  savedPrompts: Array<{
    id: string;
    title: string;
    promptType: string;
    image: string | null;
    savedAt: string;
  }>;
};

type PublicProfileSummary = {
  user: {
    handle: string;
    name: string | null;
    profileTitle: string | null;
    bio: string | null;
    focusTags: string[] | null;
    avatarUrl: string | null;
    avatarUpdatedAt: string | null;
  };
  stats: {
    promptCount: number;
  };
  prompts: Array<{
    id: string;
    slug: string;
    title: string;
    promptType: string;
    image: string | null;
    publishedAt: string | null;
  }>;
};

type AuthResult = {
  user: PublicUser;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
};

type RequestMetadata = {
  userAgent?: string;
  ipAddress?: string;
};

type PrismaClientLike = Prisma.TransactionClient | PrismaService;

type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
};

type TokenInfoResponse = {
  aud?: string;
  azp?: string;
  sub?: string;
  email?: string;
  email_verified?: string;
  name?: string;
  picture?: string;
};

type UserInfoResponse = {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
};

export type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  expires?: Date;
};

export type CookieResponse = {
  cookie: (name: string, value: string, options: CookieOptions) => unknown;
  clearCookie: (name: string, options: CookieOptions) => unknown;
};

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtAccessTtlSeconds: number;
  private readonly refreshTokenTtlDays: number;
  private readonly googleClientId: string;
  private readonly isProduction: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>,
  ) {
    this.jwtSecret = this.configService.getOrThrow('JWT_SECRET', { infer: true });
    this.jwtAccessTtlSeconds = this.configService.getOrThrow('JWT_ACCESS_TTL_SECONDS', { infer: true });
    this.refreshTokenTtlDays = this.configService.getOrThrow('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    this.googleClientId = this.configService.getOrThrow('GOOGLE_CLIENT_ID', { infer: true });
    this.isProduction = this.configService.getOrThrow('NODE_ENV', { infer: true }) === 'production';
  }

  async register(dto: RegisterDto, metadata: RequestMetadata, response: CookieResponse): Promise<AuthResult> {
    const email = this.normalizeEmail(dto.email);
    const passwordHash = await hashPassword(dto.password);
    const name = this.normalizeName(dto.name);

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      include: { passwordCredential: true },
    });

    if (existingUser?.passwordCredential) {
      throw new ConflictException('User already exists. Please login instead.');
    }

    let user: PublicUser;
    if (existingUser) {
      await this.prisma.$transaction(async (tx) => {
        await tx.passwordCredential.create({
          data: {
            userId: existingUser.id,
            passwordHash,
          },
        });

        await tx.authAccount.upsert({
          where: {
            provider_providerAccountId: {
              provider: AuthProvider.CREDENTIALS,
              providerAccountId: email,
            },
          },
          update: {
            email,
          },
          create: {
            userId: existingUser.id,
            provider: AuthProvider.CREDENTIALS,
            providerAccountId: email,
            email,
          },
        });
      });

      const updatedUser = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: existingUser.name ?? name ?? undefined,
        },
        select: this.publicUserSelect,
      });
      user = this.toPublicUser(updatedUser);
    } else {
      const createdUser = await this.prisma.user.create({
        data: {
          email,
          name,
          passwordCredential: {
            create: {
              passwordHash,
            },
          },
          authAccounts: {
            create: {
              provider: AuthProvider.CREDENTIALS,
              providerAccountId: email,
              email,
            },
          },
        },
        select: this.publicUserSelect,
      });
      user = this.toPublicUser(createdUser);
    }

    user = await this.ensureUserHandle(user, this.prisma);
    user = await this.ensureUserHandle(user, this.prisma);
    return this.issueSession(user, metadata, response);
  }

  async login(dto: LoginDto, metadata: RequestMetadata, response: CookieResponse): Promise<AuthResult> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        passwordCredential: true,
      },
    });

    if (!user?.passwordCredential) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    this.assertNotSuspended(user.suspendedAt);

    const passwordMatches = await verifyPassword(dto.password, user.passwordCredential.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const publicUser = await this.ensureUserHandle(this.toPublicUser(user), this.prisma);
    return this.issueSession(publicUser, metadata, response);
  }

  async exchangeGoogleToken(
    dto: GoogleExchangeDto,
    metadata: RequestMetadata,
    response: CookieResponse,
  ): Promise<AuthResult> {
    if (!dto.idToken && !dto.accessToken) {
      throw new BadRequestException('Either idToken or accessToken is required.');
    }

    const profile = await this.verifyGoogleProfile(dto);
    if (!profile.emailVerified) {
      throw new UnauthorizedException('Google account email is not verified.');
    }

    const email = this.normalizeEmail(profile.email);
    const user = await this.prisma.$transaction(async (tx) => {
      const existingGoogleAccount = await tx.authAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: AuthProvider.GOOGLE,
            providerAccountId: profile.sub,
          },
        },
        include: {
          user: {
            select: this.publicUserSelect,
          },
        },
      });

      if (existingGoogleAccount?.user) {
        return this.updateUserProfileFromGoogle(tx, existingGoogleAccount.user.id, profile);
      }

      const existingUserByEmail = await tx.user.findUnique({
        where: { email },
        select: this.publicUserSelect,
      });

      if (existingUserByEmail) {
        await tx.authAccount.create({
          data: {
            userId: existingUserByEmail.id,
            provider: AuthProvider.GOOGLE,
            providerAccountId: profile.sub,
            email,
          },
        });

        return this.updateUserProfileFromGoogle(tx, existingUserByEmail.id, profile);
      }

      const createdUser = await tx.user.create({
        data: {
          email,
          name: this.normalizeName(profile.name),
          avatarUrl: profile.picture ?? null,
          authAccounts: {
            create: {
              provider: AuthProvider.GOOGLE,
              providerAccountId: profile.sub,
              email,
            },
          },
        },
        select: this.publicUserSelect,
      });
      return this.toPublicUser(createdUser);
    });

    this.assertNotSuspended(user.suspendedAt);
    return this.issueSession(user, metadata, response);
  }

  async refresh(
    refreshToken: string | undefined,
    metadata: RequestMetadata,
    response: CookieResponse,
  ): Promise<AuthResult> {
    const token = refreshToken?.trim();
    if (!token) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const tokenHash = this.hashRefreshToken(token);
    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: this.publicUserSelect,
        },
      },
    });

    if (!existingToken || existingToken.revokedAt || existingToken.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    const rotatedRefreshToken = this.generateRefreshToken();
    const rotatedRefreshHash = this.hashRefreshToken(rotatedRefreshToken);
    const now = new Date();
    const refreshExpiresAt = this.calculateRefreshExpiry();

    const createdToken = await this.prisma.$transaction(async (tx) => {
      const nextToken = await tx.refreshToken.create({
        data: {
          userId: existingToken.userId,
          tokenHash: rotatedRefreshHash,
          expiresAt: refreshExpiresAt,
          userAgent: metadata.userAgent,
          ipAddress: metadata.ipAddress,
        },
      });

      await tx.refreshToken.update({
        where: { id: existingToken.id },
        data: {
          revokedAt: now,
          replacedById: nextToken.id,
        },
      });

      return nextToken;
    });

    this.setRefreshCookie(response, rotatedRefreshToken, createdToken.expiresAt);

    const accessExpiresAt = this.calculateAccessExpiry();
    const publicUser = await this.ensureProtectedSuperadminRole(this.toPublicUser(existingToken.user));
    this.assertNotSuspended(existingToken.user.suspendedAt);
    const permissionBundle = await this.resolvePermissions(
      publicUser.id,
      publicUser.role,
      publicUser.email,
    );
    const enrichedUser = {
      ...publicUser,
      permissions: permissionBundle.permissions,
      roleNames: permissionBundle.roleNames,
    };
    const accessToken = this.buildAccessToken(enrichedUser, accessExpiresAt);

    return {
      user: enrichedUser,
      accessToken,
      accessTokenExpiresAt: accessExpiresAt.toISOString(),
      refreshToken: rotatedRefreshToken,
    };
  }

  async logout(refreshToken: string | undefined, response: CookieResponse): Promise<{ success: true }> {
    if (refreshToken) {
      const tokenHash = this.hashRefreshToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: {
          tokenHash,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    this.clearRefreshCookie(response);
    return { success: true };
  }

  async getMe(userId: string): Promise<{ user: PublicUser }> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: this.publicUserSelect,
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const publicUser = await this.ensureProtectedSuperadminRole(this.toPublicUser(user));
    this.assertNotSuspended(user.suspendedAt);
    const permissionBundle = await this.resolvePermissions(
      publicUser.id,
      publicUser.role,
      publicUser.email,
    );
    const resolvedUser = {
      ...publicUser,
      permissions: permissionBundle.permissions,
      roleNames: permissionBundle.roleNames,
    };
    const ensuredUser = resolvedUser.handle
      ? resolvedUser
      : await this.ensureUserHandle(resolvedUser, this.prisma);
    return { user: ensuredUser };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<{ user: PublicUser }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        handle: true,
      },
    });

    if (!existingUser) {
      throw new UnauthorizedException('User not found.');
    }

    const normalizedName = this.normalizeName(dto.name);
    const normalizedTitle = dto.profileTitle?.trim() || null;
    const normalizedBio = dto.bio?.trim() || null;
    const normalizedTags =
      dto.focusTags?.map((tag) => tag.trim()).filter((tag) => tag.length > 0) ?? undefined;
    const normalizedAvatar = this.normalizeAvatarUrl(dto.avatarUrl);
    let nextHandle: string | undefined;

    if (dto.handle !== undefined) {
      const normalizedHandle = this.normalizeHandle(dto.handle);
      if (!normalizedHandle) {
        throw new BadRequestException('Handle is required.');
      }
      const handleOwner = await this.prisma.user.findUnique({
        where: { handle: normalizedHandle },
        select: { id: true },
      });
      if (handleOwner && handleOwner.id !== userId) {
        throw new ConflictException('Handle already taken.');
      }
      nextHandle = normalizedHandle;
    } else if (!existingUser.handle) {
      const base = this.handleBaseFromNameOrEmail(
        normalizedName ?? existingUser.name,
        existingUser.email,
      );
      nextHandle = await this.generateUniqueHandle(this.prisma, base, userId);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: normalizedName,
        handle: nextHandle ?? undefined,
        profileTitle: normalizedTitle,
        bio: normalizedBio,
        focusTags: normalizedTags,
        avatarUrl: normalizedAvatar,
        avatarUpdatedAt: normalizedAvatar ? new Date() : null,
      },
      select: this.publicUserSelect,
    });

    const publicUser = await this.ensureProtectedSuperadminRole(this.toPublicUser(updatedUser));
    this.assertNotSuspended(updatedUser.suspendedAt);
    return { user: publicUser };
  }

  async getProfileSummary(userId: string): Promise<ProfileSummary> {
    const [user, promptCount, savedCount, likedCount, audienceUsers, savedPromptRecords, likeRecords, createdPromptRecords] =
      await this.prisma.$transaction([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: this.publicUserSelect,
      }),
      this.prisma.prompt.count({
        where: { authorId: userId },
      }),
      this.prisma.savedPrompt.count({
        where: { userId },
      }),
      this.prisma.promptLike.count({
        where: { userId },
      }),
      this.prisma.savedPrompt.findMany({
        where: { prompt: { authorId: userId } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.savedPrompt.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
          prompt: {
            select: {
              id: true,
              title: true,
              featuredImageUrl: true,
              promptType: true,
            },
          },
        },
      }),
      this.prisma.promptLike.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
          prompt: {
            select: {
              title: true,
            },
          },
        },
      }),
      this.prisma.prompt.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          title: true,
          createdAt: true,
        },
      }),
    ]);

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const publicUser = await this.ensureProtectedSuperadminRole(this.toPublicUser(user));
    const resolvedUser = publicUser.handle ? publicUser : await this.ensureUserHandle(publicUser, this.prisma);

    const audienceCount = audienceUsers.length;

    const recentActivity = [
      ...savedPromptRecords.map((record) => ({
        type: 'SAVE' as const,
        promptTitle: record.prompt.title,
        createdAt: record.createdAt.toISOString(),
      })),
      ...likeRecords.map((record) => ({
        type: 'LIKE' as const,
        promptTitle: record.prompt.title,
        createdAt: record.createdAt.toISOString(),
      })),
      ...createdPromptRecords.map((record) => ({
        type: 'CREATE' as const,
        promptTitle: record.title,
        createdAt: record.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 3);

    const savedPrompts = savedPromptRecords.map((record) => ({
      id: record.prompt.id,
      title: record.prompt.title,
      promptType: record.prompt.promptType,
      image: record.prompt.featuredImageUrl ?? null,
      savedAt: record.createdAt.toISOString(),
    }));

    return {
      user: resolvedUser,
      stats: {
        promptCount,
        savedCount,
        likedCount,
        audienceCount,
        plan: resolvedUser.plan,
      },
      recentActivity,
      savedPrompts,
    };
  }

  async getPublicProfile(handle: string): Promise<PublicProfileSummary> {
    const normalizedHandle = this.normalizeHandle(handle);
    if (!normalizedHandle) {
      throw new BadRequestException('Invalid handle.');
    }

    const user = await this.prisma.user.findUnique({
      where: { handle: normalizedHandle },
      select: {
        id: true,
        handle: true,
        name: true,
        profileTitle: true,
        bio: true,
        focusTags: true,
        avatarUrl: true,
        avatarUpdatedAt: true,
      },
    });

    if (!user || !user.handle) {
      throw new NotFoundException('Profile not found.');
    }

    const [promptCount, prompts] = await this.prisma.$transaction([
      this.prisma.prompt.count({
        where: {
          authorId: user.id,
          status: PromptStatus.PUBLISHED,
          visibility: PromptVisibility.FREE,
        },
      }),
      this.prisma.prompt.findMany({
        where: {
          authorId: user.id,
          status: PromptStatus.PUBLISHED,
          visibility: PromptVisibility.FREE,
        },
        orderBy: { publishedAt: 'desc' },
        take: 12,
        select: {
          id: true,
          slug: true,
          title: true,
          promptType: true,
          featuredImageUrl: true,
          publishedAt: true,
        },
      }),
    ]);

    return {
      user: {
        handle: user.handle,
        name: user.name,
        profileTitle: user.profileTitle,
        bio: user.bio,
        focusTags: Array.isArray(user.focusTags) ? (user.focusTags as string[]) : null,
        avatarUrl: user.avatarUrl,
        avatarUpdatedAt: user.avatarUpdatedAt ? user.avatarUpdatedAt.toISOString() : null,
      },
      stats: {
        promptCount,
      },
      prompts: prompts.map((prompt) => ({
        id: prompt.id,
        slug: prompt.slug,
        title: prompt.title,
        promptType: prompt.promptType,
        image: prompt.featuredImageUrl ?? null,
        publishedAt: prompt.publishedAt ? prompt.publishedAt.toISOString() : null,
      })),
    };
  }

  verifyAccessToken(token: string): AuthUser {
    try {
      const payload = verifyJwt<AuthUser>(token, this.jwtSecret);
      if (!payload.sub || !payload.email || !payload.role || !payload.plan) {
        throw new Error('Invalid payload.');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid access token.');
    }
  }

  private async issueSession(
    user: PublicUser,
    metadata: RequestMetadata,
    response: CookieResponse,
  ): Promise<AuthResult> {
    this.assertNotSuspended(user.suspendedAt);
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const refreshExpiresAt = this.calculateRefreshExpiry();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshExpiresAt,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
      },
    });

    this.setRefreshCookie(response, refreshToken, refreshExpiresAt);

    const accessExpiresAt = this.calculateAccessExpiry();
    const elevatedUser = await this.ensureProtectedSuperadminRole(user);
    const permissionBundle = await this.resolvePermissions(
      elevatedUser.id,
      elevatedUser.role,
      elevatedUser.email,
    );
    const enrichedUser = {
      ...elevatedUser,
      permissions: permissionBundle.permissions,
      roleNames: permissionBundle.roleNames,
    };
    const accessToken = this.buildAccessToken(enrichedUser, accessExpiresAt);

    return {
      user: enrichedUser,
      accessToken,
      accessTokenExpiresAt: accessExpiresAt.toISOString(),
      refreshToken,
    };
  }

  private buildAccessToken(user: PublicUser, expiresAt: Date): string {
    const expiresInSeconds = Math.max(Math.floor((expiresAt.getTime() - Date.now()) / 1000), 1);
    return signJwt(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        plan: user.plan,
        permissions: user.permissions,
        roleNames: user.roleNames,
        suspendedAt: user.suspendedAt,
      },
      this.jwtSecret,
      expiresInSeconds,
    );
  }

  private calculateAccessExpiry(): Date {
    return new Date(Date.now() + this.jwtAccessTtlSeconds * 1000);
  }

  private calculateRefreshExpiry(): Date {
    const oneDayInMs = 24 * 60 * 60 * 1000;
    return new Date(Date.now() + this.refreshTokenTtlDays * oneDayInMs);
  }

  private generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private setRefreshCookie(response: CookieResponse, refreshToken: string, expiresAt: Date): void {
    response.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/api/auth',
      expires: expiresAt,
    });
  }

  private clearRefreshCookie(response: CookieResponse): void {
    response.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/api/auth',
    });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeName(name: string | undefined): string | null {
    const next = name?.trim();
    if (!next) {
      return null;
    }
    return next;
  }

  private normalizeAvatarUrl(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
      return null;
    }
    if (trimmed.startsWith('//')) {
      return `https:${trimmed}`;
    }
    if (trimmed.startsWith('http://')) {
      return `https://${trimmed.slice('http://'.length)}`;
    }
    return trimmed;
  }

  private normalizeHandle(value: string | undefined | null): string | null {
    const raw = value?.trim();
    if (!raw) return null;
    const stripped = raw.startsWith('@') ? raw.slice(1) : raw;
    const normalized = stripped
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    return normalized || null;
  }

  private handleBaseFromNameOrEmail(name: string | null | undefined, email: string): string {
    const byName = this.normalizeHandle(name ?? undefined);
    if (byName) return byName;
    const emailBase = email.split('@')[0] ?? 'user';
    return this.normalizeHandle(emailBase) ?? 'user';
  }

  private async generateUniqueHandle(
    client: PrismaClientLike,
    base: string,
    excludeUserId?: string,
  ): Promise<string> {
    const normalizedBase = this.normalizeHandle(base) ?? 'user';
    let candidate = normalizedBase;
    let suffix = 0;

    // Avoid unbounded loops in the unlikely case of massive collisions.
    while (suffix < 500) {
      const existing = await client.user.findUnique({
        where: { handle: candidate },
        select: { id: true },
      });
      if (!existing || (excludeUserId && existing.id === excludeUserId)) {
        return candidate;
      }
      suffix += 1;
      const suffixToken = `-${suffix}`;
      const trimmedBase = normalizedBase.slice(0, Math.max(1, 40 - suffixToken.length));
      candidate = `${trimmedBase}${suffixToken}`;
    }

    throw new ConflictException('Unable to allocate a unique handle.');
  }

  private async ensureUserHandle(
    user: PublicUser,
    client: PrismaClientLike,
  ): Promise<PublicUser> {
    if (user.handle) {
      return user;
    }
    const base = this.handleBaseFromNameOrEmail(user.name, user.email);
    const handle = await this.generateUniqueHandle(client, base, user.id);
    const updatedUser = await client.user.update({
      where: { id: user.id },
      data: { handle },
      select: this.publicUserSelect,
    });
    return this.toPublicUser(updatedUser);
  }

  private readonly publicUserSelect = {
    id: true,
    email: true,
    name: true,
    handle: true,
    profileTitle: true,
    bio: true,
    focusTags: true,
    avatarUrl: true,
    avatarUpdatedAt: true,
    suspendedAt: true,
    role: true,
    plan: true,
  } as const;

  private toPublicUser(user: {
    id: string;
    email: string;
    name: string | null;
    handle: string | null;
    profileTitle: string | null;
    bio: string | null;
    focusTags: Prisma.JsonValue | null;
    avatarUrl: string | null;
    avatarUpdatedAt: Date | null;
    suspendedAt: Date | null;
    role: UserRole;
    plan: MembershipPlan;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      handle: user.handle,
      profileTitle: user.profileTitle,
      bio: user.bio,
      focusTags: Array.isArray(user.focusTags) ? (user.focusTags as string[]) : null,
      avatarUrl: user.avatarUrl,
      avatarUpdatedAt: user.avatarUpdatedAt ? user.avatarUpdatedAt.toISOString() : null,
      suspendedAt: user.suspendedAt ? user.suspendedAt.toISOString() : null,
      role: user.role,
      plan: user.plan,
      permissions: [],
      roleNames: [user.role],
    };
  }

  async resolvePermissions(
    userId: string,
    systemRole: UserRole,
    email?: string | null,
  ): Promise<{ permissions: string[]; roleNames: string[] }> {
    let effectiveRole = systemRole;
    if (effectiveRole !== UserRole.SUPERADMIN && isProtectedSuperadminEmail(email)) {
      effectiveRole = UserRole.SUPERADMIN;
      await this.prisma.user
        .update({
          where: { id: userId },
          data: { role: UserRole.SUPERADMIN },
        })
        .catch(() => undefined);
    } else if (effectiveRole === UserRole.SUPERADMIN && !isProtectedSuperadminEmail(email)) {
      effectiveRole = UserRole.USER;
      await this.prisma.user
        .update({
          where: { id: userId },
          data: { role: UserRole.USER },
        })
        .catch(() => undefined);
    }

    const roleNames = new Set<string>();
    roleNames.add(effectiveRole);

    const prismaAny = this.prisma as unknown as {
      permission?: { findMany: (...args: unknown[]) => Promise<unknown> };
      role?: { findMany: (...args: unknown[]) => Promise<unknown> };
      userRoleAssignment?: { findMany: (...args: unknown[]) => Promise<unknown> };
    };

    // If RBAC tables aren't available yet (migrations/client not applied),
    // fall back to role-only behavior to avoid crashing auth flows.
    if (
      !prismaAny.permission?.findMany ||
      !prismaAny.role?.findMany ||
      !prismaAny.userRoleAssignment?.findMany
    ) {
      return { permissions: [], roleNames: Array.from(roleNames) };
    }

    const assignedRoles = await this.prisma.userRoleAssignment.findMany({
      where: { userId },
      include: { role: true },
    });

    assignedRoles.forEach((assignment) => {
      if (assignment.role?.name) {
        roleNames.add(assignment.role.name);
      }
    });

    const roleNameList = Array.from(roleNames);

    if (effectiveRole === UserRole.SUPERADMIN) {
      const allPermissions = await this.prisma.permission.findMany({
        select: { code: true },
      });
      return {
        permissions: allPermissions.map((permission) => permission.code),
        roleNames: roleNameList,
      };
    }

    const roles = await this.prisma.role.findMany({
      where: { name: { in: roleNameList } },
      include: { permissions: { include: { permission: true } } },
    });

    const permissionSet = new Set<string>();
    roles.forEach((role) => {
      role.permissions.forEach((entry) => {
        if (entry.permission?.code) {
          permissionSet.add(entry.permission.code);
        }
      });
    });

    return {
      permissions: Array.from(permissionSet),
      roleNames: roleNameList,
    };
  }

  private async ensureProtectedSuperadminRole(user: PublicUser): Promise<PublicUser> {
    if (isProtectedSuperadminEmail(user.email)) {
      if (user.role === UserRole.SUPERADMIN) {
        return user;
      }
      await this.prisma.user
        .update({
          where: { id: user.id },
          data: { role: UserRole.SUPERADMIN },
        })
        .catch(() => undefined);
      return { ...user, role: UserRole.SUPERADMIN };
    }

    if (user.role !== UserRole.SUPERADMIN) {
      return user;
    }

    await this.prisma.user
      .update({
        where: { id: user.id },
        data: { role: UserRole.USER },
      })
      .catch(() => undefined);
    return { ...user, role: UserRole.USER };
  }

  private assertNotSuspended(suspendedAt: Date | string | null | undefined) {
    if (!suspendedAt) return;
    throw new UnauthorizedException('Account is suspended.');
  }

  private parseGoogleVerifiedEmailFlag(value: boolean | string | undefined): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    return value === 'true';
  }

  private async verifyGoogleProfile(dto: GoogleExchangeDto): Promise<GoogleProfile> {
    if (dto.idToken) {
      const tokenInfoResponse = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(dto.idToken)}`,
      );

      if (!tokenInfoResponse.ok) {
        throw new UnauthorizedException('Google token verification failed.');
      }

      const tokenInfo = (await tokenInfoResponse.json()) as TokenInfoResponse;
      const audienceMatches = tokenInfo.aud === this.googleClientId || tokenInfo.azp === this.googleClientId;
      if (!audienceMatches) {
        throw new UnauthorizedException('Google token audience mismatch.');
      }

      if (!tokenInfo.sub || !tokenInfo.email) {
        throw new UnauthorizedException('Google token missing required user claims.');
      }

      return {
        sub: tokenInfo.sub,
        email: tokenInfo.email,
        emailVerified: this.parseGoogleVerifiedEmailFlag(tokenInfo.email_verified),
        name: tokenInfo.name,
        picture: tokenInfo.picture,
      };
    }

    if (!dto.accessToken) {
      throw new BadRequestException('Google token is required.');
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${dto.accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new UnauthorizedException('Google user info lookup failed.');
    }

    const userInfo = (await userInfoResponse.json()) as UserInfoResponse;
    if (!userInfo.sub || !userInfo.email) {
      throw new UnauthorizedException('Google user profile is missing required fields.');
    }

    return {
      sub: userInfo.sub,
      email: userInfo.email,
      emailVerified: this.parseGoogleVerifiedEmailFlag(userInfo.email_verified),
      name: userInfo.name,
      picture: userInfo.picture,
    };
  }

  private async updateUserProfileFromGoogle(
    tx: Prisma.TransactionClient,
    userId: string,
    profile: GoogleProfile,
  ): Promise<PublicUser> {
    const updateData: { name?: string | null; avatarUrl?: string | null; avatarUpdatedAt?: Date } = {};
    const normalizedName = this.normalizeName(profile.name);
    if (normalizedName) {
      updateData.name = normalizedName;
    }
    const normalizedAvatar = this.normalizeAvatarUrl(profile.picture);
    if (normalizedAvatar) {
      updateData.avatarUrl = normalizedAvatar;
      updateData.avatarUpdatedAt = new Date();
    }

    if (!Object.keys(updateData).length) {
      const existingUser = await tx.user.findUnique({
        where: { id: userId },
        select: this.publicUserSelect,
      });

      if (!existingUser) {
        throw new UnauthorizedException('User not found.');
      }

      return this.toPublicUser(existingUser);
    }

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: updateData,
      select: this.publicUserSelect,
    });
    return this.toPublicUser(updatedUser);
  }
}
