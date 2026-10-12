import { PaginationDto } from '@/common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum AppliedJobSortOptionEnum {
  MOST_RECENT = 'mostRecent',
  FIT_SCORE_HIGH_TO_LOW = 'fitScoreHighToLow',
  FIT_SCORE_LOW_TO_HIGH = 'fitScoreLowToHigh',
  EXPERIENCE_HIGH_TO_LOW = 'experienceHighToLow',
  EXPERIENCE_LOW_TO_HIGH = 'experienceLowToHigh',
}

export class GetAppliedJobsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search by job title or description',
    example: 'Farm Manager',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sorting option',
    enum: AppliedJobSortOptionEnum,
    example: AppliedJobSortOptionEnum.MOST_RECENT,
  })
  @IsOptional()
  @IsEnum(AppliedJobSortOptionEnum)
  sortOption?: AppliedJobSortOptionEnum;
}
