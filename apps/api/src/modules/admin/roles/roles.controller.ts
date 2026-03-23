import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RolesService } from './roles.service';

@ApiTags('Admin Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('roles:read')
  listRoles() {
    return this.rolesService.listRoles();
  }

  @Get('/permissions')
  @Permissions('permissions:read')
  listPermissions() {
    return this.rolesService.listPermissions();
  }

  @Post()
  @Permissions('roles:manage')
  createRole(
    @Body()
    body: {
      name: string;
      description?: string | null;
      permissionCodes?: string[];
    },
  ) {
    return this.rolesService.createRole(body);
  }

  @Patch(':id')
  @Permissions('roles:manage')
  updateRole(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string | null; permissionCodes?: string[] },
  ) {
    return this.rolesService.updateRole(id, body);
  }

  @Delete(':id')
  @Permissions('roles:manage')
  deleteRole(@Param('id') id: string) {
    return this.rolesService.deleteRole(id);
  }
}
