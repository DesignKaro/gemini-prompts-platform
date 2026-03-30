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
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { IdParamDto } from '../../../common/dto/id-param.dto';

@ApiTags('Admin Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Permissions('categories:read')
  findAll(@Query() query: ListCategoriesQueryDto) {
    return this.categoriesService.findAll({
      skip: query.skip,
      take: query.take,
      search: query.search,
      trash: query.trash,
      sort: query.sort,
    });
  }

  @Get(':id')
  @Permissions('categories:read')
  findOne(@Param() params: IdParamDto) {
    return this.categoriesService.findOne(params.id);
  }

  @Post()
  @Permissions('categories:manage')
  create(@CurrentUser() user: AuthUser, @Body() body: CreateCategoryDto) {
    return this.categoriesService.create(user.sub, body);
  }

  @Patch(':id')
  @Permissions('categories:manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param() params: IdParamDto,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(user.sub, params.id, body);
  }

  @Patch(':id/restore')
  @Permissions('categories:manage')
  restore(@CurrentUser() user: AuthUser, @Param() params: IdParamDto) {
    return this.categoriesService.restore(user.sub, params.id);
  }

  @Delete(':id')
  @Permissions('categories:manage')
  remove(@CurrentUser() user: AuthUser, @Param() params: IdParamDto) {
    return this.categoriesService.remove(user.sub, params.id);
  }
}
