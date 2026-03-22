import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CategoriesService, CategoryCreateInput, CategoryUpdateInput } from './categories.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';

@ApiTags('Admin Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Permissions('categories:read')
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('trash') trash?: string,
    @Query('sort') sort?: 'recent' | 'name',
  ) {
    return this.categoriesService.findAll({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      search,
      trash: trash === 'true' || trash === '1',
      sort,
    });
  }

  @Get(':id')
  @Permissions('categories:read')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @Permissions('categories:manage')
  create(@CurrentUser() user: AuthUser, @Body() body: CategoryCreateInput) {
    return this.categoriesService.create(user.sub, body);
  }

  @Patch(':id')
  @Permissions('categories:manage')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: CategoryUpdateInput) {
    return this.categoriesService.update(user.sub, id, body);
  }

  @Patch(':id/restore')
  @Permissions('categories:manage')
  restore(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.categoriesService.restore(user.sub, id);
  }

  @Delete(':id')
  @Permissions('categories:manage')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.categoriesService.remove(user.sub, id);
  }
}
