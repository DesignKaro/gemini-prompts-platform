import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IdParamDto } from '../../../common/dto/id-param.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { ListContactSubmissionsQueryDto } from './dto/list-contact-submissions-query.dto';
import { UpdateContactSubmissionDto } from './dto/update-contact-submission.dto';
import { ContactSubmissionsService } from './contact-submissions.service';

@ApiTags('Admin Contact Submissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/contact/submissions')
export class ContactSubmissionsController {
  constructor(private readonly contactSubmissionsService: ContactSubmissionsService) {}

  @Get()
  @Permissions('contacts:read')
  findAll(@Query() query: ListContactSubmissionsQueryDto) {
    return this.contactSubmissionsService.findAll({
      skip: query.skip,
      take: query.take,
      search: query.search,
      status: query.status,
      source: query.source,
      from: query.from,
      to: query.to,
      sort: query.sort,
    });
  }

  @Get(':id')
  @Permissions('contacts:read')
  findOne(@Param() params: IdParamDto) {
    return this.contactSubmissionsService.findOne(params.id);
  }

  @Patch(':id')
  @Permissions('contacts:manage')
  update(
    @Param() params: IdParamDto,
    @Body() body: UpdateContactSubmissionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const hasInternalNote = Object.prototype.hasOwnProperty.call(body, 'internalNote');
    return this.contactSubmissionsService.update(
      params.id,
      {
        status: body.status,
        internalNote: body.internalNote,
        hasInternalNote,
      },
      actor.sub,
    );
  }

  @Delete(':id')
  @Permissions('contacts:manage')
  remove(@Param() params: IdParamDto) {
    return this.contactSubmissionsService.remove(params.id);
  }
}
