import { HttpStatus } from '@nestjs/common';

export const TripException = {
  TRIP_NOT_FOUND: {
    code: 63601,
    status: HttpStatus.NOT_FOUND,
    message: 'Trip not found',
  },
} as const;
