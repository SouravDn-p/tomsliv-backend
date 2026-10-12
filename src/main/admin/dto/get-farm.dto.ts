import { PaginationDto } from '@/common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FarmStatus } from '@prisma';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetAllFarmDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'Farm Manager' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: FarmStatus.ACTIVE, enum: FarmStatus })
  @IsOptional()
  @IsEnum(FarmStatus)
  status?: string;
}

export class GetJobSeekersDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'Farm Manager' })
  @IsOptional()
  @IsString()
  search?: string;
}
