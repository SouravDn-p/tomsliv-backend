import { PaginationDto } from '@/common/dto/pagination.dto';
import { ValidateAdmin } from '@/core/jwt/jwt.decorator';
import { Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetFarmOwnerJobsDto } from '../jobs/dto/get-jobs.dto';
import { GetAllFarmDto, GetJobSeekersDto } from './dto/get-farm.dto';
import { AdminStatsService } from './services/admin-stats.service';
import { AdminSubscriptionService } from './services/admin-subscription.service';
import { FarmOwnerService } from './services/farm-owner.service';
import { JobsService } from './services/jobs.service';
import { UserService } from './services/user.service';

@ApiTags('Admin Endpoints')
@ApiBearerAuth()
@ValidateAdmin()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly farmOwnerService: FarmOwnerService,
    private readonly userService: UserService,
    private readonly adminStatsService: AdminStatsService,
    private readonly adminPaymentService: AdminSubscriptionService,
  ) {}

  @ApiOperation({ summary: 'Get system admin statistics' })
  @Get('stats')
  async getAdminStats() {
    return this.adminStatsService.getAdminStats();
  }

  @ApiOperation({ summary: 'Get user analytics graph data' })
  @Get('analytics/users')
  async getUserAnalyticsGraph() {
    return this.adminStatsService.getUserAnalyticsGraph();
  }

  @ApiOperation({ summary: 'Get all jobs' })
  @Get('jobs')
  async getJobs(@Query() dto: GetFarmOwnerJobsDto) {
    return this.jobsService.getJobs(dto);
  }

  @ApiOperation({ summary: 'Get single job' })
  @Get('jobs/:jobId')
  async getAdminSingleJob(@Param('jobId') jobId: string) {
    return this.jobsService.getAdminSingleJob(jobId);
  }

  @ApiOperation({ summary: 'Get job applications' })
  @Get('jobs/:jobId/applications')
  async getAdminJobApplications(
    @Param('jobId') jobId: string,
    @Query() dt: PaginationDto,
  ) {
    return this.jobsService.getAdminJobApplications(jobId, dt);
  }

  @ApiOperation({ summary: 'Toggle job status' })
  @Patch('jobs/:jobId/status')
  async toggleSuspendJob(@Param('jobId') jobId: string) {
    return this.jobsService.toggleSuspendJob(jobId);
  }

  @ApiOperation({ summary: 'Get all farm owner' })
  @Get('farms')
  async getAllFarmOwner(@Query() dto: GetAllFarmDto) {
    return this.farmOwnerService.getAllFarmOwner(dto);
  }

  @ApiOperation({ summary: 'Get single farm owner' })
  @Get('farms/:farmId')
  async getFarmDetails(@Param('farmId') id: string) {
    return this.farmOwnerService.getFarmDetails(id);
  }

  @ApiOperation({ summary: 'Toggle farm owner status' })
  @Post('farms/:farmId/status')
  async toggleFarmOwnerSuspend(@Param('farmId') id: string) {
    return this.farmOwnerService.toggleFarmOwnerSuspend(id);
  }

  @ApiOperation({ summary: 'Get all job seekers' })
  @Get('job-seekers')
  async getAllJobSeekers(@Query() dto: GetJobSeekersDto) {
    return this.userService.getAllUsers(dto);
  }

  @ApiOperation({ summary: 'Get single job seeker' })
  @Get('job-seekers/:userId')
  async getSingleUserWithApplicationHistory(@Param('userId') userId: string) {
    return this.userService.getSingleUserWithApplicationHistory(userId);
  }

  @ApiOperation({ summary: 'Toggle job seeker status' })
  @Post('job-seekers/:userId/status')
  async toggleSuspension(@Param('userId') userId: string) {
    return this.userService.toggleSuspension(userId);
  }

  @ApiOperation({ summary: 'Get all payment history' })
  @Get('subscriptions/payment-history')
  async getPaymentHistory(@Query() dto: PaginationDto) {
    return this.adminPaymentService.getPaymentHistory(dto);
  }

  @ApiOperation({ summary: 'Get all subscriptions stats' })
  @Get('subscriptions/stats')
  async getStats() {
    return this.adminPaymentService.getStats();
  }

  @ApiOperation({ summary: 'Get last 7 days revenue' })
  @Get('subscriptions/revenue')
  async getRevenueLast7Days() {
    return this.adminPaymentService.getRevenueLast7Days();
  }

  @ApiOperation({ summary: 'Get last 6 months revenue' })
  @Get('subscriptions/revenue/last-6-months')
  async getRevenueLast6Months() {
    return this.adminPaymentService.getRevenueLast6Months();
  }
}
