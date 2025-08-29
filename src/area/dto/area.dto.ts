import { ApiProperty } from '@nestjs/swagger';
import { Area } from '@prisma/client';

export class AreaDto implements Area {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  district: string | null;

  @ApiProperty()
  isIndoor: boolean;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  deletedAt: Date | null;

  constructor(partial: Partial<AreaDto>) {
    Object.assign(this, partial);
  }
}
