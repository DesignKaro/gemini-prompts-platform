import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { ListErrorLogsQueryDto } from './dto/list-error-logs-query.dto';
import { LogsService } from './logs.service';

@ApiTags('Admin Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get('/errors')
  @Permissions('activity:read')
  listErrors(@Query() query: ListErrorLogsQueryDto) {
    return this.logsService.listErrorLogs({
      fileId: query.fileId,
      search: query.search,
      limit: query.limit,
      level: query.level,
    });
  }
}

