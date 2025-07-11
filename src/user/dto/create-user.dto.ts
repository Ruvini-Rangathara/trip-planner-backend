import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { $Enums, TravelType } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @ApiProperty()
  name: string;

  @IsString()
  @ApiProperty()
  email: string;

  @IsString()
  @ApiProperty()
  password: string;

  @IsString()
  @ApiPropertyOptional({
    enum: $Enums.TravelType,
    enumName: 'TravelType',
    nullable: true,
    description: 'The type of travel preference for the user.',
  })
  @IsOptional()
  travelType?: TravelType;

  @IsString()
  @ApiPropertyOptional({
    enum: $Enums.ClimatePreference,
    enumName: 'ClimatePreference',
    nullable: true,
    description: 'The climate preference for the user.',
  })
  @IsOptional()
  climatePreference: $Enums.ClimatePreference;
}
