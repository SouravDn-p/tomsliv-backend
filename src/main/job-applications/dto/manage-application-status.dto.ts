import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStatus } from '@prisma';
import { IsEnum } from 'class-validator';

export enum ManageApplicationStatusEnum {
  SHORTLISTED = 'SHORTLISTED',
  REJECTED = 'REJECTED',
}

export class ManageApplicationStatusDto {
  @ApiProperty({
    description: 'New status for the application',
    enum: ManageApplicationStatusEnum,
    example: ManageApplicationStatusEnum.SHORTLISTED,
  })
  @IsEnum(ManageApplicationStatusEnum, {
    message: 'Status must be either SHORTLISTED or REJECTED',
  })
  status: ApplicationStatus;
}
