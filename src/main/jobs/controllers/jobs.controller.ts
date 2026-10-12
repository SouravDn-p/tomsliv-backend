import {
  GetUser,
  Public,
  ValidateAdmin,
  ValidateFarmOwner,
} from '@/core/jwt/jwt.decorator';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateJobDto } from '../dto/create-job.dto';
import { GetFarmOwnerJobsDto } from '../dto/get-jobs.dto';
import { UpsertIdealCandidateDto } from '../dto/ideal-candidate.dto';
import { ManageJobStatusDto } from '../dto/manage-job-status.dto';
import { UpdateJobDto } from '../dto/update-job.dto';
import { FarmOwnerStatsService } from '../services/farm-owner-stats.service';
import { IdealCandidateService } from '../services/ideal-candidate.service';
import { JobService } from '../services/job.service';

@ApiTags('Jobs & Ideal candidate')
@ApiBearerAuth()
@ValidateFarmOwner()
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobService: JobService,
    private readonly idealCandidateService: IdealCandidateService,
    private readonly farmOwnerStatsService: FarmOwnerStatsService,
  ) {}

  @ApiOperation({ summary: 'Create a new job by farm owner' })
  @Post()
  async createJob(@GetUser('sub') userId: string, @Body() dto: CreateJobDto) {
    return this.jobService.createJob(userId, dto);
  }

  @ApiOperation({ summary: 'Update a job by farm owner' })
  @Patch(':jobId')
  async updateJob(
    @GetUser('sub') userId: string,
    @Param('jobId') jobId: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobService.updateJob(userId, jobId, dto);
  }

  @ApiOperation({ summary: 'Manage job status by farm owner or admin' })
  @Post('manage-status/:jobId')
  async manageJobStatus(
    @GetUser('sub') userId: string,
    @Param('jobId') jobId: string,
    @Query() dto: ManageJobStatusDto,
  ) {
    return this.jobService.manageStatus(userId, jobId, dto);
  }

  @ApiOperation({ summary: 'Get farm owner statistics (Farm Owner)' })
  @Get('stats/farm-owner')
  async getFarmOwnerStats(@GetUser('sub') userId: string) {
    return this.farmOwnerStatsService.getFarmOwnerStats(userId);
  }

  @ApiOperation({ summary: 'Get farm owner jobs by farm owner' })
  @Get('my-jobs')
  async getFarmOwnerJobs(
    @GetUser('sub') userId: string,
    @Query() dto: GetFarmOwnerJobsDto,
  ) {
    return this.jobService.getFarmOwnerJobs(userId, dto);
  }

  @ApiOperation({ summary: 'Get farm owner jobs by admin' })
  @ValidateAdmin()
  @Get('farm-owner/:userId/jobs')
  async getAllFarmOwnerJobs(
    @Param('userId') userId: string,
    @Query() dto: GetFarmOwnerJobsDto,
  ) {
    return this.jobService.getFarmOwnerJobs(userId, dto);
  }

  @ApiOperation({ summary: 'Get single job (Public)' })
  @Public()
  @Get('details/:jobId')
  async getSingleJob(@Param('jobId') jobId: string) {
    return this.jobService.getSingleJob(jobId);
  }

  @ApiOperation({ summary: 'Check introduction offer availability (Public)' })
  @Public()
  @Get('introduction-offer-availability')
  async checkIntroductionOfferAvailability() {
    return this.jobService.checkIntroductionOfferAvailability();
  }

  @ApiOperation({
    summary: 'Create or update ideal candidate profile for a job (Farm Owner)',
  })
  @Post(':jobId/ideal-candidate')
  async upsertIdealCandidate(
    @GetUser('sub') userId: string,
    @Param('jobId') jobId: string,
    @Body() dto: UpsertIdealCandidateDto,
  ) {
    return this.idealCandidateService.upsertIdealCandidate(userId, jobId, dto);
  }

  @ApiOperation({
    summary: 'Get ideal candidate profile for a job (Farm Owner)',
  })
  @Get(':jobId/ideal-candidate')
  async getIdealCandidate(
    @GetUser('sub') userId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.idealCandidateService.getIdealCandidate(userId, jobId);
  }
}
