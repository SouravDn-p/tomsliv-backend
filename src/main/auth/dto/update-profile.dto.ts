import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John', description: 'Optional name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Optional phone number',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Optional profile image',
  })
  @IsOptional()
  image?: Express.Multer.File;
}

export class UpdateFarmDto {
  @ApiPropertyOptional({ example: 'John', description: 'Optional name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: '123 Farm Lane',
    description: 'Optional farm location',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    example: 50,
    description: 'Optional herd size',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  herdSize?: number;

  @ApiPropertyOptional({
    example: 'Dairy',
    description: 'Optional farm type',
  })
  @IsOptional()
  @IsString()
  farmType?: string;

  @ApiPropertyOptional({
    example: 'A family-owned dairy farm.',
    description: 'Optional farm description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'http://myfarm.com',
    description: 'Optional farm website',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Optional logo image',
  })
  @IsOptional()
  image?: Express.Multer.File;
}
