import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class DeleteTripPlanDto {
  @ApiProperty({ example: 'c0ffee00-1111-2222-3333-deadbeef0001' })
  @IsUUID()
  id!: string;
}
