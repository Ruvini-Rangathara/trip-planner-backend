// src/weather/dto.ts
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ByCoordsDto {
  @ApiProperty({ example: 6.9271, description: 'Latitude in decimal degrees' })
  @IsNumber()
  lat!: number;

  @ApiProperty({
    example: 79.8612,
    description: 'Longitude in decimal degrees',
  })
  @IsNumber()
  lon!: number;

  @ApiPropertyOptional({
    example: '2025-09-15',
    description: 'YYYY-MM-DD inside forecast window (for /forecast)',
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({
    example: 'T2M,PRECIP',
    description: 'Comma-separated variables',
  })
  @IsOptional()
  @IsString()
  vars?: string;

  @ApiPropertyOptional({
    example: '1',
    enum: ['0', '1'],
    description: 'Bilinear village interpolation',
  })
  @IsOptional()
  @IsIn(['0', '1'])
  interp?: '0' | '1';
}

export class ByNameDto {
  @ApiProperty({ example: 'Ella', description: 'Place name in Sri Lanka' })
  @IsString()
  q!: string;

  @ApiPropertyOptional({ example: '2025-09-15' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ example: 'T2M,PRECIP' })
  @IsOptional()
  @IsString()
  vars?: string;

  @ApiPropertyOptional({ example: '1', enum: ['0', '1'] })
  @IsOptional()
  @IsIn(['0', '1'])
  interp?: '0' | '1';
}
