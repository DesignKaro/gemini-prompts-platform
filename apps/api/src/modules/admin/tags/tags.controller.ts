import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TagsService, TagCreateInput, TagUpdateInput } from './tags.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';

@ApiTags('Admin Tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @Permissions('tags:read')
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('trash') trash?: string,
    @Query('sort') sort?: 'recent' | 'name',
  ) {
    return this.tagsService.findAll({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      search,
      trash: trash === 'true' || trash === '1',
      sort,
    });
  }

  @Get(':id')
  @Permissions('tags:read')
  findOne(@Param('id') id: string) {
    return this.tagsService.findOne(id);
  }

  @Post()
  @Permissions('tags:manage')
  create(@CurrentUser() user: AuthUser, @Body() body: TagCreateInput) {
    return this.tagsService.create(user.sub, body);
  }

  @Patch(':id')
  @Permissions('tags:manage')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: TagUpdateInput) {
    return this.tagsService.update(user.sub, id, body);
  }

  @Patch(':id/restore')
  @Permissions('tags:manage')
  restore(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tagsService.restore(user.sub, id);
  }

  @Delete(':id')
  @Permissions('tags:manage')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tagsService.remove(user.sub, id);
  }
}
