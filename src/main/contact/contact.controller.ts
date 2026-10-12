import { Public, ValidateAdmin } from '@/core/jwt/jwt.decorator';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';

@ApiTags('Contact')
@ApiBearerAuth()
@ValidateAdmin()
@Controller('contacts')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @ApiOperation({ summary: 'Create contact' })
  @Public()
  @Post()
  async create(@Body() dto: CreateContactDto) {
    return await this.contactService.create(dto);
  }

  @ApiOperation({ summary: 'Find one contact' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.contactService.findOne(id);
  }

  @ApiOperation({ summary: 'Find all contacts' })
  @Get()
  async findAll(@Query() query: PaginationDto) {
    return await this.contactService.findAll(query);
  }
}
