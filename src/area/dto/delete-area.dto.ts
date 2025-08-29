import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteAreaDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id: string;
}
