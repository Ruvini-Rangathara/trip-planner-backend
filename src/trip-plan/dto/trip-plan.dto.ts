import { ApiProperty } from '@nestjs/swagger';
import { AlertType, TripStatus } from '@prisma/client';

export class TripAreaDto {
  @ApiProperty() id!: string;
  @ApiProperty() tripId!: string;
  @ApiProperty() area!: string;
  @ApiProperty() longitude!: number;
  @ApiProperty() latitude!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class AlertBriefDto {
  @ApiProperty() id!: string;
  @ApiProperty() tripId!: string;
  @ApiProperty()
  type!: AlertType;
  @ApiProperty() message!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class TripPlanDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() title!: string;
  @ApiProperty()
  status!: TripStatus;
  @ApiProperty() startDate!: Date;
  @ApiProperty() endDate!: Date;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  @ApiProperty({ type: [TripAreaDto] }) areas!: TripAreaDto[];
  @ApiProperty({ type: [AlertBriefDto] }) alerts!: AlertBriefDto[];

  constructor(partial: Partial<TripPlanDto>) {
    Object.assign(this, partial);
  }
}
