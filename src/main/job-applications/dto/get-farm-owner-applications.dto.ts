import { PaginationDto } from '@/common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '@prisma';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum FarmOwnerApplicationSortOptionEnum {
  MOST_RECENT = 'mostRecent',
  FIT_SCORE_HIGH_TO_LOW = 'fitScoreHighToLow',
  FIT_SCORE_LOW_TO_HIGH = 'fitScoreLowToHigh',
  EXPERIENCE_HIGH_TO_LOW = 'experienceHighToLow',
  EXPERIENCE_LOW_TO_HIGH = 'experienceLowToHigh',
}

export class GetFarmOwnerApplicationsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search by applicant name or job title',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific job ID',
  })
  @IsOptional()
  @IsString()
  jobId?: string;

  @ApiPropertyOptional({
    description: 'Filter by application status',
    enum: ApplicationStatus,
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({
    description: 'Sorting option',
    enum: FarmOwnerApplicationSortOptionEnum,
  })
  @IsOptional()
  @IsEnum(FarmOwnerApplicationSortOptionEnum)
  sortOption?: FarmOwnerApplicationSortOptionEnum;
}
