import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateCvBodyDto } from '../dto/create-cv.dto';
import { PublicCvService } from '../services/public-cv.service';

@ApiTags('Public CV')
@Controller('public-cv')
export class PublicCvController {
  constructor(private readonly publicCvService: PublicCvService) {}

  @ApiOperation({
    summary: 'Upload or update a public CV without authentication',
  })
  @Post()
  async uploadPublicCv(@Body() dto: CreateCvBodyDto) {
    return this.publicCvService.uploadPublicCv(dto);
  }
}
