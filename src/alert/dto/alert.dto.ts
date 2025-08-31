import { ApiProperty } from '@nestjs/swagger';
import { Alert, AlertType, TripPlan } from '@prisma/client';

export class AlertDto implements Alert {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tripId: string;

  @ApiProperty()
  trip?: TripPlan;

  @ApiProperty({ enum: AlertType })
  type: AlertType;

  @ApiProperty()
  message: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  deletedAt: Date | null;

  constructor(partial: Partial<AlertDto>) {
    Object.assign(this, partial);
  }
}
