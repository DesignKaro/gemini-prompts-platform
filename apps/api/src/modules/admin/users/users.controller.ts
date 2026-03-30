import {
  Controller,
  Get,
  Param,
  Query,
  Patch,
  Body,
  Delete,
  UseGuards,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user.type';
import { Prisma } from '@prisma/client';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { SetUserMembershipDto } from './dto/set-user-membership.dto';
import { IdParamDto } from '../../../common/dto/id-param.dto';

@ApiTags('Admin Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users:read')
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(query.skip, query.take, query.search);
  }

  @Get('memberships')
  @Permissions('users:read')
  findMemberships(@Query() query: ListUsersQueryDto) {
    return this.usersService.findMemberships(query.skip, query.take, query.search);
  }

  @Get(':id/delete-impact')
  @Permissions('users:manage')
  getDeleteImpact(@Param() params: IdParamDto) {
    return this.usersService.getDeleteImpact(params.id);
  }

  @Get(':id')
  @Permissions('users:read')
  findOne(@Param() params: IdParamDto) {
    return this.usersService.findOne(params.id);
  }

  @Post()
  @Permissions('users:manage')
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  @Permissions('users:manage')
  update(@Param() params: IdParamDto, @Body() body: UpdateUserDto) {
    const payload: Prisma.UserUpdateInput = {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.email !== undefined ? { email: body.email.trim().toLowerCase() } : {}),
      ...(body.handle !== undefined ? { handle: body.handle.trim() || null } : {}),
      ...(body.role !== undefined ? { role: body.role } : {}),
      ...(body.plan !== undefined ? { plan: body.plan } : {}),
      ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
    };
    return this.usersService.update(params.id, payload);
  }

  @Patch(':id/roles')
  @Permissions('users:manage')
  updateRoles(@Param() params: IdParamDto, @Body() body: UpdateUserRolesDto) {
    return this.usersService.updateRoles(params.id, body.roleIds ?? []);
  }

  @Patch(':id/membership')
  @Permissions('users:manage')
  setMembershipUntil(
    @CurrentUser() actor: AuthUser,
    @Param() params: IdParamDto,
    @Body() body: SetUserMembershipDto,
  ) {
    return this.usersService.setMembershipUntil(actor, params.id, body.endAt ?? null);
  }

  @Patch(':id/suspend')
  @Permissions('users:manage')
  suspend(@CurrentUser() actor: AuthUser, @Param() params: IdParamDto) {
    return this.usersService.suspend(actor, params.id);
  }

  @Patch(':id/activate')
  @Permissions('users:manage')
  activate(@CurrentUser() actor: AuthUser, @Param() params: IdParamDto) {
    return this.usersService.activate(actor, params.id);
  }

  @Delete(':id')
  @Permissions('users:manage')
  remove(
    @CurrentUser() actor: AuthUser,
    @Param() params: IdParamDto,
    @Body() body?: DeleteUserDto,
  ) {
    return this.usersService.remove(actor, params.id, body);
  }
}
