import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthUser } from '../types/auth-user.type';
import { isProtectedSuperadminEmail } from '../utils/superadmin.util';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const currentUser = request.user;
    const currentRole = currentUser?.role;
    if (!currentRole) {
      return false;
    }

    if (currentRole === UserRole.SUPERADMIN && isProtectedSuperadminEmail(currentUser?.email)) {
      return true;
    }

    const normalizedRole =
      currentRole === UserRole.SUPERADMIN && !isProtectedSuperadminEmail(currentUser?.email)
        ? UserRole.USER
        : currentRole;

    return requiredRoles.includes(normalizedRole);
  }
}
