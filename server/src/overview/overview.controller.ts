import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OverviewService } from './overview.service';
import { AuthUser, Can, CurrentUser } from '../common/auth.decorators';

@ApiTags('Overview')
@ApiBearerAuth()
@Controller('overview')
export class OverviewController {
  constructor(private readonly overview: OverviewService) {}

  @Can('overview:view')
  @Get()
  summary(@CurrentUser() user: AuthUser) {
    return this.overview.summary(user);
  }
}
