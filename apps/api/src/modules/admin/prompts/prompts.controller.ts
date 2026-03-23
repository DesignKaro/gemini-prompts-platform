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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PromptsService, PromptCreateInput, PromptUpdateInput } from './prompts.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { PromptStatus, PromptVisibility } from '@prisma/client';

@ApiTags('Admin Prompts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Get()
  @Permissions('prompts:read')
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
    return this.promptsService.findAll({
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
  @Permissions('prompts:read')
  findOne(@Param('id') id: string) {
    return this.promptsService.findOne(id);
  }

  @Post()
  @Permissions('prompts:manage')
  create(@CurrentUser() user: AuthUser, @Body() body: PromptCreateInput) {
    return this.promptsService.create(user.sub, body);
  }

  @Patch(':id')
  @Permissions('prompts:manage')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: PromptUpdateInput) {
    return this.promptsService.update(user.sub, id, body);
  }

  @Patch(':id/status')
  @Permissions('prompts:manage')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('status') status: PromptStatus,
  ) {
    return this.promptsService.updateStatus(user.sub, id, status);
  }

  @Patch(':id/restore')
  @Permissions('prompts:manage')
  restore(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promptsService.restore(user.sub, id);
  }

  @Delete(':id')
  @Permissions('prompts:manage')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promptsService.remove(user.sub, id);
  }
}
