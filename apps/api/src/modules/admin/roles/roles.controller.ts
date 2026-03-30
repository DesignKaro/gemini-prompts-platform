import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { IdParamDto } from '../../../common/dto/id-param.dto';

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
  createRole(@Body() body: CreateRoleDto) {
    return this.rolesService.createRole(body);
  }

  @Patch(':id')
  @Permissions('roles:manage')
  updateRole(@Param() params: IdParamDto, @Body() body: UpdateRoleDto) {
    return this.rolesService.updateRole(params.id, body);
  }

  @Delete(':id')
  @Permissions('roles:manage')
  deleteRole(@Param() params: IdParamDto) {
    return this.rolesService.deleteRole(params.id);
  }
}
