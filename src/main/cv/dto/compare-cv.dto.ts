import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CompareCvDto {
  @ApiProperty({
    description: 'ID of the first CV to compare',
    type: String,
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  cvId1: string;

  @ApiProperty({
    description: 'ID of the second CV to compare',
    type: String,
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  cvId2: string;
}
