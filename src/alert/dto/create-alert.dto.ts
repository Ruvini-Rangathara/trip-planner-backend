import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { AlertType } from '@prisma/client';

export class CreateAlertDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  tripId: string;

  @ApiProperty({ enum: AlertType })
  @IsNotEmpty()
  @IsEnum(AlertType)
  type: AlertType;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  message: string;
}
