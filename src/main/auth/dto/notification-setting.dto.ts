import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class CommonNotificationSettingsDto {
  @ApiPropertyOptional({
    example: 'true',
    description: 'Email notifications',
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    example: 'true',
    description: 'Weekly digest emails',
  })
  @IsOptional()
  @IsBoolean()
  weeklyDigest?: boolean;
}

export class FarmOwnerNotificationSettingsDto extends CommonNotificationSettingsDto {
  @ApiPropertyOptional({
    example: 'true',
    description: 'New applicant alert emails',
  })
  @IsOptional()
  @IsBoolean()
  newApplicantAlert?: boolean;

  @ApiPropertyOptional({
    example: 'true',
    description: 'Updates and tips emails',
  })
  @IsOptional()
  @IsBoolean()
  updatesAndTips?: boolean;
}

export class UserNotificationSettingsDto extends CommonNotificationSettingsDto {
  @ApiPropertyOptional({
    example: 'true',
    description: 'New related jobs alert emails',
  })
  @IsOptional()
  @IsBoolean()
  newRelatedJobsAlert?: boolean;
}

export class AdminNotificationSettingsDto extends CommonNotificationSettingsDto {
  @ApiPropertyOptional({
    example: 'true',
    description: 'New employer join emails',
  })
  @IsOptional()
  @IsBoolean()
  newEmployerJoin?: boolean;
}
