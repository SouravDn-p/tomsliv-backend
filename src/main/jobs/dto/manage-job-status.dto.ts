import { ApiProperty } from '@nestjs/swagger';
import { JobStatus } from '@prisma';
import { IsEnum } from 'class-validator';

export class ManageJobStatusDto {
  @ApiProperty({ enum: JobStatus, example: JobStatus.ACTIVE })
  @IsEnum(JobStatus)
  status: JobStatus;
}
