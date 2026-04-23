import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { MediaService } from './media.service';
import { ListMediaQueryDto } from './dto/list-media-query.dto';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { UploadMediaDto } from './dto/upload-media.dto';
import { IdParamDto } from '../../../common/dto/id-param.dto';

@ApiTags('Admin Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @Permissions('media:read')
  findAll(@Query() query: ListMediaQueryDto) {
    return this.mediaService.findAll({
      skip: query.skip,
      take: query.take,
      search: query.search,
      status: query.status,
      trash: query.trash,
      sort: query.sort,
    });
  }

  @Get(':id')
  @Permissions('media:read')
  findOne(@Param() params: IdParamDto) {
    return this.mediaService.findOne(params.id);
  }

  @Post()
  @Permissions('media:manage')
  create(@CurrentUser() user: AuthUser, @Body() body: CreateMediaDto) {
    return this.mediaService.create(user.sub, body);
  }

  @Post('upload')
  @Permissions('media:manage')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 12 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string },
    @Body() body: UploadMediaDto,
  ) {
    return this.mediaService.uploadFile(user.sub, file, body);
  }

  @Patch(':id')
  @Permissions('media:manage')
  update(@CurrentUser() user: AuthUser, @Param() params: IdParamDto, @Body() body: UpdateMediaDto) {
    return this.mediaService.update(user.sub, params.id, body);
  }

  @Patch(':id/restore')
  @Permissions('media:manage')
  restore(@CurrentUser() user: AuthUser, @Param() params: IdParamDto) {
    return this.mediaService.restore(user.sub, params.id);
  }

  @Delete(':id')
  @Permissions('media:manage')
  remove(@CurrentUser() user: AuthUser, @Param() params: IdParamDto) {
    return this.mediaService.remove(user.sub, params.id);
  }
}
