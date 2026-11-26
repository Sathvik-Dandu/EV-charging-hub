import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StationsService } from './stations.service';
import { CreateStationDto, StationSearchDto, UpdateStationDto } from './dto/station.dto';
import { AuthUser, Can, CurrentUser, Public } from '../common/auth.decorators';
import { can } from '../common/permissions';

@ApiTags('Stations')
@ApiBearerAuth()
@Controller('stations')
export class StationsController {
  constructor(private readonly stations: StationsService) {}

  @Public()
  @Get()
  search(@Query() query: StationSearchDto, @CurrentUser() user?: AuthUser) {
    const manager = query.manage && user && can(user.role, 'stations:edit') ? user : undefined;
    return this.stations.search(query, manager);
  }

  @Public()
  @Get('cities')
  cities() {
    return this.stations.cities();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stations.findOne(id);
  }

  @Can('stations:create')
  @Post()
  create(@Body() dto: CreateStationDto, @CurrentUser() user: AuthUser) {
    return this.stations.create(dto, user);
  }

  @Can('stations:edit')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStationDto, @CurrentUser() user: AuthUser) {
    return this.stations.update(id, dto, user);
  }
}
