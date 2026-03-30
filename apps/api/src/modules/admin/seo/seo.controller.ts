import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { isProtectedSuperadminEmail } from '../../auth/utils/superadmin.util';
import { RedirectRulesService } from '../../seo/redirect-rules.service';
import { SeoIntegrationsService } from '../../seo/seo-integrations.service';
import { SeoSettingsService } from '../../seo/seo-settings.service';
import { IdParamDto } from '../../../common/dto/id-param.dto';
import { CreateRedirectRuleDto } from './dto/create-redirect-rule.dto';
import { ListRedirectRulesQueryDto } from './dto/list-redirect-rules-query.dto';
import { SeoIntegrationsScopeQueryDto } from './dto/seo-integrations-scope-query.dto';
import { UpdateRedirectRuleDto } from './dto/update-redirect-rule.dto';
import { UpdateSeoIntegrationsDto } from './dto/update-seo-integrations.dto';
import { UpdateSeoSettingsDto } from './dto/update-seo-settings.dto';

@ApiTags('Admin SEO')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/seo')
export class SeoController {
  constructor(
    private readonly seoSettingsService: SeoSettingsService,
    private readonly seoIntegrationsService: SeoIntegrationsService,
    private readonly redirectRulesService: RedirectRulesService,
  ) {}

  private assertSuperadmin(user: AuthUser) {
    const isSuperadmin =
      user.role === UserRole.SUPERADMIN && isProtectedSuperadminEmail(user.email);
    if (!isSuperadmin) {
      throw new ForbiddenException('Only superadmin can manage integrations.');
    }
  }

  @Get()
  @Permissions('roles:manage')
  getSettings() {
    return this.seoSettingsService.getSettings();
  }

  @Patch()
  @Permissions('roles:manage')
  updateSettings(@Body() body: UpdateSeoSettingsDto) {
    return this.seoSettingsService.updateSettings(body);
  }

  @Get('integrations')
  @Permissions('roles:manage')
  getIntegrations(@CurrentUser() user: AuthUser, @Query() query: SeoIntegrationsScopeQueryDto) {
    this.assertSuperadmin(user);
    return this.seoIntegrationsService.getSettings(query.scope);
  }

  @Patch('integrations')
  @Permissions('roles:manage')
  updateIntegrations(
    @CurrentUser() user: AuthUser,
    @Query() query: SeoIntegrationsScopeQueryDto,
    @Body() body: UpdateSeoIntegrationsDto,
  ) {
    this.assertSuperadmin(user);
    return this.seoIntegrationsService.updateSettings(query.scope, body, user.sub);
  }

  @Get('redirects')
  @Permissions('roles:manage')
  listRedirects(@Query() query: ListRedirectRulesQueryDto) {
    return this.redirectRulesService.list({
      skip: query.skip,
      take: query.take,
      search: query.search,
    });
  }

  @Post('redirects')
  @Permissions('roles:manage')
  createRedirect(@Body() body: CreateRedirectRuleDto) {
    return this.redirectRulesService.create(body);
  }

  @Patch('redirects/:id')
  @Permissions('roles:manage')
  updateRedirect(@Param() params: IdParamDto, @Body() body: UpdateRedirectRuleDto) {
    return this.redirectRulesService.update(params.id, body);
  }

  @Delete('redirects/:id')
  @Permissions('roles:manage')
  removeRedirect(@Param() params: IdParamDto) {
    return this.redirectRulesService.remove(params.id);
  }
}
