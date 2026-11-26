import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { StartSessionDto, StopSessionDto } from './dto/session.dto';
import { AuthUser, Can, CurrentUser } from '../common/auth.decorators';

@ApiTags('Charging Sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Can('sessions:view')
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('status') status?: 'ACTIVE' | 'COMPLETED') {
    return this.sessions.findAll(user, status);
  }

  @Can('sessions:control')
  @Post('start')
  start(@Body() dto: StartSessionDto, @CurrentUser() user: AuthUser) {
    return this.sessions.start(dto, user);
  }

  @Can('sessions:control')
  @Post(':id/stop')
  stop(@Param('id', ParseIntPipe) id: number, @Body() dto: StopSessionDto, @CurrentUser() user: AuthUser) {
    return this.sessions.stop(id, dto.idleMinutes, user);
  }
}
