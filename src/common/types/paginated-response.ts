import { ApiProperty } from '@nestjs/swagger';

export function PaginatedResponse<T>(type: new (...args: any[]) => T) {
  class PaginatedResponseInner {
    @ApiProperty({
      description: 'Number of total results',
      type: Number,
    })
    count: number;

    @ApiProperty({ type, isArray: true })
    data: T[];

    constructor(count: number, data: T[]) {
      this.count = count;
      this.data = data;
    }
  }
  return PaginatedResponseInner;
}
