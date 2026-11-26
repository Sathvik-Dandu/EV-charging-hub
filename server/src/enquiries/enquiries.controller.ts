import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EnquiriesService } from './enquiries.service';
import { CreateEnquiryDto, ReplyEnquiryDto } from './dto/enquiry.dto';
import { AuthUser, Can, CurrentUser } from '../common/auth.decorators';

@ApiTags('Enquiries')
@ApiBearerAuth()
@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  @Can('enquiries:create')
  @Post()
  create(@Body() dto: CreateEnquiryDto, @CurrentUser() user: AuthUser) {
    return this.enquiries.create(dto, user);
  }

  @Can('enquiries:view')
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.enquiries.findAll(user);
  }

  @Can('enquiries:manage')
  @Patch(':id')
  reply(@Param('id', ParseIntPipe) id: number, @Body() dto: ReplyEnquiryDto, @CurrentUser() user: AuthUser) {
    return this.enquiries.reply(id, dto, user.id);
  }
}
