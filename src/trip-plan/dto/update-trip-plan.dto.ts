import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { CreateTripPlanDto } from './create-trip-plan.dto';

export class UpdateTripPlanDto extends PartialType(CreateTripPlanDto) {
  @ApiProperty({ example: 'c0ffee00-1111-2222-3333-deadbeef0001' })
  @IsUUID()
  id!: string;
}
