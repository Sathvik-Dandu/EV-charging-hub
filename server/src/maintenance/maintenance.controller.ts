import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { AssignTicketDto, CreateTicketDto, UpdateTicketStatusDto } from './dto/ticket.dto';
import { AuthUser, Can, CurrentUser } from '../common/auth.decorators';

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Can('tickets:view')
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.maintenance.findAll(user);
  }

  @Can('tickets:create')
  @Post()
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: AuthUser) {
    return this.maintenance.create(dto, user);
  }

  @Can('tickets:assign')
  @Patch(':id/assign')
  assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignTicketDto, @CurrentUser() user: AuthUser) {
    return this.maintenance.assign(id, dto.technicianId, user);
  }

  @Can('tickets:work')
  @Patch(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTicketStatusDto, @CurrentUser() user: AuthUser) {
    return this.maintenance.updateStatus(id, dto, user);
  }
}
