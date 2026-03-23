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
import { CommentStatus, CommentTargetType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { CommentsService, CommentCreateInput, CommentUpdateInput } from './comments.service';

@ApiTags('Admin Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @Permissions('comments:read')
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('status') status?: CommentStatus,
    @Query('targetType') targetType?: CommentTargetType,
    @Query('targetId') targetId?: string,
  ) {
    return this.commentsService.findAll({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      search,
      status,
      targetType,
      targetId,
    });
  }

  @Get(':id')
  @Permissions('comments:read')
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Post()
  @Permissions('comments:moderate')
  create(@CurrentUser() user: AuthUser, @Body() body: CommentCreateInput) {
    return this.commentsService.create(user.sub, body);
  }

  @Post(':id/reply')
  @Permissions('comments:moderate')
  reply(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('content') content: string) {
    return this.commentsService.reply(user.sub, id, content);
  }

  @Patch(':id')
  @Permissions('comments:moderate')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: CommentUpdateInput) {
    return this.commentsService.update(user.sub, id, body);
  }

  @Delete(':id')
  @Permissions('comments:moderate')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.commentsService.remove(user.sub, id);
  }
}
