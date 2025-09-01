import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NearbyPlacesDto {
  @ApiProperty({ example: 6.9271, description: 'Latitude in decimal degrees' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({
    example: 79.8612,
    description: 'Longitude in decimal degrees',
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number;

  @ApiPropertyOptional({
    example: 20000,
    description: 'Search radius in meters (default 20000, max 50000)',
  })
  @IsOptional()
  @IsNumber()
  radius?: number;

  @ApiPropertyOptional({
    example: 'tourism,natural,historic,park',
    description:
      'Kinds to include (comma-separated). Default: tourism,natural,historic,park',
  })
  @IsOptional()
  @IsString()
  kinds?: string; // allowed tokens: tourism|natural|historic|park
}
