import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({ example: 'plan_123' })
  @IsString()
  planId: string;
}
