import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobType, WorkPermitType } from '@prisma';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
} from 'class-validator';

export class ExperienceDto {
  @ApiProperty({ example: 'Software Engineer' })
  @IsString()
  jobTitle: string;

  @ApiPropertyOptional({ enum: JobType, example: JobType.FULL_TIME })
  @IsOptional()
  @IsEnum(JobType)
  jobType?: JobType;

  @ApiProperty({ example: 'TechCorp Solutions Ltd' })
  @IsString()
  company: string;

  @ApiProperty({
    example:
      'Developed backend services, improved API performance by 30%, mentored junior engineers.',
  })
  @IsString()
  summary: string;

  @ApiProperty({ example: '2021-02-15T00:00:00.000Z' })
  @IsISO8601()
  startDate: string;

  @ApiPropertyOptional({ example: '2023-09-30T00:00:00.000Z' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isOngoing?: boolean;
}

export class EducationDto {
  @ApiProperty({ example: 'Bachelor of Computer Science' })
  @IsString()
  degree: string;

  @ApiProperty({ example: 'University of Auckland' })
  @IsString()
  institution: string;

  @ApiProperty({ example: '2017-01-10T00:00:00.000Z' })
  @IsISO8601()
  startDate: string;

  @ApiPropertyOptional({ example: '2020-12-15T00:00:00.000Z' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isOngoing?: boolean;
}

export class CoreCvDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsString()
  email: string;

  @ApiProperty({ example: '+64 21 123 4567' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Auckland, New Zealand' })
  @IsString()
  location: string;

  @ApiPropertyOptional({
    example:
      'Experienced backend developer with 4+ years specialising in Node.js, NestJS, and cloud infrastructure.',
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ example: 'Backend Developer' })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional({ enum: JobType, example: JobType.FULL_TIME })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(JobType)
  jobType?: JobType;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsISO8601()
  availability?: string;

  @ApiPropertyOptional({ description: 'Driver’s License', example: true })
  @IsOptional()
  @IsBoolean()
  hasDrivingLicense?: boolean;

  @ApiPropertyOptional({
    description: 'Eligible to Work in New Zealand',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  eligibleToWorkInNZ?: boolean;

  @ApiPropertyOptional({
    description: 'Work Permit Type',
    enum: WorkPermitType,
    example: WorkPermitType.WORK_VISA,
  })
  @IsOptional()
  @IsEnum(WorkPermitType)
  workPermitType?: WorkPermitType;
}
