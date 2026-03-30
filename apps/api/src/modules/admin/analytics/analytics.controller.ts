import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { AnalyticsService } from './analytics.service';
import { AnalyticsOverviewQueryDto } from './dto/analytics-overview-query.dto';
import { AnalyticsPromptsQueryDto } from './dto/analytics-prompts-query.dto';

@ApiTags('Admin Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @Permissions('analytics:read')
  getOverview(@Query() query: AnalyticsOverviewQueryDto) {
    return this.analyticsService.getOverview(query.range ?? 30);
  }

  @Get('prompts')
  @Permissions('analytics:read')
  getPrompts(@Query() query: AnalyticsPromptsQueryDto) {
    return this.analyticsService.getPrompts(query);
  }
}
