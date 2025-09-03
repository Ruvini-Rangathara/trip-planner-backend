import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, IsUUID } from 'class-validator';

export class CreateTripPlanDto {
  @ApiProperty({ example: 'Family trip to Kandy' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'b1c2b6a6-aaaa-bbbb-cccc-123456789abc' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: '2025-09-13T00:00:00.000Z' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2025-09-15T00:00:00.000Z' })
  @IsDateString()
  endDate!: string;
}
