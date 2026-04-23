import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthProvider, MembershipPlan, Prisma, SubscriptionStatus, UserRole } from '@prisma/client';
import { hashPassword } from '../../auth/utils/password.util';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { normalizePagination } from '../../../common/utils/pagination';
import { randomBytes } from 'node:crypto';
import {
  PROTECTED_SUPERADMIN_EMAIL,
  isProtectedSuperadminEmail,
} from '../../auth/utils/superadmin.util';
import { MediaStorageService } from '../../media-storage/media-storage.service';

type OwnedUserRecords = {
  prompts: number;
  posts: number;
  collabs: number;
  submissions: number;
  transactions: number;
  subscriptions: number;
  total: number;
};

type MembershipStatus = SubscriptionStatus | 'FREE';

type MembershipSubscriptionRecord = {
  status: SubscriptionStatus;
  provider: string;
  startAt: Date;
  endAt: Date | null;
  canceledAt: Date | null;
};

type MembershipUserRecord = {
  id: string;
  name: string | null;
  email: string;
  handle: string | null;
  avatarUrl: string | null;
  role: UserRole;
  plan: MembershipPlan;
  suspendedAt: Date | null;
  createdAt: Date;
  subscriptions: MembershipSubscriptionRecord[];
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaStorageService: MediaStorageService,
  ) {}

  private readonly mediaRefPrefix = 'media:';

  private extractMediaRef(value?: string | null): string | null {
    if (!value) return null;
    if (!value.startsWith(this.mediaRefPrefix)) return null;
    const id = value.slice(this.mediaRefPrefix.length).trim();
    return id || null;
  }

  private async syncUserAvatarMediaUsage(userId: string, avatarUrl?: string | null) {
    const normalized = avatarUrl?.trim();
    const refId = this.extractMediaRef(normalized ?? null);
    const assetId =
      refId ??
      (normalized
        ? (
            await this.prisma.mediaAsset.findFirst({
              where: { url: normalized },
              select: { id: true },
            })
          )?.id
        : null);

    await this.prisma.mediaUsage.deleteMany({
      where: {
        targetType: 'USER',
        targetId: userId,
      },
    });

    if (!assetId) {
      return;
    }

    await this.prisma.mediaUsage.create({
      data: {
        assetId,
        targetType: 'USER',
        targetId: userId,
        field: 'avatarUrl',
      },
    });
  }

  private normalizeUserForResponse<T extends { email: string; role: UserRole }>(user: T): T {
    if (isProtectedSuperadminEmail(user.email)) {
      return user.role === UserRole.SUPERADMIN ? user : { ...user, role: UserRole.SUPERADMIN };
    }
    return user.role === UserRole.SUPERADMIN ? { ...user, role: UserRole.USER } : user;
  }

  private extractRequestedRole(data: Prisma.UserUpdateInput): UserRole | null {
    const roleInput = data.role;
    if (!roleInput) return null;
    if (typeof roleInput === 'string') {
      return roleInput as UserRole;
    }
    if (typeof roleInput === 'object' && 'set' in roleInput && typeof roleInput.set === 'string') {
      return roleInput.set as UserRole;
    }
    return null;
  }

  private normalizeManagedRole(email: string, role?: UserRole | null): UserRole {
    if (isProtectedSuperadminEmail(email)) {
      return UserRole.SUPERADMIN;
    }
    const nextRole = role ?? UserRole.USER;
    if (nextRole === UserRole.SUPERADMIN) {
      throw new ForbiddenException(
        `Only ${PROTECTED_SUPERADMIN_EMAIL} can have the SUPERADMIN role.`,
      );
    }
    return nextRole;
  }

  private assertProtectedSuperadminNotTarget(email: string, action: string) {
    if (!isProtectedSuperadminEmail(email)) return;
    throw new ForbiddenException(`The protected superadmin account cannot be ${action}.`);
  }

  private async assertRolesExist(roleIds: string[]) {
    if (roleIds.length === 0) {
      return;
    }

    const existingRoles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true },
    });
    const existingRoleIds = new Set(existingRoles.map((role) => role.id));
    const missingRoleIds = roleIds.filter((roleId) => !existingRoleIds.has(roleId));
    if (missingRoleIds.length > 0) {
      throw new BadRequestException(`One or more roles do not exist: ${missingRoleIds.join(', ')}`);
    }
  }

  private async getOwnedUserRecords(
    userId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<OwnedUserRecords> {
    const [prompts, posts, collabs, submissions, transactions, subscriptions] = await Promise.all([
      client.prompt.count({ where: { authorId: userId } }),
      client.post.count({ where: { authorId: userId } }),
      client.collab.count({ where: { authorId: userId } }),
      client.submission.count({ where: { submittedById: userId } }),
      client.transaction.count({ where: { userId } }),
      client.subscription.count({ where: { userId } }),
    ]);

    return {
      prompts,
      posts,
      collabs,
      submissions,
      transactions,
      subscriptions,
      total: prompts + posts + collabs + submissions + transactions + subscriptions,
    };
  }

  private buildOwnedUserRecordsMessage(owned: OwnedUserRecords) {
    return `Prompts: ${owned.prompts}, Posts: ${owned.posts}, Collabs: ${owned.collabs}, Submissions: ${owned.submissions}, Transactions: ${owned.transactions}, Subscriptions: ${owned.subscriptions}.`;
  }

  private buildUserSearchWhere(search?: string): Prisma.UserWhereInput {
    if (!search) {
      return {};
    }
    return {
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
        { handle: { contains: search } },
      ],
    };
  }

  private assertSuperadminMembershipAccess(actor: AuthUser) {
    if (actor.role === UserRole.SUPERADMIN || isProtectedSuperadminEmail(actor.email)) {
      return;
    }
    throw new ForbiddenException('Only superadmins can manage user membership dates.');
  }

  private resolveCurrentMembership(
    subscriptions: MembershipSubscriptionRecord[],
    now: number,
  ): { status: MembershipStatus; subscription: MembershipSubscriptionRecord | null } {
    const activeSubscription =
      subscriptions.find(
        (subscription) =>
          subscription.status === SubscriptionStatus.ACTIVE &&
          (!subscription.endAt || subscription.endAt.getTime() > now),
      ) ?? null;
    const latestSubscription = subscriptions[0] ?? null;
    const currentSubscription = activeSubscription ?? latestSubscription;

    if (!currentSubscription) {
      return { status: 'FREE', subscription: null };
    }

    const isExpiredByDate =
      currentSubscription.status === SubscriptionStatus.ACTIVE &&
      Boolean(currentSubscription.endAt && currentSubscription.endAt.getTime() <= now);
    const membershipStatus: MembershipStatus = isExpiredByDate
      ? SubscriptionStatus.EXPIRED
      : currentSubscription.status;

    return { status: membershipStatus, subscription: currentSubscription };
  }

  private mapMembershipUser(user: MembershipUserRecord, now = Date.now()) {
    const normalizedUser = this.normalizeUserForResponse(user);
    const resolvedMembership = this.resolveCurrentMembership(user.subscriptions, now);
    const current = resolvedMembership.subscription;
    const status = resolvedMembership.status;
    const isMembershipActive =
      normalizedUser.plan === MembershipPlan.PREMIUM && status === SubscriptionStatus.ACTIVE;

    return {
      id: normalizedUser.id,
      name: normalizedUser.name,
      email: normalizedUser.email,
      handle: normalizedUser.handle,
      avatarUrl: normalizedUser.avatarUrl,
      role: normalizedUser.role,
      plan: normalizedUser.plan,
      suspendedAt: normalizedUser.suspendedAt?.toISOString() ?? null,
      createdAt: normalizedUser.createdAt.toISOString(),
      membership: {
        status,
        active: isMembershipActive,
        provider: current?.provider ?? null,
        startAt: current?.startAt.toISOString() ?? null,
        endAt: current?.endAt?.toISOString() ?? null,
        canceledAt: current?.canceledAt?.toISOString() ?? null,
      },
    };
  }

  private async findMembershipUserRecord(userId: string): Promise<MembershipUserRecord> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        handle: true,
        avatarUrl: true,
        role: true,
        plan: true,
        suspendedAt: true,
        createdAt: true,
        subscriptions: {
          where: {
            plan: MembershipPlan.PREMIUM,
          },
          orderBy: [{ createdAt: 'desc' }],
          take: 8,
          select: {
            status: true,
            provider: true,
            startAt: true,
            endAt: true,
            canceledAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  async findAll(skip: number = 0, take: number = 20, search?: string) {
    const { skip: safeSkip, take: safeTake } = normalizePagination(skip, take);
    const where = this.buildUserSearchWhere(search);

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: safeSkip,
        take: safeTake,
        orderBy: { createdAt: 'desc' },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items: items.map((item) => this.normalizeUserForResponse(item)), total };
  }

  async findMemberships(skip: number = 0, take: number = 20, search?: string) {
    const { skip: safeSkip, take: safeTake } = normalizePagination(skip, take);
    const where = this.buildUserSearchWhere(search);
    const now = Date.now();

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: safeSkip,
        take: safeTake,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          handle: true,
          avatarUrl: true,
          role: true,
          plan: true,
          suspendedAt: true,
          createdAt: true,
          subscriptions: {
            where: {
              plan: MembershipPlan.PREMIUM,
            },
            orderBy: [{ createdAt: 'desc' }],
            take: 8,
            select: {
              status: true,
              provider: true,
              startAt: true,
              endAt: true,
              canceledAt: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items: items.map((item) => this.mapMembershipUser(item, now)), total };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.normalizeUserForResponse(user);
  }

  async setMembershipUntil(actor: AuthUser, userId: string, endAtIso: string | null) {
    this.assertSuperadminMembershipAccess(actor);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const now = new Date();

    if (!endAtIso) {
      await this.prisma.$transaction(async (tx) => {
        await tx.subscription.updateMany({
          where: {
            userId,
            plan: MembershipPlan.PREMIUM,
            status: SubscriptionStatus.ACTIVE,
          },
          data: {
            status: SubscriptionStatus.CANCELED,
            canceledAt: now,
            endAt: now,
          },
        });

        await tx.user.update({
          where: { id: userId },
          data: { plan: MembershipPlan.FREE },
        });
      });

      const updatedUser = await this.findMembershipUserRecord(userId);
      return this.mapMembershipUser(updatedUser);
    }

    const parsedEndAt = new Date(endAtIso);
    if (Number.isNaN(parsedEndAt.getTime())) {
      throw new BadRequestException('A valid end date is required.');
    }
    if (parsedEndAt.getTime() <= now.getTime()) {
      throw new BadRequestException('Membership end date must be in the future.');
    }

    const providerRef = `admin_${userId.replace(/[^a-zA-Z0-9]/g, '').slice(-12)}_${Date.now().toString(36)}_${randomBytes(2).toString('hex')}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: {
          userId,
          plan: MembershipPlan.PREMIUM,
          status: SubscriptionStatus.ACTIVE,
        },
        data: {
          status: SubscriptionStatus.EXPIRED,
          endAt: now,
          canceledAt: now,
        },
      });

      await tx.subscription.create({
        data: {
          userId,
          plan: MembershipPlan.PREMIUM,
          status: SubscriptionStatus.ACTIVE,
          provider: 'ADMIN',
          providerRef,
          startAt: now,
          endAt: parsedEndAt,
          canceledAt: null,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { plan: MembershipPlan.PREMIUM },
      });
    });

    const updatedUser = await this.findMembershipUserRecord(userId);
    return this.mapMembershipUser(updatedUser);
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });
    if (!existing) {
      throw new NotFoundException('User not found.');
    }

    const requestedRole = this.extractRequestedRole(data);
    if (requestedRole) {
      if (isProtectedSuperadminEmail(existing.email)) {
        throw new ForbiddenException('The protected superadmin account role cannot be changed.');
      }
      this.normalizeManagedRole(existing.email, requestedRole);
    }

    const updateData = { ...data };
    const avatarInput = data.avatarUrl;
    const avatarValue =
      typeof avatarInput === 'string'
        ? avatarInput
        : avatarInput && typeof avatarInput === 'object' && 'set' in avatarInput
          ? avatarInput.set
          : undefined;

    if (typeof avatarValue === 'string') {
      const hostedAvatar = await this.mediaStorageService.maybeUploadImageDataUrl(
        avatarValue,
        'avatars',
      );
      updateData.avatarUrl = hostedAvatar;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });
    await this.syncUserAvatarMediaUsage(updated.id, updated.avatarUrl);
    return this.normalizeUserForResponse(updated);
  }

  async create(input: {
    name?: string | null;
    email: string;
    password?: string | null;
    role?: UserRole;
    plan?: MembershipPlan;
    roleIds?: string[];
  }) {
    const email = input.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email is required.');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const name = input.name?.trim() || null;
    const role = this.normalizeManagedRole(email, input.role ?? UserRole.USER);
    const plan = input.plan ?? MembershipPlan.FREE;
    const password = input.password?.trim() || null;

    if (password && password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long.');
    }

    const uniqueRoleIds = Array.from(new Set(input.roleIds ?? [])).filter(Boolean);
    await this.assertRolesExist(uniqueRoleIds);

    return this.prisma.$transaction(async (tx) => {
      const passwordHash = password ? await hashPassword(password) : null;

      const created = await tx.user.create({
        data: {
          email,
          name,
          role,
          plan,
          ...(passwordHash
            ? {
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
              }
            : {}),
        },
      });

      if (uniqueRoleIds.length > 0) {
        await tx.userRoleAssignment.createMany({
          data: uniqueRoleIds.map((roleId) => ({ userId: created.id, roleId })),
          skipDuplicates: true,
        });
      }

      const user = await tx.user.findUnique({
        where: { id: created.id },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
      if (!user) {
        throw new NotFoundException('User not found after creation.');
      }
      return this.normalizeUserForResponse(user);
    });
  }

  async updateRoles(userId: string, roleIds: string[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    this.assertProtectedSuperadminNotTarget(user.email, 'assigned custom roles');

    const uniqueRoleIds = Array.from(new Set(roleIds)).filter(Boolean);
    await this.assertRolesExist(uniqueRoleIds);
    await this.prisma.userRoleAssignment.deleteMany({ where: { userId } });

    if (uniqueRoleIds.length > 0) {
      await this.prisma.userRoleAssignment.createMany({
        data: uniqueRoleIds.map((roleId) => ({ userId, roleId })),
        skipDuplicates: true,
      });
    }

    return this.findOne(userId);
  }

  async suspend(actor: AuthUser, userId: string) {
    if (actor.sub === userId) {
      throw new BadRequestException('You cannot suspend your own account.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, suspendedAt: true },
    });
    if (!user) throw new NotFoundException('User not found.');
    this.assertProtectedSuperadminNotTarget(user.email, 'suspended');
    if (user.role === UserRole.SUPERADMIN && actor.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmins can suspend superadmin accounts.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { suspendedAt: user.suspendedAt ? user.suspendedAt : new Date() },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });

    return this.normalizeUserForResponse(updated);
  }

  async activate(actor: AuthUser, userId: string) {
    if (actor.sub === userId) {
      throw new BadRequestException('You cannot change your own suspension status.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found.');
    this.assertProtectedSuperadminNotTarget(user.email, 'activated');
    if (user.role === UserRole.SUPERADMIN && actor.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmins can activate superadmin accounts.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { suspendedAt: null },
    });
    return this.normalizeUserForResponse(updated);
  }

  async getDeleteImpact(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const owned = await this.getOwnedUserRecords(id);
    return {
      owned,
      requiresTransfer: owned.total > 0,
    };
  }

  async remove(actor: AuthUser, id: string, input?: { transferToUserId?: string | null }) {
    if (actor.sub === id) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found.');
    this.assertProtectedSuperadminNotTarget(user.email, 'deleted');
    if (user.role === UserRole.SUPERADMIN && actor.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmins can delete superadmin accounts.');
    }

    const transferToUserId = input?.transferToUserId?.trim() || null;
    if (transferToUserId === id) {
      throw new BadRequestException('Choose a different user to transfer owned records to.');
    }

    if (transferToUserId) {
      const transferTarget = await this.prisma.user.findUnique({
        where: { id: transferToUserId },
        select: { id: true },
      });
      if (!transferTarget) {
        throw new NotFoundException('Transfer target user not found.');
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const owned = await this.getOwnedUserRecords(id, tx);
        if (owned.total > 0 && !transferToUserId) {
          throw new BadRequestException({
            message: `User cannot be deleted because they own content. ${this.buildOwnedUserRecordsMessage(owned)} Select a user to transfer this data before deleting the account.`,
            code: 'USER_TRANSFER_REQUIRED',
          });
        }

        if (transferToUserId) {
          await tx.prompt.updateMany({
            where: { authorId: id },
            data: { authorId: transferToUserId },
          });
          await tx.post.updateMany({
            where: { authorId: id },
            data: { authorId: transferToUserId },
          });
          await tx.collab.updateMany({
            where: { authorId: id },
            data: { authorId: transferToUserId },
          });
          await tx.submission.updateMany({
            where: { submittedById: id },
            data: { submittedById: transferToUserId },
          });
          await tx.transaction.updateMany({
            where: { userId: id },
            data: { userId: transferToUserId },
          });
          await tx.subscription.updateMany({
            where: { userId: id },
            data: { userId: transferToUserId },
          });
        }

        await tx.submission.updateMany({
          where: { reviewerId: id },
          data: { reviewerId: null },
        });
        await tx.comment.updateMany({
          where: { authorId: id },
          data: { authorId: null },
        });
        await tx.comment.updateMany({
          where: { moderatedById: id },
          data: { moderatedById: null },
        });
        await tx.mediaAsset.updateMany({
          where: { uploadedById: id },
          data: { uploadedById: null },
        });
        await tx.auditLog.updateMany({
          where: { actorId: id },
          data: { actorId: null },
        });
        await tx.engagementEvent.updateMany({
          where: { userId: id },
          data: { userId: null },
        });

        await tx.promptLike.deleteMany({ where: { userId: id } });
        await tx.commentLike.deleteMany({ where: { userId: id } });
        await tx.savedPrompt.deleteMany({ where: { userId: id } });
        await tx.authorFollow.deleteMany({
          where: {
            OR: [{ followerId: id }, { authorId: id }],
          },
        });
        await tx.userRoleAssignment.deleteMany({ where: { userId: id } });
        await tx.authAccount.deleteMany({ where: { userId: id } });
        await tx.refreshToken.deleteMany({ where: { userId: id } });
        await tx.passwordCredential.deleteMany({ where: { userId: id } });

        return tx.user.delete({ where: { id } });
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : (error as { message?: string }).message;
      throw new BadRequestException(
        message || 'Unable to delete user. Remove dependent records first.',
      );
    }
  }
}
