import {
  GetUser,
  ValidateAuth,
  ValidateFarmOwner,
} from '@/core/jwt/jwt.decorator';
import { CreateCvBodyDto } from '@/main/cv/dto/create-cv.dto';
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
import { GetAppliedJobsDto } from '../dto/get-applied-jobs.dto';
import { GetFarmOwnerApplicationsDto } from '../dto/get-farm-owner-applications.dto';
import { ManageApplicationStatusDto } from '../dto/manage-application-status.dto';
import { GetFarmOwnerApplicationsService } from '../services/get-farm-owner-applications.service';
import { JobApplicationsService } from '../services/job-applications.service';
import { ManageJobApplicationsService } from '../services/manage-job-applications.service';

@ApiTags('Job Applications')
@ApiBearerAuth()
@ValidateAuth()
@Controller('job-applications')
export class JobApplicationsController {
  constructor(
    private readonly jobApplicationsService: JobApplicationsService,
    private readonly getFarmOwnerApplicationsService: GetFarmOwnerApplicationsService,
    private readonly manageJobApplicationsService: ManageJobApplicationsService,
  ) {}

  @ApiOperation({ summary: 'Apply with user saved CV (User)' })
  @Post('apply-saved/:jobId')
  async applyWithSavedCv(
    @GetUser('sub') userId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.jobApplicationsService.applyWithSavedCv(userId, jobId);
  }

  @ApiOperation({ summary: 'Apply with new CV (User)' })
  @Post('apply-new/:jobId')
  async applyWithNewCv(
    @GetUser('sub') userId: string,
    @Body() dto: CreateCvBodyDto,
    @Param('jobId') jobId: string,
  ) {
    return this.jobApplicationsService.applyWithNewCv(userId, dto, jobId);
  }

  @ApiOperation({ summary: 'Get applied jobs (User)' })
  @Get('applied-jobs')
  async getAppliedJobs(
    @GetUser('sub') userId: string,
    @Query() dto: GetAppliedJobsDto,
  ) {
    return this.jobApplicationsService.getAppliedJobs(userId, dto);
  }

  @ApiOperation({ summary: 'Get farm owner applications (Farm Owner)' })
  @ValidateFarmOwner()
  @Get('farm-owner')
  async getFarmOwnerApplications(
    @GetUser('sub') userId: string,
    @Query() dto: GetFarmOwnerApplicationsDto,
  ) {
    return this.getFarmOwnerApplicationsService.getApplications(userId, dto);
  }

  @ApiOperation({ summary: 'Get single application details (Farm Owner)' })
  @ValidateFarmOwner()
  @Get('farm-owner/:id')
  async getApplication(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.manageJobApplicationsService.getApplication(userId, id);
  }

  @ApiOperation({ summary: 'Update application status (Shortlist/Reject)' })
  @ValidateFarmOwner()
  @Patch('farm-owner/:id/status')
  async updateApplicationStatus(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Query() dto: ManageApplicationStatusDto,
  ) {
    return this.manageJobApplicationsService.updateStatus(userId, id, dto);
  }

  @Post('farm-owner/:id/toggle-shortlist')
  toggleShortlist(@GetUser('sub') userId: string, @Param('id') id: string) {
    return this.manageJobApplicationsService.toggleShortlist(userId, id);
  }

  @Post('farm-owner/:id/toggle-reject')
  toggleReject(@GetUser('sub') userId: string, @Param('id') id: string) {
    return this.manageJobApplicationsService.toggleReject(userId, id);
  }
}
