import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TariffsService } from './tariffs.service';
import { CreateTariffDto, UpdateTariffDto } from './dto/tariff.dto';
import { AuthUser, Can, CurrentUser, Public } from '../common/auth.decorators';

@ApiTags('Tariffs')
@ApiBearerAuth()
@Controller('tariffs')
export class TariffsController {
  constructor(private readonly tariffs: TariffsService) {}

  @Public()
  @Get()
  findAll() {
    return this.tariffs.findAll();
  }

  @Can('tariffs:manage')
  @Post()
  create(@Body() dto: CreateTariffDto, @CurrentUser() user: AuthUser) {
    return this.tariffs.create(dto, user.id);
  }

  @Can('tariffs:manage')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTariffDto, @CurrentUser() user: AuthUser) {
    return this.tariffs.update(id, dto, user.id);
  }
}
