import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IdParamDto } from '../../../common/dto/id-param.dto';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { ListNewsletterSubmissionsQueryDto } from './dto/list-newsletter-submissions-query.dto';
import { NewsletterService } from './newsletter.service';

@ApiTags('Admin Newsletter')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/newsletter/submissions')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Get()
  @Permissions('activity:read')
  findAll(@Query() query: ListNewsletterSubmissionsQueryDto) {
    return this.newsletterService.findAll({
      skip: query.skip,
      take: query.take,
      search: query.search,
      source: query.source,
      from: query.from,
      to: query.to,
      sort: query.sort,
    });
  }

  @Delete(':id')
  @Permissions('activity:read')
  remove(@Param() params: IdParamDto) {
    return this.newsletterService.remove(params.id);
  }
}
