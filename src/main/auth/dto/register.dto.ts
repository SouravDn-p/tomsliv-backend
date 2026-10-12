import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'john@gmail.com',
    description: 'Valid email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'johndeo',
    description: 'Name',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'strongPassword123',
    description: 'Password (min 6 characters)',
  })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class FarmRegisterDto extends RegisterDto {
  @ApiProperty({
    example: 'Sunnydale Farm',
    description: 'Name of the farm',
  })
  @IsNotEmpty()
  @IsString()
  farmName: string;
}
