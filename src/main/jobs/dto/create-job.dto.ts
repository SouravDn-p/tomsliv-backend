import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobType, SalaryType } from '@prisma';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateJobDto {
  @ApiProperty({ description: 'Job title', example: 'Farm Manager' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Job description',
    example: 'Manage daily farm operations',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Job benefits',
    example: 'Health insurance, Paid leave',
  })
  @IsString()
  @IsOptional()
  benefits?: string;

  @ApiProperty({ description: 'Farm size in hectares', example: 500 })
  @Type(() => Number)
  @IsNumber()
  farmSize: number;

  @ApiProperty({ description: 'Herd size (number of animals)', example: 200 })
  @Type(() => Number)
  @IsNumber()
  herdSize: number;

  @ApiProperty({ description: 'Number of on-farm staff', example: 5 })
  @Type(() => Number)
  @IsNumber()
  onFarmStaff: number;

  @ApiPropertyOptional({ description: 'Job location', example: 'Waikato, NZ' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    enum: JobType,
    description: 'Type of job',
    example: JobType.FULL_TIME,
  })
  @IsEnum(JobType)
  jobType: JobType;

  @ApiProperty({ description: 'Role/position name', example: 'Farm Manager' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({ description: 'Number of open positions', example: 3 })
  @Type(() => Number)
  @IsNumber()
  numberOfPositions: number;

  @ApiProperty({
    description: 'Required experience in years',
    example: 2,
  })
  @Type(() => Number)
  @IsNumber()
  requiredExperience: number;

  @ApiProperty({
    description: 'Application deadline',
    example: '2025-12-31T23:59:59.000Z',
  })
  @IsISO8601()
  applicationDeadline: string;

  @ApiProperty({
    description: 'Position start date',
    example: '2026-01-15T00:00:00.000Z',
  })
  @IsISO8601()
  positionStartDate: string;

  // @ApiProperty({
  //   enum: HourType,
  //   description: 'Hour type (week, season, negotiable)',
  //   example: HourType.week,
  // })
  // @IsEnum(HourType)
  // hourType: HourType;

  @ApiProperty({ description: 'Hours per week', example: 40 })
  @Type(() => Number)
  @IsNumber()
  hoursPerWeek: number;

  @ApiProperty({
    description: 'Roster description',
    example: '5 days on, 2 days off',
  })
  @IsString()
  @IsNotEmpty()
  roster: string;

  @ApiProperty({
    description: 'Who pays the remuneration',
    example: 'Farm Owner',
  })
  @IsString()
  @IsNotEmpty()
  remunerationPaidBy: string;

  @ApiProperty({
    enum: SalaryType,
    description: 'Remuneration payment frequency',
    example: SalaryType.YEARLY,
  })
  @IsEnum(SalaryType)
  remunerationType: SalaryType;

  @ApiPropertyOptional({
    description: 'Starting remuneration amount',
    example: 50000,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  remunerationStart?: number;

  @ApiPropertyOptional({
    description: 'Ending remuneration amount',
    example: 70000,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  remunerationEnd?: number;

  @ApiPropertyOptional({ description: 'Total package value', example: 80000 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  totalPackageValue?: number;

  @ApiPropertyOptional({ description: 'Per kg MS dollar value', example: 0.5 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  perKgMSDollarValue?: number;

  @ApiPropertyOptional({
    description: 'Percentage of milk cheque',
    example: 15,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  percentageOfMilkCheque?: number;
}
