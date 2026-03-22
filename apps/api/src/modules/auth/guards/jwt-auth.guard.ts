import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

type RequestWithUser = {
  headers: {
    authorization?: string;
  };
  user?: ReturnType<AuthService['verifyAccessToken']>;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    request.user = this.authService.verifyAccessToken(token);
    if (request.user?.suspendedAt) {
      throw new UnauthorizedException('Account is suspended.');
    }
    return true;
  }
}
