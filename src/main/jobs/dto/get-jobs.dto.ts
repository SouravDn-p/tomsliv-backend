import { PaginationDto } from '@/common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus, JobType } from '@prisma';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

// ---------------- Farm Owner Jobs DTO ----------------
export class GetFarmOwnerJobsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: JobStatus, example: JobStatus.ACTIVE })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(JobStatus)
  status?: JobStatus | '';

  @ApiPropertyOptional({ example: 'Farm Manager' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  search?: string;
}

// ---------------- Sort Enums ----------------
export enum JobSortOptionEnum {
  MOST_RECENT = 'mostRecent',
  REMUNERATION_HIGH_TO_LOW = 'remunerationHighToLow',
  REMUNERATION_LOW_TO_HIGH = 'remunerationLowToHigh',
  DEADLINE_SOON = 'deadlineSoon',
}

// ---------------- Remuneration Range DTO ----------------
export class RemunerationRangeDto {
  @ApiPropertyOptional({ description: 'Minimum remuneration', example: 10000 })
  @Type(() => Number)
  @IsNumber()
  min: number;

  @ApiPropertyOptional({ description: 'Maximum remuneration', example: 50000 })
  @Type(() => Number)
  @IsNumber()
  max: number;
}

// ---------------- All Jobs DTO ----------------
export class GetAllJobsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by job status',
    enum: JobStatus,
    example: JobStatus.ACTIVE,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({
    description: 'Filter by job types',
    type: [String],
    example: [JobType.FULL_TIME, JobType.PART_TIME],
  })
  @IsOptional()
  @Transform(({ value }) =>
    value ? (Array.isArray(value) ? value : [value]) : undefined,
  )
  @IsArray()
  @IsEnum(JobType, { each: true })
  jobTypes?: JobType[];

  @ApiPropertyOptional({
    description: 'Filter by job roles (titles)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) =>
    value ? (Array.isArray(value) ? value : [value]) : undefined,
  )
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({
    description: 'Filter by job locations',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) =>
    value ? (Array.isArray(value) ? value : [value]) : undefined,
  )
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @ApiPropertyOptional({
    description: 'Filter by remuneration range: [{min: number, max: number}]',
    type: [RemunerationRangeDto],
    example: [{ min: 10000, max: 50000 }],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const rawItems = Array.isArray(value) ? value : [value];
    return rawItems
      .map((item) => {
        if (
          typeof item === 'string' &&
          (item.startsWith('[') || item.startsWith('{'))
        ) {
          try {
            return JSON.parse(item);
          } catch {
            return item;
          }
        }
        return item;
      })
      .flat();
  })
  @Type(() => RemunerationRangeDto)
  @IsArray()
  remunerationRange?: RemunerationRangeDto[];

  @ApiPropertyOptional({
    description: 'Search text (job title or description)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Predefined sorting option',
    enum: JobSortOptionEnum,
  })
  @IsOptional()
  @IsEnum(JobSortOptionEnum)
  sortOption?: JobSortOptionEnum;
}
