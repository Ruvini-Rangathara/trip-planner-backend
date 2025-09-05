import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripArea, TripPlan, TripStatus } from '@prisma/client';

export class TripPlanDto implements TripPlan {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  status!: TripStatus;

  @ApiProperty()
  date!: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  deletedAt: Date | null;

  @ApiProperty()
  areas!: TripArea[];

  constructor(partial: Partial<TripPlanDto>) {
    Object.assign(this, partial);
  }
}
