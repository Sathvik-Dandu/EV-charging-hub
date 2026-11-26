import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, RejectUserDto, UpdateUserRoleDto, UpdateUserStatusDto } from './dto/user.dto';
import { AuthUser, Can, CurrentUser } from '../common/auth.decorators';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Can('users:manage')
  @Get()
  findAll() {
    return this.users.findAll();
  }

  @Can('technicians:view')
  @Get('technicians')
  technicians() {
    return this.users.findTechnicians();
  }

  @Can('accounts:approve')
  @Get('requests')
  requests() {
    return this.users.requests();
  }

  @Can('accounts:approve')
  @Patch(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() admin: AuthUser) {
    return this.users.approve(id, admin.id);
  }

  @Can('accounts:approve')
  @Patch(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: RejectUserDto, @CurrentUser() admin: AuthUser) {
    return this.users.reject(id, dto.reason, admin.id);
  }

  @Can('users:manage')
  @Get('roles')
  roles() {
    return this.users.roles();
  }

  @Can('users:manage')
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() admin: AuthUser) {
    return this.users.create(dto, admin.id);
  }

  @Can('users:manage')
  @Patch(':id/status')
  setStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserStatusDto, @CurrentUser() admin: AuthUser) {
    return this.users.setStatus(id, dto.isActive, admin.id);
  }

  @Can('users:manage')
  @Patch(':id/role')
  setRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserRoleDto, @CurrentUser() admin: AuthUser) {
    return this.users.setRole(id, dto.role, admin.id);
  }
}
