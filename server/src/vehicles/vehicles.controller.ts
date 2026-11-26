import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/vehicle.dto';
import { AuthUser, Can, CurrentUser } from '../common/auth.decorators';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Can('vehicles:manage')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  findMine(@CurrentUser() user: AuthUser) {
    return this.vehicles.findMine(user.id);
  }

  @Post()
  create(@Body() dto: CreateVehicleDto, @CurrentUser() user: AuthUser) {
    return this.vehicles.create(dto, user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.vehicles.remove(id, user.id);
  }
}
