import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DesiredPersonalityTrait } from '@prisma';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// @ValidatorConstraint({ name: 'isMaxGreaterThanMin', async: false })
// class IsMaxGreaterThanMin implements ValidatorConstraintInterface {
//   validate(maxExperience: number, args: ValidationArguments) {
//     const object = args.object as UpsertIdealCandidateDto;
//     return maxExperience >= object.minimumExperienceYears;
//   }

//   defaultMessage() {
//     return 'Maximum experience years must be greater than or equal to minimum experience years';
//   }
// }

export class UpsertIdealCandidateDto {
  @ApiProperty({
    description: 'Minimum years of experience required',
    example: 2,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  minimumExperienceYears: number;

  // @ApiProperty({
  //   description: 'Maximum years of experience required',
  //   example: 5,
  //   minimum: 0,
  // })
  // @Type(() => Number)
  // @IsNumber()
  // @Min(0)
  // @IsNotEmpty()
  // @Validate(IsMaxGreaterThanMin)
  // maximumExperienceYears: number;

  @ApiProperty({
    description: 'Core skills required for the job',
    example: ['Dairy farming', 'Animal care', 'Equipment maintenance'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  coreSkills: string[];

  @ApiPropertyOptional({
    description: 'Desired personality traits',
    enum: DesiredPersonalityTrait,
    isArray: true,
    example: [
      DesiredPersonalityTrait.TEAM_PLAYER,
      DesiredPersonalityTrait.RELIABLE,
    ],
  })
  @IsArray()
  @IsEnum(DesiredPersonalityTrait, { each: true })
  @IsOptional()
  desiredPersonalityTraits?: DesiredPersonalityTrait[];

  @ApiPropertyOptional({
    description: 'Non-negotiable skills or requirements',
    example: ['Able to perform physical work', 'Valid driver license'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @IsOptional()
  nonNegotiableSkills?: string[];

  @ApiPropertyOptional({
    description: 'Recruiter values',
    example: ['Honesty', 'Integrity'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @IsOptional()
  recruiterValues?: string[];

  @ApiPropertyOptional({
    description: 'Recruiter hobbies',
    example: ['Fishing', 'Hiking'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @IsOptional()
  recruiterHobbies?: string[];

  @ApiPropertyOptional({
    description: 'Recruiter passions',
    example: ['Sustainability', 'Community'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @IsOptional()
  recruiterPassions?: string[];
}
