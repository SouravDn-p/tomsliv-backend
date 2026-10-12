import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CoreCvDto, EducationDto, ExperienceDto } from './cv.dto';

export class CreateCvBodyDto {
  @ApiPropertyOptional({
    description: 'ID of the uploaded CV file',
    example: 'file_123abc',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  fileId?: string;

  @ApiPropertyOptional({
    description: 'ID of the uploaded cover letter file',
    example: 'file_456def',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  coverLetterFileId?: string;

  @ApiPropertyOptional({ type: CoreCvDto })
  @Type(() => CoreCvDto)
  @IsOptional()
  coreInfo: CoreCvDto;

  @ApiPropertyOptional({ type: [ExperienceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  @Transform(({ value }) => {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  })
  experiences?: ExperienceDto[];

  @ApiPropertyOptional({ type: [EducationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  @Transform(({ value }) => {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  })
  educations?: EducationDto[];
}
