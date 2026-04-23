import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { ListTagsQueryDto } from './dto/list-tags-query.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { IdParamDto } from '../../../common/dto/id-param.dto';

@ApiTags('Admin Tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @Permissions('tags:read')
  findAll(@Query() query: ListTagsQueryDto) {
    return this.tagsService.findAll({
      skip: query.skip,
      take: query.take,
      search: query.search,
      trash: query.trash,
      sort: query.sort,
    });
  }

  @Get(':id')
  @Permissions('tags:read')
  findOne(@Param() params: IdParamDto) {
    return this.tagsService.findOne(params.id);
  }

  @Post()
  @Permissions('tags:manage')
  create(@CurrentUser() user: AuthUser, @Body() body: CreateTagDto) {
    return this.tagsService.create(user.sub, body);
  }

  @Patch(':id')
  @Permissions('tags:manage')
  update(@CurrentUser() user: AuthUser, @Param() params: IdParamDto, @Body() body: UpdateTagDto) {
    return this.tagsService.update(user.sub, params.id, body);
  }

  @Patch(':id/restore')
  @Permissions('tags:manage')
  restore(@CurrentUser() user: AuthUser, @Param() params: IdParamDto) {
    return this.tagsService.restore(user.sub, params.id);
  }

  @Delete(':id')
  @Permissions('tags:manage')
  remove(@CurrentUser() user: AuthUser, @Param() params: IdParamDto) {
    return this.tagsService.remove(user.sub, params.id);
  }
}
