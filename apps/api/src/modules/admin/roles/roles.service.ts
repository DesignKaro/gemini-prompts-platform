import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ group: 'asc' }, { label: 'asc' }],
    });
  }

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return roles.map((role) => ({
      ...role,
      permissions: role.permissions.map((entry) => entry.permission),
    }));
  }

  async createRole(input: {
    name: string;
    description?: string | null;
    permissionCodes?: string[];
  }) {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('Role name is required.');
    }

    const permissionCodes = Array.from(new Set(input.permissionCodes ?? [])).filter(Boolean);
    const permissions = permissionCodes.length
      ? await this.prisma.permission.findMany({ where: { code: { in: permissionCodes } } })
      : [];

    if (permissionCodes.length && permissions.length !== permissionCodes.length) {
      throw new BadRequestException('One or more permissions are invalid.');
    }

    const role = await this.prisma.role.create({
      data: {
        name,
        description: input.description?.trim() || null,
        isSystem: false,
        permissions: {
          create: permissions.map((permission) => ({ permissionId: permission.id })),
        },
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    return {
      ...role,
      permissions: role.permissions.map((entry) => entry.permission),
    };
  }

  async updateRole(
    id: string,
    input: { name?: string; description?: string | null; permissionCodes?: string[] },
  ) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Role not found.');
    }

    const nextName = input.name?.trim();
    if (existing.isSystem && nextName && nextName !== existing.name) {
      throw new BadRequestException('System roles cannot be renamed.');
    }

    const permissionCodes = Array.from(new Set(input.permissionCodes ?? [])).filter(Boolean);
    const permissions = permissionCodes.length
      ? await this.prisma.permission.findMany({ where: { code: { in: permissionCodes } } })
      : [];

    if (permissionCodes.length && permissions.length !== permissionCodes.length) {
      throw new BadRequestException('One or more permissions are invalid.');
    }

    const role = await this.prisma.role.update({
      where: { id },
      data: {
        name: nextName ?? undefined,
        description: input.description?.trim() ?? undefined,
        permissions: {
          deleteMany: {},
          create: permissions.map((permission) => ({ permissionId: permission.id })),
        },
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    return {
      ...role,
      permissions: role.permissions.map((entry) => entry.permission),
    };
  }

  async deleteRole(id: string) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Role not found.');
    }
    if (existing.isSystem) {
      throw new BadRequestException('System roles cannot be deleted.');
    }

    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }
}
