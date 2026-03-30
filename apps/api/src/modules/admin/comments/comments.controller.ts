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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { CommentsService } from './comments.service';
import { ListCommentsQueryDto } from './dto/list-comments-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReplyCommentDto } from './dto/reply-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { IdParamDto } from '../../../common/dto/id-param.dto';

@ApiTags('Admin Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @Permissions('comments:read')
  findAll(@Query() query: ListCommentsQueryDto) {
    return this.commentsService.findAll({
      skip: query.skip,
      take: query.take,
      search: query.search,
      status: query.status,
      targetType: query.targetType,
      targetId: query.targetId,
    });
  }

  @Get(':id')
  @Permissions('comments:read')
  findOne(@Param() params: IdParamDto) {
    return this.commentsService.findOne(params.id);
  }

  @Post()
  @Permissions('comments:moderate')
  create(@CurrentUser() user: AuthUser, @Body() body: CreateCommentDto) {
    return this.commentsService.create(user.sub, body);
  }

  @Post(':id/reply')
  @Permissions('comments:moderate')
  reply(
    @CurrentUser() user: AuthUser,
    @Param() params: IdParamDto,
    @Body() body: ReplyCommentDto,
  ) {
    return this.commentsService.reply(user.sub, params.id, body.content);
  }

  @Patch(':id')
  @Permissions('comments:moderate')
  update(
    @CurrentUser() user: AuthUser,
    @Param() params: IdParamDto,
    @Body() body: UpdateCommentDto,
  ) {
    return this.commentsService.update(user.sub, params.id, body);
  }

  @Delete(':id')
  @Permissions('comments:moderate')
  remove(@CurrentUser() user: AuthUser, @Param() params: IdParamDto) {
    return this.commentsService.remove(user.sub, params.id);
  }
}
