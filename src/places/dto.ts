import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NearbyPlacesDto {
  @ApiProperty({ example: 6.9271 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 79.8612 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number;

  @ApiPropertyOptional({
    example: 20000,
    description: 'meters (default 20000, max 50000)',
  })
  @IsOptional()
  @IsNumber()
  radius?: number;

  @ApiPropertyOptional({
    example: 'tourism,natural,historic,park',
    description: 'Filter kinds; default covers travel POIs',
  })
  @IsOptional()
  @IsString()
  kinds?: string;
}

export class SuggestPlacesDto {
  @ApiProperty({ example: 6.9271 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 79.8612 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number;

  @ApiPropertyOptional({ example: 20000 })
  @IsOptional()
  @IsNumber()
  radius?: number;

  @ApiPropertyOptional({ example: '2025-09-10', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  start?: string;

  @ApiPropertyOptional({ example: '2025-09-12', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  end?: string;

  @ApiPropertyOptional({ example: 1, description: 'min good days in window' })
  @IsOptional()
  @IsInt()
  minGoodDays?: number;

  @ApiPropertyOptional({
    example: 'tourism,natural,historic,park',
    description: 'Place kinds to consider',
  })
  @IsOptional()
  @IsString()
  kinds?: string;

  @ApiPropertyOptional({
    example: 40,
    description: 'max places to weather-check (by distance)',
  })
  @IsOptional()
  @IsInt()
  limit?: number;
}
