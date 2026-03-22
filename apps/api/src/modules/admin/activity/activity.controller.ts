import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditAction, AuditTargetType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ActivityService } from './activity.service';

@ApiTags('Admin Activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @Permissions('activity:read')
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: AuditAction,
    @Query('targetType') targetType?: AuditTargetType,
  ) {
    return this.activityService.findAll({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      actorId,
      action,
      targetType,
    });
  }
}
