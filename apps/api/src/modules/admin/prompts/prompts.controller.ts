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
import { PromptsService } from './prompts.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { ListPromptsQueryDto } from './dto/list-prompts-query.dto';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { UpdatePromptStatusDto } from './dto/update-prompt-status.dto';
import { IdParamDto } from '../../../common/dto/id-param.dto';

@ApiTags('Admin Prompts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Get()
  @Permissions('prompts:read')
  findAll(@Query() query: ListPromptsQueryDto) {
    return this.promptsService.findAll({
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
  @Permissions('prompts:read')
  findOne(@Param() params: IdParamDto) {
    return this.promptsService.findOne(params.id);
  }

  @Post()
  @Permissions('prompts:manage')
  create(@CurrentUser() user: AuthUser, @Body() body: CreatePromptDto) {
    return this.promptsService.create(user.sub, body);
  }

  @Patch(':id')
  @Permissions('prompts:manage')
  update(
    @CurrentUser() user: AuthUser,
    @Param() params: IdParamDto,
    @Body() body: UpdatePromptDto,
  ) {
    return this.promptsService.update(user.sub, params.id, body);
  }

  @Patch(':id/status')
  @Permissions('prompts:manage')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param() params: IdParamDto,
    @Body() body: UpdatePromptStatusDto,
  ) {
    return this.promptsService.updateStatus(user.sub, params.id, body.status);
  }

  @Patch(':id/restore')
  @Permissions('prompts:manage')
  restore(@CurrentUser() user: AuthUser, @Param() params: IdParamDto) {
    return this.promptsService.restore(user.sub, params.id);
  }

  @Delete(':id')
  @Permissions('prompts:manage')
  remove(@CurrentUser() user: AuthUser, @Param() params: IdParamDto) {
    return this.promptsService.remove(user.sub, params.id);
  }
}
