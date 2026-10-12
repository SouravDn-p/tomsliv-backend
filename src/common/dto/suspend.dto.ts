import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SuspendDto {
  @ApiProperty({ example: true, description: 'isSuspended' })
  @IsBoolean()
  isSuspended: boolean;
}
