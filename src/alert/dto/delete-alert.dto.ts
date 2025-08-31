import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteAlertDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id: string;
}
