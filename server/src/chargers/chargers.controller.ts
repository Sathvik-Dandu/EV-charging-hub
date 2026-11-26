import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ChargersService } from './chargers.service';
import { ChargerActiveDto, CreateChargerDto } from './dto/charger.dto';
import { AuthUser, Can, CurrentUser, Public } from '../common/auth.decorators';
import { CONNECTOR_SPECS } from '../common/business-rules';

@ApiTags('Chargers')
@ApiBearerAuth()
@Controller('chargers')
export class ChargersController {
  constructor(private readonly chargers: ChargersService) {}

  @Public()
  @Get('specs')
  specs() {
    return CONNECTOR_SPECS;
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.chargers.findAll(user);
  }

  @Can('chargers:manage')
  @Post()
  create(@Body() dto: CreateChargerDto, @CurrentUser() user: AuthUser) {
    return this.chargers.create(dto, user);
  }

  @Can('chargers:manage')
  @Patch(':id/active')
  setActive(@Param('id', ParseIntPipe) id: number, @Body() dto: ChargerActiveDto, @CurrentUser() user: AuthUser) {
    return this.chargers.setActive(id, dto.isActive, user);
  }

  @Get(':id/slots')
  slots(@Param('id', ParseIntPipe) id: number, @Query('date') date: string) {
    return this.chargers.slots(id, date);
  }

  @Get(':id/history')
  history(@Param('id', ParseIntPipe) id: number) {
    return this.chargers.history(id);
  }
}
