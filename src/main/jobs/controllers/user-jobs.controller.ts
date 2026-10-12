import { PaginationDto } from '@/common/dto/pagination.dto';
import { GetUser, ValidateAuth } from '@/core/jwt/jwt.decorator';
import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserJobsService } from '../services/user-jobs.service';

@ApiTags('User Jobs')
@ApiBearerAuth()
@ValidateAuth()
@Controller('user-jobs')
export class UserJobsController {
  constructor(private readonly userJobsService: UserJobsService) {}

  @ApiOperation({ summary: "Toggle job's saved status for authenticated user" })
  @Patch('toggle-saved/:jobId')
  async toggleJobSavedStatus(
    @GetUser('sub') userId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.userJobsService.toggleJobSavedStatus(userId, jobId);
  }

  @ApiOperation({ summary: "Get authenticated user's saved jobs" })
  @Get('saved-jobs')
  async getSavedJobsByUser(
    @GetUser('sub') userId: string,
    @Query() pg: PaginationDto,
  ) {
    return this.userJobsService.getSavedJobsByUser(userId, pg);
  }
}
