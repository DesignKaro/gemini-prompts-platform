import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthService } from '../auth.service';
import type { AuthUser } from '../types/auth-user.type';
import { isProtectedSuperadminEmail } from '../utils/superadmin.util';

const SYSTEM_ROLE_NAMES = new Set<string>(Object.values(UserRole));

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  private hasDashboardAccess(user: AuthUser): boolean {
    if (user.role === UserRole.SUPERADMIN) {
      return isProtectedSuperadminEmail(user.email);
    }

    if (
      user.role === UserRole.ADMIN ||
      user.role === UserRole.EDITOR ||
      user.role === UserRole.MODERATOR
    ) {
      return true;
    }

    const roleNames = user.roleNames ?? [];
    return roleNames.some((roleName) => !SYSTEM_ROLE_NAMES.has(roleName));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthUser;
      originalUrl?: string;
      url?: string;
    }>();
    const user = request.user;
    if (!user) {
      return false;
    }

    if (user.role === UserRole.SUPERADMIN && isProtectedSuperadminEmail(user.email)) {
      return true;
    }

    let permissions = user.permissions;
    const shouldRefreshPermissions =
      !permissions ||
      permissions.length === 0 ||
      user.role === UserRole.USER ||
      (user.role === UserRole.SUPERADMIN && !isProtectedSuperadminEmail(user.email));

    if (shouldRefreshPermissions) {
      const normalizedRole =
        user.role === UserRole.SUPERADMIN && !isProtectedSuperadminEmail(user.email)
          ? UserRole.USER
          : user.role;
      const permissionBundle = await this.authService.resolvePermissions(
        user.sub,
        user.role,
        user.email,
      );
      permissions = permissionBundle.permissions;
      request.user = {
        ...user,
        role: normalizedRole,
        permissions,
        roleNames: permissionBundle.roleNames,
      };
    }

    const requestUrl = request.originalUrl ?? request.url ?? '';
    const effectiveUser = request.user ?? user;
    if (requestUrl.includes('/admin/') && !this.hasDashboardAccess(effectiveUser)) {
      return false;
    }

    return requiredPermissions.every((permission) => permissions?.includes(permission));
  }
}
