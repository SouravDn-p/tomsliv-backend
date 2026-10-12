import { PaginationDto } from '@/common/dto/pagination.dto';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetAllJobsDto } from '../dto/get-jobs.dto';
import { GetAllJobsStatsService } from '../services/get-all-jobs-stats.service';
import { GetAllJobsService } from '../services/get-all-jobs.service';

@ApiTags('Get All Jobs')
@Controller('jobs-stats')
export class GetAllJobsController {
  constructor(
    private readonly getAllJobsStatsService: GetAllJobsStatsService,
    private readonly getAllJobsService: GetAllJobsService,
  ) {}

  @ApiOperation({ summary: 'Get job types with counts' })
  @Get('job-types-with-counts')
  async getAllJobsWithCounts() {
    return this.getAllJobsStatsService.getJobTypesWithCounts();
  }

  @ApiOperation({ summary: 'Get remuneration buckets' })
  @Get('remuneration-buckets')
  async getRemunerationBuckets() {
    return this.getAllJobsStatsService.getRemunerationBuckets();
  }

  @ApiOperation({ summary: 'Get job roles with counts' })
  @Get('job-roles-with-counts')
  async getJobRolesWithCounts(@Query() pg: PaginationDto) {
    return this.getAllJobsStatsService.getJobRolesWithCounts(pg);
  }

  @ApiOperation({ summary: 'Get locations with counts' })
  @Get('locations-with-counts')
  async getLocationsWithCounts(@Query() pg: PaginationDto) {
    return this.getAllJobsStatsService.getJobRegionsWithCounts(pg);
  }

  @ApiOperation({ summary: 'Get all jobs' })
  @Get('all-jobs')
  async getAllJobs(@Query() query: GetAllJobsDto) {
    return this.getAllJobsService.getAllJobs(query);
  }
}
