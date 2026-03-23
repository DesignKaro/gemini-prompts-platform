import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Patch,
  Body,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PostsService, PostCreateInput, PostUpdateInput } from './posts.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { PromptStatus, PromptVisibility } from '@prisma/client';

@ApiTags('Admin Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @Permissions('posts:read')
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('status') status?: PromptStatus,
    @Query('visibility') visibility?: PromptVisibility,
    @Query('categoryId') categoryId?: string,
    @Query('tagId') tagId?: string,
    @Query('sort') sort?: 'recent' | 'views' | 'az',
    @Query('trash') trash?: string,
  ) {
    return this.postsService.findAll({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      search,
      status,
      visibility,
      categoryId,
      tagId,
      sort,
      trash: trash === 'true' || trash === '1',
    });
  }

  @Get(':id')
  @Permissions('posts:read')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Post()
  @Permissions('posts:manage')
  create(@CurrentUser() user: AuthUser, @Body() body: PostCreateInput) {
    return this.postsService.create(user.sub, body);
  }

  @Patch(':id')
  @Permissions('posts:manage')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: PostUpdateInput) {
    return this.postsService.update(user.sub, id, body);
  }

  @Patch(':id/restore')
  @Permissions('posts:manage')
  restore(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.postsService.restore(user.sub, id);
  }

  @Delete(':id')
  @Permissions('posts:manage')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.postsService.remove(user.sub, id);
  }
}
