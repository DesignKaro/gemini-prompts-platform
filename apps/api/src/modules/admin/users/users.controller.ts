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
import type { MembershipPlan, UserRole } from '@prisma/client';

@ApiTags('Admin Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users:read')
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(skip ? parseInt(skip) : 0, take ? parseInt(take) : 20, search);
  }

  @Get(':id')
  @Permissions('users:read')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Permissions('users:manage')
  create(
    @Body()
    body: {
      name?: string | null;
      email: string;
      password?: string | null;
      role?: UserRole;
      plan?: MembershipPlan;
      roleIds?: string[];
    },
  ) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  @Permissions('users:manage')
  update(@Param('id') id: string, @Body() body: Prisma.UserUpdateInput) {
    return this.usersService.update(id, body);
  }

  @Patch(':id/roles')
  @Permissions('users:manage')
  updateRoles(@Param('id') id: string, @Body('roleIds') roleIds: string[]) {
    return this.usersService.updateRoles(id, roleIds ?? []);
  }

  @Patch(':id/suspend')
  @Permissions('users:manage')
  suspend(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.usersService.suspend(actor, id);
  }

  @Patch(':id/activate')
  @Permissions('users:manage')
  activate(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.usersService.activate(actor, id);
  }

  @Delete(':id')
  @Permissions('users:manage')
  remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.usersService.remove(actor, id);
  }
}
