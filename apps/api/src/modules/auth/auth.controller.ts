import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from './decorators/current-user.decorator';
import { Permissions } from './decorators/permissions.decorator';
import { LoginDto } from './dto/login.dto';
import { GoogleExchangeDto } from './dto/google-exchange.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import type { AuthUser } from './types/auth-user.type';
import { readCookie } from './utils/cookie.util';
import { AuthService, REFRESH_COOKIE_NAME } from './auth.service';
import type { CookieResponse } from './auth.service';

type HeaderValue = string | string[] | undefined;

type HttpRequest = {
  headers: Record<string, HeaderValue>;
  get?: (headerName: string) => string | undefined;
  ip?: string;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: HttpRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    return this.authService.register(dto, this.getRequestMetadata(request), response);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: HttpRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    return this.authService.login(dto, this.getRequestMetadata(request), response);
  }

  @Post('google/exchange')
  async exchangeGoogleToken(
    @Body() dto: GoogleExchangeDto,
    @Req() request: HttpRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    return this.authService.exchangeGoogleToken(dto, this.getRequestMetadata(request), response);
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshDto,
    @Req() request: HttpRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const refreshToken = dto.refreshToken ?? this.readRefreshCookie(request);
    return this.authService.refresh(refreshToken, this.getRequestMetadata(request), response);
  }

  @Post('logout')
  async logout(
    @Body() dto: LogoutDto,
    @Req() request: HttpRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const refreshToken = dto.refreshToken ?? this.readRefreshCookie(request);
    return this.authService.logout(refreshToken, response);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile/summary')
  async profileSummary(@CurrentUser() user: AuthUser) {
    return this.authService.getProfileSummary(user.sub);
  }

  @Get('profile/public/:handle')
  async publicProfile(@Param('handle') handle: string) {
    return this.authService.getPublicProfile(handle);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.sub, dto);
  }

  // Smoke-test route for RBAC wiring.
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('activity:read')
  @Get('admin/ping')
  adminPing() {
    return { ok: true };
  }

  private readRefreshCookie(request: HttpRequest): string | undefined {
    const cookieHeader = request.headers.cookie;
    const normalizedCookieHeader = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
    return readCookie(normalizedCookieHeader, REFRESH_COOKIE_NAME);
  }

  private getRequestMetadata(request: HttpRequest): { userAgent?: string; ipAddress?: string } {
    const userAgent = request.get?.('user-agent') ?? undefined;
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const firstForwardedIp = forwardedIp?.split(',')[0]?.trim();
    const ipAddress = firstForwardedIp || request.ip || undefined;
    return { userAgent, ipAddress };
  }
}
