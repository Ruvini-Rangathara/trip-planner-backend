import { HttpStatus } from '@nestjs/common';

export const TripException = {
  TRIP_NOT_FOUND: {
    code: 63601,
    status: HttpStatus.NOT_FOUND,
    message: 'Trip not found',
  },
  TRIP_AREAS_REQUIRED: {
    code: 63602,
    status: HttpStatus.BAD_REQUEST,
    message: 'A trip must include at least one area.',
  },
} as const;
