import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MediaStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { MediaService, MediaCreateInput, MediaUpdateInput } from './media.service';

@ApiTags('Admin Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @Permissions('media:read')
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('status') status?: MediaStatus,
    @Query('trash') trash?: string,
    @Query('sort') sort?: 'recent' | 'name',
  ) {
    return this.mediaService.findAll({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      search,
      status,
      trash: trash === 'true' || trash === '1',
      sort,
    });
  }

  @Get(':id')
  @Permissions('media:read')
  findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  @Post()
  @Permissions('media:manage')
  create(@CurrentUser() user: AuthUser, @Body() body: MediaCreateInput) {
    return this.mediaService.create(user.sub, body);
  }

  @Patch(':id')
  @Permissions('media:manage')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: MediaUpdateInput) {
    return this.mediaService.update(user.sub, id, body);
  }

  @Patch(':id/restore')
  @Permissions('media:manage')
  restore(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mediaService.restore(user.sub, id);
  }

  @Delete(':id')
  @Permissions('media:manage')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mediaService.remove(user.sub, id);
  }
}
