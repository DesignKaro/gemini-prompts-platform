import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ActivityService } from './activity.service';
import { ListActivityQueryDto } from './dto/list-activity-query.dto';

@ApiTags('Admin Activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @Permissions('activity:read')
  findAll(@Query() query: ListActivityQueryDto) {
    return this.activityService.findAll({
      skip: query.skip,
      take: query.take,
      actorId: query.actorId,
      search: query.search,
      action: query.action,
      targetType: query.targetType,
      rangeDays: query.rangeDays,
      sortOrder: query.sortOrder,
    });
  }
}
