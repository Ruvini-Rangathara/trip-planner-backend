import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { $Enums, TravelType } from '@prisma/client';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty()
  @IsString()
  id: string;

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
