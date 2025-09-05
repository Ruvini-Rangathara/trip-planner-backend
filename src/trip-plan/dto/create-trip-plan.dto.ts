import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class TripAreaInputDto {
  @ApiProperty({ example: 'Kandy' })
  @IsString()
  area!: string;

  @ApiProperty({ example: 7.2906 })
  @IsNumber()
  lat!: number;

  @ApiProperty({ example: 80.6337 })
  @IsNumber()
  lng!: number;
}
export class CreateTripPlanDto {
  @ApiProperty({ example: 'Family trip to Kandy' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'b1c2b6a6-aaaa-bbbb-cccc-123456789abc' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: '2025-09-13T00:00:00.000Z' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ enum: TripStatus, default: TripStatus.PLANNED })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @ApiProperty({ type: [TripAreaInputDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'A trip must include at least one area.' })
  @ValidateNested({ each: true })
  @Type(() => TripAreaInputDto)
  areas!: TripAreaInputDto[];
}
