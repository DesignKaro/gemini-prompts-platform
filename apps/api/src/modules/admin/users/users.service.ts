import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthProvider, MembershipPlan, Prisma, UserRole } from '@prisma/client';
import { hashPassword } from '../../auth/utils/password.util';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { normalizePagination } from '../../../common/utils/pagination';
import {
  PROTECTED_SUPERADMIN_EMAIL,
  isProtectedSuperadminEmail,
} from '../../auth/utils/superadmin.util';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

  async findAll(skip: number = 0, take: number = 20, search?: string) {
    const { skip: safeSkip, take: safeTake } = normalizePagination(skip, take);
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { handle: { contains: search } },
          ],
        }
      : {};

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

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });
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

  async remove(actor: AuthUser, id: string) {
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

    const [
      promptCount,
      postCount,
      collabCount,
      submissionCount,
      transactionCount,
      subscriptionCount,
    ] = await this.prisma.$transaction([
      this.prisma.prompt.count({ where: { authorId: id } }),
      this.prisma.post.count({ where: { authorId: id } }),
      this.prisma.collab.count({ where: { authorId: id } }),
      this.prisma.submission.count({ where: { submittedById: id } }),
      this.prisma.transaction.count({ where: { userId: id } }),
      this.prisma.subscription.count({ where: { userId: id } }),
    ]);

    const owned = {
      prompts: promptCount,
      posts: postCount,
      collabs: collabCount,
      submissions: submissionCount,
      transactions: transactionCount,
      subscriptions: subscriptionCount,
    };
    const totalOwned = Object.values(owned).reduce((sum, value) => sum + value, 0);

    if (totalOwned > 0) {
      throw new BadRequestException(
        `User cannot be deleted because they own content. Prompts: ${owned.prompts}, Posts: ${owned.posts}, Collabs: ${owned.collabs}, Submissions: ${owned.submissions}, Transactions: ${owned.transactions}, Subscriptions: ${owned.subscriptions}. Transfer or delete this content first.`,
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
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
        await tx.savedPrompt.deleteMany({ where: { userId: id } });
        await tx.userRoleAssignment.deleteMany({ where: { userId: id } });
        await tx.authAccount.deleteMany({ where: { userId: id } });
        await tx.refreshToken.deleteMany({ where: { userId: id } });
        await tx.passwordCredential.deleteMany({ where: { userId: id } });

        return tx.user.delete({ where: { id } });
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : (error as { message?: string }).message;
      throw new BadRequestException(
        message || 'Unable to delete user. Remove dependent records first.',
      );
    }
  }
}
