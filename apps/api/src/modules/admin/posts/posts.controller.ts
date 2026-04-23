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
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { IdParamDto } from '../../../common/dto/id-param.dto';

@ApiTags('Admin Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @Permissions('posts:read')
  findAll(@Query() query: ListPostsQueryDto) {
    return this.postsService.findAll({
      skip: query.skip,
      take: query.take,
      search: query.search,
      status: query.status,
      visibility: query.visibility,
      categoryId: query.categoryId,
      tagId: query.tagId,
      sort: query.sort,
      trash: query.trash,
    });
  }

  @Get(':id')
  @Permissions('posts:read')
  findOne(@Param() params: IdParamDto) {
    return this.postsService.findOne(params.id);
  }

  @Post()
  @Permissions('posts:manage')
  create(@CurrentUser() user: AuthUser, @Body() body: CreatePostDto) {
    return this.postsService.create(user.sub, body);
  }

  @Patch(':id')
  @Permissions('posts:manage')
  update(@CurrentUser() user: AuthUser, @Param() params: IdParamDto, @Body() body: UpdatePostDto) {
    return this.postsService.update(user.sub, params.id, body);
  }

  @Patch(':id/restore')
  @Permissions('posts:manage')
  restore(@CurrentUser() user: AuthUser, @Param() params: IdParamDto) {
    return this.postsService.restore(user.sub, params.id);
  }

  @Delete(':id')
  @Permissions('posts:manage')
  remove(@CurrentUser() user: AuthUser, @Param() params: IdParamDto) {
    return this.postsService.remove(user.sub, params.id);
  }
}
