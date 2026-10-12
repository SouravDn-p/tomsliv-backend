import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicApplyDto } from '../dto/public-apply.dto';
import { JobApplicationsService } from '../services/job-applications.service';

@ApiTags('Public Job Applications')
@Controller('public-job-applications')
export class PublicJobApplicationsController {
  constructor(
    private readonly jobApplicationsService: JobApplicationsService,
  ) {}

  @ApiOperation({ summary: 'Apply for a job (Public/Guest)' })
  @Post('apply/:jobId')
  async applyPublic(
    @Param('jobId') jobId: string,
    @Body() dto: PublicApplyDto,
  ) {
    return this.jobApplicationsService.applyPublic(jobId, dto);
  }
}
