import {
  GetUser,
  ValidateAuth,
  ValidateFarmOwner,
} from '@/core/jwt/jwt.decorator';
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompareCvDto } from '../dto/compare-cv.dto';
import { CreateCvBodyDto } from '../dto/create-cv.dto';
import { CvComparisonService } from '../services/cv-compare.service';
import { CvService } from '../services/cv.service';

@ApiTags('CV')
@ApiBearerAuth()
@ValidateAuth()
@Controller('cv')
export class CvController {
  constructor(
    private readonly cvService: CvService,
    private readonly cvComparisonService: CvComparisonService,
  ) {}

  @ApiOperation({ summary: 'Get current user saved CV' })
  @Get()
  async getMyCv(@GetUser('sub') userId: string) {
    return this.cvService.getCv(userId);
  }

  @ApiOperation({ summary: 'Get all user CVs (Saved + Application History)' })
  @Get('all')
  async getAllMyCvs(@GetUser('sub') userId: string) {
    return this.cvService.getAllCvs(userId);
  }

  @ApiOperation({ summary: 'Save or Update CV' })
  @Post()
  async saveCv(@GetUser('sub') userId: string, @Body() data: CreateCvBodyDto) {
    return this.cvService.upsertCv(userId, data);
  }

  @ApiOperation({ summary: 'Delete saved CV' })
  @Delete()
  async deleteCv(@GetUser('sub') userId: string) {
    return this.cvService.deleteCv(userId);
  }

  // Farm Owner Endpoints
  @ApiOperation({ summary: 'Get recent CVs from applications (Farm Owner)' })
  @ValidateFarmOwner()
  @Get('farm-owner/recent')
  async getRecentCVs(@GetUser('sub') userId: string) {
    return this.cvService.getRecentCVsForFarmOwner(userId);
  }

  @ApiOperation({ summary: 'Compare two CVs (Farm Owner)' })
  @ValidateFarmOwner()
  @Post('farm-owner/compare')
  async compareCVs(@Body() data: CompareCvDto) {
    return this.cvComparisonService.compareCVs(data);
  }

  @ApiOperation({ summary: 'Get details of a specific CV (Farm Owner)' })
  @ValidateFarmOwner()
  @Get('farm-owner/:id')
  async getCvById(@Param('id') id: string) {
    return this.cvService.getCvById(id);
  }
}
